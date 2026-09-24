import { describe, expect, it } from 'vitest';
import { BladeSim, RECIPES, evaluateStyle, newLayer, parseStyle, registerStyleSim, type Node } from '@hiltwright/core';
import { layerPickList } from '../src/renderer/src/treeWords';

// What a freshly added layer does on a plain blue blade: it has to show on the blade once whatever sets it off
// happens, or the owner is left looking at a layer that seems to do nothing.
const PAINTS_NOTHING = new Set(['SyncAltToVarianceL']); // a helper: keeps the alt colour in step, draws nothing itself
const RUNS_THE_BLADE = new Set(['InOutTrL']); // ignition and retraction: shows as the blade goes out and comes back

function showsSomething(layer: Node, id: string): { shows: boolean; unsupported: string[] } {
  const ev = evaluateStyle({ name: 'Layers', args: [{ name: 'Blue', args: [] }, layer] });
  registerStyleSim(id, ev.make);
  const sim = new BladeSim(id, 40);
  sim.frame(0); sim.setOn(true);
  let t = 0; let shows = false;
  const run = (ms: number) => { for (const end = t + ms; t <= end; t += 50) { const f = sim.frame(t); for (let i = 0; i < f.length && !shows; i += 3) if (f[i] > 0.05 || f[i + 1] > 0.05 || Math.abs(f[i + 2] - 1) > 0.05) shows = true; } };
  run(1500);
  for (const e of ['clash', 'blast', 'stab'] as const) { sim.trigger(e, 0.5); run(900); }
  sim.raise('EFFECT_FORCE'); run(900);
  for (const l of ['normal', 'drag', 'melt', 'lb'] as const) { sim.setLockup(l, 0.5); run(900); sim.setLockup(null); run(400); }
  sim.setSwing(500); run(900); sim.setSwing(0);
  return { shows, unsupported: ev.report.unsupported };
}

describe('adding a layer', () => {
  const entries: [string, Node][] = [
    ...RECIPES.map((r) => [r.name, parseStyle(r.code)] as [string, Node]),
    ...layerPickList('').flatMap((g) => g.entries.map((e) => [e.name, newLayer(e.name)] as [string, Node])),
  ];

  it.each(entries.filter(([n]) => !PAINTS_NOTHING.has(n) && !RUNS_THE_BLADE.has(n)).map(([n, l], i) => [n, l, i] as const))('%s shows on the blade', (_name, layer, i) => {
    const r = showsSomething(layer, `add_${i}`);
    expect(r.unsupported).toEqual([]);
    expect(r.shows).toBe(true);
  });

  it('keeps a default that names another setting as that setting (LockupL)', () => {
    const l = newLayer('LockupL');
    expect(l.args[1]).toEqual(l.args[0]);
  });
});
