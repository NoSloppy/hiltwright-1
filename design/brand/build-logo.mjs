// Hiltwright logo, built from code so every variant stays in step: `node design/brand/build-logo.mjs`.
//
// The mark is a hilt with its blade lit, on the diagonal of a tile whose two cut corners are the app's own button
// shape (see .btn in styles.css), edged in holo cyan. The wordmark is drawn letter by letter from strokes on a grid,
// wide and squared like the Michroma headings in the app, so it needs no font to render. Colours are the app's
// design tokens.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = dirname(fileURLToPath(import.meta.url));
const C = { bg0: '#0a0e13', bg1: '#101720', bg3: '#1c2833', line2: '#3b4c5e', text: '#e6edf3', dim: '#a3b3c2', holo: '#5fd3ff', holoDim: '#2a8bb0', ink: '#062533', amber: '#ffb547', steel: '#c9d6e2', steelDark: '#6f8396' };

// ---- the mark, on a 256 grid ----

/** The tile: a square with its top-left and bottom-right corners cut, like every button in the app. */
const CUT = 44;
const tilePath = (inset = 0) => { const a = inset, b = 256 - inset, c = CUT + inset * 0.41; return `M${a + c} ${a}H${b}V${b - c}L${b - c} ${b}H${a}V${a + c}Z`; };

/**
 * Hilt and blade, drawn upright about x=128 and turned 45° so the blade runs to the top-right corner. `mono` draws it
 * in one colour for tiny sizes and single-colour uses.
 */
function saber({ mono = false, glow = true } = {}) {
  const ink = mono ? 'currentColor' : null;
  const blade = mono
    ? `<path d="M128 104V-4" stroke="currentColor" stroke-width="18" stroke-linecap="round"/>`
    : `${glow ? `<path d="M128 104V-4" stroke="${C.holo}" stroke-opacity=".14" stroke-width="46" stroke-linecap="round"/>
    <path d="M128 104V-4" stroke="${C.holo}" stroke-opacity=".28" stroke-width="31" stroke-linecap="round"/>` : ''}
    <path d="M128 104V-4" stroke="${C.holo}" stroke-width="18" stroke-linecap="round"/>
    <path d="M128 100V0" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>`;
  const f = (c) => ink ?? c;
  // Emitter shroud, neck, grip with ridges, activation button, pommel: top to bottom along the hilt.
  const hilt = `
    <path d="M110 102h36v8l-4 12h-28l-4-12z" fill="${f('url(#steel)')}"/>
    <rect x="117" y="122" width="22" height="10" fill="${mono ? 'none' : C.bg3}"/>
    <rect x="113" y="132" width="30" height="68" fill="${f('url(#grip)')}"/>
    ${[142, 154, 166, 178, 190].map((y) => `<rect x="113" y="${y}" width="30" height="4" fill="${mono ? 'none' : C.steelDark}"${mono ? ` stroke="${C.bg0}" stroke-width="0"` : ''}/>`).join('')}
    <rect x="143" y="146" width="7" height="14" fill="${mono ? 'currentColor' : C.amber}"/>
    <path d="M111 200h34v22l-8 10h-18l-8-10z" fill="${f('url(#steel)')}"/>`;
  // In one colour the ridges are cut out of the grip instead of drawn on it.
  const monoGrip = mono ? `<g fill="currentColor"><path fill-rule="evenodd" d="M113 132h30v68h-30z ${[142, 154, 166, 178, 190].map((y) => `M117 ${y}h22v4h-22z`).join(' ')}"/></g>` : '';
  // Turned to the diagonal and enlarged a little so it still reads at 16 px. It is drawn from the blade tip (y -13,
  // with the blade's round end) to the pommel (y 232), so its middle is y 109.5: that point goes on the tile's centre,
  // or the saber sits towards the top-right corner.
  return `<g transform="translate(128 128) rotate(45) scale(1.12) translate(-128 -109.5)" fill="none">${blade}${mono ? monoGrip + hilt.replace(/<rect x="113" y="132"[^>]*\/>/, '') : hilt}</g>`;
}

