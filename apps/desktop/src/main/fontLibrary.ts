// The font library: sound fonts the owner has bought or downloaded, kept in one folder on this computer so every
// part of the app can use them (Presets, the demo room, copying onto a card). Each font is a plain ProffieOS font
// folder, untouched; what the owner says about it (display name, maker, notes) lives in one index file beside them,
// so a font folder copied onto a card carries nothing extra.

import { cp, mkdir, open, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { checkFont, classifySound, parseWavHeader, type FontFile, type FontReport } from '@hiltwright/core';
import { copyFont, looksLikeFont, readFontSounds, type FontEntry, type FontSounds } from './sd';
import { extractZip, listZip } from './unzip';

export const INDEX_FILE = 'hiltwright-fonts.json';
/** Where makers' logos were kept before the shared contributors list; moved with the library, never listed as a font. */
export const MAKERS_DIR = 'hiltwright-makers';


export interface FontMeta {
  /** What the owner calls the font. The folder name is what the saber uses and does not change. */
  name: string;
  maker: string;
  notes: string;
  added: string;
  /** The package or folder it came from. */
  from?: string;
  /** A set the maker released together. Filled in when one package brings several fonts. */
  bundle?: string;
}

/** What older versions kept about a maker: their logo, a file name in MAKERS_DIR. */
export interface MakerMeta { logo?: string }

export interface FontSound {
  /** Path inside the font folder, with forward slashes. */
  path: string;
  /** The effect it plays for: hum, clash, lockup, smoothswing, ... */
  effect: string;
  kind: 'mono' | 'poly' | 'shared' | 'other';
  seconds: number | null;
  size: number;
}

export interface FontSupport {
  type: FontReport['type'];
  smoothSwing: boolean;
  /** Every effect the font has sounds for. */
  effects: string[];
  /** Effects beyond the basics every font has (hum, ignition, retraction, swing, clash). */
  special: string[];
  tracks: number;
}

export interface LibraryFont {
  folder: string;
  meta: FontMeta;
  report: FontReport;
  support: FontSupport;
  bytes: number;
}

export interface LibraryFontDetail extends LibraryFont {
  sounds: FontSound[];
  tracks: FontSound[];
}

export interface ImportResult { added: string[]; skipped: { name: string; why: string }[] }

/** Names ProffieOS does not have in EFFECT_NAMES, gathered under one label each. */
const EXTRA: [RegExp, string][] = [
  [/^(swingl|swingh|lswing|hswing)$/, 'smoothswing'],
  [/^(lb|bgnlb|endlb)$/, 'lightning block'],
  [/^(bgndrag|enddrag)$/, 'drag'],
  [/^(bgnmelt|endmelt)$/, 'melt'],
  [/^(tr|trloop|tron|troff)$/, 'blade transitions'],
  [/^(quote|quotes)$/, 'quotes'],
  [/^(ccbegin|ccend|ccchange|color|colour)$/, 'colour change'],
  [/^(blast)$/, 'blaster'],
  [/^(fastout|fastin)$/, 'fast ignition'],
  [/^(bgnauto|endauto|auto)$/, 'blaster auto'],
  [/^(lowbatt)$/, 'low battery'],
  [/^(battery|vmbegin|vmend|volup|voldown|volmin|volmax|mnum|mselect|mclick|mstart|mend|menu)$/, 'menu voice'],
];
const BASIC = new Set(['hum', 'ignition', 'retraction', 'swing', 'clash', 'font name', 'boot', 'smoothswing']);

/**
 * The name ProffieOS would treat a file as. Inside an effect's folder any numbering goes (`clsh/001.wav`,
 * `clsh/clsh1.wav`, `tr/001/000.wav`), and the file belongs to that folder's effect; it is renamed to the flat
 * form (`clsh01.wav`) so the checker sees the same thing the saber does.
 */
function soundName(rel: string): { checker: string; base: string } {
  const parts = rel.split('/');
  const file = parts[parts.length - 1];
  const stem = file.toLowerCase().replace(/\.wav$/, '');
  if (parts.length > 1) {
    const folder = parts[0].toLowerCase();
    const m = /^([a-z_]*?)(\d*)$/.exec(stem);
    if (m && (m[1] === '' || m[1] === folder)) return { checker: `${folder}${m[2] ? m[2].padStart(2, '0') : ''}.wav`, base: folder };
  }
  return { checker: file, base: stem.replace(/\d+$/, '') };
}

export function classifyFontFile(rel: string): { effect: string; kind: FontSound['kind']; checker: string } {
  const { checker, base } = soundName(rel);
  const c = classifySound(checker);
  if (c.kind !== 'other') return { effect: c.effect, kind: c.kind, checker };
  for (const [re, label] of EXTRA) if (re.test(base)) return { effect: label, kind: 'other', checker };
  return { effect: base || 'other', kind: 'other', checker };
}

const isTrack = (rel: string) => rel.split('/').slice(0, -1).some((p) => /^tracks?$/i.test(p));

async function isDir(p: string): Promise<boolean> {
  try { return (await stat(p)).isDirectory(); } catch { return false; }
}

async function wavInfo(p: string): Promise<ReturnType<typeof parseWavHeader>> {
  try {
    const fh = await open(p, 'r');
    try {
      const buf = new Uint8Array(512);
      const { bytesRead } = await fh.read(buf, 0, 512, 0);
      return parseWavHeader(buf.subarray(0, bytesRead));
    } finally { await fh.close(); }
  } catch { return null; }
}

/** `fn` over every item, `n` at a time, results in the items' order. */
async function inBatches<T, R>(items: T[], n: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]); } }));
  return out;
}

