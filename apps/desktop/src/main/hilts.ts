// The demo room's hilts, kept in the app's data folder so every build of the app on this computer sees the same ones
// (page storage is per origin: development and installed builds each had their own). The list, the fit adjustments
// made to pack hilts and the room's scene settings live in hilts.json on the shared safe store; each hilt's model and
// its side files (an OBJ's .mtl and textures) live in hilts/<id>/ under generated names.
//
// The owner's hilts are keyed by id and pack adjustments by pack id, in separate fields, so a file named like a pack
// hilt can never overwrite its fit, and resetting a pack's fit can never delete a hilt. Files are written before the
// list names them and deleted only after the list stops naming them, so a failed save never leaves the list pointing
// at something missing.

import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { JsonStore } from './jsonStore';
import { writeZip, type ZipInput } from './zip';
import { extractZip, listZip } from './unzip';
import { cleanFit, cleanScene, type HiltFit, type SceneSettings } from '../shared/demoSettings';
import type { HiltAddMode, HiltAddResult, HiltInfo, HiltInput, HiltMergeResult, HiltModelData, LegacyHilts } from '../shared/api';

export type OwnHiltFormat = HiltInfo['format'];
export interface HiltRecord {
  id: string;
  name: string;
  format: OwnHiltFormat;
  fit: HiltFit;
  creator?: string;
  /** The model's file in hilts/<id>/. */
  model: string;
  /** Files that came with it, under the names the model refers to them by, and their files in hilts/<id>/. */
  side: { name: string; file: string }[];
  /** SHA-256 of the model's bytes: the same name and hash is the same hilt. */
  sha256: string;
}
export interface HiltsFile {
  version: 1;
  hilts: HiltRecord[];
  /** The owner's adjustments to pack hilts, by pack id. A pack with none shows the pack's own fit. */
  packFits: Record<string, HiltFit>;
  /** The chosen hilt: an id, `pack:<packId>`, or absent for the built-in one. */
  room: { scene?: SceneSettings; chosen?: string };
  /** Page origins whose earlier storage has been brought over: never twice, even if the page lost its own note of it. */
  adopted?: string[];
}
export type { HiltInfo, HiltModelData, HiltInput, LegacyHilts } from '../shared/api';
export type AddMode = HiltAddMode;
export type AddResult = HiltAddResult;
export type MergeResult = HiltMergeResult;

const ID = /^[0-9a-f]{12}$/;
const FILE = /^[0-9a-f]{8}\.(glb|obj|stl|bin)$/;
const PACK_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;
const FORMATS: readonly string[] = ['glb', 'obj', 'stl'];
const EXPORT_KIND = 'hiltwright-hilts';
/** An import is unpacked before it is read; this keeps a hostile zip from filling the disk. */
const IMPORT_MAX_BYTES = 4 * 1024 ** 3;

const buf = (d: ArrayBuffer | Uint8Array): Buffer => (d instanceof Uint8Array ? Buffer.from(d.buffer, d.byteOffset, d.byteLength) : Buffer.from(d));
const sha = (d: Buffer) => createHash('sha256').update(d).digest('hex');
const fileName = (ext: string) => `${randomBytes(4).toString('hex')}.${ext}`;
const sideName = (n: unknown) => (typeof n === 'string' ? n.replace(/\\/g, '/').split('/').pop()!.slice(0, 200) : '');
const cleanName = (n: unknown): string => (typeof n === 'string' ? n.trim().slice(0, 120) : '');
const cleanCreator = (c: unknown): string | undefined => { const s = typeof c === 'string' ? c.trim().slice(0, 120) : ''; return s || undefined; };
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const info = (h: HiltRecord): HiltInfo => ({ id: h.id, name: h.name, format: h.format, fit: { ...h.fit }, ...(h.creator ? { creator: h.creator } : {}) });

