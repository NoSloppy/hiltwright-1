// SD card service: find a ProffieOS card in a card reader, list and check its fonts and tracks, copy fonts in.
// The card is any mounted volume with the ProffieOS layout (font folders with hum sounds, a tracks folder, presets.ini).

import { execFile } from 'node:child_process';
import { copyFile, mkdir, open, readFile, readdir, rename, rm, stat, statfs } from 'node:fs/promises';
import { basename, dirname, join, relative } from 'node:path';
import { checkFont, classifySound, hasMenuSounds, parseVoicePackIni, parseWavHeader, type FontFile, type FontReport, type VoicePackStatus } from '@hiltwright/core';

export interface CardInfo {
  root: string;
  label: string | null;
  freeBytes: number | null;
  totalBytes: number | null;
  /** Looks like a ProffieOS card: has presets.ini or at least one font folder. */
  proffie: boolean;
  hasPresetsIni: boolean;
  /** The USB serial of the Proffieboard this drive belongs to: the saber is sharing its own card (card-safety D3). */
  saberSerial: string | null;
}

export interface FontEntry {
  name: string;
  path: string;
  report: FontReport;
}

async function isDir(p: string): Promise<boolean> {
  try { return (await stat(p)).isDirectory(); } catch { return false; }
}

async function exists(p: string): Promise<boolean> {
  try { await stat(p); return true; } catch { return false; }
}

type Candidate = { root: string; label: string | null; free: number | null; total: number | null; saberSerial: string | null };

/**
 * Windows' removable drives, each followed through its partition and disk drive up the PnP tree. A drive whose
 * ancestors include `USB\VID_1209&PID_6668\<serial>` is a Proffieboard sharing its own card (card-safety D3).
 */
const DRIVES_SCRIPT = [
  '$out = @()',
  'foreach ($ld in Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 2 }) {',
  '  $owner = $null',
  '  try {',
  '    $disk = Get-CimAssociatedInstance -InputObject $ld -ResultClassName Win32_DiskPartition | ForEach-Object { Get-CimAssociatedInstance -InputObject $_ -ResultClassName Win32_DiskDrive } | Select-Object -First 1',
  '    $id = $disk.PNPDeviceID',
  '    for ($i = 0; $i -lt 4 -and $id; $i++) {',
  "      if ($id -match '^USB\\\\VID_1209&PID_6668\\\\([^\\\\]+)$') { $owner = $Matches[1]; break }",
  '      $id = (Get-PnpDeviceProperty -InstanceId $id -KeyName DEVPKEY_Device_Parent -ErrorAction Stop).Data',
  '    }',
  '  } catch {}',
  '  $out += [pscustomobject]@{ DeviceID = $ld.DeviceID; VolumeName = $ld.VolumeName; FreeSpace = $ld.FreeSpace; Size = $ld.Size; Owner = $owner }',
  '}',
  'ConvertTo-Json -InputObject @($out)',
].join('\n');

/** The drive list the script prints: one object or a list, with the Proffieboard serial each drive belongs to, if any. */
export function parseRemovableDrives(stdout: string): Candidate[] {
  try {
    const parsed = JSON.parse(stdout || '[]') as unknown;
    const list = (Array.isArray(parsed) ? parsed : [parsed]) as { DeviceID?: unknown; VolumeName?: unknown; FreeSpace?: unknown; Size?: unknown; Owner?: unknown }[];
    return list.filter((d) => d && typeof d.DeviceID === 'string' && d.DeviceID).map((d) => ({
      root: `${d.DeviceID as string}\\`,
      label: typeof d.VolumeName === 'string' && d.VolumeName ? d.VolumeName : null,
      free: Number(d.FreeSpace) || null,
      total: Number(d.Size) || null,
      saberSerial: typeof d.Owner === 'string' && /^[0-9A-Za-z]+$/.test(d.Owner) ? d.Owner : null,
    }));
  } catch { return []; }
}

