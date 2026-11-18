// Preset editing against a live board, built on what the OS 7.8 transcripts showed:
// writes answer with nothing, the save is deferred, and the read-back can be delayed by the SD write.
// Every write here is followed by a read-back and is only reported as done when the read-back matches.

import type { BoardClient, Response } from './client';
import { isPresetBlockEnd, parsePresetBlocks, presetCommands, type PresetRecord } from './presets';
import { parseInteger } from './responses';
import { isNoise } from './lines';

export interface PresetPatch {
  font?: string;
  track?: string;
  name?: string;
  /** 1-based blade number → style string, e.g. "builtin 2 1 65535,0,0". */
  styles?: Record<number, string>;
}

export interface EditResult {
  ok: boolean;
  /** The preset as the board reported it after the write. */
  preset: PresetRecord | null;
  /** How many read-backs it took. */
  readbacks: number;
  ms: number;
  error?: string;
  /** For style writes with applyIndex: true when the preset was re-selected, false when skipped because the blade was on. */
  applied?: boolean;
}

// A preset change on a Fett263 build can spend seconds scanning the new font and speaking an error before it
// answers anything else; the read-back waits that out rather than declaring the write lost.
const READBACK_TIMEOUT = 10000;

/** Last complete preset block in a response. A delayed earlier block may precede it. */
function lastBlock(r: Response): PresetRecord | null {
  const { presets } = parsePresetBlocks(r.lines);
  return presets.length ? presets[presets.length - 1] : null;
}

export async function listPresets(client: BoardClient): Promise<PresetRecord[]> {
  const r = await client.send(presetCommands.list(), { idleMs: 700, timeoutMs: 20000 });
  return parsePresetBlocks(r.lines).presets;
}

export async function currentPresetIndex(client: BoardClient): Promise<number | null> {
  const r = await client.send(presetCommands.getCurrent(), { until: (l) => /^-?\d+$/.test(l.trim()) });
  return parseInteger(r.lines);
}

/** show_current_preset, tolerating the SD-write delay. Retries once when nothing complete came back. */
export async function readCurrentPreset(client: BoardClient, attempts = 3): Promise<{ preset: PresetRecord | null; readbacks: number }> {
  let readbacks = 0;
  for (let i = 0; i < attempts; i++) {
    readbacks++;
    const r = await client.send(presetCommands.showCurrent(), { until: isPresetBlockEnd, timeoutMs: READBACK_TIMEOUT, idleMs: 1500 });
    const p = lastBlock(r);
    if (p) return { preset: p, readbacks };
  }
  return { preset: null, readbacks };
}

/** Make preset `index` current on the board and return what the board says it is. */
export async function selectPreset(client: BoardClient, index: number): Promise<{ preset: PresetRecord | null; index: number | null }> {
  await client.send(presetCommands.select(index), { idleMs: 1200, timeoutMs: 12000 });
  const cur = await currentPresetIndex(client);
  const { preset } = await readCurrentPreset(client);
  return { preset, index: cur };
}

/**
 * Whether the preset shows every field the patch sets: the read-back rule for a write, and how a change that met a
 * stalled link is judged once the saber is read again (usb-power-connect D5).
 */
export function patchShown(p: PresetRecord, patch: PresetPatch): boolean {
  if (patch.font !== undefined && p.font !== patch.font) return false;
  if (patch.track !== undefined && p.track !== patch.track) return false;
  if (patch.name !== undefined && p.name !== patch.name) return false;
  if (patch.styles) for (const [k, v] of Object.entries(patch.styles)) if (p.styles[Number(k) - 1] !== v) return false;
  return true;
}

export interface EditOptions {
  /**
   * `set_styleN` only stores the string and saves the file; the running style keeps its old arguments until the
   * preset is loaded again. Pass the current preset's index to re-select it after a verified style write so the
   * change is visible on the blade at once (about a second; the board re-scans the font).
   */
  applyIndex?: number;
}