/** Every wav in a font folder, three levels deep, as paths within it. */
async function walkWavs(dir: string, prefix = '', depth = 0): Promise<string[]> {
  const out: string[] = [];
  let names: string[] = [];
  try { names = await readdir(dir); } catch { return out; }
  for (const n of names) {
    if (n.startsWith('.')) continue;
    const p = join(dir, n);
    if (/\.wav$/i.test(n)) out.push(prefix + n);
    else if (depth < 3 && (await isDir(p))) out.push(...(await walkWavs(p, `${prefix}${n}/`, depth + 1)));
  }
  return out;
}

/** Look over one font folder: every sound and track, what the font supports, and the usual checks. */
export async function scanFont(dir: string): Promise<{ sounds: FontSound[]; tracks: FontSound[]; report: FontReport; support: FontSupport; bytes: number; hasSmoothswIni: boolean }> {
  const sounds: FontSound[] = [];
  const tracks: FontSound[] = [];
  const checked: FontFile[] = [];
  let bytes = 0;
  // Sizes and headers are read many at a time: a font is a hundred small files, and the first look at a library
  // of dozens of fonts is otherwise seconds of waiting.
  const rels = (await walkWavs(dir)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const facts = await inBatches(rels, 24, async (rel) => {
    const p = join(dir, ...rel.split('/'));
    try { return { size: (await stat(p)).size, wav: await wavInfo(p) }; } catch { return null; }
  });
  for (let i = 0; i < rels.length; i++) {
    const rel = rels[i]; const f = facts[i];
    if (!f) continue;
    const { size, wav } = f;
    bytes += size;
    if (isTrack(rel)) { tracks.push({ path: rel, effect: 'track', kind: 'other', seconds: wav?.seconds ?? null, size }); continue; }
    const c = classifyFontFile(rel);
    sounds.push({ path: rel, effect: c.effect, kind: c.kind, seconds: wav?.seconds ?? null, size });
    checked.push({ name: c.checker, size, wav });
  }
  const report = checkFont(checked);
  let hasSmoothswIni = false;
  try { hasSmoothswIni = (await readdir(dir)).some((n) => n.toLowerCase() === 'smoothsw.ini'); } catch { /* unreadable */ }
  const effects = [...new Set(sounds.map((s) => s.effect))].sort();
  const smoothSwing = effects.includes('smoothswing');
  return {
    sounds, tracks, report, bytes, hasSmoothswIni,
    support: { type: report.type, smoothSwing, effects, special: effects.filter((e) => !BASIC.has(e) && e !== 'menu voice'), tracks: tracks.length },
  };
}

/**
 * The font folders inside a folder someone downloaded: the folder itself, or folders below it. Packages often hold
 * the same font for several boards; when one of the candidates sits under a folder named for Proffie, only those
 * are kept.
 */
export async function findFontDirs(dir: string, depth = 0): Promise<string[]> {
  if (await looksLikeFont(dir)) return [dir];
  if (depth >= 4) return [];
  const out: string[] = [];
  let names: string[] = [];
  try { names = await readdir(dir); } catch { return out; }
  for (const n of names.sort()) {
    if (n.startsWith('.') || n === '__MACOSX' || /^tracks?$/i.test(n)) continue;
    const p = join(dir, n);
    if (await isDir(p)) out.push(...(await findFontDirs(p, depth + 1)));
  }
  if (depth > 0) return out;
  const proffie = out.filter((p) => /proffie/i.test(relative(dir, p)));
  return proffie.length ? proffie : out;
}

const GENERIC = /^(proffie(os|board)?|proffie[ _-]?(os|board)[ _-]?v?\d*|sound[ _-]?fonts?|fonts?|sounds?|\d+|v\d+(\.\d+)*)$/i;

/** A folder name the saber can use: no path characters, no ';' (ProffieOS splits font paths on it). */
export function safeFolderName(name: string): string {
  return name.replace(/[\\/:*?"<>|;]/g, '_').replace(/\s+/g, ' ').trim().replace(/^\.+/, '').slice(0, 60) || 'font';
}

/**
 * What to call a font found at `dir` inside the package at `top` (named `topName`): its own folder's name, or the
 * nearest folder above it whose name says something, or the package's.
 */
export function nameFor(dir: string, top: string, topName: string): string {
  let d = resolve(dir);
  const t = resolve(top);
  while (d !== t && GENERIC.test(basename(d))) d = dirname(d);
  return d === t ? topName : basename(d);
}

const KEEP_FILE = /\.(wav|ini|txt|md|pdf|jpg|jpeg|png)$/i;

export class FontLibrary {
  private index: Record<string, FontMeta> | null = null;
  private makerIndex: Record<string, MakerMeta> = {};
  private cache = new Map<string, LibraryFontDetail>();

  constructor(public root: string, private trash: (p: string) => Promise<void>) {}

  private async readIndex(): Promise<Record<string, FontMeta>> {
    if (this.index) return this.index;
    try {
      const raw = JSON.parse(await readFile(join(this.root, INDEX_FILE), 'utf8')) as { fonts?: Record<string, FontMeta>; makers?: Record<string, MakerMeta> };
      this.index = raw.fonts && typeof raw.fonts === 'object' ? raw.fonts : {};
      this.makerIndex = raw.makers && typeof raw.makers === 'object' ? raw.makers : {};
    } catch { this.index = {}; this.makerIndex = {}; }
    return this.index;
  }

  private async writeIndex(): Promise<void> {
    await mkdir(this.root, { recursive: true });
    await writeFile(join(this.root, INDEX_FILE), JSON.stringify({ version: 1, fonts: this.index ?? {}, makers: this.makerIndex }, null, 2));
  }

  /** A folder name that must already be a font in the library: never a path. */
  private folderPath(folder: string): string {
    if (!folder || folder !== basename(folder) || /[\\/]/.test(folder) || folder === '.' || folder === '..') throw new Error('Not a font in the library');
    return join(this.root, folder);
  }

  async list(): Promise<LibraryFont[]> {
    await mkdir(this.root, { recursive: true });
    const index = await this.readIndex();
    const names = (await readdir(this.root)).filter((n) => !n.startsWith('.') && n !== MAKERS_DIR).sort((a, b) => a.localeCompare(b));
    const found = await inBatches(names, 4, async (n) => {
      const p = join(this.root, n);
      if (!(await isDir(p)) || !(await looksLikeFont(p))) return null;
      const { sounds: _s, tracks: _t, ...rest } = await this.detail(n);
      return { ...rest, meta: index[n] ?? rest.meta };
    });
    const out = found.filter((f): f is LibraryFont => !!f);
    const seen = new Set(out.map((f) => f.folder));
    for (const k of [...this.cache.keys()]) if (!seen.has(k)) this.cache.delete(k);
    return out;
  }

  async detail(folder: string): Promise<LibraryFontDetail> {
    const index = await this.readIndex();
    const hit = this.cache.get(folder);
    if (hit) return { ...hit, meta: index[folder] ?? hit.meta };
    const dir = this.folderPath(folder);
    if (!(await isDir(dir))) throw new Error(`${folder} is not in the font library`);
    const s = await scanFont(dir);
    const meta = index[folder] ?? { name: folder.replace(/_/g, ' '), maker: '', notes: '', added: (await stat(dir)).mtime.toISOString() };
    const d: LibraryFontDetail = { folder, meta, report: s.report, support: s.support, bytes: s.bytes, sounds: s.sounds, tracks: s.tracks };
    this.cache.set(folder, d);
    return d;
  }

  async setMeta(folder: string, patch: Partial<Pick<FontMeta, 'name' | 'maker' | 'notes' | 'bundle'>>): Promise<LibraryFont> {
    const d = await this.detail(folder);
    const index = await this.readIndex();
    const next: FontMeta = { ...d.meta, ...patch };
    if (!next.bundle) delete next.bundle;
    index[folder] = next;
    await this.writeIndex();
    const { sounds: _s, tracks: _t, ...rest } = d;
    return { ...rest, meta: index[folder] };
  }

  /** Move a font to the recycle bin (never deleted outright) and forget what was said about it. */
  async remove(folder: string): Promise<void> {
    const dir = this.folderPath(folder);
    await this.trash(dir);
    const index = await this.readIndex();
    delete index[folder];
    this.cache.delete(folder);
    await this.writeIndex();
  }

  /**
   * Makers' logos kept in the library before logos moved to the shared contributors list: the name and the image
   * file, so they can be handed over once.
   */
  async legacyLogos(): Promise<{ name: string; file: string }[]> {
    await this.readIndex();
    const out: { name: string; file: string }[] = [];
    for (const [name, m] of Object.entries(this.makerIndex)) if (m.logo && m.logo === basename(m.logo)) out.push({ name, file: join(this.root, MAKERS_DIR, m.logo) });
    return out;
  }

  /** Bytes of one sound or track, for playing in the app. */
  async readSound(folder: string, rel: string): Promise<ArrayBuffer> {
    const dir = resolve(this.folderPath(folder));
    const p = resolve(dir, ...rel.split('/'));
    if (!p.startsWith(dir + sep) || !/\.wav$/i.test(p)) throw new Error('Not a sound in that font');
    const buf = await readFile(p);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  }

  readFont(folder: string, onFile?: (name: string, done: number, total: number) => void): Promise<FontSounds> {
    return readFontSounds(this.folderPath(folder), onFile);
  }

  copyToCard(folder: string, cardRoot: string, replace: boolean): Promise<FontEntry> {
    return copyFont(this.folderPath(folder), cardRoot, replace);
  }

  private async freeName(want: string): Promise<string> {
    const base = safeFolderName(want);
    let name = base;
    for (let i = 2; await isDir(join(this.root, name)) || (await this.readIndex())[name]; i++) name = `${base}-${i}`;
    return name;
  }

  /**
   * Add what the owner downloaded: a .zip package, a font folder, or a folder holding several fonts. Everything is
   * copied in; the original stays where it was.
   */
  async importFrom(src: string, onLine?: (line: string) => void): Promise<ImportResult> {
    await mkdir(this.root, { recursive: true });
    const result: ImportResult = { added: [], skipped: [] };
    const label = basename(src).replace(/\.zip$/i, '');
    let top = src;
    let staging: string | null = null;
    try {
      if (/\.zip$/i.test(src)) {
        staging = join(this.root, `.incoming-${Date.now().toString(36)}`);
        const entries = await listZip(src);
        const wavs = entries.filter((e) => /\.wav$/i.test(e.name)).length;
        if (!wavs) throw new Error(`${basename(src)} has no sounds in it. Is it a sound font package?`);
        onLine?.(`Unpacking ${basename(src)} (${wavs} sounds)…`);
        await extractZip(src, staging, (n) => KEEP_FILE.test(n) && !n.startsWith('__MACOSX/'), (_n, done, total) => { if (done % 100 === 0 || done === total) onLine?.(`Unpacked ${done} of ${total} files`); });
        top = staging;
      } else if (!(await isDir(src))) throw new Error('Choose a font folder or a .zip package');
      const dirs = await findFontDirs(top);
      if (!dirs.length) throw new Error(`No sound font found in ${basename(src)}. A font folder has hum sounds in it (hum.wav, hum01.wav or hum/…).`);
      const index = await this.readIndex();
      for (const d of dirs) {
        const want = nameFor(d, top, label);
        const folder = await this.freeName(want);
        onLine?.(`Adding ${folder}…`);
        const dest = join(this.root, folder);
        if (staging) {
          try { await rename(d, dest); } catch { await cp(d, dest, { recursive: true }); }
        } else {
          await cp(d, dest, { recursive: true, filter: (s) => !basename(s).startsWith('.') && (extname(s) === '' || KEEP_FILE.test(s)) });
        }
        // A package with one font and its tracks beside it rather than inside: the tracks go into the font, where
        // ProffieOS finds them as <font>/tracks/<name>.wav.
        const beside = [join(dirname(d), 'tracks'), join(top, 'tracks')].find((x) => x !== join(d, 'tracks'));
        if (dirs.length === 1 && beside && (await isDir(beside)) && !(await isDir(join(dest, 'tracks')))) {
          await cp(beside, join(dest, 'tracks'), { recursive: true, filter: (s) => extname(s) === '' || /\.wav$/i.test(s) });
        }
        index[folder] = { name: want.replace(/_/g, ' '), maker: '', notes: '', added: new Date().toISOString(), from: basename(src), ...(dirs.length > 1 ? { bundle: label.replace(/_/g, ' ') } : {}) };
        result.added.push(folder);
      }
      await this.writeIndex();
    } finally {
      if (staging) await rm(staging, { recursive: true, force: true }).catch(() => undefined);
    }
    return result;
  }

  /**
   * Point the library at another folder. With `move`, the fonts here go with it (a rename when both are on the same
   * drive, a copy then delete otherwise); without, the new folder is used as it is.
   */
  async moveTo(next: string, move: boolean, onLine?: (line: string) => void): Promise<void> {
    await mkdir(next, { recursive: true });
    if (move && resolve(next) !== resolve(this.root)) {
      const index = await this.readIndex();
      const target = new FontLibrary(next, this.trash);
      const theirs = await target.readIndex();
      for (const n of await readdir(this.root)) {
        const from = join(this.root, n);
        if (n === INDEX_FILE || n.startsWith('.') || !(await isDir(from))) continue;
        if (n === MAKERS_DIR) {
          // Logos merge into the new library's own folder of them.
          await mkdir(join(next, MAKERS_DIR), { recursive: true });
          for (const f of await readdir(from)) await cp(join(from, f), join(next, MAKERS_DIR, f));
          await rm(from, { recursive: true, force: true });
          continue;
        }
        const name = await target.freeName(n);
        onLine?.(`Moving ${n}…`);
        try { await rename(from, join(next, name)); } catch { await cp(from, join(next, name), { recursive: true }); await rm(from, { recursive: true, force: true }); }
        if (index[n]) theirs[name] = index[n];
      }
      for (const [k, v] of Object.entries(this.makerIndex)) if (!Object.keys(target.makerIndex).some((t) => t.toLowerCase() === k.toLowerCase())) target.makerIndex[k] = v;
      await target.writeIndex();
      await rm(join(this.root, INDEX_FILE), { force: true });
    }
    this.root = next;
    this.index = null;
    this.makerIndex = {};
    this.cache.clear();
  }

  forget(): void { this.index = null; this.makerIndex = {}; this.cache.clear(); }
}
