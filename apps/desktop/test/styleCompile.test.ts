import { describe, expect, it } from 'vitest';
import {
  BASES, EFFECTS, RECIPES, SENSORS, TRANSITIONS, aliasFor, checkStyle, defaultStyle, defaultTree, newBlock, newLayer, numNode, parseStyle, printStyle, readLayer, setShape, setStrength, setWhen, styleToCpp, styleToLook, treeFromCpp, treeToLook, unlockPair,
  type LookDef, type ModelBlade, type Node, type SaberConfigModel, type SensorKey, type Shape, type StyleDoc, type TreeDoc, type WhenType,
} from '@hiltwright/core';
import { buildFirmware } from '../src/main/build';
import { PATTERNS, makePattern } from '../src/renderer/src/patterns';
import { layerPickList } from '../src/renderer/src/treeWords';

// Every style the editor can write, through the real toolchain (ST34). Needs HILTWRIGHT_TOOLCHAIN_DIR; a build takes
// 20 to 60 seconds, so many styles go into one firmware (one preset each) and a failing batch is split in halves until
// the styles that fail are alone. Run it with:
//   HILTWRIGHT_TOOLCHAIN_DIR=C:/ProgramData/Hiltwright npx vitest run test/styleCompile.test.ts
const root = process.env.HILTWRIGHT_TOOLCHAIN_DIR;
const main: ModelBlade = { id: 'b1', role: 'main', type: 'pixel', pixels: 132, order: 'GRB', extra: [], leds: [], parallel: 1, wiring: { kind: 'own', dataPin: 'bladePin', powerPins: ['bladePowerPin2', 'bladePowerPin3'] } };

// ---------------- the forms ----------------

interface Form { name: string; look: LookDef }
let counter = 0;
const idFor = (name: string) => `look_f${(counter++).toString(36)}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30)}`;
const simpleForm = (name: string, doc: StyleDoc): Form => { const id = idFor(name); return { name, look: styleToLook({ ...doc, name }, id) }; };
const treeForm = (name: string, doc: TreeDoc): Form => { const id = idFor(name); return { name, look: treeToLook({ ...doc, name }, id, aliasFor(id)) }; };
/** A full-editor style: the default stack with `layer` added on top of the base, as the editor's Add does. */
const withLayer = (layer: Node): TreeDoc => { const d = defaultTree(); d.tree.args.splice(1, 0, layer); return d; };
const withBase = (base: Node): TreeDoc => { const d = defaultTree(); d.tree.args[0] = base; return d; };
const dedupe = (forms: Form[]): Form[] => { const seen = new Set<string>(); return forms.filter((f) => { const k = f.look.define!.replace(/^using \w+ =/, ''); if (seen.has(k)) return false; seen.add(k); return true; }); };

/** Simple: every base (with the default effects), every effect alone, every transition as ignition and as retraction. */
function simpleForms(): Form[] {
  const forms: Form[] = [];
  for (const b of BASES) forms.push(simpleForm(`base ${b.kind}`, { ...defaultStyle(), base: newBlock(b) }));
  for (const e of EFFECTS) forms.push(simpleForm(`effect ${e.kind}`, { ...defaultStyle(), effects: [newBlock(e)] }));
  for (const t of TRANSITIONS) {
    forms.push(simpleForm(`ignition ${t.kind}`, { ...defaultStyle(), ignition: newBlock(t) }));
    forms.push(simpleForm(`retraction ${t.kind}`, { ...defaultStyle(), retraction: newBlock(t) }));
  }
  forms.push(simpleForm('every effect, lava, spark and centre', { ...defaultStyle(), base: { kind: 'lava', params: { base: '#ff1e00', alt: '#ffa000' } }, effects: EFFECTS.map((e) => newBlock(e)), ignition: newBlock(TRANSITIONS.find((t) => t.kind === 'spark')!), retraction: newBlock(TRANSITIONS.find((t) => t.kind === 'centre')!) }));
  return forms;
}
/** The same Simple styles opened in the full editor (openAsTree). */
function convertedForms(): Form[] {
  return simpleForms().map((f) => treeForm(`as tree: ${f.name}`, treeFromCpp(styleToCpp(f.look.style as StyleDoc, 'X'), f.name)));
}

