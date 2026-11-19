// The page's side of themes (shared/themes.ts): which theme is in force, and switching to another.

import { themeById, type ThemeDef } from '../../shared/themes';

/** The theme the page is showing. */
export function currentTheme(): ThemeDef {
  return themeById(document.documentElement.dataset.theme);
}

/** Show a theme now. The tokens in styles.css under `:root[data-theme]` do the rest. */
export function applyTheme(id: unknown): ThemeDef {
  const theme = themeById(id);
  document.documentElement.dataset.theme = theme.id;
  return theme;
}

/** Show a theme and save it. If saving fails the theme still shows, for this run. */
export async function chooseTheme(id: string): Promise<ThemeDef> {
  const theme = applyTheme(id);
  try { await window.hiltwright.theme.set(theme.id); } catch (err) { console.error(`[theme] not saved: ${String(err)}`); }
  return theme;
}
