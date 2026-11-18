// What restoring a snapshot changes, and where (preset-history-restore, F33).
//
// A snapshot is the saber's whole preset list as it was before a change. Presets carry no identity of their own on the
// saber, so which preset in the snapshot is which preset now is worked out from the two lists: the saber's list is
// explained as the snapshot's with at most one move, one added or one missing preset, plus some presets whose values
// differ, choosing the explanation with the fewest changed fields. Two consequences:
// - Restoring the whole list is always possible and always correct: the steps end with the snapshot's list exactly,
//   and the saber's list is read back and compared with it.
// - Restoring one preset is offered only when exactly one preset's values differ and every equally good explanation
//   agrees which preset that is. Otherwise the owner is told why, and offered the whole list.

import type { PresetRecord } from './presets';
import { diffPreset, isEmptyPatch, listAfterStep, sameValues, type PresetPatch, type RestoreStep } from './session';

/** How the saber's list came from the snapshot's: positions in the snapshot (`from`, `at` for `removed`) and now. */
type Shape =
  | { kind: 'same-order' }
  | { kind: 'moved'; from: number; to: number }
  | { kind: 'added'; at: number }
  | { kind: 'removed'; at: number };

interface Explanation {
  shape: Shape;
  /** [index now, index in the snapshot] for every preset found in both. */
  pairs: [number, number][];
  /** The pairs whose values differ. */
  differ: [number, number][];
  cost: number;
}

function explain(shape: Shape, snapshot: PresetRecord[], current: PresetRecord[]): Explanation {
  const pairs: [number, number][] = [];
  if (shape.kind === 'same-order') current.forEach((_p, i) => pairs.push([i, i]));
  else if (shape.kind === 'added') current.forEach((_p, i) => { if (i !== shape.at) pairs.push([i, i < shape.at ? i : i - 1]); });
  else if (shape.kind === 'removed') snapshot.forEach((_p, j) => { if (j !== shape.at) pairs.push([j < shape.at ? j : j - 1, j]); });
  else {
    // Moved: the snapshot without `from` and the list without `to` line up in order; `to` is `from`, moved.
    const rest = (n: number, skip: number) => Array.from({ length: n }, (_x, i) => i).filter((i) => i !== skip);
    const now = rest(current.length, shape.to);
    const then = rest(snapshot.length, shape.from);
    now.forEach((i, k) => pairs.push([i, then[k]]));
    pairs.push([shape.to, shape.from]);
  }
  // Differ: a write would change something. (Values a preset write cannot set, such as extra styles, are not counted.)
  const differ = pairs.filter(([i, j]) => !sameValues(current[i], snapshot[j]) && !isEmptyPatch(diffPreset(current[i], snapshot[j])));
  // Each field a write would change counts one, as does the move, the added or the missing preset: a preset that
  // differs only in its font is more likely the same preset edited than a different one in its place.
  const fields = differ.reduce((n, [i, j]) => n + fieldCount(diffPreset(current[i], snapshot[j])), 0);
  return { shape, pairs, differ, cost: fields + (shape.kind === 'same-order' ? 0 : 1) };
}

function fieldCount(p: PresetPatch): number {
  return (p.name !== undefined ? 1 : 0) + (p.font !== undefined ? 1 : 0) + (p.track !== undefined ? 1 : 0) + (p.styles ? 1 : 0);
}

/** Every explanation of the saber's list from the snapshot's with at most one structural change. */
function explanations(snapshot: PresetRecord[], current: PresetRecord[]): Explanation[] {
  const out: Explanation[] = [];
  if (current.length === snapshot.length) {
    out.push(explain({ kind: 'same-order' }, snapshot, current));
    for (let from = 0; from < snapshot.length; from++) for (let to = 0; to < current.length; to++) if (from !== to) out.push(explain({ kind: 'moved', from, to }, snapshot, current));
  } else if (current.length === snapshot.length + 1) {
    for (let at = 0; at < current.length; at++) out.push(explain({ kind: 'added', at }, snapshot, current));
  } else if (current.length === snapshot.length - 1) {
    for (let at = 0; at < snapshot.length; at++) out.push(explain({ kind: 'removed', at }, snapshot, current));
  }
  return out;
}

export interface SingleRestore {
  /** The preset to write, by its position now (0-based). */
  at: number;
  /** Where it is in the snapshot (0-based). */
  snapshotAt: number;
  /** Its name now, for what the page says. */
  name: string;
  patch: PresetPatch;
  /** The one step, and the saber's list once it is made: every other preset as it is now. */
  step: RestoreStep;
  expected: PresetRecord[];
}

export interface RestorePlan {
  /** The saber's list already matches the snapshot: nothing to write. */
  same: boolean;
  /** One preset put back on its own, when that is certain. */
  single: SingleRestore | null;
  /** Why one preset cannot be put back on its own (null when it can, or when nothing differs). */
  singleRefused: string | null;
  /** The steps that make the saber's list the snapshot's, in order. Empty when it already is, or when refused. */
  steps: RestoreStep[];
  /** One plain line per step, for the owner to read before restoring. */
  changes: string[];
  /** Why the whole list cannot be restored (null when it can). */
  wholeRefused: string | null;
  /** The list once the whole-list restore is made: the snapshot's. */
  expected: PresetRecord[];
}

const label = (p: PresetRecord | undefined) => `"${(p?.name ?? '').replace(/\s*\n\s*/g, ' ') || 'Unnamed'}"`;

