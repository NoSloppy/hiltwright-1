import { describe, expect, it } from 'vitest';
import { CATALOGUE, parseStyle } from '@hiltwright/core';
import { cleanDoc, friendly, friendlyDefault, friendlyEnum, layerPickList, summarise } from '../src/renderer/src/treeWords';
import { byColourGroup, choicesFor, colourGroup } from '../src/renderer/src/treeWords';

describe('template names in words', () => {
  it('drops the layer suffix only from real layer templates', () => {
    expect(friendly('ResponsiveClashL')).toBe('Responsive clash');
    expect(friendly('AudioFlickerL')).toBe('Audio flicker');
    expect(friendly('Blue')).toBe('Blue');
    expect(friendly('NORMAL')).toBe('Normal');
    expect(friendly('SWING_SPEED')).toBe('Swing speed');
  });

  it('never clips an enum value', () => {
    expect(friendlyEnum('SaberBase::LOCKUP_NORMAL')).toBe('Normal');
    expect(friendlyEnum('EFFECT_LOW_BATTERY')).toBe('Low battery');
    expect(friendlyEnum('EFFECT_CLASH')).toBe('Clash');
  });

  it('keeps acronym runs whole and reads in sentence case', () => {
    expect(friendly('RandomPerLEDFlickerL')).toBe('Random per LED flicker');
    expect(friendly('ResponsiveLightningBlockL')).toBe('Responsive lightning block');
    expect(friendly('ColorChange')).toBe('Colour change');
  });

  it('drops the Tr prefix from transitions', () => {
    expect(friendly('TrFade')).toBe('Fade');
    expect(friendly('TrInstant')).toBe('Instant');
    expect(friendly('TrWipeIn')).toBe('Wipe in');
  });

  it('uses the overrides where the mechanical name reads badly', () => {
    expect(friendly('LockupTrL')).toBe('Lockup');
    expect(friendly('InOutTrL')).toBe('Ignition and retraction');
    expect(friendly('TransitionEffectL')).toBe('On an effect');
    expect(friendly('MultiTransitionEffectL')).toBe('On an effect (repeatable)');
  });
});

describe('catalogue docs', () => {
  it('strips parameter signatures and return types', () => {
    const d = cleanDoc(CATALOGUE.LockupTrL.doc);
    expect(d.startsWith('This layer creates a complete lockup effect.')).toBe(true);
    expect(d).not.toMatch(/TRANSITION|Return type|LAYER/);
    expect(cleanDoc(CATALOGUE.AlphaL.doc)).toBe('This function makes a color transparent. The ALPHA function specifies just how opaque it should be.');
    expect(cleanDoc('COLOR1, COLOR2, ...:  COLOR Return value: COLOR Decides what color to return.')).toBe('Decides what color to return.');
    expect(cleanDoc('F, HOLD_MILLIS and SPEED: FUNCTION Holds Peak value of F.')).toBe('Holds Peak value of F.');
    expect(cleanDoc('grade: int Randomly selects between A and B.')).toBe('Randomly selects between A and B.');
    expect(cleanDoc('Returns 0-32768 based on battery level. returned value: INTEGER')).toBe('Returns 0-32768 based on battery level.');
    expect(cleanDoc('returned value: FUNCTION, same for all leds Returns 0-32768 based on angle of twist')).toBe('Returns 0-32768 based on angle of twist');
  });

  it('cuts long docs on a word with an ellipsis, and says nothing for a plain colour', () => {
    const long = cleanDoc('word '.repeat(80).trim() + '.', 60);
    expect(long.length).toBeLessThanOrEqual(60);
    expect(long.endsWith('word…')).toBe(true);
    expect(cleanDoc('rgb(0,0,255)')).toBe('');
  });

  it('leaves no signature fragment in any layer doc', () => {
    for (const e of Object.values(CATALOGUE)) if (e.kind === 'COLOR') expect(cleanDoc(e.doc), e.name).not.toMatch(/^[\w ,.]+:\s+(TRANSITION|FUNCTION|COLOR|LAYER|INTEGER)\b|[Rr]eturn (type|value): /);
  });
});

