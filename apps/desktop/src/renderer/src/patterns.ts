// Swapping a colour slot between plain colour and patterns, and a template for another one: the pure part of the full
// editor's pattern pickers, kept out of the components so tests can compile what they write (test/styleCompile.test.ts).

import { CATALOGUE, cloneNode, colourView, kindOf, newNode, paramFor, parseStyle, type Node } from '@hiltwright/core';

/** Swap a node for another template, keeping arguments whose kinds still fit their new slots. */
export function retarget(old: Node, name: string): Node {
  const next = newNode(name);
  const e = CATALOGUE[name];
  if (!e) return next;
  for (let i = 0; i < next.args.length; i++) {
    const p = paramFor(e, i); const prev = old.args[i];
    if (p && prev && kindOf(prev) === p.kind) next.args[i] = cloneNode(prev);
  }
  return next;
}

// Patterns a colour slot can be, besides one plain colour. Switching keeps the colours that fit.
export const PATTERNS: [string, string][] = ([['AudioFlicker', 'Flickers with the sound'], ['Pulsing', 'Pulses between two colours'], ['RandomFlicker', 'Random flicker'], ['BrownNoiseFlicker', 'Restless drift'], ['HumpFlicker', 'Rolling humps'], ['Sparkle', 'Sparkles'], ['Mix', 'Blend of two colours'], ['Gradient', 'Gradient, hilt to tip'], ['StripesX', 'Moving stripes'], ['StyleFire', 'Fire'], ['Rainbow', 'Rainbow']] as [string, string][]).filter(([n]) => CATALOGUE[n]);
const half = (hex: string): Node => { const v = parseInt(hex.slice(1), 16); return { name: 'Rgb', args: [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((x) => ({ name: String(x >> 1), args: [] })) }; };

/** The colour slot as a pattern template, carrying the current colour (and a darker second one) into it. */
const FIRE_SETTINGS = ['0', '6', 'FireConfig<10,1000,2>', 'FireConfig<2,1000,5>', 'FireConfig<0,0,10>', 'FireConfig<0,0,10>'];
export function makePattern(name: string, prev: Node): Node {
  const n = makePatternRaw(name, prev);
  // StyleFire's catalogue defaults for its fire settings are names (NORM::Cooling) the compiler does not know: start from a working fire.
  if (n.name === 'StyleFire' && JSON.stringify(n.args).includes('NORM::')) n.args = [...n.args.slice(0, 2), ...FIRE_SETTINGS.map((t) => parseStyle(t))];
  return n;
}
function makePatternRaw(name: string, prev: Node): Node {
  if (name === '') { const first = findColour(prev); return first ? cloneNode(first) : { name: 'White', args: [] }; }
  if (CATALOGUE[prev.name]) { const r = retarget(prev, name); if (CATALOGUE[prev.name].params.some((p) => p.kind === 'COLOR')) return fillColours(r); }
  const e = CATALOGUE[name];
  const n = fillColours(newNode(name));
  const cv = colourView(prev);
  const colourSlots = n.args.map((_, i) => paramFor(e, i)?.kind === 'COLOR' ? i : -1).filter((i) => i >= 0);
  if (cv && colourSlots.length) { n.args[colourSlots[0]] = cloneNode(prev); if (colourSlots[1] != null) n.args[colourSlots[1]] = half(cv.hex); }
  return n;
}
/** Variadic colour templates (Mix, Gradient, StripesX) start with two colours. */
function fillColours(n: Node): Node {
  const e = CATALOGUE[n.name];
  const last = e?.params[e.params.length - 1];
  if (e?.variadic && last?.kind === 'COLOR') while (n.args.length < e.params.length + 1) n.args.push(n.args.length === e.params.length ? { name: 'Blue', args: [] } : { name: 'White', args: [] });
  return n;
}
function findColour(n: Node): Node | null { if (colourView(n)) return n; for (const a of n.args) { const c = findColour(a); if (c) return c; } return null; }

