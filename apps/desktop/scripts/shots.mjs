// Offscreen screenshots of every page at the default and the minimum window size, for checking layouts (layout-fit).
//
//   npm run shots -w @hiltwright/desktop -- <folder> [page ...]
//
// Writes <folder>/<page>-<width>x<height>.png. It uses the development aids of the main process (HILTWRIGHT_OFFSCREEN,
// HILTWRIGHT_W, HILTWRIGHT_H, HILTWRIGHT_SHOT, HILTWRIGHT_PAGE=fake:<page>), so it runs the app in development mode.
//
// It never reaches a board or a real card: HILTWRIGHT_NO_BOARD is always set (and the script stops if it cannot be),
// the app's data folder, font library and card are all fixture folders made under the OS temp folder, and nothing
// of the owner's is read.

import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const desktop = resolve(here, '..');

const SIZES = [{ w: 1480, h: 980 }, { w: 1180, h: 700 }];

const outDir = process.argv[2];
if (!outDir) { console.error('Usage: npm run shots -w @hiltwright/desktop -- <folder> [page ...]'); process.exit(2); }

// The pages, read from the app's own list so a new page is photographed without touching this script.
const appSource = readFileSync(join(desktop, 'src/renderer/src/App.tsx'), 'utf8');
const typeLine = /^type Page = ([^;]+);/m.exec(appSource);
const allPages = typeLine ? [...typeLine[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1]) : [];
if (!allPages.length) { console.error('Could not read the page ids from App.tsx.'); process.exit(2); }
const wanted = process.argv.slice(3);

// Extra states of a page (a toggle open, a dialog showing, a tab picked), each a snippet run in the page before the
// shot. They are photographed too when no page or state is named: <folder>/<state>-<width>x<height>.png.
const sleep = 'const sleep = (ms) => new Promise((r) => setTimeout(r, ms));';
const click = "const click = (sel, text) => { const e = [...document.querySelectorAll(sel)].find((x) => !text || x.textContent.trim().toLowerCase().includes(text.toLowerCase())); if (!e) throw new Error('not found: ' + sel + ' ' + text); e.click(); return e; };";
const typeInto = "const typeInto = (el, v) => { const set = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set; set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };";
const run = (body) => `(async () => { ${sleep} ${click} ${typeInto} ${body} })()`;
const STATES = {
  'about-licence': { page: 'about', js: run("click('button', 'show the licence'); await sleep(900);") },
  'about-notices': { page: 'about', js: run("click('button', 'show the third-party notices'); await sleep(900);") },
  'looks-battery': { page: 'looks', js: run("click('button, li, [role=button]', 'Battery gauge'); await sleep(500);") },
  'looks-paste': { page: 'looks', js: run("click('button', 'paste style code'); await sleep(500);") },
  'presets-sets': { page: 'presets', js: run("click('[role=tab]', 'sets'); await sleep(400);") },
  'presets-history': { page: 'presets', js: run("click('[role=tab]', 'history'); await sleep(600);") },
  'editor-full': { page: 'editor', js: run("click('[role=tab]', 'full'); await sleep(700);") },
  'fonts-preset': { page: 'fonts', js: run("click('[role=tab]', 'preset fonts'); await sleep(500);") },
  'fonts-add': { page: 'fonts', js: run("click('[role=tab]', 'add a font'); await sleep(500);") },
  'fonts-tracks': { page: 'fonts', js: run("click('[role=tab]', 'tracks'); await sleep(500);") },
  'fonts-selected': { page: 'fonts', js: run("click('tbody tr:not(.grp)'); await sleep(400); click('[role=tab]', 'selected font'); await sleep(500);") },
  'diag-reboot': { page: 'diag', js: run("const i = document.querySelector('input[placeholder=\"Type a command\"]'); i.focus(); typeInto(i, 'reboot'); await sleep(200); i.form.requestSubmit(); await sleep(600);") },
};
const allNames = [...allPages, ...Object.keys(STATES)];
for (const p of wanted) if (!allNames.includes(p)) { console.error(`Unknown page or state "${p}". Pages: ${allPages.join(', ')}. States: ${Object.keys(STATES).join(', ')}`); process.exit(2); }
const jobs = (wanted.length ? wanted : allNames).map((name) => (STATES[name] ? { name, ...STATES[name] } : { name, page: name }));

