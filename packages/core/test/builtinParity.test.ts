// ST23 (preview-honesty): every built-in style previews from a hand-written simulation in sim.ts (SIM_LOOKS). This
// runs the C++ that is actually compiled (lookLibrary.ts, with the shared HwFx / HwFxTr wrappers expanded from
// LOOK_FX) through the style evaluator, and checks that the two give the same blade, frame by frame, through every
// state a saber goes through. If either side changes, this fails.

import { describe, expect, it } from 'vitest';
import { LIBRARY_LOOKS, LOOK_FX } from '../src/lookLibrary';
import { BladeSim, SIMULATED_LOOKS, registerStyleSim, unregisterStyleSim } from '../src/sim';
import { cloneNode, evaluateStyle, parseStyle, type Node } from '../src/styleTree';

/** The template aliases in LOOK_FX (HwFxTr, HwFx), as parameter names and body, read from the C++ itself. */
const FX = new Map<string, { params: string[]; body: Node }>();
for (const m of LOOK_FX.matchAll(/template<([^>]*)>\s*using\s+(\w+)\s*=\s*([\s\S]*?);/g)) {
  FX.set(m[2], { params: m[1].split(',').map((p) => p.replace(/\bclass\b/, '').trim()), body: parseStyle(m[3]) });
}

/** Expand HwFx / HwFxTr as the compiler would: the template's body with its parameters substituted. */
function expand(n: Node): Node {
  const t = FX.get(n.name);
  if (!t) return { name: n.name, args: n.args.map(expand) };
  const bind = new Map(t.params.map((p, i) => [p, expand(n.args[i])]));
  const sub = (x: Node): Node => (bind.has(x.name) && !x.args.length ? cloneNode(bind.get(x.name)!) : { name: x.name, args: x.args.map(sub) });
  return expand(sub(t.body));
}
const compiled = (define: string): Node => expand(parseStyle(define.replace(/^\s*using\s+\w+\s*=\s*/, '').replace(/;\s*$/, '')));

const N = 48;
const STEP = 1000 / 60; // the preview's frame rate
const PHASES = ['off', 'igniting', 'on', 'swinging', 'clash', 'blast', 'lockup', 'lockup end', 'drag', 'drag end', 'lightning block', 'lightning block end', 'stab', 'retracting', 'off again'] as const;
type Phase = typeof PHASES[number];

/** A scripted session through every state. Same seed both sides, so random styles draw the same numbers. */
function session(id: string): { frames: Float32Array[]; phase: Phase[] } {
  const sim = new BladeSim(id, N, 7);
  const frames: Float32Array[] = []; const phase: Phase[] = [];
  let t = 0;
  const run = (ms: number, p: Phase) => { const end = t + ms; for (; t < end; t += STEP) { frames.push(sim.frame(t).slice()); phase.push(p); } };
  run(200, 'off');
  sim.setOn(true); run(400, 'igniting'); run(300, 'on');
  sim.setSwing(300); sim.setAngle(30); run(300, 'swinging'); sim.setSwing(0); sim.setAngle(0);
  sim.trigger('clash', 0.5); run(400, 'clash');
  sim.trigger('blast', 0.3); run(400, 'blast');
  sim.setLockup('normal'); run(400, 'lockup'); sim.setLockup(null); run(400, 'lockup end');
  sim.setLockup('drag'); run(300, 'drag'); sim.setLockup(null); run(200, 'drag end');
  sim.setLockup('lb'); run(300, 'lightning block'); sim.setLockup(null); run(200, 'lightning block end');
  sim.trigger('stab', 0.8); run(700, 'stab');
  sim.setOn(false); run(600, 'retracting'); run(200, 'off again');
  return { frames, phase };
}

/**
 * The tolerance: one step of 8-bit colour, per channel, on any LED in any frame. Wipes land a hair apart at their
 * edge (the hand-written mix and the evaluator's round differently, under 0.003); nothing else needs any slack.
 */
const TOLERANCE = 1 / 255;

const FX_STYLES = LIBRARY_LOOKS.filter((l) => l.usesFx).map((l) => l.id);
/**
 * Where the hand-written simulation genuinely differs from the C++, kept visible rather than hidden by a looser
 * tolerance. Each entry must still differ (the test checks), so fixing one forces its removal here.
 */
const KNOWN_DIFFERENCES: { styles: string[]; phases: Phase[] | 'all'; why: string }[] = [
  {
    // sim.ts hwFx: smoothStep(32000, 6000). ResponsiveDragL is SmoothStep<Int<32000>, Scale<TwistAngle<>, 2000, 10000>>:
    // the real drag grows and shrinks as the hilt turns; the hand-written one is a fixed size.
    styles: FX_STYLES, phases: ['drag'], why: 'drag size ignores the hilt twist',
  },
  {
    // sim.ts lightningL: three bumps at fixed places and sizes. ResponsiveLightningBlockL moves its bumps with
    // BladeAngle<24000,32768> and sizes them with TwistAngle; the hand-written one follows neither.
    styles: FX_STYLES, phases: ['lightning block'], why: 'lightning block ignores blade angle and twist',
  },
  {
    // sim.ts loopL loops on exact time (now % 1260 ms). TransitionLoopL<TrConcat<...>> restarts each step on the
    // frame after the last one ends, as the firmware does, so at 60 frames a second it slips up to a frame per
    // step and drifts out of phase. The gap closes as the frame step shrinks (at 0.25 ms it is under 0.07).
    styles: ['hw_heartbeat'], phases: 'all', why: 'loop restarts on frame boundaries in the C++, on exact time by hand',
  },
];

const allowed = (id: string, p: Phase) => KNOWN_DIFFERENCES.some((k) => k.styles.includes(id) && (k.phases === 'all' || k.phases.includes(p)));

describe('built-in styles: hand-written simulation against the compiled C++ (ST23)', () => {
  it('covers every built-in style, and every built-in style has a hand-written simulation', () => {
    expect([...SIMULATED_LOOKS].sort()).toEqual(LIBRARY_LOOKS.map((l) => l.id).sort());
  });

  it.each(LIBRARY_LOOKS.map((l) => [l.id, l] as const))('%s', (id, look) => {
    const { make, report } = evaluateStyle(compiled(look.define));
    expect(report.unsupported, 'every template a built-in style uses is modelled').toEqual([]);
    registerStyleSim(`cpp_${id}`, make);
    try {
      const hand = session(id); const cpp = session(`cpp_${id}`).frames;
      const worst: Partial<Record<Phase, number>> = {};
      hand.frames.forEach((f, k) => { let m = 0; for (let i = 0; i < f.length; i++) m = Math.max(m, Math.abs(f[i] - cpp[k][i])); const p = hand.phase[k]; worst[p] = Math.max(worst[p] ?? 0, m); });
      const off = PHASES.filter((p) => !allowed(id, p) && (worst[p] ?? 0) > TOLERANCE).map((p) => `${p}: ${worst[p]!.toFixed(3)}`);
      expect(off, `${id} differs from its C++`).toEqual([]);
      // An allow-listed difference that has gone away must come off the list.
      const stale = KNOWN_DIFFERENCES.filter((k) => k.styles.includes(id)).filter((k) => !(k.phases === 'all' ? PHASES : k.phases).some((p) => (worst[p] ?? 0) > TOLERANCE)).map((k) => k.why);
      expect(stale, `${id}: allow-listed but now matching`).toEqual([]);
    } finally { unregisterStyleSim(`cpp_${id}`); }
  });
});