/** The fields a patch sets, in plain words. */
export function patchWords(patch: PresetPatch): string {
  const parts: string[] = [];
  if (patch.name !== undefined) parts.push(`name to ${label({ name: patch.name } as PresetRecord)}`);
  if (patch.font !== undefined) parts.push(`font to "${patch.font}"`);
  if (patch.track !== undefined) parts.push(patch.track ? `track to "${patch.track}"` : 'no track');
  const blades = Object.keys(patch.styles ?? {}).map(Number).sort((a, b) => a - b);
  if (blades.length) parts.push(`the style on blade${blades.length > 1 ? 's' : ''} ${blades.join(', ')}`);
  return parts.join(', ');
}

/** One line for a step, on the list as it stands when the step's turn comes. */
function stepWords(list: PresetRecord[], step: RestoreStep): string {
  switch (step.op) {
    case 'move': return `Move ${label(list[step.from])} from position ${step.from + 1} to position ${step.to + 1}.`;
    case 'duplicate': return `Add a preset at position ${step.to + 1}, copied from ${label(list[step.from])}.`;
    case 'delete': return `Delete ${label(list[step.at])} at position ${step.at + 1}: it is not in the snapshot.`;
    case 'edit': return `Preset ${step.at + 1}, ${label(list[step.at])}: set ${patchWords(step.patch)}.`;
  }
}

/** Steps that turn `start` into `snapshot` once its length and order are right: one edit per position that differs. */
function edits(start: PresetRecord[], snapshot: PresetRecord[]): RestoreStep[] {
  const out: RestoreStep[] = [];
  snapshot.forEach((want, i) => {
    const patch = diffPreset(start[i], want);
    if (!isEmptyPatch(patch)) out.push({ op: 'edit', at: i, patch });
  });
  return out;
}

function structural(shape: Shape | null, snapshot: PresetRecord[], current: PresetRecord[]): RestoreStep[] {
  const out: RestoreStep[] = [];
  if (!shape) {
    // Too different to line up: make the lengths match at the end of the list, then set each position's values.
    let n = current.length;
    while (n > snapshot.length) { out.push({ op: 'delete', at: n - 1 }); n--; }
    while (n < snapshot.length) { out.push({ op: 'duplicate', from: n - 1, to: n }); n++; }
    return out;
  }
  if (shape.kind === 'moved') out.push({ op: 'move', from: shape.to, to: shape.from });
  if (shape.kind === 'added') out.push({ op: 'delete', at: shape.at });
  // Brought back as a copy of its neighbour, placed after it as Duplicate does, then given the snapshot's values.
  if (shape.kind === 'removed') out.push(shape.at > 0 ? { op: 'duplicate', from: shape.at - 1, to: shape.at } : { op: 'duplicate', from: 0, to: 1 });
  return out;
}

/**
 * What restoring `snapshot` onto the saber's list `current` changes, and where. Pure: the page shows it before
 * anything is sent, and the board works it out again from the list as it is when the restore's turn comes.
 */
export function planRestore(snapshot: PresetRecord[], current: PresetRecord[]): RestorePlan {
  const base = { single: null, singleRefused: null, steps: [], changes: [], wholeRefused: null, expected: snapshot };
  if (!snapshot.length) return { ...base, same: false, singleRefused: 'This snapshot has no presets in it.', wholeRefused: 'This snapshot has no presets in it.' };
  if (!current.length) return { ...base, same: false, singleRefused: 'The saber reports no presets.', wholeRefused: 'The saber reports no presets to restore onto.' };
  const all = explanations(snapshot, current);
  const least = all.length ? Math.min(...all.map((e) => e.cost)) : Infinity;
  const best = all.filter((e) => e.cost === least);
  if (best.length && least === 0) return { ...base, same: true };

  // The whole list: any best explanation ends in the snapshot's list; with none, position by position.
  const chosen = best[0] ?? null;
  const moves = structural(chosen?.shape ?? null, snapshot, current);
  let list = current;
  const steps: RestoreStep[] = [];
  const changes: string[] = [];
  for (const s of moves) { changes.push(stepWords(list, s)); list = listAfterStep(list, s); steps.push(s); }
  for (const s of edits(list, snapshot)) { changes.push(stepWords(list, s)); list = listAfterStep(list, s); steps.push(s); }

  // One preset on its own: only when every best explanation names the same preset and the same values.
  let single: SingleRestore | null = null;
  let singleRefused: string | null = null;
  if (!best.length) singleRefused = `The saber's list (${current.length} presets) is too different from this snapshot's (${snapshot.length}) to tell which preset is which, so only the whole list can be restored.`;
  else {
    const singles = best.map((e) => {
      if (e.differ.length !== 1) return null;
      const [at, snapshotAt] = e.differ[0];
      const patch = diffPreset(current[at], snapshot[snapshotAt]);
      const step: RestoreStep = { op: 'edit', at, patch };
      return { at, snapshotAt, name: current[at].name, patch, step, expected: listAfterStep(current, step) };
    });
    const key = (s: SingleRestore | null) => (s ? JSON.stringify([s.at, s.patch]) : 'none');
    const agreed = singles.every((s) => key(s) === key(singles[0]));
    if (!agreed) singleRefused = 'It is not certain which preset this snapshot\'s values belong to, so restore the whole list instead.';
    else if (singles[0]) single = singles[0];
    else if (chosen && chosen.differ.length > 1) singleRefused = `${chosen.differ.length} presets differ from this snapshot, so restore the whole list to put them all back.`;
    else singleRefused = 'No preset\'s values differ from this snapshot: only the order or the number of presets does. Restore the whole list to put that back.';
  }
  return { same: false, single, singleRefused, steps, changes, wholeRefused: null, expected: snapshot };
}

/** What a single-preset restore says it will change. */
export function singleWords(s: SingleRestore): string {
  return `Preset ${s.at + 1}, ${label({ name: s.name } as PresetRecord)}: set ${patchWords(s.patch)}. Nothing else changes.`;
}
