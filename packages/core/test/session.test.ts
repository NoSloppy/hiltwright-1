import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BoardClient, NO_SD_CARD, deleteCurrentPreset, diffPreset, duplicateCurrentPreset, editCurrentPreset, listAfterDelete, listAfterDuplicate, listAfterMove, moveCurrentPreset, parsePresetBlocks, patchShown,
  planRestore, runRestore, sameList, sdFailureIn, selectPreset, splitLines, type PresetRecord, type Transport,
} from '../src';

const transcript = (name: string) => readFileSync(new URL(`./transcripts/${name}`, import.meta.url), 'latin1');

class FakeTimers {
  now = 0;
  private timers: { at: number; fn: () => void; id: number }[] = [];
  private seq = 0;
  after(ms: number, fn: () => void): number { const id = ++this.seq; this.timers.push({ at: this.now + ms, fn, id }); return id; }
  cancel(id: unknown) { this.timers = this.timers.filter((t) => t.id !== id); }
  async run(untilMs: number) {
    for (;;) {
      await new Promise((r) => setTimeout(r, 0));
      const next = this.timers.filter((t) => t.at <= untilMs).sort((a, b) => a.at - b.at)[0];
      if (!next) { this.now = untilMs; return; }
      this.timers = this.timers.filter((t) => t !== next);
      this.now = next.at;
      next.fn();
    }
  }
}

/** A board that behaves like the OS 7.8 transcripts: set_font is silent and the read-back is delayed by the save. */
class FakeBoard implements Transport {
  private cb: ((chunk: string) => void) | null = null;
  sent: string[] = [];
  font = 'GeneralPrincess;common';
  style1 = 'builtin 2 1';
  on = false;
  saveDelay = 1200;
  /** No readable SD card: ProffieOS says so where it would save (seen on hote2, HW-2026-09-26d). */
  noCard = false;
  private pendingSave: number | null = null;
  constructor(private timers: FakeTimers) {}
  private emit(text: string, delay = 10) { this.timers.after(delay, () => this.cb?.(text)); }
  private block() { return `FONT=${this.font}\nTRACK=tracks/General.wav\nSTYLE1=${this.style1}\nSTYLE2=builtin 2 2\nSTYLE3=builtin 2 3\nSTYLE4=builtin 2 4\nNAME=Preset: 3\nVARIATION=0\n`; }
  write(text: string) {
    const cmd = text.trim();
    this.sent.push(cmd);
    if (this.noCard && cmd.startsWith('set_')) { this.emit('Failed to mount SD card.\r\n'); return; }
    if (cmd.startsWith('set_font ')) {
      this.font = cmd.slice(9);
      this.pendingSave = this.timers.now + this.saveDelay; // nothing is printed now
      this.emit('Creating file presets.tmp iteration = 2\r\n', this.saveDelay);
      return;
    }
    if (cmd.startsWith('set_style1 ')) {
      this.style1 = cmd.slice(11);
      this.pendingSave = this.timers.now + this.saveDelay;
      this.emit('Creating file presets.tmp iteration = 3\r\n', this.saveDelay);
      return;
    }
    if (cmd === 'show_current_preset') {
      // While a save is in flight the board blocks; the block arrives after the save finishes.
      const wait = this.pendingSave && this.pendingSave > this.timers.now ? this.pendingSave - this.timers.now + 50 : 10;
      this.emit(this.block(), wait);
      return;
    }
    if (cmd === 'get_preset') { this.emit('2\r\n'); return; }
    if (cmd === 'get_on') { this.emit(this.on ? '1\r\n' : '0\r\n'); return; }
    if (cmd.startsWith('set_preset ')) { this.emit(transcript('19-set_preset_2.txt'), 30); return; }
    if (cmd === 'list_presets') { this.emit(transcript('04-list_presets.txt'), 20); return; }
    this.emit(`Whut? :${cmd}\r\n`);
  }
  onData(cb: (chunk: string) => void) { this.cb = cb; return () => { this.cb = null; }; }
}

