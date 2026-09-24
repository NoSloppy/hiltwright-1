// Plain words for the full style editor: template names, catalogue docs and whole sub-trees, said without C++.
// Pure, so the tests can pin the wording down.

import { CATALOGUE, parseStyle, type CatEntry, type Kind, type Node } from '@hiltwright/core';

export const COLOR_ARGS: [string, string][] = [['BASE_COLOR_ARG', 'Base colour'], ['ALT_COLOR_ARG', 'Alt colour'], ['IGNITION_COLOR_ARG', 'Ignition colour'], ['BLAST_COLOR_ARG', 'Blast colour'], ['CLASH_COLOR_ARG', 'Clash colour'], ['LOCKUP_COLOR_ARG', 'Lockup colour'], ['DRAG_COLOR_ARG', 'Drag colour'], ['LB_COLOR_ARG', 'Lightning block colour'], ['STAB_COLOR_ARG', 'Stab colour'], ['SWING_COLOR_ARG', 'Swing colour'], ['EMITTER_COLOR_ARG', 'Emitter colour'], ['PREON_COLOR_ARG', 'Pre-on colour'], ['RETRACTION_COLOR_ARG', 'Retraction colour'], ['POSTOFF_COLOR_ARG', 'Post-off colour'], ['OFF_COLOR_ARG', 'Off colour'], ['ALT_COLOR2_ARG', '2nd alt colour'], ['ALT_COLOR3_ARG', '3rd alt colour']];

/** Templates whose mechanical names read badly. */
const NAMES: Record<string, string> = { RgbArg: 'Live colour', LockupTrL: 'Lockup', LockupL: 'Classic lockup', InOutTrL: 'Ignition and retraction', TransitionEffectL: 'On an effect', MultiTransitionEffectL: 'On an effect (repeatable)', TransitionPulseL: 'On a pulse', OnSparkL: 'Ignition spark' };

const sentence = (s: string): string => s.replace(/\b([Cc])olor/g, '$1olour').replace(/^./, (c) => c.toUpperCase());
/** SCREAMING_CASE words (effects, lockup types, defaults like WHITE): all lower case bar the first letter. */
const enumWords = (s: string): string => sentence(s.replace(/_/g, ' ').toLowerCase().trim());

/** An EFFECT_ or LOCKUP_ value in words. Never goes near the catalogue, so LOCKUP_NORMAL keeps its L. */
export const friendlyEnum = (v: string): string => enumWords(v.replace(/^(SaberBase::)?(EFFECT_|LOCKUP_)/, ''));

/** Plain words for a template name, in sentence case: ResponsiveLightningBlockL -> Responsive lightning block. */
export function friendly(name: string): string {
  if (NAMES[name]) return NAMES[name];
  const e = CATALOGUE[name];
  let n = name;
  if (e?.kind === 'COLOR' && /[A-Za-z0-9]L$/.test(n)) n = n.slice(0, -1); // the layer suffix, only on a real layer
  if (e?.kind === 'TRANSITION' && /^Tr[A-Z]/.test(n)) n = n.slice(2); // TrWipeIn -> Wipe in
  if (/^[A-Z0-9_:]+$/.test(n) && /[A-Z]{2}/.test(n)) return enumWords(n.replace(/^.*::/, ''));
  // Split camel case, keeping acronym runs whole (PerLEDFlicker -> Per LED Flicker), then lower every ordinary word.
  const words = n.replace(/_/g, ' ').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/\s+/).filter(Boolean);
  return sentence(words.map((w) => (/^[A-Z][a-z]/.test(w) ? w.toLowerCase() : w)).join(' '));
}

// ---- catalogue docs ----