const defs = `<defs>
  <linearGradient id="steel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.steelDark}"/><stop offset=".45" stop-color="${C.steel}"/><stop offset="1" stop-color="${C.steelDark}"/></linearGradient>
  <linearGradient id="grip" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1a232d"/><stop offset=".5" stop-color="#34424f"/><stop offset="1" stop-color="#1a232d"/></linearGradient>
  <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.bg1}"/><stop offset="1" stop-color="${C.bg0}"/></linearGradient>
  <radialGradient id="halo" cx=".62" cy=".38" r=".6"><stop offset="0" stop-color="${C.holo}" stop-opacity=".22"/><stop offset="1" stop-color="${C.holo}" stop-opacity="0"/></radialGradient>
  <clipPath id="inside"><path d="${tilePath(6)}"/></clipPath>
</defs>`;

/** The tile with the saber on it: the app icon. */
const tile = () => `
  <path d="${tilePath()}" fill="${C.line2}"/>
  <path d="${tilePath(6)}" fill="url(#tile)"/>
  <path d="${tilePath(6)}" fill="url(#halo)"/>
  <g clip-path="url(#inside)">${saber()}</g>
  <path d="M${CUT} 0L0 ${CUT}M256 ${256 - CUT}L${256 - CUT} 256" stroke="${C.holo}" stroke-width="7" stroke-linecap="square"/>`;

// ---- the wordmark ----

/**
 * Letters as stroke centre-lines on a 24-high cap grid, with their advance widths. Squared, wide, and the round
 * letters cut at the corners the way the tile is.
 */
const S = 4.6; // stroke
const GLYPHS = {
  H: { w: 26, d: 'M0 0V24M26 0V24M0 12H26' },
  I: { w: 0, d: 'M0 0V24' },
  L: { w: 23, d: 'M0 0V24H23' },
  T: { w: 26, d: 'M0 0H26M13 0V24' },
  W: { w: 36, d: 'M0 0L8 24L18 5L28 24L36 0' },
  // The leg starts inside the bowl's bottom stroke: started on its centre line, its square end pokes into the counter.
  R: { w: 25, d: 'M0 24V0H19L25 6V9L21 13H0M15.5 14.5L25 24' },
  G: { w: 26, d: 'M26 5L21 0H6L0 6V18L6 24H26V13H15' },
};
const TRACK = 11; // space between letters, generous like the app's letter-spaced headings
/** Pairs that look too far apart at even spacing: T's bar hangs over the gap after L. */
const KERN = { LT: -8 };

function wordmark(text, x0, y0, scale, color) {
  let x = 0; const parts = [];
  let prev = '';
  for (const ch of text) { x += KERN[prev + ch] ?? 0; const g = GLYPHS[ch]; parts.push(`<path transform="translate(${x} 0)" d="${g.d}"/>`); x += g.w + TRACK; prev = ch; }
  const width = (x - TRACK) * scale;
  return { width, svg: `<g transform="translate(${x0} ${y0}) scale(${scale})" fill="none" stroke="${color}" stroke-width="${S}" stroke-linejoin="miter" stroke-miterlimit="4" stroke-linecap="square">${parts.join('')}</g>` };
}

// ---- files ----

