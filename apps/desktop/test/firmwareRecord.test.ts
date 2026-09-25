import { describe, expect, it } from 'vitest';
import { generateConfig, type ModelBlade, type SaberConfigModel } from '@hiltwright/core';
import { cleanFirmware } from '../src/main/firmwareRecord';

const main: ModelBlade = { id: 'b1', role: 'main', type: 'pixel', pixels: 132, order: 'GRB', extra: [], leds: [], parallel: 1, wiring: { kind: 'own', dataPin: 'bladePin', powerPins: ['bladePowerPin2', 'bladePowerPin3'] } };
const model: SaberConfigModel = { name: 'hiltwright_test', board: 'V2', buttons: 2, prop: 'fett263', blades: [main], presets: [{ font: 'common', track: '', name: 'Preset 1' }] };
const record = () => ({ ...generateConfig(model).manifest, os: 'v8.10', at: '2026-09-24T10:00:00.000Z' });

describe('the firmware record a saber keeps', () => {
  it('keeps the board and blades the firmware was built for', () => {
    expect(cleanFirmware(record()).wiring).toEqual({ board: 'V2', blades: [main] });
  });

  it('still accepts a record from before the layout was kept', () => {
    const { wiring: _w, ...old } = record();
    expect(cleanFirmware(old).wiring).toBeUndefined();
  });

  it('refuses a layout that is malformed or too large', () => {
    expect(() => cleanFirmware({ ...record(), wiring: { board: 'V9', blades: [main] } })).toThrow();
    expect(() => cleanFirmware({ ...record(), wiring: { board: 'V2', blades: 'b1' } })).toThrow();
    expect(() => cleanFirmware({ ...record(), wiring: { board: 'V2', blades: [{ pixels: 3 }] } })).toThrow();
    expect(() => cleanFirmware({ ...record(), wiring: { board: 'V2', blades: Array.from({ length: 17 }, (_, i) => ({ ...main, id: `b${i}` })) } })).toThrow();
    expect(() => cleanFirmware({ ...record(), wiring: { board: 'V2', blades: [{ ...main, extra: ['x'.repeat(70000)] }] } })).toThrow(/too large/);
  });
});