describe('sub-trees in words', () => {
  it('reads a nested function as one line', () => {
    expect(summarise(parseStyle('Scale<SwingSpeed<100>,Int<9000>,Int<14000>>'))).toBe('Scale (Swing speed 100, 9000, 14000)');
    expect(summarise(parseStyle('AudioFlicker<Blue,Rgb<0,0,128>>'))).toBe('Audio flicker (Blue, #000080)');
    expect(summarise(parseStyle('RgbArg<BASE_COLOR_ARG,Rgb<0,0,255>>'))).toBe('Base colour (#0000ff)');
    expect(summarise(parseStyle('TrFade<100>'))).toBe('Fade 100');
  });

  it('shows defaults the same way', () => {
    expect(friendlyDefault('Int<1>')).toBe('1');
    expect(friendlyDefault('TrFade<200>')).toBe('Fade 200');
    expect(friendlyDefault('WHITE')).toBe('White');
    expect(friendlyDefault(null)).toBe('none');
  });
});

describe('the add-a-layer picker', () => {
  it('groups layers, hides the helpers and never lists the same name twice', () => {
    const groups = layerPickList('');
    expect(groups.map((g) => g.group)).toEqual(['Reacts to an effect', 'Always on', 'Ignition and retraction', 'Shape and mix', 'Advanced']);
    const names = groups.flatMap((g) => g.entries.map((e) => e.name));
    expect(names).not.toContain('Layers');
    expect(names).not.toContain('InOutHelperL');
    expect(names).not.toContain('LockupTr');
    expect(names).toContain('LockupTrL');
    const words = names.map(friendly);
    expect(new Set(words).size).toBe(words.length);
    expect(groups.find((g) => g.group === 'Ignition and retraction')!.entries.map((e) => e.name)).toContain('InOutTrL');
    expect(groups.find((g) => g.group === 'Reacts to an effect')!.entries.map((e) => e.name)).toEqual(expect.arrayContaining(['ResponsiveClashL', 'TransitionEffectL', 'MultiTransitionEffectL']));
  });

  it('searches every colour template when asked', () => {
    const [hit] = layerPickList('layers');
    expect(hit.entries.map((e) => e.name)).toContain('Layers');
    expect(layerPickList('ignition and')[0].entries.map((e) => e.name)).toContain('InOutTrL');
  });
});

describe('colour groups', () => {
  it('puts plain colours apart from what moves, mixes or draws over', () => {
    expect(['Red', 'DeepSkyBlue', 'Rgb', 'RgbArg', 'AudioFlicker', 'StyleFire', 'StripesX', 'Mix', 'Gradient', 'AlphaL', 'ResponsiveClashL', 'LockupTrL', 'IgnitionTime'].map((n) => `${n}:${colourGroup(n)}`)).toEqual([
      'Red:Colours', 'DeepSkyBlue:Colours', 'Rgb:Colours', 'RgbArg:Live colours', 'AudioFlicker:Flickers and patterns', 'StyleFire:Flickers and patterns', 'StripesX:Flickers and patterns',
      'Mix:Mixes and shapes', 'Gradient:Mixes and shapes', 'AlphaL:Mixes and shapes', 'ResponsiveClashL:Effect layers', 'LockupTrL:Effect layers', 'IgnitionTime:Other',
    ]);
  });
  it('leaves only timings and helpers in Other', () => {
    const other = choicesFor('COLOR', '').filter((e) => colourGroup(e.name) === 'Other').map((e) => e.name);
    expect(other.every((n) => /Time$|Delay$|^Tr|Helper|SyncAlt/.test(n))).toBe(true);
  });
});

describe('colour lists', () => {
  const colours = () => byColourGroup(choicesFor('COLOR', '')).find(([g]) => g === 'Colours')![1].map((e) => e.name);
  it('shows a colour once however many spellings ProffieOS has for it', () => {
    expect(colours().filter((n) => /^white$/i.test(n))).toEqual(['White']);
  });
  it('keeps the spelling the style uses', () => {
    expect(byColourGroup(choicesFor('COLOR', ''), 'WHITE').find(([g]) => g === 'Colours')![1].map((e) => e.name).filter((n) => /^white$/i.test(n))).toEqual(['WHITE']);
  });
});
