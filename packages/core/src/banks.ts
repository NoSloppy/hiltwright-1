// Preset banks: lists of presets built without a saber, then loaded onto one.
//
// A preset on the saber names a font, a track and a compiled style per blade slot. A bank keeps the same things, but
// by blade role (main, crystal, accent ...) rather than slot number, so one bank fits any saber: loading it maps each
// role onto that saber's blades. Loading replaces the saber's presets with the bank's at the next install.

import type { BladeRole, SaberConfigModel } from './config/generate';
import { STARTER_LOOKS, starterLookFor, type FirmwareManifest, type LookDef } from './looks';
import { parseStyleArgs } from './looks';
import { parseBuiltin, type PresetRecord } from './protocol/presets';

export interface BankPreset {
  name: string;
  /** As the saber stores it: `folder` or `folder;common`. */
  font: string;
  track: string;
  /** Look id per blade role; a role left out gets the saber's default look for it. */
  looks: Partial<Record<BladeRole, string>>;
  /** Colour and timing arguments per role, the words a preset carries (`formatStyleArgs`). */
  lookArgs?: Partial<Record<BladeRole, string>>;
}

export interface PresetBank {
  id: string;
  name: string;
  presets: BankPreset[];
  /** ISO time of the last change. */
  updated: string;
}

export function isBank(v: unknown): v is PresetBank {
  const b = v as PresetBank;
  return !!b && typeof b.id === 'string' && typeof b.name === 'string' && Array.isArray(b.presets) && b.presets.every((p) => p && typeof p.name === 'string' && typeof p.font === 'string' && typeof p.track === 'string' && !!p.looks && typeof p.looks === 'object');
}

