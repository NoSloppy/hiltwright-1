// The build model for a saber: wiring, prop, and which look goes in each preset slot. Drafted from what the
// board reports, refined by the owner on Build & Install, and stored on the saber record.

import { boardHint, type BladeVariant, type BoardModel, type LookDef, type ModelBlade, type Prop, type SaberConfigModel } from '@hiltwright/core';
import type { SaberRecord } from '../../shared/api';
import type { BoardInfo } from './board';

export const DATA_PINS = ['bladePin', 'blade2Pin', 'blade3Pin', 'blade4Pin'];
export const POWER_PINS = ['bladePowerPin1', 'bladePowerPin2', 'bladePowerPin3', 'bladePowerPin4', 'bladePowerPin5', 'bladePowerPin6'];

/** First guess at wiring from what the board reported. Every pin here is a guess the owner must confirm. */
export function guessBlades(pixelBlades: number[]): ModelBlade[] {
  return pixelBlades.map((px, i) => ({
    id: `b${i + 1}`,
    role: i === 0 ? 'main' : px <= 8 ? (i === 1 ? 'crystal' : 'accent') : 'side',
    type: 'pixel', pixels: px, order: 'GRB', extra: [], leds: [], parallel: 1,
    wiring: { kind: 'own', dataPin: DATA_PINS[Math.min(i, 3)], powerPins: i === 0 ? ['bladePowerPin2', 'bladePowerPin3'] : [POWER_PINS[Math.min(3 + i, 5)]] },
  }));
}

/** What is known about a saber from its library record alone, shaped like a live board reading. */
export function infoFromRecord(rec: SaberRecord): BoardInfo {
  return {
    version: { version: rec.identity.version ?? '', config: rec.identity.configName, prop: rec.identity.prop, buttons: rec.identity.buttons, installed: rec.identity.installed, major: null },
    battery: null, volume: null, currentPreset: null, presets: rec.presets, fonts: rec.fonts, tracks: rec.tracks,
    pixelBlades: rec.identity.pixelBlades, bladeConfig: rec.identity.bladeConfig, rejected: [], timings: {},
  };
}

export function configNameFor(saber: SaberRecord): string {
  return `hiltwright_${saber.name.toLowerCase().replace(/^hiltwright[_ ]+/, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'saber'}`;
}

/**
 * Which board the saber has, and how that is known (install-target-safety D2). The running firmware never says, so:
 * the flash size its bootloader showed at an install; else the firmware Hiltwright installed, when the saved wiring
 * names the same board; else the owner's own choice. Otherwise nobody knows, and the board is only a placeholder.
 */
export function knownBoard(saber: SaberRecord): { board: BoardModel; from: NonNullable<SaberConfigModel['boardFrom']> } | null {
  const saved = saber.model;
  if (saber.bootloader) return { board: saber.bootloader.board, from: 'bootloader' };
  const built = saber.firmware?.wiring?.board;
  if (built && (!saved || saved.board === built)) return { board: built, from: 'firmware' };
  if (saved?.boardFrom === 'owner') return { board: saved.board, from: 'owner' };
  return null;
}

/** The saved wiring names a different board from the one the saber's bootloader showed: the page says it was corrected. */
export function boardCorrection(saber: SaberRecord): { saved: BoardModel; actual: BoardModel } | null {
  const saved = saber.model?.board;
  const actual = saber.bootloader?.board;
  return saved && actual && saved !== actual ? { saved, actual } : null;
}

/** A board the saber's config name mentions, offered while the board is not known; never chosen by itself. */
export function boardSuggestion(saber: SaberRecord): BoardModel | null {
  return knownBoard(saber) ? null : boardHint(saber.identity.configName);
}

/**
 * The model to build now: the saved one where it exists (wiring, prop, looks), always with the presets the board
 * currently has. Slot looks are carried over by preset name, so reordering or renaming on the saber does not lose
 * a chosen look.
 */
export function draftModel(info: BoardInfo, saber: SaberRecord, overrides: { blades?: ModelBlade[]; prop?: Prop; variants?: BladeVariant[] } = {}): SaberConfigModel {
  const saved = saber.model;
  const known = knownBoard(saber);
  const blades = overrides.blades ?? saved?.blades ?? guessBlades(info.pixelBlades.length ? info.pixelBlades : [132]);
  const byName = new Map((saved?.presets ?? []).map((p) => [p.name, p.looks ?? []]));
  const argsByName = new Map((saved?.presets ?? []).map((p) => [p.name, p.lookArgs ?? []]));
  return {
    name: saved?.name ?? configNameFor(saber),
    // Not known: V2 only keeps the pin lists showing; without `boardFrom` nothing is built until the owner chooses.
    board: known?.board ?? saved?.board ?? 'V2',
    ...(known ? { boardFrom: known.from } : {}),
    buttons: saved?.buttons ?? ((info.version?.buttons === 1 || info.version?.buttons === 3 ? info.version.buttons : 2) as 1 | 2 | 3),
    prop: overrides.prop ?? saved?.prop ?? 'fett263',
    blades,
    // Presets loaded from a bank stay as loaded until they have been installed; otherwise the saber's own are the truth.
    presets: saved?.presetsFrom ? saved.presets.map((p) => ({ ...p, ...(p.looks ? { looks: blades.map((_b, k) => p.looks?.[k] ?? null) } : {}), ...(p.lookArgs ? { lookArgs: blades.map((_b, k) => p.lookArgs?.[k] ?? null) } : {}) })) : info.presets.map((p, i) => {
      const looks = byName.get(p.name) ?? saved?.presets[i]?.looks ?? [];
      const lookArgs = argsByName.get(p.name) ?? saved?.presets[i]?.lookArgs ?? [];
      return { font: p.font, track: p.track, name: p.name, ...(looks.some(Boolean) ? { looks: blades.map((_b, k) => looks[k] ?? null) } : {}), ...(lookArgs.some(Boolean) ? { lookArgs: blades.map((_b, k) => lookArgs[k] ?? null) } : {}) };
    }),
    looks: saved?.looks ?? [],
    ...(saved?.presetsFrom ? { presetsFrom: saved.presetsFrom } : {}),
    // The owner's wiring confirmation travels with the model; it only counts while the layout matches (see wiringConfirmed).
    ...(saved?.wiringConfirmation ? { wiringConfirmation: saved.wiringConfirmation } : {}),
    ...((overrides.variants ?? saved?.bladeId?.variants ?? []).length ? { bladeId: { variants: overrides.variants ?? saved!.bladeId!.variants } } : {}),
    generator: `hiltwright ${window.hiltwright.appVersion}`,
  };
}

/**
 * The saber's installed firmware carries the staged presets: the same names, in the same order. Then they can be put
 * on the saber without another install ("Use the staged presets", safe-staged-install D3).
 */
export function firmwareHasStaged(model: SaberConfigModel | null | undefined, firmware: SaberRecord['firmware']): boolean {
  if (!model?.presetsFrom || !firmware) return false;
  return firmware.presets.length === model.presets.length && firmware.presets.every((p, i) => p.name === model.presets[i].name);
}

export { queuedLookIds, withLookInSlot } from './slotModel';
