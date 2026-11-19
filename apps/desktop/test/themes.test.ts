// Themes: the list is well formed, every theme has its block of tokens in styles.css (and no block is an orphan),
// and the saved choice survives a round trip and falls back to the default when it cannot be used.

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_THEME, THEMES, themeById } from '../src/shared/themes';
import { readTheme, saveTheme } from '../src/main/appearance';

const dir = join(import.meta.dirname, '../src/renderer/src');
const base = readFileSync(join(dir, 'styles.css'), 'utf8');
const themesCss = readFileSync(join(dir, 'themes.css'), 'utf8');
const css = `${base}\n${themesCss}`;
const HEX = /^#[0-9a-f]{6}$/;

describe('the theme list', () => {
  it('has unique ids, a name and a line of description for each', () => {
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
    for (const t of THEMES) {
      expect(t.id, t.id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(t.name.length, t.id).toBeGreaterThan(0);
      expect(t.about.length, t.id).toBeGreaterThan(0);
    }
  });

  it('gives the window and the picker plain six-digit colours', () => {
    for (const t of THEMES) {
      for (const c of [t.window.back, t.window.bar, t.window.symbols, ...t.swatch]) expect(c, `${t.id} ${c}`).toMatch(HEX);
      for (const n of Object.values(t.scene)) expect(Number.isInteger(n) && n >= 0 && n <= 0xffffff, `${t.id} scene`).toBe(true);
    }
  });

  it('falls back to the default for an id it does not know', () => {
    expect(themeById('no-such-theme').id).toBe(DEFAULT_THEME);
    expect(themeById(undefined).id).toBe(DEFAULT_THEME);
    expect(themeById(42).id).toBe(DEFAULT_THEME);
  });

  it('opens a theme saved under an id it has since been renamed from', () => {
    expect(themeById('saberbench').id).toBe('original');
  });
});

describe('the tokens in styles.css', () => {
  const blocks = [...css.matchAll(/:root\[data-theme="([^"]+)"\]\{/g)].map((m) => m[1]);

  it('has one block for every theme but the default, whose tokens are the plain :root block', () => {
    expect(blocks.sort()).toEqual(THEMES.map((t) => t.id).filter((id) => id !== DEFAULT_THEME).sort());
    expect(base).toMatch(/^:root\{/m);
  });

  it('never moves anything: no theme rule sets a size, a margin, a grid or an order', () => {
    // Padding is allowed only where a button's shape needs room for its points.
    const moved = [...themesCss.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(?:^|[;{\s])((?:min-|max-)?(?:width|height)|margin(?:-[a-z]+)?|grid(?:-[a-z-]+)?|order|flex(?:-[a-z]+)?|gap|top|left|right|bottom|position|display)\s*:/g)].map((m) => m[1]);
    expect(moved).toEqual([]);
  });

  it('sets, in each block, every surface token a theme has to decide', () => {
    const must = ['--bg0', '--bg1', '--text', '--mute', '--holo', '--holo-fill', '--sel', '--plate', '--tape-ink', '--rail', '--ground', '--btn', '--pri', '--lit'];
    for (const id of blocks) {
      const start = css.indexOf(`:root[data-theme="${id}"]{`);
      const block = css.slice(start, css.indexOf('\n}', start));
      for (const token of must) expect(block.includes(`${token}:`), `${id} ${token}`).toBe(true);
    }
  });
});

describe('the saved theme', () => {
  const dirs: string[] = [];
  const dir = () => { const d = mkdtempSync(join(tmpdir(), 'hw-theme-')); dirs.push(d); return d; };
  afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
  const other = THEMES.find((t) => t.id !== DEFAULT_THEME)!;

  it('is the default when nothing is saved', () => {
    expect(readTheme(dir()).id).toBe(DEFAULT_THEME);
  });

  it('comes back after saving', async () => {
    const d = dir();
    expect((await saveTheme(d, other.id)).id).toBe(other.id);
    expect(readTheme(d).id).toBe(other.id);
  });

  it('saves the default in place of an id it does not know', async () => {
    const d = dir();
    expect((await saveTheme(d, 'no-such-theme')).id).toBe(DEFAULT_THEME);
    expect(readTheme(d).id).toBe(DEFAULT_THEME);
  });

  it('is the default when the file is damaged or names a theme that is gone', () => {
    const d = dir();
    writeFileSync(join(d, 'appearance.json'), '{ not json');
    expect(readTheme(d).id).toBe(DEFAULT_THEME);
    writeFileSync(join(d, 'appearance.json'), JSON.stringify({ version: 1, theme: 'removed-theme' }));
    expect(readTheme(d).id).toBe(DEFAULT_THEME);
  });

  it('lets the development switch show a theme without saving it, and ignores a switch that names none', async () => {
    const d = dir();
    await saveTheme(d, DEFAULT_THEME);
    expect(readTheme(d, other.id).id).toBe(other.id);
    expect(readTheme(d).id).toBe(DEFAULT_THEME);
    expect(readTheme(d, 'no-such-theme').id).toBe(DEFAULT_THEME);
  });
});