export const newBank = (name = 'New bank'): PresetBank => ({ id: `bank_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name, presets: [], updated: new Date().toISOString() });
export const newBankPreset = (name = 'New preset'): BankPreset => ({ name, font: 'common', track: '', looks: {} });

/** What a preset with no name, or no font, gets when a set is loaded. */
const nameInstead = (i: number) => `Preset ${i + 1}`;
const FONT_INSTEAD = 'common';

/** The styles a set can use on this saber: the starters, those the saber's model carries, and the style library's. */
function styleIndex(model: Pick<SaberConfigModel, 'looks'>, allLooks: readonly LookDef[]): Map<string, LookDef> {
  const out = new Map<string, LookDef>();
  for (const l of [...STARTER_LOOKS, ...(model.looks ?? []), ...allLooks]) if (!out.has(l.id)) out.set(l.id, l);
  return out;
}

/**
 * The saber's model with the bank's presets in place of its own. Each role maps onto every blade of that role; looks
 * the model does not carry yet are added from `allLooks`. `presetsFrom` marks the model so the draft keeps these
 * presets rather than re-reading the saber's, and so the install knows to clear the saber's presets.ini.
 * Never throws on a set that no longer fits (HW-2026-09-24d): a style missing from the library gives that blade the
 * saber's default style (and drops its colours, which belonged to the missing style), a preset without a name or a
 * font gets one. `bankLoadCheck` says each of these before the set is loaded.
 */
export function bankToModel(bank: PresetBank, model: SaberConfigModel, allLooks: readonly LookDef[]): SaberConfigModel {
  const looks = [...(model.looks ?? [])];
  const carried = new Set([...STARTER_LOOKS.map((l) => l.id), ...looks.map((l) => l.id)]);
  const index = styleIndex(model, allLooks);
  const presets = bank.presets.map((p, i) => {
    const chosen = model.blades.map((b) => p.looks?.[b.role] ?? null);
    const row = chosen.map((id) => (id && index.has(id) ? id : null));
    const argRow = model.blades.map((b, k) => (chosen[k] && !row[k] ? null : p.lookArgs?.[b.role] ?? null));
    for (const id of row) {
      if (!id || carried.has(id)) continue;
      looks.push(index.get(id)!);
      carried.add(id);
    }
    return { font: p.font.trim() ? p.font : FONT_INSTEAD, track: p.track, name: p.name.trim() ? p.name : nameInstead(i), ...(row.some(Boolean) ? { looks: row } : {}), ...(argRow.some(Boolean) ? { lookArgs: argRow } : {}) };
  });
  return { ...model, looks, presets, presetsFrom: { bank: bank.id, name: bank.name, at: new Date().toISOString() } };
}

/**
 * A bank made from a saber's presets as last read, with the looks its firmware manifest knows in each slot. On vendor
 * firmware the looks are unknown and only names, fonts and tracks carry over.
 */
export function bankFromSaber(name: string, presets: readonly PresetRecord[], blades: readonly { role: BladeRole }[], firmware: FirmwareManifest | null | undefined): PresetBank {
  const bank = newBank(name);
  bank.presets = presets.map((p, pi) => {
    const looks: BankPreset['looks'] = {}; const args: NonNullable<BankPreset['lookArgs']> = {};
    blades.forEach((b, k) => {
      if (looks[b.role]) return; // the first blade of a role speaks for it
      const id = firmware?.presets[pi]?.looks[k];
      if (id) looks[b.role] = id;
      const style = p.styles[k];
      const parsed = style ? parseBuiltin(style) : null;
      if (parsed?.args && parseStyleArgs(parsed.args).size) args[b.role] = parsed.args;
    });
    return { name: p.name, font: p.font, track: p.track, looks, ...(Object.keys(args).length ? { lookArgs: args } : {}) };
  });
  return bank;
}

/**
 * Problems a bank has on a saber with these blades, each saying what the affected preset gets instead (what
 * `bankToModel` does about it). `carried`: styles the saber's model already carries, which a set may name too.
 */
export function bankProblems(bank: PresetBank, blades: readonly { role: BladeRole }[], allLooks: readonly LookDef[], carried: readonly LookDef[] = []): string[] {
  const out: string[] = [];
  if (!bank.presets.length) out.push('The set has no presets, so there is nothing to load.');
  const roles = new Set(blades.map((b) => b.role));
  const index = styleIndex({ looks: [...carried] }, allLooks);
  bank.presets.forEach((p, i) => {
    const who = p.name.trim() ? `"${p.name.replace(/\s*\n\s*/g, ' ')}"` : `Preset ${i + 1}`;
    if (!p.name.trim()) out.push(`Preset ${i + 1} has no name, so it is named "${nameInstead(i)}".`);
    if (!p.font.trim()) out.push(`${who} has no font, so it gets the "${FONT_INSTEAD}" folder as its font.`);
    for (const [role, id] of Object.entries(p.looks ?? {})) {
      if (!id) continue;
      if (!roles.has(role as BladeRole)) { out.push(`${who} sets a style for a ${role} blade, which this saber does not have, so that style is left out.`); continue; }
      if (!index.has(id)) out.push(`${who}, ${role} blade: its style "${id}" is not in the style library any more, so it gets the saber's default style for that blade (${starterLookFor(role as BladeRole).name}) instead${p.lookArgs?.[role as BladeRole] ? ', and the colours chosen for the missing style are left out' : ''}.`);
    }
  });
  return out;
}

export interface BankLoadCheck {
  /** Loading is possible: the set has presets. */
  canLoad: boolean;
  /** The set's problems, each with what the affected preset gets instead. */
  problems: string[];
  /** Said when loading replaces staged edits that are not on the saber yet (F35); null when nothing is staged. */
  replacesStaged: string | null;
  /** Ask before loading: there are problems to read, or staged edits would be replaced. */
  needsConfirm: boolean;
}

/** What loading `bank` onto this saber's model would do, worked out before anything changes. */
export function bankLoadCheck(bank: PresetBank, model: SaberConfigModel, allLooks: readonly LookDef[]): BankLoadCheck {
  const problems = bankProblems(bank, model.blades, allLooks, model.looks ?? []);
  const canLoad = bank.presets.length > 0;
  const n = model.presets.length;
  const replacesStaged = model.presetsFrom ? `Loading it replaces the ${n} preset${n === 1 ? '' : 's'} staged here (${model.presetsFrom.name}), which are not on the saber yet.` : null;
  return { canLoad, problems, replacesStaged, needsConfirm: !canLoad || problems.length > 0 || replacesStaged !== null };
}
