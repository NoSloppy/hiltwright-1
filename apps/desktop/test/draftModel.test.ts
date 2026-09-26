import { beforeAll, describe, expect, it } from 'vitest';
import { wiringConfirmed, withWiringConfirmation, type ModelBlade, type SaberConfigModel } from '@hiltwright/core';
import type { SaberRecord } from '../src/shared/api';

// draftModel stamps the app version from the preload bridge; stand it in before the module loads.
let draftModel: typeof import('../src/renderer/src/saberModel').draftModel;
let infoFromRecord: typeof import('../src/renderer/src/saberModel').infoFromRecord;
beforeAll(async () => {
  (globalThis as unknown as { window: unknown }).window = { hiltwright: { appVersion: 'test' } };
  ({ draftModel, infoFromRecord } = await import('../src/renderer/src/saberModel'));
});

const main: ModelBlade = { id: 'b1', role: 'main', type: 'pixel', pixels: 132, order: 'GRB', extra: [], leds: [], parallel: 1, wiring: { kind: 'own', dataPin: 'bladePin', powerPins: ['bladePowerPin2', 'bladePowerPin3'] } };
const saved: SaberConfigModel = { name: 'hiltwright_kylo', board: 'V2', buttons: 2, prop: 'fett263', blades: [main], presets: [{ font: 'common', track: '', name: 'Preset 1' }], looks: [] };

function plan(model: SaberConfigModel): SaberRecord {
  return { id: 'p1', name: 'Kylo build', planned: true, identity: {}, presets: [], fonts: [], tracks: [], model, lastSeen: null } as unknown as SaberRecord;
}

describe('the working model', () => {
  it('keeps the wiring confirmation of a saber that has never been installed (FW1)', () => {
    const rec = plan(withWiringConfirmation(saved, true));
    const m = draftModel(infoFromRecord(rec), rec);
    expect(m.wiringConfirmation).toEqual(rec.model!.wiringConfirmation);
    expect(wiringConfirmed(m)).toBe(true);
  });

  it('shows no confirmation when none was given, or only the old timestamp', () => {
    expect(wiringConfirmed(draftModel(infoFromRecord(plan(saved)), plan(saved)))).toBe(false);
    const legacy = plan({ ...saved, wiringConfirmedAt: '2026-09-22T10:00:00.000Z' });
    expect(wiringConfirmed(draftModel(infoFromRecord(legacy), legacy))).toBe(false);
  });
});

// Baseline audit (baseline-board 1.15, 6.16) and the defects found while writing these tests (BST-2, BST-3).
const board = (name: string, font = 'common') => ({ font, track: '', styles: ['builtin 0 1'], name, variation: 0 });
function connected(presets: ReturnType<typeof board>[], model?: SaberConfigModel, identity: Partial<SaberRecord['identity']> = {}): SaberRecord {
  return {
    id: 's1', name: 'hote2', firstSeen: '', lastSeen: '', fonts: [], tracks: [], presets, ...(model ? { model } : {}),
    identity: { usbSerial: '1', configName: 'config/hiltwright_hote2.h', version: 'v8.10 hiltwright ce12a06', prop: 'SaberFett263Buttons', buttons: 2, installed: 'x', pixelBlades: [132, 1, 2], bladeConfig: 0, ...identity },
  };
}
const withLooks = (names: [string, string | null][]): SaberConfigModel => ({ ...saved, presets: names.map(([name, look]) => ({ font: 'common', track: '', name, ...(look ? { looks: [look] } : {}) })) });
const looksOf = (m: SaberConfigModel) => m.presets.map((p) => p.looks?.[0] ?? null);

describe('drafts from what the saber reports', () => {
  it("1.15 first visit to a remembered saber: one blade per reported pixel count, and the saber's presets", () => {
    const rec = connected([board('Mara Jade', 'Mara;common'), board('Valkyrie', 'Valkyrie;common')]);
    const m = draftModel(infoFromRecord(rec), rec);
    expect(m.blades.map((b) => [b.role, b.type, b.pixels])).toEqual([['main', 'pixel', 132], ['crystal', 'pixel', 1], ['accent', 'pixel', 2]]);
    expect(m.presets).toEqual([{ font: 'Mara;common', track: '', name: 'Mara Jade' }, { font: 'Valkyrie;common', track: '', name: 'Valkyrie' }]);
    expect(m.name).toBe('hiltwright_hote2');
    expect(m.looks).toEqual([]);
    expect(m.generator).toBe('hiltwright test');
  });

  it('6.16 presets reordered on the saber keep the styles chosen for them', () => {
    const rec = connected([board('B'), board('C'), board('A')], withLooks([['A', 'look_a'], ['B', 'look_b'], ['C', null]]));
    expect(looksOf(draftModel(infoFromRecord(rec), rec))).toEqual(['look_b', null, 'look_a']);
  });

  // Owner: preset-editor-fixes (BST-2). Looks are keyed by preset name, so equal names share the last one's looks.
  it.fails('presets with the same name, or no name, keep their own styles', () => {
    const rec = connected([board(''), board('')], withLooks([['', 'look_1'], ['', 'look_2']]));
    expect(looksOf(draftModel(infoFromRecord(rec), rec))).toEqual(['look_1', 'look_2']);
  });

  // Owner: preset-editor-fixes (BST-2). An unknown name falls back to whatever preset used to sit at that position.
  it.fails("a preset renamed and moved on the saber does not take its new position's styles", () => {
    const rec = connected([board('B'), board('A renamed')], withLooks([['A', 'look_a'], ['B', 'look_b']]));
    expect(looksOf(draftModel(infoFromRecord(rec), rec))).toEqual(['look_b', null]);
  });

  // Owner: install-target-safety, under FW3 (BST-3). The board is guessed from the ProffieOS version, never V3.
  it.fails('a new saber whose config names a V3 board is drafted for V3', () => {
    const rec = connected([board('A')], undefined, { configName: 'config/proffieboard_v3_config.h', version: 'v8.10' });
    expect(draftModel(infoFromRecord(rec), rec).board).toBe('V3');
  });
});

// Baseline audit (baseline-firmware hardware-wiring 1.4).
describe('hardware-wiring audit: the first guess', () => {
  it('1.4 a connected saber seen for the first time: one pixel blade per strip it reports', () => {
    const rec = connected([board('One')], undefined, { pixelBlades: [140, 2, 1] });
    const m = draftModel(infoFromRecord(rec), rec);
    expect(m.blades.map((b) => [b.type, b.pixels])).toEqual([['pixel', 140], ['pixel', 2], ['pixel', 1]]);
    expect(m.blades.map((b) => b.role)).toEqual(['main', 'crystal', 'accent']);
    expect(new Set(m.blades.map((b) => (b.wiring as { dataPin: string }).dataPin)).size).toBe(3);
  });
});
