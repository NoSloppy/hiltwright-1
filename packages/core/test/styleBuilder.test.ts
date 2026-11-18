import { describe, expect, it } from 'vitest';
import { BASES, BladeSim, EFFECTS, TRANSITIONS, defaultStyle, generateConfig, isStyleDoc, newBlock, registerStyleSim, sharedSettings, styleToCpp, styleToLook, styleToSim, type SaberConfigModel } from '../src';

const run = (sim: BladeSim, t0: number, t1: number) => { let f = sim.frame(t0); for (let t = t0; t <= t1; t += 1000 / 60) f = sim.frame(t); return f; };

describe('style editor model', () => {
  it('every base, effect and transition produces C++ and a simulator that runs', () => {
    for (const b of BASES) for (const tr of TRANSITIONS) {
      const doc = { ...defaultStyle('t'), base: newBlock(b), effects: EFFECTS.map(newBlock), ignition: newBlock(tr), retraction: newBlock(tr) };
      const cpp = styleToCpp(doc, 'HwT');
      expect(cpp).toMatch(/^using HwT = Layers<[\s\S]*>;$/);
      expect((cpp.match(/</g) ?? []).length).toBe((cpp.match(/>/g) ?? []).length);
      registerStyleSim('t', styleToSim(doc));
      const sim = new BladeSim('t', 40, 3);
      sim.setOn(true); sim.trigger('clash'); sim.trigger('blast'); sim.setLockup('lb');
      const f = run(sim, 0, 800);
      expect(f.every((v) => v >= 0 && v <= 1 && Number.isFinite(v)), `${b.kind} ${tr.kind}`).toBe(true);
    }
  });

  it('a built look carries its colours as live arguments, and its define reaches the config', () => {
    const doc = defaultStyle('Ember');
    doc.base = { kind: 'fire', params: { base: '#ff2000', alt: '#ffc800', speed: 7 } };
    const look = styleToLook(doc, 'look_ember');
    expect(look.code).toBe('StylePtr<Hw_look_ember>()');
    expect(look.args).toEqual(expect.arrayContaining([1, 2, 9, 10, 11, 13, 15, 16]));
    expect(look.defaults?.[1]).toBe('#ff2000');
    expect(look.preview2).toBe('#ffc800');
    expect(isStyleDoc(look.style)).toBe(true);
    const main = { id: 'b1', role: 'main' as const, type: 'pixel' as const, pixels: 132, order: 'GRB', extra: [], leds: [], parallel: 1, wiring: { kind: 'own' as const, dataPin: 'bladePin', powerPins: ['bladePowerPin2'] } };
    const model: SaberConfigModel = { name: 'hiltwright_t', board: 'V2', boardFrom: 'owner', buttons: 2, prop: 'sa22c', blades: [main], presets: [{ font: 'A;common', track: '', name: 'One', looks: ['look_ember'] }], looks: [look] };
    const g = generateConfig(model);
    expect(g.text).toContain('using Hw_look_ember = Layers<');
    expect(g.text).toContain('StyleFire<RgbArg<BASE_COLOR_ARG, Rgb<255,32,0>>');
    expect(g.text).toContain('StylePtr<Hw_look_ember>()');
  });

  it('says which colours of a built style share one live setting on the saber (ST32)', () => {
    const doc = defaultStyle('t');
    expect(sharedSettings(doc)).toEqual([]);
    for (const base of BASES) expect(sharedSettings({ ...defaultStyle('t'), base: newBlock(base), effects: EFFECTS.map((e) => newBlock(e)).filter((e) => e.kind !== 'core') })).toEqual([]);
    // Stardust and Core pulse both read the 2nd alt colour.
    doc.effects = [newBlock(EFFECTS.find((e) => e.kind === 'sparkle')!), newBlock(EFFECTS.find((e) => e.kind === 'core')!)];
    const shared = sharedSettings(doc);
    expect(shared).toHaveLength(1);
    expect(shared[0]).toMatchObject({ arg: 33, setting: '2nd alt colour', uses: ['Stardust', 'Core pulse'] });
    expect(shared[0].text).toMatch(/^Stardust and Core pulse share one live setting on the saber \(2nd alt colour\)/);
    // Two copies of one effect share its colour; three are listed in a row.
    doc.effects = [newBlock(EFFECTS.find((e) => e.kind === 'blast')!), newBlock(EFFECTS.find((e) => e.kind === 'blast')!), newBlock(EFFECTS.find((e) => e.kind === 'blast')!)];
    expect(sharedSettings(doc)[0]).toMatchObject({ arg: 9, uses: ['Blaster deflect', 'Blaster deflect (2nd)', 'Blaster deflect (3rd)'] });
  });
});
