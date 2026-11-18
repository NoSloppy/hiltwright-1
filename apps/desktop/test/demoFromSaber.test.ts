// demo-room-fixes SR12: "From <saber>" brings the preset's colours, and says when its style cannot be shown.
import { describe, expect, it } from 'vitest';
import { STARTER_LOOKS, type FirmwareManifest, type LookDef, type PresetRecord, type SaberConfigModel } from '@hiltwright/core';
import { presetBladeLoad, presetLookId } from '../src/renderer/src/demoFromSaber';

const fire = STARTER_LOOKS.find((l) => l.id === 'hw_fire')!;
const ember: LookDef = { id: 'look_ember', name: 'Ember', source: 'pasted', by: 'x', code: '', header: null, roles: ['main'], args: [1, 3, 9], preview: '#ff0000', description: '' };
const firmware: FirmwareManifest = {
  hash: 'fw', os: 'v8.10', at: '2026-10-01T00:00:00Z',
  looks: [{ id: fire.id, name: fire.name, args: fire.args }, { id: 'look_odd', name: 'Odd one', args: [1] }],
  presets: [{ name: 'One', looks: [fire.id] }, { name: 'Two', looks: ['look_odd'] }, { name: 'Three', looks: [fire.id] }],
};
const rec = (name: string, styles: string[]): PresetRecord => ({ name, font: 'A', track: '', styles, variation: 0 });
const saberPresets = [rec('One', ['builtin 0 1 0,0,65535']), rec('Two', ['builtin 1 1 65535,0,0']), rec('Three', ['builtin 2 1'])];
const model = { name: 't', presets: saberPresets.map((p) => ({ name: p.name, font: p.font, track: '' })), blades: [], looks: [ember] } as unknown as SaberConfigModel;
const base = { model, firmware, saberPresets, blade: 1, shown: [fire, ember], current: 'Fire' };

describe('SR12 From <saber>', () => {
  it('brings the colours the preset has on the saber', () => {
    const r = presetBladeLoad({ ...base, preset: 0 });
    expect(r.lookId).toBe(fire.id);
    expect(r.colours[1]).toBe('#0000ff');
    expect(r.note).toBeNull();
  });
  it("brings no colours when the preset sets none, so the style's own show", () => {
    const r = presetBladeLoad({ ...base, preset: 2 });
    expect(r.lookId).toBe(fire.id);
    expect(r.colours).toEqual({});
  });
  it('uses the colours still waiting in the plan, and the style chosen there', () => {
    const queued = { ...model, presets: [{ ...model.presets[0], looks: [ember.id], lookArgs: ['65535,0,0'] }, ...model.presets.slice(1)] } as SaberConfigModel;
    const r = presetBladeLoad({ ...base, model: queued, preset: 0 });
    expect(r.lookId).toBe(ember.id);
    expect(r.colours).toEqual({ 1: '#ff0000' });
  });
  it('keeps only colours the style reads', () => {
    const r = presetBladeLoad({ ...base, saberPresets: [rec('One', ['builtin 0 1 0,0,65535 0,65535,0'])], shown: [{ ...fire, args: [1] }], preset: 0 });
    expect(Object.keys(r.colours)).toEqual(['1']);
  });
  it('says plainly when the style cannot be shown, and what stays', () => {
    const r = presetBladeLoad({ ...base, preset: 1 });
    expect(r.lookId).toBeNull();
    expect(r.colours).toEqual({});
    expect(r.note).toBe('Two runs Odd one on blade 1, which the demo room cannot show yet, so the blade still shows Fire.');
  });
  it('says so when no style can be worked out', () => {
    const r = presetBladeLoad({ ...base, firmware: null, preset: 0 });
    expect(r.lookId).toBeNull();
    expect(r.note).toContain('cannot tell which style One runs');
  });
  it('ignores the plan when it holds a staged list', () => {
    const staged = { ...model, presetsFrom: { name: 'A set', at: 'x' }, presets: [{ name: 'Z', font: 'A', track: '', looks: [ember.id] }] } as unknown as SaberConfigModel;
    expect(presetLookId({ ...base, model: staged, preset: 0 })?.id).toBe(fire.id);
  });
});