const svg = (w, h, body, title) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="t"><title id="t">${title}</title>${body}</svg>\n`;
const files = {};

// App icon: the tile.
files['hiltwright-icon.svg'] = svg(256, 256, defs + tile(), 'Hiltwright');

// The mark alone, no tile, for dark backgrounds.
// Room around it for the blade's glow, which reaches past the 256 square at the tip.
files['hiltwright-mark.svg'] = svg(256, 256, defs + saber(), 'Hiltwright').replace('viewBox="0 0 256 256"', 'viewBox="-16 -16 288 288"');

// One colour (currentColor): favicons, embossing, anywhere colour is not available. Tile outline and saber.
files['hiltwright-mark-mono.svg'] = svg(256, 256, `<g color="${C.text}"><path d="${tilePath(5)}" fill="none" stroke="currentColor" stroke-width="10"/>${saber({ mono: true })}</g>`, 'Hiltwright');

// Horizontal lockups: icon and wordmark. Text colour flips for light backgrounds.
const lockup = (textColor) => {
  const icon = 96; const gap = 30; const scale = 1.55; const capH = 24 * scale;
  const wm = wordmark('HILTWRIGHT', icon + gap + S * scale / 2, (icon - capH) / 2, scale, textColor);
  const w = Math.ceil(icon + gap + wm.width + S * scale);
  return svg(w, icon, `${defs}<g transform="scale(${icon / 256})">${tile()}</g>${wm.svg}`, 'Hiltwright');
};
files['hiltwright-logo.svg'] = lockup(C.text);
files['hiltwright-logo-light.svg'] = lockup(C.bg0);

// Wordmark alone.
{ const wm = wordmark('HILTWRIGHT', S, S, 2, C.text); files['hiltwright-wordmark.svg'] = svg(Math.ceil(wm.width + S * 2), Math.ceil(24 * 2 + S * 2), wm.svg, 'Hiltwright'); }

mkdirSync(OUT, { recursive: true });
for (const [name, text] of Object.entries(files)) writeFileSync(join(OUT, name), text);
// The app shows the icon and the wordmark in its sidebar; keep its copies in step. The window and installer icons
// are raster (PNG, ICO): `npm run icons` in apps/desktop renders them from hiltwright-icon.svg.
const APP_ASSETS = join(OUT, '..', '..', 'apps', 'desktop', 'src', 'renderer', 'src', 'assets');
mkdirSync(APP_ASSETS, { recursive: true });
for (const name of ['hiltwright-icon.svg', 'hiltwright-wordmark.svg']) writeFileSync(join(APP_ASSETS, name), files[name]);

// A sheet to look at them all together, on dark and light, and at icon sizes.
// The images are embedded, so the sheet also works when opened as a lone file or pasted elsewhere.
const src = (f) => `data:image/svg+xml;base64,${Buffer.from(files[f]).toString('base64')}`;
const img = (f, h, bg) => `<div style="background:${bg};padding:24px;display:flex;align-items:center;justify-content:center"><img src="${src(f)}" style="height:${h}px"></div>`;
writeFileSync(join(OUT, 'preview.html'), `<!doctype html><meta charset="utf-8"><title>Hiltwright logo</title>
<body style="margin:0;background:#05080c;font:13px system-ui;color:#a3b3c2">
<div style="display:grid;grid-template-columns:1fr;gap:2px">
${img('hiltwright-logo.svg', 96, C.bg0)}${img('hiltwright-logo-light.svg', 96, '#f2f5f8')}
${img('hiltwright-icon.svg', 220, C.bg1)}${img('hiltwright-mark.svg', 220, C.bg0)}
${img('hiltwright-mark-mono.svg', 160, '#233040')}${img('hiltwright-wordmark.svg', 60, C.bg0)}
</div>
<div style="display:flex;gap:24px;align-items:end;padding:24px;background:${C.bg1}">${[16, 24, 32, 48, 64, 128].map((s) => `<div style="text-align:center"><img src="${src('hiltwright-icon.svg')}" width="${s}" height="${s}"><br>${s}</div>`).join('')}
${[16, 32].map((s) => `<div style="text-align:center;color:${C.text}"><img src="${src('hiltwright-mark-mono.svg')}" width="${s}" height="${s}" ><br>mono ${s}</div>`).join('')}</div>
</body>`);
console.log(`wrote ${Object.keys(files).length} logo files and preview.html to ${OUT}`);