function setup() {
  const timers = new FakeTimers();
  const board = new FakeBoard(timers);
  const events: string[] = [];
  const client = new BoardClient(board, { now: () => timers.now, setTimer: (fn, ms) => timers.after(ms, fn), clearTimer: (h) => timers.cancel(h), onEvent: (l) => events.push(l) });
  return { timers, board, client, events };
}

describe('editCurrentPreset', () => {
  it('waits out the deferred save and reports success only after the read-back matches', async () => {
    const { timers, board, client, events } = setup();
    const p = editCurrentPreset(client, { font: 'TeensySF;common' }, () => timers.now);
    await timers.run(10000);
    const r = await p;
    expect(r.ok).toBe(true);
    expect(r.preset?.font).toBe('TeensySF;common');
    expect(board.sent).toEqual(['set_font TeensySF;common', 'show_current_preset']);
    expect(events).toContain('Creating file presets.tmp iteration = 2');
    expect(r.ms).toBeGreaterThanOrEqual(1200);
  });

  it('fails honestly when the board never confirms', async () => {
    const { timers, board, client } = setup();
    board.saveDelay = 60000; // the SD hangs
    const p = editCurrentPreset(client, { font: 'TeensySF;common' }, () => timers.now);
    await timers.run(60000);
    const r = await p;
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/did not confirm/);
    expect(r.readbacks).toBe(3);
  });

  it('a verified style write is re-applied by re-selecting the preset when asked', async () => {
    const { timers, board, client } = setup();
    const p = editCurrentPreset(client, { styles: { 1: 'builtin 2 1 65535,0,0' } }, () => timers.now, { applyIndex: 2 });
    await timers.run(20000);
    const r = await p;
    expect(r.ok).toBe(true);
    expect(r.preset?.styles[0]).toBe('builtin 2 1 65535,0,0');
    expect(r.applied).toBe(true);
    expect(board.sent).toEqual(['set_style1 builtin 2 1 65535,0,0', 'show_current_preset', 'get_on', 'set_preset 2']);
    // A font-only patch is never re-selected, even with applyIndex.
    const q = editCurrentPreset(client, { font: 'TeensySF;common' }, () => timers.now, { applyIndex: 2 });
    await timers.run(40000);
    await q;
    expect(board.sent.slice(4)).toEqual(['set_font TeensySF;common', 'show_current_preset']);
  });

  it('with the blade on, a style write is saved but not re-applied', async () => {
    const { timers, board, client } = setup();
    board.on = true;
    const p = editCurrentPreset(client, { styles: { 1: 'builtin 2 1 0,65535,0' } }, () => timers.now, { applyIndex: 2 });
    await timers.run(20000);
    const r = await p;
    expect(r.ok).toBe(true);
    expect(r.applied).toBe(false);
    expect(board.sent).toEqual(['set_style1 builtin 2 1 0,65535,0', 'show_current_preset', 'get_on']);
  });

  it('preset-editor-fixes D6: a saber with no readable card says so, and the change is reported as not saved', async () => {
    const { timers, board, client } = setup();
    board.noCard = true;
    const p = editCurrentPreset(client, { font: 'TeensySF;common' }, () => timers.now);
    await timers.run(20000);
    const r = await p;
    expect(r).toMatchObject({ ok: false, error: NO_SD_CARD, readbacks: 0 });
    expect(board.sent).toEqual(['set_font TeensySF;common']);
    expect(sdFailureIn(['Failed to mount SD card.'])).toBe(true);
    expect(sdFailureIn(['Creating file presets.tmp iteration = 2'])).toBe(false);
  });

  it('a patch with nothing in it sends nothing', async () => {
    const { board, client } = setup();
    expect(await editCurrentPreset(client, {})).toMatchObject({ ok: true, readbacks: 0 });
    expect(board.sent).toEqual([]);
  });
});

describe('selectPreset', () => {
  it('selects, confirms the index and reads the block back through the font-scan chatter', async () => {
    const { timers, board, client, events } = setup();
    const p = selectPreset(client, 2);
    await timers.run(5000);
    const r = await p;
    expect(r.index).toBe(2);
    expect(r.preset?.name).toBe('Preset: 3');
    expect(board.sent[0]).toBe('set_preset 2');
    expect(events.some((e) => /^Scanning sound font/.test(e))).toBe(true);
  });
});

