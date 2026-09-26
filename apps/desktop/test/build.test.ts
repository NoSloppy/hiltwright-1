import { describe, expect, it } from 'vitest';
import { analyzeStyleCode, validateModel, type LookDef, type ModelBlade, type SaberConfigModel } from '@hiltwright/core';
import { newBlade, withKind } from '../src/renderer/src/hardwareModel';
import { buildFirmware, translateErrors } from '../src/main/build';
import { toolchainStatus } from '../src/main/toolchain';

const root = process.env.HILTWRIGHT_TOOLCHAIN_DIR;

const hote2: SaberConfigModel = {
  name: 'hiltwright_hote2', board: 'V2', buttons: 2, prop: 'fett263', generator: 'test',
  blades: [
    { id: 'main', role: 'main', type: 'pixel', pixels: 140, order: 'GRB', extra: [], leds: [], parallel: 1, wiring: { kind: 'own', dataPin: 'bladePin', powerPins: ['bladePowerPin2', 'bladePowerPin3'] } },
    { id: 'crystal', role: 'crystal', type: 'pixel', pixels: 2, order: 'GRB', extra: [], leds: [], parallel: 1, wiring: { kind: 'own', dataPin: 'blade2Pin', powerPins: ['bladePowerPin4'] } },
    { id: 'accent', role: 'accent', type: 'pixel', pixels: 1, order: 'GRB', extra: [], leds: [], parallel: 1, wiring: { kind: 'own', dataPin: 'blade3Pin', powerPins: ['bladePowerPin5'] } },
  ],
  presets: [
    { font: 'Mara Jade Skywalker;common', track: 'Mara Jade Skywalker/tracks/The_Force.wav', name: 'Mara Jade Skywalker' },
    { font: 'Valkyrie;common', track: 'Valkyrie/tracks/battle_cry.wav', name: 'Valkyrie', looks: ['ember', null, null] },
  ],
  looks: [ember()],
};

/** A pasted library-style look, to prove inline emission into a preset slot compiles. */
function ember(): LookDef {
  const code = `// Hiltwright test look (header laid out like a library block)
// Copyright 2026 Hiltwright contributors
// Base Style: Fire Blade
StylePtr<Layers<
  StyleFire<RgbArg<BASE_COLOR_ARG, Rgb<255,0,0>>,RgbArg<ALT_COLOR_ARG, Rgb<255,255,0>>,0,6,FireConfig<10,1000,2>,FireConfig<2,1000,5>,FireConfig<0,0,10>,FireConfig<0,0,10>>,
  TransitionEffectL<TrConcat<TrInstant,AlphaL<White,Bump<Int<16384>,Int<16000>>>,TrFade<300>>,EFFECT_CLASH>,
  LockupTrL<AudioFlicker<RgbArg<LOCKUP_COLOR_ARG, Rgb<255,255,255>>,RgbArg<BASE_COLOR_ARG, Rgb<255,0,0>>>,TrInstant,TrFade<200>,SaberBase::LOCKUP_NORMAL>,
  InOutTrL<TrWipeX<IgnitionTime<300>>,TrWipeInX<RetractionTime<0>>>>>()`;
  const a = analyzeStyleCode(code);
  return { id: 'ember', name: 'Ember', source: 'pasted', by: 'Hiltwright', code: a.expression, header: a.header, roles: ['main'], args: a.args, preview: a.preview, defaults: a.defaults, description: 'fire' };
}