/**
 * ProffieOS says this when it cannot read its SD card (none in the saber, or unreadable). Preset changes and the
 * current preset are saved on the card, so without one they cannot be saved, and may even reset the board
 * (preset-editor-fixes, HW-2026-09-26d).
 */
export function sdFailureIn(lines: string[]): boolean {
  return lines.some((l) => /Failed to mount SD card/i.test(l));
}

/** Why a preset change was not saved when the saber reported it cannot read its card. Reconnecting does not help. */
export const NO_SD_CARD = 'Not saved: the saber has no readable SD card, and preset changes are saved on the card.';

/** Apply a patch to the board's *current* preset. Silence is not success: the result is what the read-back says. */
export async function editCurrentPreset(client: BoardClient, patch: PresetPatch, now: () => number = () => Date.now(), opts: EditOptions = {}): Promise<EditResult> {
  const started = now();
  const cmds: string[] = [];
  if (patch.font !== undefined) cmds.push(presetCommands.setFont(patch.font));
  if (patch.track !== undefined) cmds.push(presetCommands.setTrack(patch.track));
  if (patch.name !== undefined) cmds.push(presetCommands.setName(patch.name));
  if (patch.styles) for (const [k, v] of Object.entries(patch.styles)) cmds.push(presetCommands.setStyle(Number(k), v));
  if (!cmds.length) return { ok: true, preset: null, readbacks: 0, ms: 0 };
  // Every line the saber sends back is kept: a card it cannot read shows up here, not as silence.
  const heard: string[] = [];
  for (const c of cmds) heard.push(...(await client.send(c, { idleMs: 400, timeoutMs: 8000 })).lines);
  if (sdFailureIn(heard)) return { ok: false, preset: null, readbacks: 0, ms: now() - started, error: NO_SD_CARD };
  let readbacks = 0;
  // Up to three read-backs: the first often returns only the "Creating file" notice while the SD write runs.
  for (let i = 0; i < 3; i++) {
    const r = await readCurrentPreset(client, 1);
    readbacks += r.readbacks;
    if (r.preset && patchShown(r.preset, patch)) {
      let applied: boolean | undefined;
      if (patch.styles && opts.applyIndex != null) {
        // Re-selecting the preset while the blade is on is what overloads a V2 running a heavy style; with the
        // blade off it is cheap. get_on answers 1/0 on OS 8; older firmware rejects it and we assume off.
        const on = await client.send('get_on', { idleMs: 400, timeoutMs: 6000 });
        const lit = on.lines.some((l) => l.trim() === '1');
        if (lit) applied = false;
        else { await client.send(presetCommands.select(opts.applyIndex), { idleMs: 1200, timeoutMs: 12000 }); applied = true; }
      }
      return { ok: true, preset: r.preset, readbacks, ms: now() - started, applied };
    }
    if (r.preset && i === 2) return { ok: false, preset: r.preset, readbacks, ms: now() - started, error: 'The saber reports different values than were written.' };
  }
  // Nothing came back three times. Tell a dead link apart from a refused write: a live board answers get_preset at once.
  const alive = await client.send(presetCommands.getCurrent(), { idleMs: 400, timeoutMs: 4000 });
  if (sdFailureIn(alive.lines)) return { ok: false, preset: null, readbacks, ms: now() - started, error: NO_SD_CARD };
  const dead = alive.lines.filter((l) => !isNoise(l)).length === 0;
  return { ok: false, preset: null, readbacks, ms: now() - started, error: dead ? 'The saber stopped answering. Unplug and replug it, then press Connect.' : 'The saber did not confirm the change.' };
}