const KIND_WORD = '(?:TRANSITION|FUNCTION|FUNCITON|COLOR|LAYER|INTEGER|int)';
// "Return value: LAYER", "returned value: FUNCTION, same for all leds", "Return type: LAYER", "Returns: COLOR"
const RETURN_SIG = new RegExp(`\\b[Rr]eturn(?:s|ed)?(?:\\s+(?:[Tt]ype|[Vv]alue))?\\s*:\\s*${KIND_WORD}\\b(?:,\\s*same for all leds)?\\.?`, 'g');
// "BeginTr, EndTr: TRANSITION", "COLOR1, COLOR2, ...:  COLOR", "F, HOLD_MILLIS and SPEED: FUNCTION", "grade: int"
const PARAM_SIG = new RegExp(`(^|[\\s.])\\w+(?:\\.\\.\\.)?(?:\\s*(?:,|\\band\\b)\\s*(?:\\w+(?:\\.\\.\\.)?|\\.\\.\\.))*\\s*:\\s+${KIND_WORD}\\b`, 'g');

/** A catalogue doc without its signature fragments: the first sentence or two, cut on a word with an ellipsis. */
export function cleanDoc(doc: string, max = 150): string {
  if (!doc || /^rgb\(/.test(doc)) return ''; // a named colour's doc is just its value
  const s = doc.replace(RETURN_SIG, ' ').replace(PARAM_SIG, '$1').replace(/^\s*Returns:\s*/, 'Returns ').replace(/(\w)<>/g, '$1').replace(/\s+/g, ' ').trim().replace(/^./, (c) => c.toUpperCase());
  if (!s) return '';
  // Sentence ends: a stop followed by a space and a capital (or the end), so "0.5" and "e.g. x" stay whole.
  const ends = [...s.matchAll(/[.!?](?=\s+[A-Z(]|$)/g)].map((m) => m.index! + 1);
  let out = ends.length ? s.slice(0, ends[0]) : s;
  if (ends.length > 1 && out.length < 70) out = s.slice(0, ends[1]);
  if (out.length <= max) return out;
  const cut = out.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(' ') > max / 2 ? cut.lastIndexOf(' ') : cut.length).replace(/[\s,;:.]+$/, '') + '…';
}

/** Layers the catalogue documents too thinly to describe. */
const BLURBS: Record<string, string> = {
  AlphaMixL: 'Mixes colours by a function, as a see-through layer.',
  MultiTransitionEffectL: 'Like On an effect, but each trigger runs its own copy, so quick repeats overlap.',
  OnSparkL: 'A flash of colour just after ignition, fading out.',
  SequenceL: 'Blinks a colour in an on/off pattern.',
};
/** Layers whose catalogue doc describes them misleadingly, said plainly. */
const PLAIN: Record<string, string> = {
  TransitionEffectL: 'Plays its steps, in order, each time the effect happens.',
  MultiTransitionEffectL: 'Plays its steps each time the effect happens; quick repeats overlap.',
  TransitionPulseL: 'Plays its steps each time its pulse fires.',
  InOutTrL: 'How the blade comes on and goes out.',
  Mix: 'Blends its colours by a number: the first at 0, the last at full, a mix in between.',
  SyncAltToVarianceL: 'Paints nothing: it keeps the alt colour in step with the colour variance setting. Put it anywhere above the base.',
  TransitionLoopL: 'Plays its steps over and over, for as long as the blade is on.',
  SequenceL: 'Blinks a colour in a pattern of on and off, like Morse code.',
};
export const describe = (e: CatEntry | undefined): string => (e ? PLAIN[e.name] || cleanDoc(e.doc) || BLURBS[e.name] || '' : '');

// ---- colours and whole sub-trees ----

// Hex -> a colour name from the catalogue (White, DeepSkyBlue -> Deep sky blue), shortest name first.
let NAMED: Map<string, string> | null = null;
/** A plain-language name for a colour: the catalogue's name for it, or its hex. */
export function colourName(hex: string): string {
  if (!NAMED) {
    NAMED = new Map();
    const named = Object.values(CATALOGUE).filter((e) => e.kind === 'COLOR' && !e.params.length && /^rgb\(/.test(e.doc) && /[a-z]/.test(e.name)).sort((a, b) => a.name.length - b.name.length || a.name.localeCompare(b.name));
    for (const e of named) { const h = hexOf({ name: e.name, args: [] }); if (h && !NAMED.has(h)) NAMED.set(h, friendly(e.name)); }
  }
  return NAMED.get(hex.toLowerCase()) ?? hex;
}

export const hexOf = (n: Node): string | null => {
  if (n.name === 'Rgb' && n.args.length === 3) return '#' + n.args.map((a) => Math.max(0, Math.min(255, Number(a.name) || 0)).toString(16).padStart(2, '0')).join('');
  const e = CATALOGUE[n.name];
  if (e && e.kind === 'COLOR' && !e.params.length) { const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(e.doc); if (m) return '#' + m.slice(1, 4).map((x) => Number(x).toString(16).padStart(2, '0')).join(''); }
  return null;
};

const isNum = (n: Node): boolean => /^-?\d+$/.test(n.name) || (n.name === 'Int' && n.args.length === 1 && /^-?\d+$/.test(n.args[0].name));

/** A sub-tree as one line of words: Scale<SwingSpeed<100>,Int<9000>,Int<14000>> -> Scale (Swing speed 100, 9000, 14000). */
export function summarise(n: Node): string {
  if (/^-?\d+$/.test(n.name)) return n.name;
  if (n.name === 'Int' && n.args.length === 1) return summarise(n.args[0]);
  if (n.name === 'Rgb' && n.args.length === 3) return hexOf(n)!;
  if (/^(SaberBase::)?(EFFECT_|LOCKUP_)/.test(n.name)) return friendlyEnum(n.name);
  if (n.name === 'RgbArg' && n.args.length) { const label = COLOR_ARGS.find(([a]) => a === n.args[0].name)?.[1] ?? friendly(n.args[0].name); return n.args[1] ? `${label} (${summarise(n.args[1])})` : label; }
  const name = friendly(n.name);
  if (!n.args.length) return name;
  if (n.args.length === 1 && isNum(n.args[0])) return `${name} ${summarise(n.args[0])}`; // Swing speed 100, Fade 200
  return `${name} (${n.args.map(summarise).join(', ')})`;
}

/** A parameter's default as the catalogue writes it (Int<1>, WHITE, TrFade<200>), in the same words. */
export function friendlyDefault(def: string | null): string {
  if (def == null) return 'none';
  try { return summarise(parseStyle(def)); } catch { return def; }
}

// ---- choosing templates ----

/** Catalogue entries a slot of `kind` can take, the current one included even if it is an internal helper. */
export function choicesFor(kind: Kind, current: string): CatEntry[] {
  const all = Object.values(CATALOGUE).filter((e) => !e.internal || e.name === current);
  const list = kind === 'COLOR' ? all.filter((e) => e.kind === 'COLOR') : kind === 'FUNCTION' || kind === 'INTEGER' ? all.filter((e) => e.kind === 'FUNCTION') : kind === 'TRANSITION' ? all.filter((e) => e.kind === 'TRANSITION') : all;
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

/** The groups a colour list is shown in, in order: plain colours first, then what moves, mixes, draws over, the rest. */
export const COLOUR_GROUPS = ['Colours', 'Live colours', 'Flickers and patterns', 'Mixes and shapes', 'Effect layers', 'Other'] as const;
export type ColourGroup = (typeof COLOUR_GROUPS)[number];

/** Where a colour template sits: a plain colour (Red, Rgb<>), one changeable on Presets, a moving pattern, and so on. */
export function colourGroup(name: string): ColourGroup {
  const e = CATALOGUE[name];
  if (name === 'Rgb' || name === 'Rgb16' || (e && !e.params.length && /^rgb\(/.test(e.doc))) return 'Colours';
  if (/Arg$/.test(name)) return 'Live colours';
  if (/Time$|Delay$|^Tr|Helper|SyncAlt/.test(name)) return 'Other';
  if (/^(Mix|Gradient|Alpha|Layers|Color(Select|Change|Sequence)|Remap|Pixelate)/.test(name)) return 'Mixes and shapes';
  if (/L$/.test(name) || /Blast|Clash|Lockup|Drag|Melt|Stab|Lightning|InOut|OnSpark|TransitionEffect|TransitionLoop|TransitionPulse|EffectSequence|EasyBlade/.test(name)) return 'Effect layers';
  if (/Flicker|Puls|Blink|Sparkle|Strobe|Stripes|Fire|Rainbow|Cylon|Sequence|Random|Hue|RotateColors|ColorCycle/.test(name)) return 'Flickers and patterns';
  return 'Other';
}
/**
 * Catalogue entries sorted into COLOUR_GROUPS, empty groups left out. Plain colours spelt two ways (White and WHITE)
 * show once: the one `keep` names if it is among them, else the mixed-case one.
 */
export function byColourGroup(entries: CatEntry[], keep?: string): [ColourGroup, CatEntry[]][] {
  const seen = new Map<string, CatEntry>();
  for (const e of entries) {
    const k = colourGroup(e.name) === 'Colours' ? friendly(e.name) : `#${e.name}`; // only plain colours have spellings that read the same
    const had = seen.get(k);
    if (!had || e.name === keep || (had.name !== keep && /^[A-Z0-9_]+$/.test(had.name) && !/^[A-Z0-9_]+$/.test(e.name))) seen.set(k, e);
  }
  const once = [...seen.values()];
  return COLOUR_GROUPS.map((g) => [g, once.filter((e) => colourGroup(e.name) === g)] as [ColourGroup, CatEntry[]]).filter(([, l]) => l.length);
}

export const LAYER_GROUPS = ['Reacts to an effect', 'Always on', 'Ignition and retraction', 'Shape and mix', 'Advanced'] as const;
/** Kept out of the browsing view: the stack itself and the helpers the ignition layers are built from. */
const HIDDEN_LAYERS = new Set(['Layers', 'InOutHelperL']);

export function layerGroup(name: string): (typeof LAYER_GROUPS)[number] {
  if (/InOut|Ignition|Retraction|Preon|PostOff|OnSpark/.test(name)) return 'Ignition and retraction';
  if (/Clash|Blast|Lockup|Drag|Melt|Stab|Lightning|TransitionEffect|TransitionPulse/.test(name)) return 'Reacts to an effect';
  if (/Flicker|Sparkle|Pulsing|Strobe|Blink|Random|Stripes|Rainbow|TransitionLoop|Sequence/.test(name)) return 'Always on';
  if (/^Alpha|Mix|Gradient/.test(name)) return 'Shape and mix';
  return 'Advanced';
}

/**
 * What the add-a-layer picker lists. With no search: layer templates in labelled groups, without the helpers. A search
 * looks through every colour template. Either way a plain template is dropped when its ...L layer twin exists.
 */
export function layerPickList(query: string): { group: string; entries: CatEntry[] }[] {
  const q = query.trim().toLowerCase();
  const colours = choicesFor('COLOR', '').filter((e) => !(CATALOGUE[e.name + 'L']?.kind === 'COLOR' && !CATALOGUE[e.name + 'L'].internal));
  const byName = (a: CatEntry, b: CatEntry) => friendly(a.name).localeCompare(friendly(b.name));
  if (q) return [{ group: '', entries: colours.filter((e) => e.name.toLowerCase().includes(q) || friendly(e.name).toLowerCase().includes(q) || e.doc.toLowerCase().includes(q)).sort(byName) }];
  const layers = colours.filter((e) => (/L$/.test(e.name) || /LAYER/i.test(e.doc)) && !HIDDEN_LAYERS.has(e.name));
  return LAYER_GROUPS.map((group) => ({ group, entries: layers.filter((e) => layerGroup(e.name) === group).sort(byName) })).filter((g) => g.entries.length);
}