describe('translateErrors', () => {
  it('turns compiler output into owner language', () => {
    expect(translateErrors("region `FLASH' overflowed by 1234 bytes", [])[0]).toMatch(/too big/);
    expect(translateErrors('#error Please select Proffieboard V2 in Tools->Board', [])[0]).toMatch(/Proffieboard V2/);
    expect(translateErrors("error: cannot convert 'const char*' to 'StyleFactory*'", [])[0]).toMatch(/fewer styles/);
    expect(translateErrors("config.h:12:3: error: 'Layerz' was not declared in this scope", [])[0]).toMatch(/did not understand/);
    expect(translateErrors('C:/Users/x/AppData/Local/Hiltwright/toolchain/arduino-data/packages/proffieboard/tools/arm-none-eabi-gcc/14-2-rel1-xpack/arm-none-eabi/include/c++/14.2.1/system_error:41:10: fatal error: bits/error_constants.h: No such file or directory', [])[0]).toMatch(/its own files/);
    expect(translateErrors("arm-none-eabi-g++: fatal error: cannot execute 'cc1plus': CreateProcess: No such file or directory", [])[0]).toMatch(/its own files/);
  });
});

describe.skipIf(!root)('buildFirmware with a real toolchain', () => {
  it('reports the toolchain as ready', async () => {
    const s = await toolchainStatus(root!);
    expect(s.ready).toBe(true);
  });

  it('compiles the generated hote2 config for a V2 and produces a .dfu', async () => {
    const lines: string[] = [];
    const r = await buildFirmware({ toolchainRoot: root!, saberId: 'test-hote2', model: hote2, onLine: (l) => lines.push(l), force: true });
    if (!r.ok) console.log(r.problems, r.output.slice(0, 4000));
    expect(r.ok).toBe(true);
    expect(r.manifest?.presets[1].looks).toEqual(['ember', 'hw_accent', 'hw_accent']);
    expect(r.dfuPath).toMatch(/\.dfu$/);
    expect(r.textBytes).toBeGreaterThan(150000);
    expect(r.flashPct).toBeLessThan(100);
    console.log(`build ${r.ms} ms, .text ${r.textBytes} bytes, ${r.flashPct}% of ${r.flashBytes}`);
    // Second build hits the cache.
    const again = await buildFirmware({ toolchainRoot: root!, saberId: 'test-hote2', model: hote2 });
    expect(again.cached).toBe(true);
  });
});

describe.skipIf(!root)('Blade ID build', () => {
  it('compiles a config with swappable blades: scanning defines and one row per measured blade', async () => {
    const m: SaberConfigModel = { ...hote2, name: 'hiltwright_hote2_id', prop: 'sa22c', looks: [], presets: hote2.presets.map((p) => ({ font: p.font, track: p.track, name: p.name })), bladeId: { variants: [
      { id: 'v1', name: 'Duel blade', pixels: 140, ohms: 916 },
      { id: 'v2', name: 'Short blade', pixels: 96, ohms: 22000 },
      { id: 'v0', name: 'No blade', pixels: 0, ohms: null, noBlade: true },
    ] } };
    const r = await buildFirmware({ toolchainRoot: root!, saberId: 'test-hote2-id', model: m, force: true });
    if (!r.ok) console.log(r.problems, r.output.slice(0, 3000));
    expect(r.ok).toBe(true);
    expect(r.manifest?.bladeId).toBe(true);
    console.log(`blade id build ${r.ms} ms, ${r.flashPct}% of flash`);
  });
});

describe('usbState', () => {
  it('reports the running firmware when a Proffieboard is plugged in (skips otherwise)', async () => {
    const { usbState } = await import('../src/main/flash');
    const s = await usbState();
    console.log('usb', JSON.stringify(s));
    expect(typeof s.runtimePresent).toBe('boolean');
    expect(s.bootloaderPresent).toBe(false);
  });
});

