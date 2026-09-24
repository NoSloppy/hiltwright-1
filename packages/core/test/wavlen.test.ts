import { describe, expect, it } from 'vitest';
import { BladeSim, registerStyleSim, unregisterStyleSim } from '../src/sim';
import { evaluateStyle, parseStyle } from '../src/styleTree';

/** Sum of every LED channel at `t` ms, after the sim was driven by `drive` at 0. */
function brightnessAt(style: string, drive: (sim: BladeSim) => void, t: number): number {
  const { make } = evaluateStyle(parseStyle(style));
  registerStyleSim('wl', make);
  try {
    const sim = new BladeSim('wl', 40); sim.frame(0); drive(sim);
    for (let x = 0; x < t; x += 20) sim.frame(x);
    return [...sim.frame(t)].reduce((a, b) => a + b, 0);
  } finally { unregisterStyleSim('wl'); }
}

describe('WavLen follows the font', () => {
  const ignition = 'Layers<White, InOutTrL<TrWipeX<WavLen<EFFECT_IGNITION>>, TrInstant>>';
  it('an ignition wipe lasts as long as the ignition sound', () => {
    const full = brightnessAt(ignition, (s) => s.setOn(true, 0.2), 1000);
    const long = brightnessAt(ignition, (s) => s.setOn(true, 4), 1000);
    expect(long).toBeGreaterThan(0);
    expect(long).toBeLessThan(full * 0.5);
  });
  it('without a font, a one-second stand-in', () => {
    expect(brightnessAt(ignition, (s) => s.setOn(true), 1100)).toBeCloseTo(brightnessAt(ignition, (s) => s.setOn(true, 0.2), 1100), 0);
  });
  it('WavLen<> inside a preon transition reads the preon sound', () => {
    const preon = 'Layers<Black, TransitionEffectL<TrConcat<TrInstant, White, TrFadeX<WavLen<>>>, EFFECT_PREON>>';
    const short = brightnessAt(preon, (s) => s.doEffect('EFFECT_PREON', 0, -1, 0.3), 600);
    const long = brightnessAt(preon, (s) => s.doEffect('EFFECT_PREON', 0, -1, 3), 600);
    expect(short).toBe(0);
    expect(long).toBeGreaterThan(0);
  });
});