/** Candidate roots: removable volumes on Windows, /Volumes and /media elsewhere, plus an override for development. */
async function candidateRoots(): Promise<Candidate[]> {
  const override = process.env.HILTWRIGHT_SD_ROOT;
  if (override) return [{ root: override, label: 'dev override', free: null, total: null, saberSerial: null }];
  if (process.platform === 'win32') {
    const out = await new Promise<string>((resolve) => execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', DRIVES_SCRIPT], { timeout: 8000, windowsHide: true }, (err, stdout) => resolve(err ? '' : stdout)));
    return parseRemovableDrives(out);
  }
  const bases = process.platform === 'darwin' ? ['/Volumes'] : ['/media', '/run/media', '/mnt'];
  const out: Candidate[] = [];
  for (const b of bases) {
    try { for (const name of await readdir(b)) out.push({ root: join(b, name), label: name, free: null, total: null, saberSerial: null }); } catch { /* not present */ }
  }
  return out;
}

/**
 * ProffieOS reads a font's sounds either flat (`hum01.wav` in the font folder) or from one subfolder per effect
 * (`hum/hum01.wav`, or `hum/001.wav`). Many fonts use the second, so both count.
 */
const CORE_SOUND = /^(hum\d*|font\d*|out\d*|poweron\d*|in\d*)\.wav$/i;
const CORE_FOLDER = /^(hum|font|out|poweron|in)$/i;
export async function looksLikeFont(dir: string): Promise<boolean> {
  try {
    const names = await readdir(dir);
    if (names.some((n) => CORE_SOUND.test(n))) return true;
    for (const n of names) {
      if (!CORE_FOLDER.test(n)) continue;
      try { if ((await readdir(join(dir, n))).some((f) => /\.wav$/i.test(f))) return true; } catch { /* not a folder */ }
    }
    return false;
  } catch { return false; }
}

/**
 * Ask the OS to eject the volume at `root`: flushes any writes Windows is still holding and dismounts it, the same
 * as "Safely remove". Done before the saber is told to take its card back, otherwise a half-written font is lost.
 */
export async function ejectVolume(root: string): Promise<{ ok: boolean; detail: string }> {
  // Hiltwright's own reading of the card holds files open, and Windows will not eject a drive with files open.
  await stopReading(root);
  if (process.platform === 'win32') {
    const letter = root.replace(/[\\/]+$/, '');
    if (!/^[A-Za-z]:$/.test(letter)) return { ok: false, detail: `Not a drive letter: ${root}` };
    const script = `$sh = New-Object -ComObject Shell.Application; $v = $sh.NameSpace(17).ParseName('${letter}'); if ($v -eq $null) { 'gone' } else { $v.InvokeVerb('Eject'); for ($i = 0; $i -lt 16 -and (Test-Path '${letter}\\'); $i++) { Start-Sleep -Milliseconds 500 }; if (Test-Path '${letter}\\') { 'still-there' } else { 'ejected' } }`;
    // Windows can take more than one try to let go once Hiltwright's own reading has stopped: on hote2 the second
    // try, five seconds after the first, ejected at once (card-safety 4.1, 2026-11-14). So up to three, quietly.
    let out = '';
    for (let attempt = 1; attempt <= 3; attempt++) {
      out = await new Promise<string>((resolve) => execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], { timeout: 15000, windowsHide: true }, (err, stdout) => resolve(err ? `error ${String(err)}` : String(stdout).trim())));
      if (out === 'ejected' || out === 'gone') return { ok: true, detail: attempt > 1 ? `${out} (try ${attempt})` : out };
      if (out !== 'still-there') break;
    }
    return { ok: false, detail: out === 'still-there' ? 'Windows did not release the drive. Close any window or program that has files on it open, then try again.' : out };
  }
  const cmd = process.platform === 'darwin' ? ['diskutil', ['eject', root]] as const : ['udisksctl', ['unmount', '-b', root]] as const;
  const out = await new Promise<string>((resolve) => execFile(cmd[0], [...cmd[1]], { timeout: 15000 }, (err, stdout, stderr) => resolve(err ? `error ${String(stderr || err)}` : 'ejected')));
  return { ok: out === 'ejected', detail: out };
}

/**
 * Reads of a card under way, so giving a shared card back can stop them: over USB, listing a card's fonts takes
 * minutes, and the files it holds open stop Windows ejecting the drive (card-safety 4.1, 2026-11-14).
 */