/** The readable part of a stored hilts.json. An entry naming a file it could not own is dropped; fits and scene are repaired. */
export function cleanHilts(raw: unknown): { value: HiltsFile; dropped: number } | null {
  const f = raw as { hilts?: unknown; packFits?: unknown; room?: unknown } | null;
  if (!f || typeof f !== 'object' || !Array.isArray(f.hilts)) return null;
  let dropped = 0;
  const hilts: HiltRecord[] = [];
  for (const r of f.hilts as Record<string, unknown>[]) {
    const side = Array.isArray(r?.side) ? (r.side as Record<string, unknown>[]) : null;
    const ok = r && typeof r === 'object' && typeof r.id === 'string' && ID.test(r.id) && !hilts.some((h) => h.id === r.id)
      && FORMATS.includes(r.format as string) && typeof r.model === 'string' && FILE.test(r.model) && cleanName(r.name)
      && typeof r.sha256 === 'string' && /^[0-9a-f]{64}$/.test(r.sha256)
      && side !== null && side.every((s) => s && typeof s.file === 'string' && FILE.test(s.file) && sideName(s.name));
    if (!ok) { dropped++; continue; }
    const creator = cleanCreator(r.creator);
    hilts.push({ id: r.id as string, name: cleanName(r.name), format: r.format as OwnHiltFormat, fit: cleanFit(r.fit), ...(creator ? { creator } : {}), model: r.model as string, side: side!.map((s) => ({ name: sideName(s.name), file: s.file as string })), sha256: r.sha256 as string });
  }
  const packFits: Record<string, HiltFit> = {};
  if (f.packFits && typeof f.packFits === 'object' && !Array.isArray(f.packFits)) {
    for (const [k, v] of Object.entries(f.packFits as Record<string, unknown>)) { if (PACK_ID.test(k)) packFits[k] = cleanFit(v); else dropped++; }
  }
  const room0 = (f.room && typeof f.room === 'object' ? f.room : {}) as { scene?: unknown; chosen?: unknown };
  const room: HiltsFile['room'] = {};
  if (room0.scene !== undefined) room.scene = cleanScene(room0.scene);
  if (typeof room0.chosen === 'string' && (hilts.some((h) => h.id === room0.chosen) || /^pack:/.test(room0.chosen) && PACK_ID.test(room0.chosen.slice(5)))) room.chosen = room0.chosen;
  const adopted = Array.isArray((f as { adopted?: unknown }).adopted) ? ((f as { adopted: unknown[] }).adopted).filter((o): o is string => typeof o === 'string' && o.length <= 200).slice(0, 50) : [];
  return { value: { version: 1, hilts, packFits, room, ...(adopted.length ? { adopted } : {}) }, dropped };
}

/** The same hilt: the same model under the same name, or under the numbered name it was given when that was taken. */
function sameHilt(c: HiltRecord, name: string, hash: string): boolean {
  if (c.sha256 !== hash) return false;
  const a = c.name.trim().toLowerCase(); const b = name.trim().toLowerCase();
  return a === b || a.startsWith(`${b} `) && /^\d+$/.test(a.slice(b.length + 1));
}

/** "YS" if free, else "YS 2", "YS 3", and so on. */
function freeName(hilts: HiltRecord[], name: string): string {
  if (!hilts.some((h) => same(h.name, name))) return name;
  for (let n = 2; ; n++) if (!hilts.some((h) => same(h.name, `${name} ${n}`))) return `${name} ${n}`;
}

export class HiltStore {
  private store: JsonStore<HiltsFile>;
  constructor(private readonly dir: string) {
    this.store = new JsonStore<HiltsFile>(join(dir, 'hilts.json'), { name: 'demo room hilts', place: 'data', empty: () => ({ version: 1, hilts: [], packFits: {}, room: {} }), clean: cleanHilts });
  }
  private folder(id: string) { return join(this.dir, 'hilts', id); }

  async list(): Promise<HiltInfo[]> { return (await this.store.read()).hilts.map(info); }

  async model(id: string): Promise<HiltModelData> {
    const h = (await this.store.read()).hilts.find((x) => x.id === id);
    if (!h) throw new Error('That hilt is no longer here.');
    const at = this.folder(id);
    const data = await readFile(join(at, h.model));
    const sideFiles = await Promise.all(h.side.map(async (s) => ({ name: s.name, data: new Uint8Array(await readFile(join(at, s.file))) })));
    return { format: h.format, data: new Uint8Array(data), sideFiles };
  }

