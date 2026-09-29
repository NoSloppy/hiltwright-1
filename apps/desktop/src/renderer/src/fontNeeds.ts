// The fonts a saber's presets name, and where each one is: on the card, in the library ready to copy, or nowhere.
// Moved out of Fonts.tsx unchanged so it can be tested (sd-fonts-test-coverage).

import type { FontEntry, LibraryFont } from '../../shared/api';

export interface FontNeeds {
  /** Font folders the presets name (their first font path), without `common`, each once. */
  needed: string[];
  /** Needed, not on the card, and in the library: "Copy all" copies these. */
  copyable: string[];
  /** Needed, and neither on the card nor in the library. */
  missing: string[];
  onCard(font: string): boolean;
  inLibrary(font: string): LibraryFont | null;
}

export function fontsForPresets(presets: { font: string }[], cardFonts: Pick<FontEntry, 'name'>[], library: LibraryFont[]): FontNeeds {
  const needed = [...new Set(presets.map((p) => p.font.split(';')[0]?.trim() ?? '').filter((f) => f && f.toLowerCase() !== 'common'))];
  const onCard = (f: string) => cardFonts.some((x) => x.name.toLowerCase() === f.toLowerCase());
  const inLibrary = (f: string) => library.find((x) => x.folder.toLowerCase() === f.toLowerCase()) ?? null;
  return {
    needed,
    copyable: needed.filter((f) => !onCard(f) && inLibrary(f)),
    missing: needed.filter((f) => !onCard(f) && !inLibrary(f)),
    onCard,
    inLibrary,
  };
}
