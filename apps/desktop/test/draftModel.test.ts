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