  /** Write a model and its side files into `folder` under fresh names. */
  private async writeFiles(folder: string, m: HiltModelData): Promise<{ model: string; side: HiltRecord['side']; sha256: string; files: string[] }> {
    if (!FORMATS.includes(m.format)) throw new Error('A hilt must be a .glb, .obj or .stl model.');
    const data = buf(m.data);
    await mkdir(folder, { recursive: true });
    const model = fileName(m.format);
    await writeFile(join(folder, model), data);
    const side: HiltRecord['side'] = [];
    const files = [model];
    for (const s of m.sideFiles ?? []) {
      const name = sideName(s.name);
      if (!name) continue;
      const file = fileName('bin');
      await writeFile(join(folder, file), buf(s.data));
      side.push({ name, file }); files.push(file);
    }
    return { model, side, sha256: sha(data), files };
  }

  /**
   * Keep a hilt the owner loaded. 'new' adds it under its own name, or adds nothing and says which hilt has that name;
   * 'keepBoth' adds it under the next free numbered name with a fresh fit; `replace` swaps the model of that hilt,
   * keeping its name, fit and credit.
   */
  async add(input: HiltInput, mode: AddMode): Promise<AddResult> {
    const name = cleanName(input.name);
    if (!name) throw new Error('A hilt needs a name.');
    if (typeof mode === 'object') return this.replace(mode.replace, input);
    const id = randomBytes(6).toString('hex');
    const folder = this.folder(id);
    let result: AddResult | null = null;
    try {
      const w = await this.writeFiles(folder, input);
      await this.store.update((f) => {
        const taken = f.hilts.find((h) => same(h.name, name));
        if (taken && mode === 'new') { result = { taken: { id: taken.id, name: taken.name } }; return; }
        const creator = cleanCreator(input.creator);
        const rec: HiltRecord = { id, name: freeName(f.hilts, name), format: input.format, fit: cleanFit(input.fit), ...(creator ? { creator } : {}), model: w.model, side: w.side, sha256: w.sha256 };
        f.hilts.push(rec);
        result = { added: info(rec) };
      });
    } catch (err) {
      await rm(folder, { recursive: true, force: true });
      throw err;
    }
    if (!result || 'taken' in result) await rm(folder, { recursive: true, force: true });
    return result!;
  }

  private async replace(id: string, m: HiltModelData): Promise<AddResult> {
    const folder = this.folder(id);
    if (!(await this.store.read()).hilts.some((h) => h.id === id)) throw new Error('That hilt is no longer here.');
    const w = await this.writeFiles(folder, m);
    let old: string[] = [];
    let rec: HiltRecord | null = null;
    try {
      await this.store.update((f) => {
        const h = f.hilts.find((x) => x.id === id);
        if (!h) throw new Error('That hilt is no longer here.');
        old = [h.model, ...h.side.map((s) => s.file)];
        Object.assign(h, { format: m.format, model: w.model, side: w.side, sha256: w.sha256 });
        rec = h;
      });
    } catch (err) {
      for (const file of w.files) await rm(join(folder, file), { force: true });
      throw err;
    }
    for (const file of old) if (FILE.test(file)) await rm(join(folder, file), { force: true });
    return { added: info(rec!) };
  }

  async setFit(id: string, fit: unknown): Promise<void> {
    await this.store.update((f) => { const h = f.hilts.find((x) => x.id === id); if (!h) throw new Error('That hilt is no longer here.'); h.fit = cleanFit(fit); });
  }

  async setCreator(id: string, creator: unknown): Promise<void> {
    await this.store.update((f) => {
      const h = f.hilts.find((x) => x.id === id);
      if (!h) throw new Error('That hilt is no longer here.');
      const c = cleanCreator(creator);
      if (c) h.creator = c; else delete h.creator;
    });
  }

  /** Remove one of the owner's hilts: the list is saved first, then its files go. */
  async remove(id: string): Promise<void> {
    let found = false;
    await this.store.update((f) => {
      const i = f.hilts.findIndex((x) => x.id === id);
      if (i < 0) return;
      found = true;
      f.hilts.splice(i, 1);
      if (f.room.chosen === id) delete f.room.chosen;
    });
    if (found && ID.test(id)) await rm(this.folder(id), { recursive: true, force: true });
  }