describe('diffPreset', () => {
  it('produces the smallest patch that restores a snapshot', () => {
    const { presets } = parsePresetBlocks(splitLines(transcript('04-list_presets.txt')));
    const edited: PresetRecord = { ...presets[2], font: 'TeensySF;common', styles: [...presets[2].styles] };
    edited.styles[0] = 'builtin 2 1 65535,0,0';
    expect(diffPreset(edited, presets[2])).toEqual({ font: 'GeneralPrincess;common', styles: { 1: 'builtin 2 1' } });
    expect(diffPreset(presets[2], presets[2])).toEqual({});
  });
});

/**
 * A board with a real list: selecting, editing, moving, duplicating and deleting act on it as ProffieOS does.
 * `broken` makes move_preset, duplicate_preset and delete_preset do nothing, as a refused or lost change would.
 */
class ListBoard implements Transport {
  private cb: ((chunk: string) => void) | null = null;
  sent: string[] = [];
  current = 0;
  broken = false;
  constructor(private timers: FakeTimers, public list: PresetRecord[]) {}
  private emit(text: string, delay = 10) { this.timers.after(delay, () => this.cb?.(text)); }
  private block(p: PresetRecord) { return `FONT=${p.font}\nTRACK=${p.track}\n${p.styles.map((s, i) => `STYLE${i + 1}=${s}\n`).join('')}NAME=${p.name}\nVARIATION=${p.variation}\n`; }
  write(text: string) {
    const cmd = text.trim();
    this.sent.push(cmd);
    const arg = cmd.slice(cmd.indexOf(' ') + 1);
    const cur = this.list[this.current];
    if (cmd === 'list_presets') return this.emit(this.list.map((p) => this.block(p)).join(''));
    if (cmd === 'get_preset') return this.emit(`${this.current}\r\n`);
    if (cmd === 'show_current_preset') return this.emit(this.block(cur));
    if (cmd.startsWith('set_preset ')) { this.current = Number(arg); return this.emit('Scanning sound font: x\r\n'); }
    if (cmd.startsWith('set_font ')) { this.list[this.current] = { ...cur, font: arg }; return; }
    if (cmd.startsWith('set_track ')) { this.list[this.current] = { ...cur, track: arg }; return; }
    if (cmd.startsWith('set_name ')) { this.list[this.current] = { ...cur, name: arg }; return; }
    const st = /^set_style(\d+) (.*)$/.exec(cmd);
    if (st) { const styles = [...cur.styles]; styles[Number(st[1]) - 1] = st[2]; this.list[this.current] = { ...cur, styles }; return; }
    if (cmd.startsWith('move_preset ')) { if (!this.broken) { this.list = listAfterMove(this.list, this.current, Number(arg)); this.current = Number(arg); } return; }
    if (cmd.startsWith('duplicate_preset ')) { if (!this.broken) { this.list = listAfterDuplicate(this.list, this.current, Number(arg)); this.current = Number(arg); } return; }
    if (cmd === 'delete_preset') { if (!this.broken) { this.list = listAfterDelete(this.list, this.current); this.current = Math.min(this.current, this.list.length - 1); } return; }
    this.emit(`Whut? :${cmd}\r\n`);
  }
  onData(cb: (chunk: string) => void) { this.cb = cb; return () => { this.cb = null; }; }
}

const mk = (name: string, font = `${name};common`): PresetRecord => ({ name, font, track: `tracks/${name}.wav`, styles: [`builtin 0 1 ${name}`, 'builtin 0 2'], variation: 0 });
function listSetup(list: PresetRecord[] = [mk('Alpha'), mk('Bravo'), mk('Charlie'), mk('Delta')]) {
  const timers = new FakeTimers();
  const board = new ListBoard(timers, list.map((p) => ({ ...p, styles: [...p.styles] })));
  const client = new BoardClient(board, { now: () => timers.now, setTimer: (fn, ms) => timers.after(ms, fn), clearTimer: (h) => timers.cancel(h) });
  const go = async <T>(p: Promise<T>): Promise<T> => {
    let done = false;
    p.then(() => { done = true; }, () => { done = true; });
    while (!done) await timers.run(timers.now + 60_000);
    return p;
  };
  return { timers, board, client, go };
}
const copy = (l: PresetRecord[]) => l.map((p) => ({ ...p, styles: [...p.styles] }));