/** Fields of `to` that differ from `from`, as a patch. Used to restore a snapshot with the fewest commands. */
export function diffPreset(from: PresetRecord, to: PresetRecord): PresetPatch {
  const patch: PresetPatch = {};
  if (from.font !== to.font) patch.font = to.font;
  if (from.track !== to.track) patch.track = to.track;
  if (from.name !== to.name) patch.name = to.name;
  const styles: Record<number, string> = {};
  to.styles.forEach((s, i) => { if (from.styles[i] !== s) styles[i + 1] = s; });
  if (Object.keys(styles).length) patch.styles = styles;
  return patch;
}

export function isEmptyPatch(p: PresetPatch): boolean {
  return p.font === undefined && p.track === undefined && p.name === undefined && !p.styles;
}

// ---------- Structural edits: reorder, duplicate, delete ----------
// These change presets.ini on the board and renumber presets, so each one re-reads the list and the current index, and
// is only reported as done when the list read back is the one the change should have made (F34).

export interface ListResult { presets: PresetRecord[]; current: number | null }
/** A list change as the saber reported it: `presets` and `current` are what it read back, whatever `ok` says. */
export interface ListChange extends ListResult { ok: boolean; error?: string }

async function resync(client: BoardClient): Promise<ListResult> {
  const presets = await listPresets(client);
  const current = await currentPresetIndex(client);
  return { presets, current };
}

/** Whether two presets carry the same values a preset write can set: name, font, track and every blade's style. */
export function sameValues(a: PresetRecord | undefined, b: PresetRecord | undefined): boolean {
  if (!a || !b) return false;
  if (a.name !== b.name || a.font !== b.font || a.track !== b.track || a.styles.length !== b.styles.length) return false;
  return a.styles.every((s, i) => s === b.styles[i]);
}

/** Whether two lists hold the same presets in the same order, by their values. */
export function sameList(a: PresetRecord[], b: PresetRecord[]): boolean {
  return a.length === b.length && a.every((p, i) => sameValues(p, b[i]));
}

/** The list once the preset at `from` is moved to `to` (both 0-based), as `move_preset` makes it. */
export function listAfterMove(before: PresetRecord[], from: number, to: number): PresetRecord[] {
  const next = [...before];
  const [p] = next.splice(from, 1);
  if (p) next.splice(to, 0, p);
  return next;
}
/** The list once the preset at `from` is copied to position `to`, as `duplicate_preset` makes it. */
export function listAfterDuplicate(before: PresetRecord[], from: number, to: number): PresetRecord[] {
  const next = [...before];
  const p = before[from];
  if (p) next.splice(to, 0, { ...p, styles: [...p.styles] });
  return next;
}
/** The list once the preset at `at` is deleted. */
export function listAfterDelete(before: PresetRecord[], at: number): PresetRecord[] {
  return before.filter((_p, i) => i !== at);
}

/**
 * Read the list back until it is the expected one: the saber may still be saving presets.ini when it is first asked.
 * Not the expected list after three readings is a failure, and the result carries what the saber does show.
 */
export async function confirmList(client: BoardClient, expected: PresetRecord[], what: string, attempts = 3): Promise<ListChange> {
  let last: ListResult = { presets: [], current: null };
  for (let i = 0; i < attempts; i++) {
    last = await resync(client);
    if (sameList(last.presets, expected)) return { ...last, ok: true };
  }
  if (!last.presets.length) return { ...last, ok: false, error: `The saber did not list its presets after the ${what}.` };
  return { ...last, ok: false, error: `The saber's list does not show the ${what}. The page shows what it has now.` };
}

/** Move the current preset, at `from` in `before`, to position `to` (0-based), and confirm it from the list read back. */
export async function moveCurrentPreset(client: BoardClient, before: PresetRecord[], from: number, to: number): Promise<ListChange> {
  await client.send(presetCommands.move(to), { idleMs: 900, timeoutMs: 8000 });
  return confirmList(client, listAfterMove(before, from, to), 'move');
}