  async packFits(): Promise<Record<string, HiltFit>> { return { ...(await this.store.read()).packFits }; }

  async setPackFit(packId: string, fit: unknown): Promise<void> {
    if (!PACK_ID.test(packId)) throw new Error('Not a pack hilt.');
    await this.store.update((f) => { f.packFits[packId] = cleanFit(fit); });
  }

  /** Back to the pack's own fit. Touches nothing but that pack's adjustment. */
  async resetPackFit(packId: string): Promise<void> {
    await this.store.update((f) => { delete f.packFits[packId]; });
  }

  async room(): Promise<{ scene: SceneSettings | null; chosen: string | null; adopted: string[] }> {
    const f = await this.store.read();
    const r = f.room;
    return { scene: r.scene ? { ...r.scene } : null, chosen: r.chosen ?? null, adopted: [...(f.adopted ?? [])] };
  }

  async setRoom(patch: { scene?: unknown; chosen?: unknown }): Promise<void> {
    await this.store.update((f) => {
      if (patch.scene !== undefined) f.room.scene = cleanScene(patch.scene);
      if (patch.chosen !== undefined) {
        const c = patch.chosen;
        if (typeof c === 'string' && (f.hilts.some((h) => h.id === c) || /^pack:/.test(c) && PACK_ID.test(c.slice(5)))) f.room.chosen = c;
        else delete f.room.chosen;
      }
    });
  }

  /**
   * Add hilts from elsewhere (an earlier version's page storage, or an import) without replacing anything: the same
   * name and model is skipped, a different model under a taken name gets the next free numbered name. Pack fits and
   * room settings are taken only where there are none. All files are written first; if the list cannot be saved,
   * they are removed again.
   */
  private async merge(incoming: (HiltInput & { packId?: string })[], scene: unknown, chosen: string | undefined, origin?: string): Promise<MergeResult> {
    const written: { id: string; input: HiltInput; w: Awaited<ReturnType<HiltStore['writeFiles']>> }[] = [];
    const current = (await this.store.read()).hilts;
    let skipped = 0;
    try {
      for (const h of incoming) {
        if (h.packId) continue;
        if (!FORMATS.includes(h.format) || !cleanName(h.name)) { skipped++; continue; }
        const hash = sha(buf(h.data));
        if (current.some((c) => sameHilt(c, h.name, hash)) || written.some((x) => same(x.input.name, h.name) && x.w.sha256 === hash)) { skipped++; continue; }
        const id = randomBytes(6).toString('hex');
        written.push({ id, input: h, w: await this.writeFiles(this.folder(id), h) });
      }
      let added = 0; let fits = 0;
      await this.store.update((f) => {
        // Adopted meanwhile by another window: take nothing (the files written above are removed below).
        if (origin && f.adopted?.includes(origin)) { skipped += incoming.length; return; }
        const byName = new Map<string, string>();
        for (const { id, input, w } of written) {
          if (f.hilts.some((c) => sameHilt(c, input.name, w.sha256))) { skipped++; continue; }
          const creator = cleanCreator(input.creator);
          const name = freeName(f.hilts, cleanName(input.name));
          f.hilts.push({ id, name, format: input.format, fit: cleanFit(input.fit), ...(creator ? { creator } : {}), model: w.model, side: w.side, sha256: w.sha256 });
          byName.set(cleanName(input.name).toLowerCase(), id);
          added++;
        }
        for (const h of incoming) {
          if (!h.packId || !PACK_ID.test(h.packId)) continue;
          if (f.packFits[h.packId]) { skipped++; continue; }
          f.packFits[h.packId] = cleanFit(h.fit); fits++;
        }
        if (origin) f.adopted = [...(f.adopted ?? []), origin];
        if (scene !== undefined && !f.room.scene) f.room.scene = cleanScene(scene);
        if (chosen && !f.room.chosen) {
          if (/^pack:/.test(chosen) && PACK_ID.test(chosen.slice(5))) f.room.chosen = chosen;
          else if (chosen.startsWith('name:')) {
            const n = chosen.slice(5);
            const id = byName.get(n.trim().toLowerCase()) ?? f.hilts.find((c) => same(c.name, n))?.id;
            if (id) f.room.chosen = id;
          }
        }
      });
      // Anything written but not taken (a copy that arrived meanwhile) goes again.
      const kept = new Set((await this.store.read()).hilts.map((h) => h.id));
      for (const x of written) if (!kept.has(x.id)) await rm(this.folder(x.id), { recursive: true, force: true });
      return { added, fits, skipped };
    } catch (err) {
      for (const x of written) await rm(this.folder(x.id), { recursive: true, force: true });
      throw err;
    }
  }

