// Checking a style before it is saved (ST33): every name is a ProffieOS template the catalogue knows, every argument is
// the kind of thing its slot takes, and the count is right where the catalogue knows it. The catalogue is generated
// from the OS source, so a style that passes is made of real templates in the right places; only the build can say the
// compiler is happy with the whole. Pure, so the editor can run it on every save and tests can run it on any style.

import { CATALOGUE, paramFor, type Kind, type Node } from './styleTree';

export interface StyleProblem {
  /** Position in the top-level Layers<> (0 is the base), or null when the problem is the style as a whole. */
  layer: number | null;
  /** The owner's words for where: "The blade", "Layer 2 (ResponsiveClashL)", "The style". */
  where: string;
  text: string;
}

const KIND_WORDS: Record<Kind, string> = {
  COLOR: 'a colour', FUNCTION: 'a number that can change (a function)', TRANSITION: 'a transition', INTEGER: 'a plain number', EFFECT: 'an effect', LOCKUP_TYPE: 'a lockup type', OTHER: 'something else',
};
const isNumber = (name: string) => /^-?\d+$/.test(name) || /^0[bBxX][0-9a-fA-F]+$/.test(name);
/** Constants and enum values (BASE_COLOR_ARG, EFFECT_CLASH, SaberBase::LOCKUP_NORMAL, NORM::Cooling, a #define): not templates, so never "unknown". */
const isConstant = (name: string) => isNumber(name) || /^([A-Za-z]\w*::)+\w+$/.test(name) || /^[A-Z][A-Z0-9_]*$/.test(name);

/**
 * What a node plainly is, when there is no doubt: a colour written out (a named colour, Rgb, RgbArg), a number (a
 * literal, Int<>), or a transition. The catalogue's own kinds are good for the templates it lists but not for every
 * slot (it has a few slots typed wrongly, and old-style templates), so only these plain cases are held to a slot's kind.
 */
function plainKind(n: Node): 'COLOR' | 'NUMBER' | 'TRANSITION' | null {
  if (isNumber(n.name) || (n.name === 'Int' && n.args.length === 1)) return 'NUMBER';
  if (/^(Rgb|Rgb16|RgbArg)$/.test(n.name)) return 'COLOR';
  const e = CATALOGUE[n.name];
  if (e && e.kind === 'COLOR' && !e.params.length && /^rgb\(/.test(e.doc)) return 'COLOR';
  if (e && e.kind === 'TRANSITION' && /^Tr[A-Z]/.test(n.name)) return 'TRANSITION';
  return null;
}

/** The catalogue name a mistyped one is most likely meant to be: one letter off, or only the capitals differ. */
function closest(name: string): string | null {
  const lower = name.toLowerCase();
  let best: string | null = null;
  for (const k of Object.keys(CATALOGUE)) {
    if (Math.abs(k.length - name.length) > 1 || k[0].toLowerCase() !== lower[0]) continue;
    if (k.toLowerCase() === lower) return k;
    if (!best && editDistanceOne(k.toLowerCase(), lower)) best = k;
  }
  return best;
}
function editDistanceOne(a: string, b: string): boolean {
  if (a === b) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return a.slice(i + 1) === b.slice(i + 1) || a.slice(i) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i);
}

/** Slots the catalogue types wrongly (found by running it over real styles), and slots with a bare letter for a name, which it types by guess. */
const MISTYPED = new Set(['SmoothStep:WIDTH']);
const typedByGuess = (parent: string, param: string) => MISTYPED.has(`${parent}:${param}`) || param.length <= 2;

function walk(n: Node, expected: Kind | null, inside: { parent: string; param: string } | null, out: string[], depth = 0): void {
  if (depth > 60 || n.name.endsWith('...')) return;
  const e = CATALOGUE[n.name];
  if (!e && !isConstant(n.name)) {
    const near = closest(n.name);
    out.push(`“${n.name}” is not a ProffieOS template Hiltwright knows${near ? `. Did you mean “${near}”?` : '. Check the spelling.'}`);
    n.args.forEach((a) => walk(a, null, null, out, depth + 1));
    return;
  }
  // The kind in this slot, against what was plainly put there.
  const got = plainKind(n);
  if (inside && expected && expected !== 'OTHER' && got && !typedByGuess(inside.parent, inside.param)) {
    const fits = got === 'NUMBER' ? expected === 'FUNCTION' || expected === 'INTEGER' : got === expected;
    if (!fits) out.push(`${inside.parent} needs ${KIND_WORDS[expected]} for ${friendlyParam(inside.param)}, but “${n.name}” is ${got === 'NUMBER' ? 'a number' : KIND_WORDS[got]}.`);
  }
  if (!e) return; // a constant has no arguments to check
  // How many arguments the template takes, where the catalogue says.
  if (e.params.length) { // a template with no listed parameters (WavLen<EFFECT_X>) is taken as the catalogue not knowing them
    const fixed = e.variadic ? e.params.length - 1 : e.params.length;
    let required = 0;
    e.params.forEach((p, i) => { if (p.default === null && (!e.variadic || i < fixed)) required = i + 1; });
    const most = e.variadic ? Infinity : e.params.length;
    if (n.args.length > most) out.push(`${n.name} takes ${most === 0 ? 'no values' : `at most ${most} value${most === 1 ? '' : 's'}`}, but has ${n.args.length}.`);
    else if (n.args.length < required) out.push(`${n.name} needs at least ${required} value${required === 1 ? '' : 's'}, but has ${n.args.length}.`);
  }
  n.args.forEach((a, i) => {
    const p = paramFor(e, i);
    walk(a, p ? p.kind : null, p ? { parent: n.name, param: p.name } : null, out, depth + 1);
  });
}
const friendlyParam = (name: string): string => `“${name.toLowerCase().replace(/_/g, ' ')}”`;

/**
 * What is wrong with a style, by layer; an empty list when nothing is. `labels` are the names the owner gave the layers
 * in the editor. The root has to be a colour or layer: that is what a blade style is.
 */
export function checkStyle(root: Node, labels: readonly (string | null)[] = []): StyleProblem[] {
  const problems: StyleProblem[] = [];
  const where = (i: number | null, n?: Node): string => (i === null ? 'The style' : labels[i] ? `“${labels[i]}”` : i === 0 ? 'The blade' : `Layer ${i}${n ? ` (${n.name})` : ''}`);
  const add = (i: number | null, texts: string[], n?: Node) => texts.forEach((text) => problems.push({ layer: i, where: where(i, n), text }));
  const rootKind = plainKind(root);
  if (rootKind && rootKind !== 'COLOR') add(null, [`A style has to be a colour or a stack of layers, but “${root.name}” is ${rootKind === 'NUMBER' ? 'a number' : 'a transition'}.`]);
  if (root.name === 'Layers') {
    // Layers<> takes any number of colours: each layer is checked on its own.
    root.args.forEach((a, i) => {
      const out: string[] = [];
      walk(a, 'COLOR', { parent: 'Layers', param: 'a layer' }, out);
      add(i, out, a);
    });
  } else {
    const out: string[] = [];
    walk(root, null, null, out);
    add(null, out);
  }
  return problems;
}