const RESPONSIVE = 'Layers<Red, ResponsiveLockupL<White,TrInstant,TrFade<100>,Int<26000>>, ResponsiveLightningBlockL<White>, ResponsiveMeltL<Mix<TwistAngle<>,Red,Yellow>>, ResponsiveDragL<White>, ResponsiveClashL<White,TrInstant,TrFade<200>,Int<26000>>, ResponsiveBlastL<White>, ResponsiveBlastWaveL<White>, ResponsiveBlastFadeL<White>, ResponsiveStabL<White>, InOutTrL<TrWipe<300>,TrWipeIn<500>>>';
const recipeForms = (): Form[] => [treeForm('the responsive example from the official editor, pasted', treeFromCpp(RESPONSIVE, 'Responsive')), ...RECIPES.map((r) => treeForm(`recipe ${r.name}`, withLayer(parseStyle(r.code))))];
/** Every template the add-a-layer picker offers, as newLayer starts it. */
const startForms = (): Form[] => layerPickList('').flatMap((g) => g.entries).map((e) => treeForm(`new layer ${e.name}`, withLayer(newLayer(e.name))));

// What switching the shape, the trigger or the strength of a layer card writes, from each kind of starting layer.
const STARTS = [
  'Red', 'AlphaL<White,Bump<Int<16384>,Int<8000>>>', 'AlphaL<Orange,SmoothStep<Int<29000>,Int<2000>>>', 'AlphaL<Orange,SmoothStep<Int<6000>,Int<-2000>>>', 'AlphaL<White,Int<12000>>',
  ...RECIPES.filter((r) => /^(Lockup spot|Flash on an effect|Spot on an effect)$/.test(r.name)).map((r) => r.code),
];
const SHAPES: Exclude<Shape, 'custom'>[] = ['whole', 'spot', 'hilt', 'tip'];
const WHENS: WhenType[] = ['always', 'effect', 'lockup'];
const SENSOR_KEYS = Object.keys(SENSORS) as SensorKey[];
type Composed = Extract<ReturnType<typeof readLayer>, { form: 'composed' }>;
const composed = (n: Node): { n: Node; card: Composed } | null => { const card = readLayer(n); return card.form === 'composed' ? { n, card } : null; };
function cardEditForms(): Form[] {
  const forms: Form[] = [];
  const add = (label: string, layer: Node) => forms.push(treeForm(label, withLayer(layer)));
  for (const src of STARTS) {
    const s = composed(parseStyle(src));
    if (!s) throw new Error(`${src} is not a composed layer`);
    for (const shape of SHAPES) add(`${src} > shape ${shape}`, setShape(s.n, s.card, shape));
    for (const when of WHENS) add(`${src} > trigger ${when}`, setWhen(s.n, s.card, when));
    for (const shape of SHAPES) for (const when of WHENS) {
      const a = composed(setShape(s.n, s.card, shape));
      if (a) add(`${src} > shape ${shape}, then trigger ${when}`, setWhen(a.n, a.card, when));
      const b = composed(setWhen(s.n, s.card, when));
      if (b) add(`${src} > trigger ${when}, then shape ${shape}`, setShape(b.n, b.card, shape));
    }
    add(`${src} > strength fixed`, setStrength(s.n, s.card, parseStyle('Int<12000>')));
    for (const sensor of SENSOR_KEYS) add(`${src} > strength follows ${sensor}`, setStrength(s.n, s.card, numNode({ mode: 'follow', sensor, from: 4000, to: 28000, window: null }, undefined)));
  }
  return dedupe(forms);
}

/** "Reacts to…": every pair of every picker template, rewritten to follow each other sensor. */
function reactsForms(): Form[] {
  const forms: Form[] = [];
  for (const e of layerPickList('').flatMap((g) => g.entries)) {
    const layer = newLayer(e.name);
    const card = readLayer(layer);
    if (card.form !== 'template') continue;
    for (const p of card.pairs) for (const sensor of SENSOR_KEYS) {
      if (sensor === p.sensor) continue;
      const open = unlockPair(layer, p, sensor);
      if (open) forms.push(treeForm(`${e.name} > ${p.label} reacts to ${sensor}`, withLayer(open)));
    }
  }
  return dedupe(forms);
}

/** Pattern swaps in a colour slot: plain colour to each pattern, each pattern to plain and to each other pattern; the base and a layer's colour. */
function patternForms(): Form[] {
  const forms: Form[] = [];
  const names = PATTERNS.map(([n]) => n);
  const plain = parseStyle('RgbArg<BASE_COLOR_ARG,Rgb<0,0,255>>');
  const from: [string, Node][] = [['plain', plain], ...names.map((n): [string, Node] => [n, makePattern(n, plain)])];
  for (const [fromName, start] of from) for (const to of ['', ...names]) {
    const next = makePattern(to, start);
    forms.push(treeForm(`base ${fromName} > ${to || 'plain'}`, withBase(next)));
  }
  // The colour of a layer (ResponsiveClashL's COLOR), from plain.
  for (const to of names) forms.push(treeForm(`clash colour plain > ${to}`, withLayer({ name: 'ResponsiveClashL', args: [makePattern(to, plain)] })));
  return dedupe(forms);
}

// ---------------- compiling in batches ----------------