// Fixtures: a saber remembered in the app's data folder, a font library, and a card, all made up.
function wav(seconds = 0.1) {
  const data = Buffer.alloc(Math.round(44100 * 2 * seconds));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(44100, 24);
  h.writeUInt32LE(88200, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}
const SOUNDS = ['hum01', 'hum02', 'out01', 'out02', 'in01', 'in02', 'clsh01', 'clsh02', 'clsh03', 'blst01', 'blst02', 'swng01', 'swng02', 'swng03', 'swng04', 'lock01', 'boot01', 'font01', 'force01', 'stab01', 'swingh01', 'swingl01', 'drag01', 'melt01'];
function makeFont(root, name) {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  for (const s of SOUNDS) writeFileSync(join(dir, `${s}.wav`), wav(s.startsWith('hum') ? 0.4 : 0.1));
  writeFileSync(join(dir, 'config.ini'), 'humstart=300\n');
}

const base = mkdtempSync(join(tmpdir(), 'hiltwright-shots-'));
const userData = join(base, 'userData');
const fontLibrary = join(base, 'fontlibrary');
const card = join(base, 'card');
for (const d of [userData, fontLibrary, card]) mkdirSync(d, { recursive: true });

const libFonts = ['Obi-Wan_Kenobi_Revenge_of_the_Sith', 'Kylo_Ren_Crossguard_Unstable', 'Ahsoka_Tano_Shoto_Pair', 'Mace_Windu_Purple', 'Darth_Maul_Double_Bladed', 'Luke_Skywalker_Return_Of_The_Jedi', 'Cal_Kestis_Fallen_Order', 'Rey_Skywalker_Yellow', 'Qui-Gon_Jinn_Phantom_Menace', 'Starkiller_Force_Unleashed', 'Count_Dooku_Curved_Hilt', 'Grand_Inquisitor_Spinning', 'Yoda_Green_Short', 'Revan_Knights_Of_The_Old_Republic'];
const makers = ['Kyberphonic', 'Greyscale Audio', 'Shadowfoil', '', 'Vader’s Workshop', 'Kyberphonic', '', 'Greyscale Audio', 'Shadowfoil', '', 'Kyberphonic', '', 'Greyscale Audio', ''];
const index = { version: 1, fonts: {}, makers: {} };
libFonts.forEach((f, i) => {
  makeFont(fontLibrary, f);
  index.fonts[f] = { name: f.replace(/_/g, ' '), maker: makers[i], notes: i % 3 === 0 ? 'Needs the volume up a notch; the swings are quiet.' : '', added: '2026-10-0' + (1 + (i % 9)) + 'T10:00:00.000Z' };
});
writeFileSync(join(fontLibrary, 'hiltwright-fonts.json'), JSON.stringify(index));

// The card has most of the library's fonts, one with a missing hum, and tracks.
libFonts.slice(0, 9).forEach((f) => makeFont(card, f));
mkdirSync(join(card, 'tracks'), { recursive: true });
for (const t of ['duel_of_the_fates.wav', 'imperial_march.wav', 'binary_sunset.wav']) writeFileSync(join(card, 'tracks', t), wav(1));
writeFileSync(join(card, 'presets.ini'), '');
rmSync(join(card, 'Mace_Windu_Purple', 'hum01.wav'));
rmSync(join(card, 'Mace_Windu_Purple', 'hum02.wav'));

const presetFonts = ['Obi-Wan_Kenobi_Revenge_of_the_Sith', 'Kylo_Ren_Crossguard_Unstable', 'Ahsoka_Tano_Shoto_Pair', 'Mace_Windu_Purple', 'Cal_Kestis_Fallen_Order', 'Yoda_Green_Short', 'Not_In_Library_Anywhere'];
const now = new Date().toISOString();
writeFileSync(join(userData, 'library.json'), JSON.stringify({
  version: 1,
  sabers: [{
    id: 'fixture0001', name: 'Fixture Saber', firstSeen: now, lastSeen: now,
    identity: { usbSerial: 'FIXTURE0001', configName: 'hiltwright_fixture_saber', version: '8.x', prop: 'saber', buttons: 2, installed: now, pixelBlades: [144], bladeConfig: 0 },
    presets: presetFonts.map((font, i) => ({ font, track: `tracks/${['duel_of_the_fates', 'imperial_march', 'binary_sunset'][i % 3]}.wav`, styles: [`builtin ${i} 1`], name: font.replace(/_/g, ' ').slice(0, 24), variation: 0 })),
    fonts: presetFonts, tracks: ['duel_of_the_fates.wav'],
  }],
}));

const env = {
  ...process.env,
  HILTWRIGHT_NO_BOARD: '1',
  HILTWRIGHT_OFFSCREEN: '1',
  HILTWRIGHT_USER_DATA: userData,
  HILTWRIGHT_FONT_LIBRARY: fontLibrary,
  HILTWRIGHT_SD_ROOT: card,
};
delete env.ELECTRON_RUN_AS_NODE;
// The one thing this script must never run without.
if (env.HILTWRIGHT_NO_BOARD !== '1') { console.error('Could not set HILTWRIGHT_NO_BOARD. Not starting the app.'); process.exit(1); }

mkdirSync(outDir, { recursive: true });

// Pages that only show their detail once something is picked: pick the first font in the list before the shot.
const PICK_FIRST_ROW = "document.querySelector('tbody tr:not(.grp)')?.click()";
const OPEN = { fonts: PICK_FIRST_ROW, library: PICK_FIRST_ROW };
const viteBin = join(desktop, '../../node_modules/electron-vite/bin/electron-vite.js');

function shoot({ name, page, js }, { w, h }) {
  const file = resolve(outDir, `${name}-${w}x${h}.png`);
  return new Promise((done) => {
    const shotEnv = { ...env, HILTWRIGHT_W: String(w), HILTWRIGHT_H: String(h), HILTWRIGHT_PAGE: `fake:${page}`, HILTWRIGHT_SHOT: file };
    if (js ?? OPEN[page]) shotEnv.HILTWRIGHT_SHOT_JS = js ?? OPEN[page];
    const child = spawn(process.execPath, [viteBin, 'dev'], { cwd: desktop, env: shotEnv });
    let log = '';
    let finished = false;
    const finish = (ok) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      else child.kill('SIGKILL');
      if (!ok) console.error(`${name} ${w}x${h}: failed\n${log.split('\n').slice(-15).join('\n')}`);
      else console.log(`${name} ${w}x${h}: ${file}`);
      setTimeout(() => done(ok), 1500);
    };
    const timer = setTimeout(() => finish(false), 120000);
    const onData = (d) => { log += d; if (log.includes('[main] screenshot')) finish(true); };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', () => finish(log.includes('[main] screenshot')));
  });
}

let failed = 0;
try {
  for (const size of SIZES) for (const job of jobs) if (!(await shoot(job, size))) failed++;
} finally {
  rmSync(base, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
