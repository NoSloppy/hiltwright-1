import { describe, expect, it } from 'vitest';
import { STARTER_LOOKS, generateConfig, type ModelBlade, type SaberConfigModel } from '@hiltwright/core';
import { queuedLookIds, withLookInSlot } from '../src/renderer/src/slotModel';
import type { SaberRecord } from '../src/shared/api';

const main: ModelBlade = { id: 'b1', role: 'main', type: 'pixel', pixels: 132, order: 'GRB', extra: [], leds: [], parallel: 1, wiring: { kind: 'own', dataPin: 'bladePin', powerPins: ['bladePowerPin2', 'bladePowerPin3'] } };
const crystal: ModelBlade = { id: 'b2', role: 'crystal', type: 'pixel', pixels: 2, order: 'GRB', extra: [], leds: [], parallel: 1, wiring: { kind: 'own', dataPin: 'blade2Pin', powerPins: ['bladePowerPin4'] } };
const model: SaberConfigModel = { name: 'hiltwright_test', board: 'V2', buttons: 2, prop: 'sa22c', blades: [main, crystal], presets: [{ font: 'A;common', track: '', name: 'One' }, { font: 'B;common', track: '', name: 'Two' }] };
const fire = STARTER_LOOKS.find((l) => l.id === 'hw_fire')!;
const heart = STARTER_LOOKS.find((l) => l.id === 'hw_heartbeat')!;

describe('queuing a look with the colours chosen for it', () => {
  it('keeps the colours beside the look, per blade', () => {
    const a = withLookInSlot(model, fire, 1, 1, '0,65535,0 65535,65535,65535');
    expect(a.presets[1].looks).toEqual(['hw_fire', null]);
    expect(a.presets[1].lookArgs).toEqual(['0,65535,0 65535,65535,65535', null]);
    expect(a.presets[0].lookArgs).toBeUndefined();

    const b = withLookInSlot(a, heart, 1, 2, '65535,0,65535');
    expect(b.presets[1].looks).toEqual(['hw_fire', 'hw_heartbeat']);
    expect(b.presets[1].lookArgs).toEqual(['0,65535,0 65535,65535,65535', '65535,0,65535']);
  });

  it('forgets old colours when the slot gets a look without any', () => {
    const a = withLookInSlot(model, fire, 0, 1, '65535,0,0');
    const b = withLookInSlot(a, fire, 0, 1);
    expect(b.presets[0].lookArgs).toBeUndefined();
  });

  it('never reaches the firmware: colours live in the saber\'s presets, not the config', () => {
    const plain = generateConfig(withLookInSlot(model, fire, 1, 1));
    const coloured = generateConfig(withLookInSlot(model, fire, 1, 1, '0,65535,0'));
    expect(coloured.text).toBe(plain.text);
    expect(coloured.hash).toBe(plain.hash);
  });
});

// preset-editing 6.14 (baseline audit): a style chosen for a live preset that the installed firmware lacks is queued
// for the next Build & Install, and is counted once.
describe('a new style on a live saber', () => {
  const firmware = (ids: string[]): SaberRecord['firmware'] => ({ hash: 'h', os: 'v8.10', at: '2026-09-25T00:00:00Z', looks: ids.map((id) => ({ id, name: id, args: [] })), presets: [] });

  it('6.14 counts as queued when the firmware does not have it, once however many slots use it', () => {
    const one = withLookInSlot(model, fire, 0, 1);
    expect(queuedLookIds(one, firmware(['hw_heartbeat']))).toEqual(['hw_fire']);
    const twice = withLookInSlot(one, fire, 1, 2);
    expect(queuedLookIds(twice, firmware(['hw_heartbeat']))).toEqual(['hw_fire']);
  });

  it('6.14 is not queued when the installed firmware already has it', () => {
    expect(queuedLookIds(withLookInSlot(model, heart, 0, 1), firmware(['hw_heartbeat']))).toEqual([]);
  });

  it('6.14 is queued, every chosen style, on firmware Hiltwright did not build', () => {
    expect(queuedLookIds(withLookInSlot(withLookInSlot(model, fire, 0, 1), heart, 1, 1), undefined).sort()).toEqual(['hw_fire', 'hw_heartbeat']);
    expect(queuedLookIds(undefined, undefined)).toEqual([]);
  });
});
