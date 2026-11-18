// Audit of baseline-styles, style-simulator 2.13 (styles-test-coverage design D4): saved styles get a simulator,
// so Presets, Styles and the demo room can preview them, and an edited style gets a fresh one.

import { afterEach, describe, expect, it } from 'vitest';
import { BladeSim, approximateWords, canSimulateLook, defaultStyle, defaultTree, evaluateStyle, lookPreviewReport, parseStyle, registerLookSim, registerStyleSim, unregisterStyleSim, type LookDef } from '../src';

const N = 60;
/** The last frame after igniting and waiting a second and a half. */
function lit(id: string): Float32Array {
  const sim = new BladeSim(id, N, 3);
  sim.setOn(true);
  let f = sim.frame(0);
  for (let t = 0; t <= 1500; t += 1000 / 60) f = sim.frame(t);
  return f.slice();
}
const colourAt = (f: Float32Array, i: number) => [f[i * 3], f[i * 3 + 1], f[i * 3 + 2]];

const registered: string[] = [];
const look = (over: Partial<LookDef>): LookDef => {
  const l: LookDef = { id: `look_test_${registered.length}`, name: 'Test', source: 'pasted', by: 'you', code: 'StylePtr<Red>()', header: null, roles: ['main'], args: [], preview: '#ff0000', description: '', ...over };
  registered.push(l.id);
  return l;
};
afterEach(() => { for (const id of registered.splice(0)) unregisterStyleSim(id); });

describe('saved styles in the simulator', () => {
  it('2.13 a pasted style and a built style each get a simulator and light the blade', () => {
    const pasted = look({ code: 'StylePtr<Red>()' });
    expect(registerLookSim(pasted)).toBe(true);
    expect(canSimulateLook(pasted.id)).toBe(true);
    expect(colourAt(lit(pasted.id), 30)).toEqual([1, 0, 0]);

    const built = look({ source: 'built', code: 'StylePtr<HwBuilt>()', style: defaultStyle('Mine') } as Partial<LookDef>);
    expect(registerLookSim(built)).toBe(true);
    expect(canSimulateLook(built.id)).toBe(true);
    expect(lit(built.id).some((v) => v > 0)).toBe(true);
  });

  it('2.13 text that is not a style gets no simulator (the page shows a flat colour bar)', () => {
    const junk = look({ code: 'this is not a style' });
    expect(registerLookSim(junk)).toBe(false);
    expect(canSimulateLook(junk.id)).toBe(false);
  });

  it('2.13 an edited style, replaced as the style editor replaces it, previews its new colour', () => {
    const mine = look({ code: 'StylePtr<Red>()' });
    registerLookSim(mine);
    expect(colourAt(lit(mine.id), 30)).toEqual([1, 0, 0]);
    // The editor's save registers the new version under the same id (StyleEditor.tsx, registerStyleSim).
    registerStyleSim(mine.id, evaluateStyle(parseStyle('StylePtr<Blue>()')).make);
    expect(colourAt(lit(mine.id), 30)).toEqual([0, 0, 1]);
  });

  it('ST20 the report travels with a saved style, for every page that previews it', () => {
    expect(lookPreviewReport(look({ code: 'StylePtr<Layers<Red, NoSuchLayerL<White>, InOutTrL<TrInstant,TrInstant>>>()' }))).toEqual({ unsupported: ['NoSuchLayerL'], approximate: [] });
    expect(lookPreviewReport(look({ code: 'StylePtr<HwX>()', define: 'using HwX = Layers<RotateColorsX<Variation,Red>, InOutTrL<TrInstant,TrInstant>>;' }))).toEqual({ unsupported: [], approximate: ['Variation'] });
    expect(lookPreviewReport(look({ source: 'built', code: 'StylePtr<HwT>()', style: defaultTree() } as Partial<LookDef>))).toEqual({ unsupported: [], approximate: [] });
    // Nothing to say about the beginner editor's blocks, Hiltwright's own styles, or code that cannot be read.
    expect(lookPreviewReport(look({ source: 'built', code: 'StylePtr<HwBuilt>()', style: defaultStyle('Mine') } as Partial<LookDef>))).toBeNull();
    expect(lookPreviewReport(look({ source: 'library', code: 'StylePtr<HwBlade>()' } as Partial<LookDef>))).toBeNull();
    expect(lookPreviewReport(look({ code: 'this is not a style' }))).toBeNull();
    expect(approximateWords('Variation')).toMatch(/variation/);
  });

  it('2.13 registering an id again through registerLookSim keeps the simulator it has', () => {
    // Pinned on purpose: a refresh must go through registerStyleSim, as the editor does, or change this knowingly.
    const mine = look({ code: 'StylePtr<Red>()' });
    registerLookSim(mine);
    expect(registerLookSim({ ...mine, code: 'StylePtr<Blue>()' })).toBe(true);
    expect(colourAt(lit(mine.id), 30)).toEqual([1, 0, 0]);
  });
});