const reads = new Map<string, { active: number; gen: number }>();
const cardKey = (root: string) => root.replace(/[\\/]+$/, '').toUpperCase();
function beginRead(root: string): { stopped: () => boolean; end: () => void } {
  const k = cardKey(root);
  const r = reads.get(k) ?? { active: 0, gen: 0 };
  reads.set(k, r);
  r.active++;
  const gen = r.gen;
  return { stopped: () => r.gen !== gen, end: () => { r.active = Math.max(0, r.active - 1); } };
}
/** Stop every read of this card and wait, up to 10 s, for them to let go of its files. */
export async function stopReading(root: string, waitMs = 10_000): Promise<void> {
  const r = reads.get(cardKey(root));
  if (!r) return;
  r.gen++;
  for (const until = Date.now() + waitMs; r.active > 0 && Date.now() < until;) await new Promise((res) => setTimeout(res, 100));
}
const STOPPED = 'Stopped: the card is being given back.';

/** The sounds a listen needs. Everything else in a font (tracks, ini files, quotes) stays on the card. */
const PLAYABLE = /^(hum|humm|out|poweron|fastout|preon|in|poweroff|pwroff|pstoff|clsh|clash|blst|blaster|stab|force|font|boot|lock|lockup|bgnlock|endlock|drag|bgndrag|enddrag|lb|bgnlb|endlb|swingl|swingh|lswing|hswing|swng|swing|tr)$/i;
const FONT_BYTES_CAP = 120 * 1024 * 1024;

export interface FontSounds { name: string; files: Record<string, ArrayBuffer>; ini: Record<string, string>; smoothsw: Record<string, string>; bytes: number; skipped: number }

function parseIni(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) { const m = /^\s*([A-Za-z0-9_.]+)\s*=\s*(.+?)\s*$/.exec(line); if (m) out[m[1]] = m[2]; }
  return out;
}

/**
 * Every playable wav in a font folder, flat or one folder per sound, keyed by its path within the font. Reading
 * over the saber's USB link is slow, so `onFile` reports each one as it lands.
 */
export async function readFontSounds(fontDir: string, onFile?: (name: string, done: number, total: number) => void): Promise<FontSounds> {
  const wanted: { key: string; p: string }[] = [];
  for (const name of await readdir(fontDir)) {
    const p = join(fontDir, name);
    const m = /^([a-z]+)\d*\.wav$/i.exec(name);
    if (m) { if (PLAYABLE.test(m[1])) wanted.push({ key: name, p }); continue; }
    if (name.startsWith('.') || !PLAYABLE.test(name) || !(await isDir(p))) continue;
    // Inside a sound's folder: its wavs, or numbered folders of wavs (tr/001/000.wav, the style transition sounds).
    try { for (const f of await readdir(p)) { if (/\.wav$/i.test(f)) wanted.push({ key: `${name}/${f}`, p: join(p, f) }); else if (/^\d+$/.test(f) && (await isDir(join(p, f)))) { for (const g of await readdir(join(p, f))) if (/\.wav$/i.test(g)) wanted.push({ key: `${name}/${f}/${g}`, p: join(p, f, g) }); } } } catch { /* unreadable */ }
  }
  const files: Record<string, ArrayBuffer> = {};
  let bytes = 0; let skipped = 0; let done = 0;
  for (const w of wanted) {
    try {
      const s = await stat(w.p);
      if (bytes + s.size > FONT_BYTES_CAP) { skipped++; continue; }
      const buf = await readFile(w.p);
      files[w.key] = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      bytes += s.size;
    } catch { skipped++; }
    onFile?.(w.key, ++done, wanted.length);
  }
  const readIni = async (n: string) => { try { return parseIni(await readFile(join(fontDir, n), 'utf8')); } catch { return {}; } };
  return { name: basename(fontDir), files, ini: await readIni('config.ini'), smoothsw: await readIni('smoothsw.ini'), bytes, skipped };
}

