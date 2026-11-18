// A preset's font field as the Presets page edits it (preset-editor-fixes D3): ProffieOS takes a list of folders,
// `Main;Extra;common`. The page edits the first folder and the common switch, and keeps every other folder.

export interface FontParts {
  /** The folder the page edits: the first in the list. */
  folder: string;
  /** Every other folder, in order, apart from `common`. */
  extra: string[];
  common: boolean;
}

export function splitFont(font: string): FontParts {
  const parts = font.split(';').map((p) => p.trim()).filter(Boolean);
  const folder = parts[0] ?? '';
  const rest = parts.slice(1);
  return { folder: folder === 'common' ? '' : folder, extra: rest.filter((p) => p !== 'common'), common: folder === 'common' || rest.includes('common') };
}

export function joinFont(f: FontParts): string {
  const list = [f.folder, ...f.extra].filter((p) => p && p !== 'common');
  if (f.common) list.push('common');
  return list.join(';');
}
