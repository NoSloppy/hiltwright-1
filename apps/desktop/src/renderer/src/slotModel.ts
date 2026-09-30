// Which look goes in which preset slot: pure functions over the build model, kept apart from anything that
// touches the board or the window so they can be tested under node.

import { STARTER_LOOKS, lookFingerprint, type LookDef, type SaberConfigModel } from '@hiltwright/core';
import type { SaberRecord } from '../../shared/api';

/**
 * The one rule for what a preset slot holds (preset-editor-fixes D1, shared with style-to-saber-fixes): the owner's
 * latest choice for preset `preset` (0-based), blade `blade` (1-based), whether it was written to the saber live or
 * queued for the next build. `look` null means no style chosen. `args` are the colours and timings still to be written
 * to the saber after an install; a choice already written live has none left to write, so pass null.
 */
export function withSlotChoice(model: SaberConfigModel, preset: number, blade: number, look: LookDef | null, args: string | null): SaberConfigModel {
  const looks = !look || look.source === 'starter' || (model.looks ?? []).some((l) => l.id === look.id) ? model.looks ?? [] : [...(model.looks ?? []), look];
  return {
    ...model,
    looks,
    presets: model.presets.map((p, i) => {
      if (i !== preset) return p;
      const row = model.blades.map((_b, k) => p.looks?.[k] ?? null);
      row[blade - 1] = look?.id ?? null;
      const argRow = model.blades.map((_b, k) => p.lookArgs?.[k] ?? null);
      argRow[blade - 1] = look ? args : null;
      const { looks: _l, lookArgs: _a, ...rest } = p;
      return { ...rest, ...(row.some(Boolean) ? { looks: row } : {}), ...(argRow.some(Boolean) ? { lookArgs: argRow } : {}) };
    }),
  };
}

/**
 * A copy of the model with `look` compiled into preset `preset` (0-based), blade `blade` (1-based). `args` are the
 * colours and timings chosen with it, kept until they can be written to the saber after the install.
 */
export function withLookInSlot(model: SaberConfigModel, look: LookDef, preset: number, blade: number, args: string | null = null): SaberConfigModel {
  return withSlotChoice(model, preset, blade, look, args);
}

/**
 * Whether the installed firmware has this version of a look: it lists the id, and either recorded no fingerprint
 * (firmware from before fingerprints, taken as having the version it names) or the fingerprint of `current`.
 */
export function installedVersion(firmware: SaberRecord['firmware'], id: string, current: LookDef | undefined): boolean {
  const had = firmware?.looks.find((l) => l.id === id);
  if (!had) return false;
  return !had.hash || !current || had.hash === lookFingerprint(current);
}

/** Ids of looks whose installed version is `current`'s, for the Styles page's "On the saber". */
export function installedLookIds(firmware: SaberRecord['firmware'], current: (id: string) => LookDef | undefined): Set<string> {
  return new Set((firmware?.looks ?? []).map((l) => l.id).filter((id) => installedVersion(firmware, id, current(id))));
}

/**
 * Look ids the model will compile that the installed firmware does not have yet, or has an older version of (its
 * fingerprint differs from the plan's copy, or the starter's).
 */
export function queuedLookIds(model: SaberConfigModel | undefined, firmware: SaberRecord['firmware']): string[] {
  if (!model) return [];
  const wanted = new Set<string>();
  for (const p of model.presets) for (const id of p.looks ?? []) if (id) wanted.add(id);
  const copy = (id: string) => (model.looks ?? []).find((l) => l.id === id) ?? STARTER_LOOKS.find((l) => l.id === id);
  return [...wanted].filter((id) => !installedVersion(firmware, id, copy(id)));
}
