// Staged presets after an install (safe-staged-install design D3, D4).
import { beforeAll, describe, expect, it } from 'vitest';
import type { FirmwareManifest, ModelBlade, SaberConfigModel } from '@hiltwright/core';
import { waitingColours } from '../src/renderer/src/pendingColours';

let firmwareHasStaged: typeof import('../src/renderer/src/saberModel').firmwareHasStaged;
beforeAll(async () => {
  (globalThis as unknown as { window: unknown }).window = { hiltwright: { appVersion: 'test' } };
  ({ firmwareHasStaged } = await import('../src/renderer/src/saberModel'));
});

const main: ModelBlade = { id: 'b1', role: 'main', type: 'pixel', pixels: 132, order: 'GRB', extra: [], leds: [], parallel: 1, wiring: { kind: 'own', dataPin: 'bladePin', powerPins: ['bladePowerPin2'] } };
const model: SaberConfigModel = {
  name: 'hiltwright_hote2', board: 'V2', boardFrom: 'owner', buttons: 2, prop: 'fett263', blades: [main],
  presets: [{ font: 'Mara;common', track: '', name: 'Mara Jade', looks: ['hw_fire'], lookArgs: ['255,0,0'] }, { font: 'Valkyrie;common', track: '', name: 'Valkyrie' }],
};
const staged = { ...model, presetsFrom: { name: 'Set A', at: '2026-09-27T10:00:00.000Z' } };
const firmware = (names: string[]): FirmwareManifest => ({ hash: 'h', os: 'v8.10', at: '', looks: [{ id: 'hw_fire', name: 'Fire', args: [] }], presets: names.map((name) => ({ name, looks: ['hw_fire'] })) });

describe('the firmware carries the staged presets', () => {
  it('the same names in the same order', () => {
    expect(firmwareHasStaged(staged, firmware(['Mara Jade', 'Valkyrie']))).toBe(true);
  });

  it('other names, another order, no firmware record, or nothing staged: no', () => {
    expect(firmwareHasStaged(staged, firmware(['Valkyrie', 'Mara Jade']))).toBe(false);
    expect(firmwareHasStaged(staged, firmware(['Mara Jade']))).toBe(false);
    expect(firmwareHasStaged(staged, undefined)).toBe(false);
    expect(firmwareHasStaged(model, firmware(['Mara Jade', 'Valkyrie']))).toBe(false);
  });
});

describe('colours wait for the staged presets', () => {
  it('none while the presets are staged', () => {
    expect(waitingColours(staged, firmware(['Mara Jade', 'Valkyrie']))).toEqual([]);
  });

  it('once settled, the colours for slots whose firmware has the style', () => {
    expect(waitingColours(model, firmware(['Mara Jade', 'Valkyrie']))).toEqual([{ i: 0, k: 0, args: '255,0,0', name: 'Mara Jade' }]);
  });
});