/** Copy the current preset, at `from` in `before`, to position `to` (0-based); the copy becomes current. */
export async function duplicateCurrentPreset(client: BoardClient, before: PresetRecord[], from: number, to: number): Promise<ListChange> {
  await client.send(presetCommands.duplicate(to), { idleMs: 900, timeoutMs: 8000 });
  return confirmList(client, listAfterDuplicate(before, from, to), 'copy');
}

/** Delete the current preset, at `at` in `before`. */
export async function deleteCurrentPreset(client: BoardClient, before: PresetRecord[], at: number): Promise<ListChange> {
  await client.send(presetCommands.delete(), { idleMs: 900, timeoutMs: 8000 });
  return confirmList(client, listAfterDelete(before, at), 'delete');
}

/** The preset with a patch applied: what a confirmed edit leaves it as. */
export function withPatch(p: PresetRecord, patch: PresetPatch): PresetRecord {
  const styles = [...p.styles];
  if (patch.styles) for (const [k, v] of Object.entries(patch.styles)) styles[Number(k) - 1] = v;
  return { ...p, font: patch.font ?? p.font, track: patch.track ?? p.track, name: patch.name ?? p.name, styles: styles.map((s) => s ?? '') };
}

// ---------- Putting a snapshot back (F33) ----------

/** One change a restore makes, on the list as it stands when the step's turn comes. Positions are 0-based. */
export type RestoreStep =
  | { op: 'move'; from: number; to: number }
  | { op: 'duplicate'; from: number; to: number }
  | { op: 'delete'; at: number }
  | { op: 'edit'; at: number; patch: PresetPatch };

/** The list once a step is made. */
export function listAfterStep(list: PresetRecord[], step: RestoreStep): PresetRecord[] {
  switch (step.op) {
    case 'move': return listAfterMove(list, step.from, step.to);
    case 'duplicate': return listAfterDuplicate(list, step.from, step.to);
    case 'delete': return listAfterDelete(list, step.at);
    case 'edit': return list.map((p, i) => (i === step.at ? withPatch(p, step.patch) : p));
  }
}

/**
 * Make a restore's steps on the saber, one at a time, each confirmed by what the saber reads back, then read the whole
 * list and compare it with `expected`. Stops at the first step the saber does not confirm. `presets` is the list as the
 * saber last reported it, so the page can show what it has, done or not.
 */
export async function runRestore(client: BoardClient, before: PresetRecord[], steps: RestoreStep[], expected: PresetRecord[]): Promise<ListChange & { done: number }> {
  let list = before;
  let current: number | null = null;
  const fail = (error: string, done: number, presets = list): ListChange & { done: number } => ({ ok: false, error, presets, current, done });
  for (let n = 0; n < steps.length; n++) {
    const step = steps[n];
    const at = step.op === 'edit' || step.op === 'delete' ? step.at : step.from;
    const sel = await selectPreset(client, at);
    if (!sel.preset || sel.index !== at) return fail(`The saber did not switch to preset ${at + 1}.`, n);
    current = at;
    if (step.op === 'edit') {
      const r = await editCurrentPreset(client, step.patch);
      if (r.preset) list = list.map((p, i) => (i === at ? r.preset! : p));
      if (!r.ok) return fail(r.error ?? 'The saber did not confirm the change.', n);
      continue;
    }
    const r = step.op === 'move' ? await moveCurrentPreset(client, list, step.from, step.to)
      : step.op === 'duplicate' ? await duplicateCurrentPreset(client, list, step.from, step.to)
      : await deleteCurrentPreset(client, list, step.at);
    if (r.presets.length) list = r.presets;
    current = r.current;
    if (!r.ok) return fail(r.error ?? 'The saber did not confirm the change.', n);
  }
  const end = await confirmList(client, expected, 'restore');
  if (end.presets.length) list = end.presets;
  if (!end.ok) return { ...end, presets: list, done: steps.length, error: end.presets.length ? 'After the restore the saber\'s list does not match the snapshot. The page shows what it has now.' : end.error };
  return { ...end, done: steps.length };
}