describe('move, duplicate and delete are confirmed by the list read back (F34)', () => {
  it('a confirmed move reports the list the saber read back', async () => {
    const { board, client, go } = listSetup();
    board.current = 2;
    const before = copy(board.list);
    const r = await go(moveCurrentPreset(client, before, 2, 0));
    expect(r.ok).toBe(true);
    expect(r.presets.map((p) => p.name)).toEqual(['Charlie', 'Alpha', 'Bravo', 'Delta']);
    expect(r.current).toBe(0);
  });

  it('a move the saber did not make is reported as failed, with what it does show', async () => {
    const { board, client, go } = listSetup();
    board.current = 2;
    board.broken = true;
    const before = copy(board.list);
    const r = await go(moveCurrentPreset(client, before, 2, 0));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/does not show the move/);
    expect(r.presets.map((p) => p.name)).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta']);
    // Read three times before giving up: the saber may still have been saving.
    expect(board.sent.filter((c) => c === 'list_presets')).toHaveLength(3);
  });

  it('a duplicate and a delete the saber did not make are reported as failed', async () => {
    const { board, client, go } = listSetup();
    board.broken = true;
    const before = copy(board.list);
    expect(await go(duplicateCurrentPreset(client, before, 0, 1))).toMatchObject({ ok: false, error: expect.stringMatching(/does not show the copy/) });
    expect(await go(deleteCurrentPreset(client, before, 0))).toMatchObject({ ok: false, error: expect.stringMatching(/does not show the delete/) });
    board.broken = false;
    expect((await go(duplicateCurrentPreset(client, before, 0, 1))).ok).toBe(true);
    expect((await go(deleteCurrentPreset(client, copy(board.list), 0))).ok).toBe(true);
  });
});