export async function locateCards(): Promise<CardInfo[]> {
  const out: CardInfo[] = [];
  for (const c of await candidateRoots()) {
    if (!(await isDir(c.root))) continue;
    const hasPresetsIni = await exists(join(c.root, 'presets.ini')) || await exists(join(c.root, 'presets.tmp'));
    let fontDirs = 0;
    try {
      for (const name of await readdir(c.root)) {
        if (name.startsWith('.') || name.toLowerCase() === 'tracks') continue;
        const p = join(c.root, name);
        if (await isDir(p) && await looksLikeFont(p)) { fontDirs++; if (fontDirs >= 1) break; }
      }
    } catch { /* unreadable */ }
    out.push({ root: c.root, label: c.label, freeBytes: c.free, totalBytes: c.total, proffie: hasPresetsIni || fontDirs > 0, hasPresetsIni, saberSerial: c.saberSerial });
  }
  return out;
}

/** The font's wavs: those in the folder itself, and those one level down in an effect's subfolder. */
async function readFontFiles(dir: string, stopped: () => boolean = () => false): Promise<FontFile[]> {
  const files: FontFile[] = [];
  const entries: { name: string; p: string }[] = [];
  for (const name of await readdir(dir)) {
    const p = join(dir, name);
    if (/\.wav$/i.test(name)) { entries.push({ name, p }); continue; }
    if (name.startsWith('.') || !(await isDir(p))) continue;
    // A subfolder's files are named for the folder so the checker sees `hum/001.wav` as a hum: ProffieOS does the same.
    try { for (const f of await readdir(p)) if (/\.wav$/i.test(f)) entries.push({ name: /^\d+\.wav$/i.test(f) ? `${name}${f}` : f, p: join(p, f) }); } catch { /* unreadable */ }
  }
  for (const { name, p } of entries) {
    if (stopped()) throw new Error(STOPPED);
    const s = await stat(p);
    if (!s.isFile()) continue;
    let wav = null;
    try {
      const fh = await open(p, 'r');
      try {
        const buf = new Uint8Array(256);
        const { bytesRead } = await fh.read(buf, 0, 256, 0);
        wav = parseWavHeader(buf.subarray(0, bytesRead));
      } finally { await fh.close(); }
    } catch { /* unreadable file */ }
    files.push({ name, size: s.size, wav });
  }
  return files;
}

export async function checkFontDir(dir: string, stopped?: () => boolean): Promise<FontEntry> {
  const files = await readFontFiles(dir, stopped);
  return { name: basename(dir), path: dir, report: checkFont(files) };
}

export async function listFonts(root: string): Promise<FontEntry[]> {
  const read = beginRead(root);
  try {
    const out: FontEntry[] = [];
    for (const name of (await readdir(root)).sort((a, b) => a.localeCompare(b))) {
      if (read.stopped()) throw new Error(STOPPED);
      if (name.startsWith('.') || name.startsWith('$') || /^(tracks|system volume information)$/i.test(name)) continue;
      const p = join(root, name);
      if (!(await isDir(p)) || !(await looksLikeFont(p))) continue;
      out.push(await checkFontDir(p, read.stopped));
    }
    return out;
  } finally { read.end(); }
}

/** The Fett263 voice pack in the card's common folder: voicepack.ini and the menu number sounds. */
export async function readVoicePack(root: string): Promise<VoicePackStatus> {
  const common = join(root, 'common');
  let text: string | null = null;
  try { text = await readFile(join(common, 'voicepack.ini'), 'utf8'); } catch { /* no file */ }
  let names: string[] = [];
  try { names = await readdir(common); } catch { /* no common folder */ }
  return { ...parseVoicePackIni(text), menuSounds: hasMenuSounds(names) };
}

export async function listTracks(root: string): Promise<{ name: string; size: number }[]> {
  const read = beginRead(root);
  try {
    const dir = join(root, 'tracks');
    if (!(await isDir(dir))) return [];
    const out: { name: string; size: number }[] = [];
    for (const name of await readdir(dir)) {
      if (read.stopped()) throw new Error(STOPPED);
      if (!/\.wav$/i.test(name)) continue;
      out.push({ name: `tracks/${name}`, size: (await stat(join(dir, name))).size });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  } finally { read.end(); }
}

export interface CopyOptions {
  /** Replace a font of the same name: the owner has confirmed. Without it an existing font is refused. */
  replace?: boolean;
  /** Called after each file, with the files copied so far and the total. */
  onProgress?: (done: number, total: number) => void;
  /** The card's free space, for tests. Read from the card itself when not given. */
  freeBytes?: number | null;
  /** How one file is copied, for tests that make a copy fail part way. */
  copyOne?: (from: string, to: string) => Promise<void>;
}

const COPYING = '.hiltwright-copy-';
const OLD = '.hiltwright-old-';
const mbText = (b: number) => `${Math.max(1, Math.round(b / 1e6))} MB`;

/** Every file under `dir`, with its size, relative to `dir`. */
async function filesUnder(dir: string): Promise<{ rel: string; size: number }[]> {
  const out: { rel: string; size: number }[] = [];
  const walk = async (d: string) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile()) out.push({ rel: relative(dir, p), size: (await stat(p)).size });
    }
  };
  await walk(dir);
  return out;
}

