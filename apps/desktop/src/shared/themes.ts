// The app's themes. A theme is a name, the few colours that live outside the page (the window's own background and
// its caption-button bar, and the demo room's lighting), and a block of tokens under `:root[data-theme="<id>"]` in
// renderer/src/themes.css. The first theme is the default: its tokens are the plain `:root` block in styles.css.
// A theme sets colour, shapes, lines, type and the backdrop. It never moves anything.
//
// To add a theme: add an entry here, and a `:root[data-theme="<id>"]` block in themes.css that sets the tokens it
// changes. test/themes.test.ts checks that every theme here has its block and that every block belongs to a theme.

export interface ThemeDef {
  id: string;
  name: string;
  /** One line under the name in the picker. */
  about: string;
  /** Outside the page: the window before the page paints, and the bar the caption buttons sit on. */
  window: { back: string; bar: string; symbols: string };
  /** The picker's sample: ground, panel, accent, text. */
  swatch: [string, string, string, string];
  /** The demo room, which is drawn by WebGL and cannot read CSS tokens. */
  scene: { clear: number; floor: number; gridMajor: number; gridMinor: number; ambient: number; fill: number; key: number };
}

export const THEMES: readonly ThemeDef[] = [
  {
    id: 'station',
    name: 'Station',
    about: 'Gloss black, with trooper green for what is selected and what comes next.',
    window: { back: '#050506', bar: '#0a0a0b', symbols: '#dfe2dd' },
    swatch: ['#050506', '#0e0e10', '#86dc5f', '#dfe2dd'],
    scene: { clear: 0x050506, floor: 0x101012, gridMajor: 0x3a3c40, gridMinor: 0x1b1c1e, ambient: 0xa9adb3, fill: 0xeef1f4, key: 0xd9dde2 },
  },
  {
    id: 'hull',
    name: 'Scorched hull',
    about: 'Warm soot and worn paint, with enamel orange for what comes next.',
    window: { back: '#191612', bar: '#24211d', symbols: '#e6dfd0' },
    swatch: ['#191612', '#2b2823', '#d9642b', '#e6dfd0'],
    scene: { clear: 0x080705, floor: 0x171512, gridMajor: 0x4d412d, gridMinor: 0x242019, ambient: 0xaea390, fill: 0xf0e7d6, key: 0xe2d5c0 },
  },
  {
    id: 'hoth',
    name: 'Hoth',
    about: 'A base cut into the ice: pale, cold and soft-edged, with flight-suit orange for what comes next.',
    window: { back: '#b9c6cf', bar: '#d2dde4', symbols: '#14202a' },
    swatch: ['#b9c6cf', '#dfe7ec', '#e8742a', '#34424d'],
    scene: { clear: 0x070b10, floor: 0x121a21, gridMajor: 0x3d5566, gridMinor: 0x1c2831, ambient: 0x9fb4c4, fill: 0xe6f1f8, key: 0xcfe2ee },
  },
  {
    id: 'ronin',
    name: 'Ronin',
    about: 'An old black-and-white film: ink, grain and brush strokes, with red only for what is selected.',
    window: { back: '#0b0b0b', bar: '#101010', symbols: '#e4e0d6' },
    swatch: ['#0b0b0b', '#151515', '#d8281d', '#e4e0d6'],
    scene: { clear: 0x050505, floor: 0x121212, gridMajor: 0x4a4a48, gridMinor: 0x1e1e1d, ambient: 0xa8a8a4, fill: 0xf0eee8, key: 0xd9d7d0 },
  },
  {
    id: 'ninth',
    name: 'The Ninth Jedi',
    about: 'A temple above the mist at dusk: plum and slate, gold-framed, with lantern gold for what comes next.',
    window: { back: '#15131f', bar: '#191725', symbols: '#ece6d8' },
    swatch: ['#15131f', '#1f1c2d', '#f2a93e', '#d8363f'],
    scene: { clear: 0x0b0a12, floor: 0x1a1726, gridMajor: 0x4d4670, gridMinor: 0x231f33, ambient: 0xb0a8cc, fill: 0xffe6c0, key: 0xd8d0f0 },
  },
  {
    id: 'coruscant',
    name: 'Coruscant at night',
    about: 'The city planet from orbit: black glass, rounded shapes, city amber and the blue of its atmosphere.',
    window: { back: '#05070c', bar: '#080b11', symbols: '#eef1f6' },
    swatch: ['#05070c', '#0d1119', '#ffad42', '#6fb0ff'],
    scene: { clear: 0x04060a, floor: 0x0d1119, gridMajor: 0x33435c, gridMinor: 0x161d29, ambient: 0xa0b0cc, fill: 0xffe2b0, key: 0xc8d8f4 },
  },
  {
    id: 'crait',
    name: 'Crait',
    about: 'White salt over red mineral: pale, sharp-cornered, with red showing under every edge.',
    window: { back: '#d8d2cc', bar: '#e7e2dd', symbols: '#1d1210' },
    swatch: ['#d8d2cc', '#f1ede9', '#b8141e', '#7d0c13'],
    scene: { clear: 0x0c0506, floor: 0x1c1011, gridMajor: 0x6a2026, gridMinor: 0x2a1416, ambient: 0xc8b4b0, fill: 0xfff0ea, key: 0xf0d8d2 },
  },
];

export const DEFAULT_THEME = THEMES[0].id;

/** The theme with this id, or the default for anything else (an older file, a theme since removed, a wrong type). */
export function themeById(id: unknown): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