const BATCH = Number(process.env.HILTWRIGHT_STYLE_BATCH ?? 40);
let builds = 0;
let compiled = 0;
async function build(forms: Form[], tag: string): Promise<{ ok: boolean; message: string; pct: number | null }> {
  const model: SaberConfigModel = {
    name: 'hw_style_test', board: 'V3', boardFrom: 'owner', buttons: 2, prop: 'sa22c', blades: [main],
    presets: forms.map((f, i) => ({ font: 'A;common', track: '', name: `P${i}`, looks: [f.look.id] })), looks: forms.map((f) => f.look),
  };
  builds++;
  const r = await buildFirmware({ toolchainRoot: root!, saberId: `style-compile-${tag}`, model, force: true });
  const errors = r.output.split('\n').filter((l) => /error/i.test(l)).slice(0, 3).map((l) => l.trim().slice(0, 300));
  return { ok: r.ok, message: [...r.problems, ...errors].join(' | '), pct: r.flashPct };
}
/** Compile the forms together; on failure split them until the ones that fail are alone. Returns name -> compiler message. */
async function failures(forms: Form[], tag: string, log: (s: string) => void): Promise<Record<string, string>> {
  if (!forms.length) return {};
  const r = await build(forms, tag);
  if (r.ok) { compiled += forms.length; log(`${forms.length} styles ok (${r.pct}% of V3 flash)`); return {}; }
  if (forms.length === 1) { log(`FAIL ${forms[0].name}: ${r.message}`); return { [forms[0].name]: r.message }; }
  log(`${forms.length} styles failed together: ${r.message.slice(0, 200)}; splitting`);
  const mid = Math.ceil(forms.length / 2);
  return { ...(await failures(forms.slice(0, mid), tag, log)), ...(await failures(forms.slice(mid), tag, log)) };
}
const chunks = <T,>(xs: T[], n: number): T[][] => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

/**
 * Forms that do not compile today. Each is a real bug in what the editor writes: it stays here, with the compiler's
 * message, until fixed, and the test fails when one starts compiling (so the entry is removed) or a new one fails.
 */
const KNOWN_FAILURES: Record<string, string> = {};

async function check(group: string, forms: Form[]): Promise<void> {
  const t0 = Date.now();
  const log = (s: string) => console.log(`[style:${group}] ${s}`);
  log(`${forms.length} styles in batches of ${BATCH}`);
  const known = forms.filter((f) => f.name in KNOWN_FAILURES);
  const rest = forms.filter((f) => !(f.name in KNOWN_FAILURES));
  const failed: Record<string, string> = {};
  for (const [i, c] of chunks(rest, BATCH).entries()) Object.assign(failed, await failures(c, `${group}-${i}`, log));
  const stillBroken = known.length ? await failures(known, `${group}-known`, log) : {};
  log(`done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  expect(failed, 'forms that fail to compile and are not listed as known failures').toEqual({});
  expect(known.map((f) => f.name).filter((n) => !(n in stillBroken)), 'known failures that now compile: remove them from KNOWN_FAILURES').toEqual([]);
}

describe('what the editors write is real C++', () => {
  it('the forms are all distinct and pass the check before saving', () => {
    const all = [...simpleForms(), ...convertedForms(), ...recipeForms(), ...startForms(), ...cardEditForms(), ...reactsForms(), ...patternForms()];
    expect(all.length).toBeGreaterThan(300);
    const names = all.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
    // A style the editor writes itself must never be one the save check refuses.
    const refused = all.filter((f) => f.look.style && 'tree' in (f.look.style as object)).map((f) => ({ name: f.name, problems: checkStyle((f.look.style as TreeDoc).tree).map((p) => p.text) })).filter((x) => x.problems.length);
    expect(refused).toEqual([]);
    console.log(`[style] ${all.length} forms in all, ${all.map((f) => f.look.id).length} ids`);
  });
});

describe.skipIf(!root)('every form compiles in the real toolchain', () => {
  const MIN = 60 * 1000;
  it('Simple: every base, effect, ignition and retraction', async () => { await check('simple', simpleForms()); }, 40 * MIN);
  it('Simple opened in the full editor', async () => { await check('converted', convertedForms()); }, 40 * MIN);
  it('recipes and every new-layer starting point', async () => { await check('starts', dedupe([...recipeForms(), ...startForms()])); }, 120 * MIN);
  it('shape, trigger and strength changes on a layer card', async () => { await check('card', cardEditForms()); }, 120 * MIN);
  it('"Reacts to…" rewrites', async () => { await check('reacts', reactsForms()); }, 120 * MIN);
  it('pattern swaps', async () => { await check('patterns', patternForms()); }, 120 * MIN);
  it('prints the totals', () => { console.log(`[style] ${compiled} styles compiled ok in ${builds} builds`); });
});