async function cardFree(root: string): Promise<number | null> {
  try { const s = await statfs(root); return Number(s.bavail) * Number(s.bsize); } catch { return null; }
}

/**
 * What an earlier copy left behind (card-safety D5): an unfinished copy is removed; a replace cut short between its
 * two renames has its old font put back, or removed once the new one is in place.
 */
async function clearLeftovers(root: string): Promise<void> {
  let names: string[] = [];
  try { names = await readdir(root); } catch { return; }
  for (const n of names) {
    if (n.startsWith(COPYING)) await rm(join(root, n), { recursive: true, force: true });
    else if (n.startsWith(OLD)) {
      const font = join(root, n.slice(OLD.length));
      if (await exists(font)) await rm(join(root, n), { recursive: true, force: true });
      else await rename(join(root, n), font);
    }
  }
}

/**
 * Copy a font folder onto the card, all or nothing (card-safety D5). The font appears under its name only once every
 * file is there: the copy goes into a hidden folder on the card and is renamed into place. A replace keeps the old
 * font until the new copy is complete, then swaps it out, so old and new files never mix. The space is checked first.
 */
export async function copyFont(src: string, root: string, options: CopyOptions | boolean = {}): Promise<FontEntry> {
  const o: CopyOptions = typeof options === 'boolean' ? { replace: options } : options;
  const name = basename(src);
  if (!/^[^\\/:*?"<>|]+$/.test(name)) throw new Error('Font folder name is not valid on an SD card');
  if (/[;,]/.test(name)) throw new Error(`"${name}" has a ; or , in its name, which ProffieOS reads as a break between font folders. Rename the folder first.`);
  await clearLeftovers(root);
  const dst = join(root, name);
  if (!o.replace && await exists(dst)) throw new Error(`${name} is already on the card`);
  const files = await filesUnder(src);
  const bytes = files.reduce((a, f) => a + f.size, 0);
  const free = o.freeBytes !== undefined ? o.freeBytes : await cardFree(root);
  if (free != null && bytes + Math.max(1e6, bytes * 0.02) > free) throw new Error(`${name} needs ${mbText(bytes)} and the card has ${mbText(free)} free.`);
  const tmp = join(root, `${COPYING}${name}`);
  const copyOne = o.copyOne ?? ((from: string, to: string) => copyFile(from, to));
  try {
    await mkdir(tmp, { recursive: true });
    let done = 0;
    for (const f of files) {
      const to = join(tmp, f.rel);
      await mkdir(dirname(to), { recursive: true });
      await copyOne(join(src, f.rel), to);
      o.onProgress?.(++done, files.length);
    }
  } catch (err) {
    await rm(tmp, { recursive: true, force: true }).catch(() => undefined);
    throw err;
  }
  if (!o.replace) {
    if (await exists(dst)) { await rm(tmp, { recursive: true, force: true }); throw new Error(`${name} is already on the card`); }
    await rename(tmp, dst);
  } else {
    const old = join(root, `${OLD}${name}`);
    const had = await exists(dst);
    if (had) await rename(dst, old);
    try {
      await rename(tmp, dst);
    } catch (err) {
      if (had) await rename(old, dst).catch(() => undefined);
      await rm(tmp, { recursive: true, force: true }).catch(() => undefined);
      throw err;
    }
    if (had) await rm(old, { recursive: true, force: true });
  }
  return checkFontDir(dst);
}

export function soundKind(fileName: string): string {
  return classifySound(fileName).kind;
}
