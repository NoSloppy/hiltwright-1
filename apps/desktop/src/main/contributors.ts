// The people whose work the owner uses: font makers, look authors (Fett263 and the like). Credited by name on
// fonts and looks; here each can have a logo and a link. One file and a folder of logos in userData, shared by the
// font library and the looks, so the same person is credited the same way everywhere. The file is kept by the safe
// store (jsonStore.ts).

import { cp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { JsonStore } from './jsonStore';

export interface ContributorMeta { logo?: string; url?: string }
export interface ContributorInfo { name: string; /** Data URL, ready for an <img>. */ logo: string | null; url: string | null }

const LOGO_TYPES: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

/** A link the owner gave: http(s) only, so opening it can only ever show a web page. */
export function cleanUrl(url: string): string | null {
  const t = url.trim();
  if (!t) return null;
  let u: URL;
  try { u = new URL(/^[a-z]+:\/\//i.test(t) ? t : `https://${t}`); } catch { throw new Error('That is not a web address'); }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('Only web addresses (http or https) can be saved');
  return u.toString();
}

interface ContributorsFile { version: 1; people: Record<string, ContributorMeta> }

const goodLogo = (v: unknown): v is string => typeof v === 'string' && v === basename(v) && !!LOGO_TYPES[extname(v).toLowerCase()];

/**
 * The entries whose logo is a picture file name and whose link is a web address. An entry with a field that fails is
 * counted as dropped (so the original is kept aside) and keeps only what passed; one left with nothing drops off.
 * Null when it is not a contributors file.
 */
export function cleanContributors(raw: unknown): { value: ContributorsFile; dropped: number } | null {
  const f = raw as { people?: unknown } | null;
  if (!f || typeof f !== 'object' || !f.people || typeof f.people !== 'object' || Array.isArray(f.people)) return null;
  const people: Record<string, ContributorMeta> = {};
  let dropped = 0;
  for (const [name, v] of Object.entries(f.people as Record<string, unknown>)) {
    const m = (v && typeof v === 'object' ? v : {}) as { logo?: unknown; url?: unknown };
    const next: ContributorMeta = {};
    let bad = !v || typeof v !== 'object';
    if (m.logo !== undefined) { if (goodLogo(m.logo)) next.logo = m.logo; else bad = true; }
    if (m.url !== undefined) {
      let url: string | null = null;
      try { url = typeof m.url === 'string' ? cleanUrl(m.url) : null; } catch { url = null; }
      if (url) next.url = url; else bad = true;
    }
    if (bad) dropped++;
    if (next.logo || next.url) people[name] = next;
  }
  return { value: { version: 1, people }, dropped };
}

export class ContributorStore {
  private store: JsonStore<ContributorsFile>;
  constructor(private readonly dir: string) {
    this.store = new JsonStore(join(dir, 'contributors.json'), { name: 'contributors', place: 'data', empty: () => ({ version: 1, people: {} }), clean: cleanContributors });
  }
  private get logos() { return join(this.dir, 'contributors'); }

  private async people(): Promise<Record<string, ContributorMeta>> {
    return (await this.store.read()).people;
  }
  /** The stored spelling of a name, matched regardless of case. */
  private keyIn(people: Record<string, ContributorMeta>, name: string): string | null {
    const want = name.trim().toLowerCase();
    return Object.keys(people).find((k) => k.toLowerCase() === want) ?? null;
  }
  private async key(name: string): Promise<string | null> {
    return this.keyIn(await this.people(), name);
  }

  private async logoUrl(file: string | undefined): Promise<string | null> {
    if (!file || file !== basename(file)) return null;
    const type = LOGO_TYPES[extname(file).toLowerCase()];
    if (!type) return null;
    try { return `data:${type};base64,${(await readFile(join(this.logos, file))).toString('base64')}`; } catch { return null; }
  }

  private newLogoFile(name: string, ext: string): string {
    return `${name.replace(/[^A-Za-z0-9]+/g, '_').toLowerCase() || 'logo'}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}${ext}`;
  }

  async list(): Promise<ContributorInfo[]> {
    const people = await this.people();
    const out: ContributorInfo[] = [];
    for (const name of Object.keys(people).sort((a, b) => a.localeCompare(b))) out.push({ name, logo: await this.logoUrl(people[name].logo), url: people[name].url ?? null });
    return out;
  }

  async has(name: string): Promise<boolean> { return (await this.key(name)) !== null; }

  /**
   * Copy an image in as the person's logo; the original stays where it was. The old picture is deleted only once the
   * list naming the new one is saved; if saving fails, the new copy goes and everything is as it was.
   */
  async setLogo(name: string, image: string): Promise<ContributorInfo> {
    const n = name.trim();
    if (!n) throw new Error('A contributor needs a name');
    const ext = extname(image).toLowerCase();
    if (!LOGO_TYPES[ext]) throw new Error('A logo must be a PNG, JPEG, WebP, GIF or SVG image');
    if ((await stat(image)).size > LOGO_MAX_BYTES) throw new Error('That image is over 2 MB. A small logo is plenty.');
    const file = this.newLogoFile((await this.key(n)) ?? n, ext);
    await mkdir(this.logos, { recursive: true });
    await cp(image, join(this.logos, file));
    let old: string | undefined;
    let k = n;
    try {
      await this.store.update((f) => {
        k = this.keyIn(f.people, n) ?? n;
        old = f.people[k]?.logo;
        f.people[k] = { ...f.people[k], logo: file };
      });
    } catch (err) {
      await rm(join(this.logos, file), { force: true });
      throw err;
    }
    if (old && old === basename(old) && old !== file) await rm(join(this.logos, old), { force: true });
    return { name: k, logo: await this.logoUrl(file), url: (await this.people())[k]?.url ?? null };
  }

  /** Remove a person's logo: the list is saved first, then the picture goes. */
  async clearLogo(name: string): Promise<void> {
    let old: string | undefined;
    await this.store.update((f) => {
      const k = this.keyIn(f.people, name);
      if (!k || !f.people[k].logo) return;
      old = f.people[k].logo;
      delete f.people[k].logo;
      if (!f.people[k].url) delete f.people[k];
    });
    if (old && old === basename(old)) await rm(join(this.logos, old), { force: true });
  }

  async setUrl(name: string, url: string): Promise<void> {
    const n = name.trim();
    if (!n) throw new Error('A contributor needs a name');
    const clean = cleanUrl(url);
    await this.store.update((f) => {
      const k = this.keyIn(f.people, n) ?? n;
      const next: ContributorMeta = { ...f.people[k] };
      if (clean) next.url = clean; else delete next.url;
      if (next.logo || next.url) f.people[k] = next; else delete f.people[k];
    });
  }

  /**
   * Give `to` the same logo (a copy of the picture) and link as `from`, after an author was renamed. `from` keeps its
   * own: other fonts or styles may still credit it. Refused when `to` already has an entry; nothing when `from` has none.
   */
  async copyTo(from: string, to: string): Promise<boolean> {
    const people = await this.people();
    const src = this.keyIn(people, from);
    const t = to.trim();
    if (!t) throw new Error('A contributor needs a name');
    if (this.keyIn(people, t)) throw new Error(`${t} already has a logo or link`);
    if (!src) return false;
    const meta = people[src];
    let logo: string | undefined;
    if (meta.logo && meta.logo === basename(meta.logo)) {
      logo = this.newLogoFile(t, extname(meta.logo).toLowerCase());
      await mkdir(this.logos, { recursive: true });
      try { await cp(join(this.logos, meta.logo), join(this.logos, logo)); } catch { logo = undefined; }
    }
    try {
      await this.store.update((f) => {
        if (this.keyIn(f.people, t)) throw new Error(`${t} already has a logo or link`);
        const next: ContributorMeta = { ...(logo ? { logo } : {}), ...(meta.url ? { url: meta.url } : {}) };
        if (next.logo || next.url) f.people[t] = next;
      });
    } catch (err) {
      if (logo) await rm(join(this.logos, logo), { force: true });
      throw err;
    }
    return true;
  }

  /** The link stored for a person, for opening: never a link the renderer made up. */
  async urlOf(name: string): Promise<string | null> {
    const people = await this.people();
    const k = this.keyIn(people, name);
    return k ? people[k].url ?? null : null;
  }
}