  /** What an earlier version kept in the page's own storage. Running it again adds nothing. */
  async adopt(legacy: LegacyHilts): Promise<MergeResult> {
    const origin = typeof legacy?.origin === 'string' && legacy.origin ? legacy.origin.slice(0, 200) : 'unknown';
    const hilts = Array.isArray(legacy?.hilts) ? legacy.hilts : [];
    if ((await this.store.read()).adopted?.includes(origin)) return { added: 0, fits: 0, skipped: hilts.length };
    return this.merge(hilts, legacy?.scene, typeof legacy?.chosen === 'string' ? legacy.chosen : undefined, origin);
  }

  /** Every hilt the owner loaded, with its fit and credit, and every pack fit adjustment, in one zip. */
  async exportTo(file: string): Promise<{ hilts: number; packFits: number }> {
    const f = await this.store.read();
    const hilts = f.hilts.map((h) => ({ ...h, fit: { ...h.fit }, side: h.side.map((s) => ({ ...s })) }));
    const packFits = { ...f.packFits };
    const entries: ZipInput[] = [{ name: 'hilts.json', data: JSON.stringify({ kind: EXPORT_KIND, version: 1, hilts, packFits }, null, 2) }];
    for (const h of hilts) for (const file of [h.model, ...h.side.map((s) => s.file)]) entries.push({ name: `${h.id}/${file}`, from: join(this.folder(h.id), file) });
    await writeZip(file, entries);
    return { hilts: hilts.length, packFits: Object.keys(packFits).length };
  }

  /** Add what an export holds that is not already here; never replaces a hilt. */
  async importFrom(file: string): Promise<MergeResult> {
    let list;
    try { list = await listZip(file); } catch { throw new Error('That file is not a Hiltwright hilt export.'); }
    if (!list.some((e) => e.name === 'hilts.json')) throw new Error('That file is not a Hiltwright hilt export.');
    if (list.reduce((n, e) => n + e.size, 0) > IMPORT_MAX_BYTES) throw new Error('That export is too large to import.');
    const tmp = join(this.dir, `hilts-import-${randomBytes(4).toString('hex')}`);
    try {
      await extractZip(file, tmp);
      let raw: unknown;
      try { raw = JSON.parse((await readFile(join(tmp, 'hilts.json'), 'utf8')).replace(/^﻿/, '')); } catch { raw = null; }
      const clean = raw && (raw as { kind?: unknown }).kind === EXPORT_KIND ? cleanHilts(raw) : null;
      if (!clean) throw new Error('That file is not a Hiltwright hilt export.');
      const incoming: (HiltInput & { packId?: string })[] = [];
      let missing = 0;
      for (const h of clean.value.hilts) {
        try {
          const data = await readFile(join(tmp, h.id, h.model));
          const sideFiles = await Promise.all(h.side.map(async (s) => ({ name: s.name, data: await readFile(join(tmp, h.id, s.file)) })));
          incoming.push({ name: h.name, format: h.format, data, sideFiles, fit: h.fit, creator: h.creator });
        } catch { missing++; }
      }
      for (const [packId, fit] of Object.entries(clean.value.packFits)) incoming.push({ name: packId, format: 'stl', data: new Uint8Array(0), sideFiles: [], fit, packId });
      const r = await this.merge(incoming, undefined, undefined);
      return { added: r.added, fits: r.fits, skipped: r.skipped + missing + clean.dropped };
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }
}
