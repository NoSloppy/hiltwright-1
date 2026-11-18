import { describe, expect, it } from 'vitest';
import { LIMIT, MERGE_MS, historyReducer, initialHistory, type History, type HistoryEvent } from '../src/renderer/src/editorHistory';

type S = { n: number; mode: 'a' | 'b' };
const run = (h: History<S>, ...events: HistoryEvent<S>[]) => events.reduce(historyReducer<S>, h);
const set = (n: number, at: number, step = false): HistoryEvent<S> => ({ type: 'edit', fn: (s) => ({ ...s, n }), at, step });
const start = () => initialHistory<S>({ n: 0, mode: 'a' }, true);

describe('style editor history', () => {
  it('undoes and redoes separate edits one at a time', () => {
    let h = run(start(), set(1, 0), set(2, 5000), set(3, 10000));
    expect(h.present.n).toBe(3);
    h = run(h, { type: 'undo' }); expect(h.present.n).toBe(2);
    h = run(h, { type: 'undo' }, { type: 'undo' }); expect(h.present.n).toBe(0);
    h = run(h, { type: 'undo' }); expect(h.present.n).toBe(0); // nothing left: stays put
    h = run(h, { type: 'redo' }, { type: 'redo' }); expect(h.present.n).toBe(2);
  });

  it('joins a quick burst of edits into one step', () => {
    let h = run(start(), set(1, 1000), set(2, 1100), set(3, 1200), set(4, 1200 + MERGE_MS + 1));
    expect(h.past.map((s) => s.n)).toEqual([0, 3]);
    h = run(h, { type: 'undo' }, { type: 'undo' });
    expect(h.present.n).toBe(0);
  });

  it('keeps a deliberate edit as its own step even inside a burst', () => {
    const h = run(start(), set(1, 1000), set(2, 1050, true), set(3, 1100));
    expect(h.past.map((s) => s.n)).toEqual([0, 1, 2]);
  });

  it('a new edit after undoing drops what could have been redone', () => {
    const h = run(start(), set(1, 0), set(2, 5000), { type: 'undo' }, set(9, 10000));
    expect(h.present.n).toBe(9);
    expect(h.future).toEqual([]);
  });

  it('never joins an edit onto a step reached by undo', () => {
    const h = run(start(), set(1, 1000), set(2, 5000), { type: 'undo' }, set(7, 5100));
    expect(h.past.map((s) => s.n)).toEqual([0, 1]);
  });

  it('changing the view is not a step, but undo goes back to the view the change was made in', () => {
    let h = run(start(), set(1, 0), { type: 'view', fn: (s) => ({ ...s, mode: 'b' }) });
    expect(h.past.length).toBe(1);
    h = run(h, set(2, 5000), { type: 'undo' });
    expect(h.present).toEqual({ n: 1, mode: 'b' });
    h = run(h, { type: 'undo' });
    expect(h.present).toEqual({ n: 0, mode: 'a' });
  });

  it('knows the saved snapshot, including after undoing back to it', () => {
    let h = run(start(), set(1, 0));
    expect(h.present).not.toBe(h.saved);
    h = run(h, { type: 'undo' });
    expect(h.present).toBe(h.saved);
    h = run(h, { type: 'redo' }, { type: 'saved' });
    expect(h.present).toBe(h.saved);
  });

  it('keeps a bounded number of steps', () => {
    let h = start();
    for (let i = 1; i <= LIMIT + 50; i++) h = run(h, set(i, i * 10000));
    expect(h.past.length).toBe(LIMIT);
  });
});