// Baseline finding FW20 (baseline-firmware): blade kinds and options the app offers but had never compiled. Two builds
// cover them all; if one fails, split it to find the part before filing anything.
const pixel = (id: string, role: ModelBlade['role'], pixels: number, order: string, wiring: ModelBlade['wiring']): ModelBlade => ({ id, role, type: 'pixel', pixels, order, extra: [], leds: [], parallel: 1, wiring });
const fw20V2: SaberConfigModel = {
  name: 'hiltwright_fw20_v2', board: 'V2', buttons: 3, prop: 'fett263', generator: 'test',
  extraDefines: ['FETT263_TWIST_OFF', 'FETT263_TWIST_ON'],
  blades: [
    pixel('b1', 'main', 132, 'GRBW', { kind: 'own', dataPin: 'bladePin', powerPins: ['bladePowerPin2', 'bladePowerPin3'] }),
    pixel('b2', 'crystal', 2, '', { kind: 'chain', after: 'b1' }),
    newBlade('b3', 'accent', 'V2', { data: ['bladePin'], power: ['bladePowerPin2', 'bladePowerPin3'] }),
    // The star's three channels on pins of their own (the app's default repeats one pin: FST-3, wiring-validation).
    { ...withKind(newBlade('b4', 'accent', 'V2', { data: ['bladePin'], power: [] }), 'star', 'V2'), wiring: { kind: 'power', pins: ['bladePowerPin4', 'bladePowerPin5', 'bladePowerPin6'] } },
  ],
  presets: [{ font: 'TeensySF;common', track: '', name: 'One' }, { font: 'SmthJedi;common', track: '', name: 'Two' }],
};
const fw20V3: SaberConfigModel = {
  name: 'hiltwright_fw20_v3', board: 'V3', buttons: 2, prop: 'sa22c', generator: 'test',
  blades: [
    pixel('b1', 'main', 144, 'RGBW', { kind: 'own', dataPin: 'bladePin', powerPins: ['bladePowerPin2', 'bladePowerPin3'] }),
    pixel('b2', 'side', 10, '', { kind: 'chain', after: 'b1' }),
    withKind({ ...newBlade('b3', 'motor', 'V3', { data: ['bladePin'], power: ['bladePowerPin2', 'bladePowerPin3'] }), role: 'motor' }, 'motor', 'V3'),
  ],
  presets: [{ font: 'TeensySF;common', track: '', name: 'One' }],
};

describe('FW20 models', () => {
  it('are valid, so a compile failure is the firmware and not the model', () => {
    expect(validateModel(fw20V2)).toEqual([]);
    expect(validateModel(fw20V3)).toEqual([]);
    expect(fw20V2.blades.map((b) => b.type)).toEqual(['pixel', 'pixel', 'simple', 'simple']);
    // Each simple blade has pins of its own: three for the star, one for the single LED and the motor.
    const pinsOf = (b: ModelBlade) => (b.wiring.kind === 'power' ? b.wiring.pins : b.wiring.kind === 'own' ? b.wiring.powerPins : []);
    expect(pinsOf(fw20V2.blades[3])).toHaveLength(3);
    const all = fw20V2.blades.flatMap(pinsOf);
    expect(new Set(all).size).toBe(all.length);
    expect(fw20V3.blades[2]).toMatchObject({ role: 'motor', type: 'simple', wiring: { kind: 'power' } });
    expect(pinsOf(fw20V3.blades[2]).some((p) => ['bladePowerPin2', 'bladePowerPin3'].includes(p))).toBe(false);
  });
});

describe.skipIf(!root)('FW20: never-compiled blade kinds, with a real toolchain', () => {
  for (const [label, model] of [['a V2 with a GRBW main blade, a chained crystal, a single LED, a star LED, 3 buttons and extra defines', fw20V2], ['a V3 with an RGBW main blade, a chained sub-blade and a motor', fw20V3]] as const) {
    it(`compiles ${label}`, async () => {
      const r = await buildFirmware({ toolchainRoot: root!, saberId: `test-${model.name}`, model, onLine: () => undefined, force: true });
      if (!r.ok) console.log(r.problems, r.output.slice(0, 4000));
      expect(r.ok).toBe(true);
      expect(r.dfuPath).toMatch(/\.dfu$/);
      console.log(`${model.name}: build ${r.ms} ms, .text ${r.textBytes} bytes, ${r.flashPct}% of ${r.flashBytes}`);
    }, 10 * 60 * 1000);
  }
});