describe('restoring a snapshot puts values back into the right preset (F33)', () => {
  it('edit preset 3, move it to position 1: undo restores the moved preset and leaves the preset now at position 3 untouched', async () => {
    const { board, client, go } = listSetup();
    const beforeEdit = copy(board.list);
    // Edit preset 3's font, then move it to the top.
    await go(selectPreset(client, 2));
    expect((await go(editCurrentPreset(client, { font: 'TeensySF;common' }))).ok).toBe(true);
    const beforeMove = copy(board.list);
    expect((await go(moveCurrentPreset(client, beforeMove, 2, 0))).ok).toBe(true);
    const now = copy(board.list);
    expect(now.map((p) => p.name)).toEqual(['Charlie', 'Alpha', 'Bravo', 'Delta']);

    // Undo the edit: Charlie, now at position 1, gets its font back. The selected preset (Charlie) is not where the
    // snapshot had it, which is what used to overwrite Alpha with Charlie's old values.
    const plan = planRestore(beforeEdit, now);
    expect(plan.single).toMatchObject({ at: 0, snapshotAt: 2, name: 'Charlie', patch: { font: 'Charlie;common' } });
    const sent = board.sent.length;
    const r = await go(runRestore(client, now, [plan.single!.step], plan.single!.expected));
    expect(r.ok).toBe(true);
    expect(board.list.map((p) => [p.name, p.font])).toEqual([['Charlie', 'Charlie;common'], ['Alpha', 'Alpha;common'], ['Bravo', 'Bravo;common'], ['Delta', 'Delta;common']]);
    // Only preset 1 was selected and written.
    const writes = board.sent.slice(sent).filter((c) => /^(set_|move_|duplicate_|delete_)/.test(c));
    expect(writes).toEqual(['set_preset 0', 'set_font Charlie;common']);
    expect(board.list[2]).toEqual(now[2]);
  });

  it('undo after a move puts the order back', async () => {
    const { board, client, go } = listSetup();
    board.current = 2;
    const beforeMove = copy(board.list);
    await go(moveCurrentPreset(client, beforeMove, 2, 0));
    const plan = planRestore(beforeMove, copy(board.list));
    expect(plan.single).toBeNull();
    expect(plan.steps).toEqual([{ op: 'move', from: 0, to: 2 }]);
    const r = await go(runRestore(client, copy(board.list), plan.steps, plan.expected));
    expect(r.ok).toBe(true);
    expect(board.list).toEqual(beforeMove);
  });

  it('undo after a delete brings the deleted preset back where it was', async () => {
    const { board, client, go } = listSetup();
    board.current = 1;
    const beforeDelete = copy(board.list);
    await go(deleteCurrentPreset(client, beforeDelete, 1));
    const now = copy(board.list);
    const plan = planRestore(beforeDelete, now);
    expect(plan.single).toBeNull();
    expect(plan.singleRefused).toMatch(/only the order or the number/);
    expect(plan.steps[0]).toEqual({ op: 'duplicate', from: 0, to: 1 });
    expect(plan.changes[0]).toBe('Add a preset at position 2, copied from "Alpha".');
    const r = await go(runRestore(client, now, plan.steps, plan.expected));
    expect(r.ok).toBe(true);
    expect(board.list.map((p) => p.name)).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta']);
    expect(sameList(board.list, beforeDelete)).toBe(true);
  });

  it('undo after deleting the first preset brings it back at position 1', async () => {
    const { board, client, go } = listSetup();
    const beforeDelete = copy(board.list);
    await go(deleteCurrentPreset(client, beforeDelete, 0));
    const plan = planRestore(beforeDelete, copy(board.list));
    const r = await go(runRestore(client, copy(board.list), plan.steps, plan.expected));
    expect(r.ok).toBe(true);
    expect(sameList(board.list, beforeDelete)).toBe(true);
  });

  it('undo after a duplicate removes the copy and nothing else', async () => {
    const { board, client, go } = listSetup();
    board.current = 1;
    const beforeDup = copy(board.list);
    await go(duplicateCurrentPreset(client, beforeDup, 1, 2));
    // The copy is renamed, as an owner would.
    await go(editCurrentPreset(client, { name: 'Bravo copy' }));
    const now = copy(board.list);
    const plan = planRestore(beforeDup, now);
    expect(plan.steps).toEqual([{ op: 'delete', at: 2 }]);
    expect(plan.changes).toEqual(['Delete "Bravo copy" at position 3: it is not in the snapshot.']);
    const r = await go(runRestore(client, now, plan.steps, plan.expected));
    expect(r.ok).toBe(true);
    expect(board.list).toEqual(beforeDup);
  });

  it('a whole-list restore the saber does not take is reported as failed', async () => {
    const { board, client, go } = listSetup();
    board.current = 2;
    const beforeMove = copy(board.list);
    await go(moveCurrentPreset(client, beforeMove, 2, 0));
    const now = copy(board.list);
    const plan = planRestore(beforeMove, now);
    board.broken = true;
    const r = await go(runRestore(client, now, plan.steps, plan.expected));
    expect(r).toMatchObject({ ok: false, done: 0, error: expect.stringMatching(/does not show the move/) });
    expect(r.presets.map((p) => p.name)).toEqual(['Charlie', 'Alpha', 'Bravo', 'Delta']);
  });
});

describe('patchShown', () => {
  const { presets } = parsePresetBlocks(splitLines(transcript('04-list_presets.txt')));
  const p = presets[2];
  it('is true when the preset shows every field the patch sets', () => {
    expect(patchShown(p, { font: p.font })).toBe(true);
    expect(patchShown(p, { name: p.name })).toBe(true);
    expect(patchShown(p, { styles: { 2: p.styles[1] } })).toBe(true);
    expect(patchShown(p, {})).toBe(true);
  });
  it('is false when one field differs, even if another matches', () => {
    expect(patchShown(p, { font: 'TeensySF;common' })).toBe(false);
    expect(patchShown(p, { name: p.name, font: 'TeensySF;common' })).toBe(false);
    expect(patchShown(p, { styles: { 2: 'builtin 9 9' } })).toBe(false);
  });
});
