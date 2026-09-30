// board-connection 3.3 and 3.14 (baseline audit), on the rules useBoard uses.

import { describe, expect, it } from 'vitest';
import { NO_SD_CARD, connectGate, runOperation, sdFailureIn, serialQueue, type OpDeps, type SaveState } from '../src/renderer/src/boardOps';

const later = () => { let done!: () => void; const p = new Promise<void>((r) => { done = r; }); return { p, done }; };

describe('one connection attempt at a time', () => {
  it('3.3 a plug-in event during a reconnect opens nothing more: the second attempt is skipped', async () => {
    const gate = connectGate(() => false);
    const opening = later();
    let opened = 0;
    const first = gate(async () => { opened++; await opening.p; });
    const second = gate(async () => { opened++; });
    expect(await second).toBe(false);
    opening.done();
    expect(await first).toBe(true);
    expect(opened).toBe(1);
  });

  it('3.3 an attempt while a port is already open is skipped', async () => {
    let open = true;
    const gate = connectGate(() => open);
    expect(await gate(async () => {})).toBe(false);
    open = false;
    expect(await gate(async () => {})).toBe(true);
  });

  it('3.3 the gate opens again after an attempt fails', async () => {
    const gate = connectGate(() => false);
    await expect(gate(async () => { throw new Error('port busy'); })).rejects.toThrow('port busy');
    expect(await gate(async () => {})).toBe(true);
  });
});

describe('board operations queued in order', () => {
  it('3.14 two quick edits both run, in the order they were made, the second after the first finishes', async () => {
    const enqueue = serialQueue();
    const log: string[] = [];
    const slow = later();
    const a = enqueue(async () => { log.push('edit 1 start'); await slow.p; log.push('edit 1 done'); return 1; });
    const b = enqueue(async () => { log.push('edit 2 start'); return 2; });
    await Promise.resolve();
    expect(log).toEqual(['edit 1 start']);
    slow.done();
    expect(await Promise.all([a, b])).toEqual([1, 2]);
    expect(log).toEqual(['edit 1 start', 'edit 1 done', 'edit 2 start']);
  });

  it('3.14 a failed operation does not stop the ones after it', async () => {
    const enqueue = serialQueue();
    const failed = enqueue(async () => { throw new Error('no answer'); });
    const next = enqueue(async () => 'written');
    await expect(failed).rejects.toThrow('no answer');
    expect(await next).toBe('written');
  });
});

// connection-robustness BST-4: an operation whose turn comes after an unplug says so.
describe('running a board operation', () => {
  function deps(client: { name: string } | null) {
    const saves: SaveState[] = [];
    const busy: boolean[] = [];
    const d: OpDeps<{ name: string }> = { client: () => client, setBusy: (b) => busy.push(b), setSave: (s) => saves.push(s), log: () => undefined, snapshot: async () => undefined };
    return { d, saves, busy };
  }

  it('an edit whose turn comes after the saber was unplugged is reported as not sent', async () => {
    const { d, saves, busy } = deps(null);
    let ran = false;
    expect(await runOperation(d, 'Set font', async () => { ran = true; return { ok: true }; }, true)).toBe(false);
    expect(ran).toBe(false);
    expect(saves).toEqual([{ kind: 'failed', what: 'Set font', error: 'Not sent: the saber is not connected.' }]);
    expect(busy).toEqual([]);
  });

  it('with a saber, runs the operation on its client and reports it saved', async () => {
    const { d, saves, busy } = deps({ name: 'hote2' });
    let on = '';
    expect(await runOperation(d, 'Set font', async (c) => { on = c.name; return { ok: true, ms: 12, note: 'checked' }; }, false)).toBe(true);
    expect(on).toBe('hote2');
    expect(saves[0]).toEqual({ kind: 'writing', what: 'Set font' });
    expect(saves[1]).toMatchObject({ kind: 'saved', what: 'Set font · checked', ms: 12 });
    expect(busy).toEqual([true, false]);
  });

  it('a change under way when the saber is unplugged says so, not what its last command made of the silence', async () => {
    let connected: { name: string } | null = { name: 'hote2' };
    const saves: SaveState[] = [];
    const d: OpDeps<{ name: string }> = { client: () => connected, setBusy: () => undefined, setSave: (s) => saves.push(s), log: () => undefined, snapshot: async () => undefined };
    await runOperation(d, 'Font → Ben_Solo', async () => { connected = null; return { ok: false, error: 'The saber stopped answering. Unplug and replug it, then press Connect.' }; }, false);
    expect(saves.at(-1)).toEqual({ kind: 'failed', what: 'Font → Ben_Solo', error: 'Not saved: the saber was disconnected during the change.' });
  });

  it('preset-editor-fixes D6: a saber that reset for want of a card is reported as having no card, not as unplugged', async () => {
    let connected: { name: string } | null = { name: 'hote2' };
    const saves: SaveState[] = [];
    const d: OpDeps<{ name: string }> = { client: () => connected, setBusy: () => undefined, setSave: (s) => saves.push(s), log: () => undefined, snapshot: async () => undefined };
    expect(await runOperation(d, 'Font → Ben_Solo', async () => { connected = null; return { ok: false, error: NO_SD_CARD }; }, false)).toBe(false);
    expect(saves.at(-1)).toEqual({ kind: 'failed', what: 'Font → Ben_Solo', error: NO_SD_CARD });
  });

  it('an operation that throws is reported as failed and clears busy', async () => {
    const { d, saves, busy } = deps({ name: 'hote2' });
    expect(await runOperation(d, 'Rename', async () => { throw new Error('Port closed'); }, false)).toBe(false);
    expect(saves.at(-1)).toEqual({ kind: 'failed', what: 'Rename', error: 'Error: Port closed' });
    expect(busy).toEqual([true, false]);
  });
});

// preset-editor-fixes D6: what the saber says when it cannot read its card (hote2 with its card in the reader).
describe('no readable SD card', () => {
  it('is found in any line the saber sends, and only there', () => {
    expect(sdFailureIn(['Failed to mount SD card.'])).toBe(true);
    expect(sdFailureIn(['0', 'failed to mount sd card.'])).toBe(true);
    expect(sdFailureIn(['Creating file presets.tmp iteration = 2', 'Whut? :set_foo'])).toBe(false);
    expect(sdFailureIn([])).toBe(false);
  });
});
