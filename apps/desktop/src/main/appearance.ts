// The chosen theme, kept in <userData>/appearance.json. It is read before the window is made, so the window opens in
// the right colours, and written when the owner picks another. A missing or unreadable file means the default theme:
// nothing here is worth stopping the app for.

import { readFileSync } from 'node:fs';
import { rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_THEME, themeById, type ThemeDef } from '../shared/themes';

const FILE = 'appearance.json';

/** The saved theme. `forced` (the HILTWRIGHT_THEME development switch) wins when it names a theme. */
export function readTheme(userData: string, forced?: string): ThemeDef {
  if (forced && themeById(forced).id === forced) return themeById(forced);
  try {
    const saved = (JSON.parse(readFileSync(join(userData, FILE), 'utf8')) as { theme?: unknown }).theme;
    return themeById(saved);
  } catch {
    return themeById(DEFAULT_THEME);
  }
}

/**
 * How Windows' three caption buttons are drawn over the header row. Their own background is clear, so the header
 * shows through and they wear whatever the theme gives the header (its colour, texture, sheen), and they stop one
 * pixel short of the row's height, so the line under the header runs unbroken beneath them. Only the symbols take a
 * colour of their own.
 */
export const HEADER_HEIGHT = 60;
export function captionOverlay(theme: ThemeDef): { color: string; symbolColor: string; height: number } {
  return { color: 'rgba(0, 0, 0, 0)', symbolColor: theme.window.symbols, height: HEADER_HEIGHT - 1 };
}

/** Saves the theme and returns it. An unknown id saves, and returns, the default. */
export async function saveTheme(userData: string, id: unknown): Promise<ThemeDef> {
  const theme = themeById(id);
  const path = join(userData, FILE);
  await writeFile(`${path}.tmp`, JSON.stringify({ version: 1, theme: theme.id }, null, 2), 'utf8');
  await rename(`${path}.tmp`, path);
  return theme;
}
