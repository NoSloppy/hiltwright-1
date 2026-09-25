import { describe, expect, it } from 'vitest';
import { wiringConfirmed, wiringFingerprint, withWiringConfirmation, type ModelBlade, type SaberConfigModel } from '../src';

const main: ModelBlade = { id: 'main', role: 'main', type: 'pixel', pixels: 132, order: 'GRB', extra: [], leds: [], parallel: 1, wiring: { kind: 'own', dataPin: 'bladePin', powerPins: ['bladePowerPin2', 'bladePowerPin3'] } };
const crystal: ModelBlade = { id: 'crystal', role: 'crystal', type: 'pixel', pixels: 2, order: 'GRB', extra: [], leds: [], parallel: 1, wiring: { kind: 'own', dataPin: 'blade2Pin', powerPins: ['bladePowerPin4'] } };
const saber: SaberConfigModel = { name: 'hiltwright_test', board: 'V2', buttons: 2, prop: 'fett263', blades: [main, crystal], presets: [{ font: 'common', track: '', name: 'Preset 1' }] };
const confirmed = withWiringConfirmation(saber, true, '2026-09-24T10:00:00.000Z');

describe('wiring confirmation', () => {
  it('counts for the layout it was given for', () => {
    expect(wiringConfirmed(saber)).toBe(false);
    expect(wiringConfirmed(confirmed)).toBe(true);
    expect(confirmed.wiringConfirmation).toEqual({ at: '2026-09-24T10:00:00.000Z', layout: wiringFingerprint('V2', [main, crystal]) });
  });

  it('is withdrawn by any change to a blade', () => {
    const pin = { ...crystal, wiring: { kind: 'own' as const, dataPin: 'blade3Pin', powerPins: ['bladePowerPin4'] } };
    expect(wiringConfirmed({ ...confirmed, blades: [main, pin] })).toBe(false);
    expect(wiringConfirmed({ ...confirmed, blades: [main, { ...crystal, pixels: 3 }] })).toBe(false);
    expect(wiringConfirmed({ ...confirmed, blades: [main, { ...crystal, type: 'simple' }] })).toBe(false);
    expect(wiringConfirmed({ ...confirmed, blades: [main] })).toBe(false);
  });

  it('is withdrawn by a change of board', () => {
    expect(wiringConfirmed({ ...confirmed, board: 'V3' })).toBe(false);
  });

  it('survives changes that cannot misroute power: prop, buttons, presets', () => {
    expect(wiringConfirmed({ ...confirmed, prop: 'sa22c', buttons: 1, presets: [] })).toBe(true);
  });

  it('does not depend on the order fields were written in', () => {
    const reordered = JSON.parse(JSON.stringify({ wiring: crystal.wiring, parallel: 1, leds: [], extra: [], order: 'GRB', pixels: 2, type: 'pixel', role: 'crystal', id: 'crystal' })) as ModelBlade;
    expect(wiringFingerprint('V2', [main, reordered])).toBe(wiringFingerprint('V2', [main, crystal]));
  });

  it('comes back when the layout is changed back', () => {
    const changed = { ...confirmed, blades: [main, { ...crystal, pixels: 3 }] };
    expect(wiringConfirmed(changed)).toBe(false);
    expect(wiringConfirmed({ ...changed, blades: [main, crystal] })).toBe(true);
  });

  it('can be turned off, and an old timestamp-only confirmation never counts', () => {
    const off = withWiringConfirmation(confirmed, false);
    expect(wiringConfirmed(off)).toBe(false);
    expect(off.wiringConfirmation).toBeUndefined();
    const legacy: SaberConfigModel = { ...saber, wiringConfirmedAt: '2026-09-22T10:00:00.000Z' };
    expect(wiringConfirmed(legacy)).toBe(false);
    expect(withWiringConfirmation(legacy, true).wiringConfirmedAt).toBeUndefined();
  });
});
