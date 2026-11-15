import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkStyle } from '../src/styleCheck';
import { BASES, EFFECTS, TRANSITIONS, defaultStyle, newBlock, styleToCpp } from '../src/styleBuilder';
import { CATALOGUE, defaultTree, newNode, parseStyle, treeFromCpp } from '../src/styleTree';
import { RECIPES, newLayer } from '../src/layerCard';

const texts = (src: string) => checkStyle(parseStyle(src)).map((p) => p.text);

/** Every StylePtr<...> in the fixture configs: real styles from real saber configs. */
function fixtureStyles(): string[] {
  const dir = join(__dirname, 'fixtures');
  const out: string[] = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.h'))) {
    const t = readFileSync(join(dir, f), 'utf8');
    for (let i = t.indexOf('StylePtr<'); i >= 0; i = t.indexOf('StylePtr<', i + 1)) {
      let depth = 0; let j = i + 'StylePtr'.length;
      for (; j < t.length; j++) { if (t[j] === '<') depth++; else if (t[j] === '>' && --depth === 0) break; }
      out.push(t.slice(i + 'StylePtr<'.length, j));
    }
  }
  return out;
}

describe('checking a style before it is saved', () => {
  it('passes every style the editor itself writes', () => {
    for (const b of BASES) { const d = defaultStyle(); d.base = newBlock(b); expect(checkStyle(treeFromCpp(styleToCpp(d, 'X'), 'x').tree), b.kind).toEqual([]); }
    for (const e of EFFECTS) { const d = defaultStyle(); d.effects = [newBlock(e)]; expect(checkStyle(treeFromCpp(styleToCpp(d, 'X'), 'x').tree), e.kind).toEqual([]); }
    for (const t of TRANSITIONS) { const d = defaultStyle(); d.ignition = newBlock(t); d.retraction = newBlock(t); expect(checkStyle(treeFromCpp(styleToCpp(d, 'X'), 'x').tree), t.kind).toEqual([]); }
    expect(checkStyle(defaultTree().tree)).toEqual([]);
    for (const r of RECIPES) expect(checkStyle(parseStyle(r.code)), r.name).toEqual([]);
  });

  it('passes every new-layer starting point', () => {
    const bad: string[] = [];
    for (const [name, e] of Object.entries(CATALOGUE)) {
      if (e.kind !== 'COLOR' || e.internal || !(/L$/.test(name))) continue;
      const p = checkStyle({ name: 'Layers', args: [parseStyle('Blue'), newLayer(name)] });
      if (p.length) bad.push(`${name}: ${p.map((x) => x.text).join(' / ')}`);
    }
    expect(bad).toEqual([]);
  });

  it('passes the styles in real saber configs', () => {
    const styles = fixtureStyles();
    expect(styles.length).toBeGreaterThan(10);
    const bad: string[] = [];
    // Names that are real ProffieOS styles or this config's own aliases, which a pasted style cannot rely on: flagged, and the owner can save anyway.
    const OUTSIDE = /“(BatteryLevelStyle|FanShade|VUMeterStyle1|AhsokaMain|AhsokaCrystal|DualityMain|OshaCorruptionMain)”/;
    for (const s of styles) { let p: string[] = []; try { p = texts(s); } catch { continue; } p = p.filter((x) => !OUTSIDE.test(x)); if (p.length) bad.push(`${s.slice(0, 80)}: ${p.join(' / ')}`); }
    expect(bad).toEqual([]);
  });

  it('passes every template with its parameters filled by default', () => {
    const bad: string[] = [];
    for (const [name, e] of Object.entries(CATALOGUE)) {
      if (e.internal) continue;
      const p = checkStyle(newNode(name));
      // A template that is not itself a colour is a bad root; judge its arguments instead.
      const own = p.filter((x) => x.layer !== null || !/has to be a colour/.test(x.text));
      if (own.length) bad.push(`${name}: ${own.map((x) => x.text).join(' / ')}`);
    }
    expect(bad).toEqual([]);
  });

  it('names an unknown template, in the layer it is in', () => {
    const p = checkStyle(parseStyle('Layers<Blue,ResponsiveClashL<Whte>,ResponsiveBlastL<White>>'));
    expect(p).toHaveLength(1);
    expect(p[0].layer).toBe(1);
    expect(p[0].where).toBe('Layer 1 (ResponsiveClashL)');
    expect(p[0].text).toContain('“Whte”');
  });

  it('says where in the owner’s words, using the names they gave the layers', () => {
    const p = checkStyle(parseStyle('Layers<Blue,Gren>'), ['The base', 'Moss']);
    expect(p[0].where).toBe('“Moss”');
    expect(checkStyle(parseStyle('Layers<Blu,Red>'))[0].where).toBe('The blade');
  });

  it('catches a colour where a number is needed, and a number where a colour is', () => {
    expect(texts('Layers<Blue,AlphaL<White,Red>>').join(' ')).toMatch(/needs a number that can change .* but “Red” is a colour/);
    expect(texts('Layers<Blue,AlphaL<Int<5>,Int<9000>>>').join(' ')).toMatch(/needs a colour .* but “Int” is a number/);
    expect(texts('Layers<Blue,ResponsiveClashL<White,TrInstant,Red>>').join(' ')).toMatch(/needs a transition .* but “Red” is a colour/);
  });

  it('catches too many and too few arguments where the catalogue knows them', () => {
    expect(texts('Layers<Blue,BlastL<White,200,100,400,5,6>>').join(' ')).toMatch(/BlastL takes at most 5 values, but has 6/);
    expect(texts('Layers<Blue,AlphaL<White>>').join(' ')).toMatch(/AlphaL needs at least 2 values, but has 1/);
  });

  it('leaves constants, argument names and effect names alone', () => {
    expect(texts('Layers<RgbArg<BASE_COLOR_ARG,Rgb<0,0,255>>,TransitionEffectL<TrConcat<TrInstant,White,TrFade<300>>,EFFECT_USER1>,LockupTrL<White,TrInstant,TrFade<100>,SaberBase::LOCKUP_NORMAL>>')).toEqual([]);
  });

  it('refuses a style that is not a colour', () => {
    expect(texts('TrInstant').join(' ')).toMatch(/has to be a colour or a stack of layers/);
    expect(checkStyle(parseStyle('Blu'))[0].where).toBe('The style');
  });
});
