// The people whose work the owner uses: font makers, look authors (Fett263 and the like). Credited by name on
// fonts and looks; here each can have a logo and a link. One file and a folder of logos in userData, shared by the
// font library and the looks, so the same person is credited the same way everywhere.

import { cp, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

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

export class ContributorStore {
  private people: Record<string, ContributorMeta> | null = null;
  constructor(private readonly dir: string) {}
  private get file() { return join(this.dir, 'contributors.json'); }
  private get logos() { return join(this.dir, 'contributors'); }

  private async load(): Promise<Record<string, ContributorMeta>> {
    if (this.people) return this.people;
    try { const raw = JSON.parse(await readFile(this.file, 'utf8')) as { people?: Record<string, ContributorMeta> }; this.people = raw.people && typeof raw.people === 'object' ? raw.people : {}; } catch { this.people = {}; }
    return this.people;
  }
  private async save(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify({ version: 1, people: this.people ?? {} }, null, 2), 'utf8');
    await rename(tmp, this.file);
  }
  /** The stored spelling of a name, matched regardless of case. */
  private async key(name: string): Promise<string | null> {
    const want = name.trim().toLowerCase();
    return Object.keys(await this.load()).find((k) => k.toLowerCase() === want) ?? null;
  }

  private async logoUrl(file: string | undefined): Promise<string | null> {
    if (!file || file !== basename(file)) return null;
    const type = LOGO_TYPES[extname(file).toLowerCase()];
    if (!type) return null;
    try { return `data:${type};base64,${(await readFile(join(this.logos, file))).toString('base64')}`; } catch { return null; }
  }

  async list(): Promise<ContributorInfo[]> {
    const people = await this.load();
    const out: ContributorInfo[] = [];
    for (const name of Object.keys(people).sort((a, b) => a.localeCompare(b))) out.push({ name, logo: await this.logoUrl(people[name].logo), url: people[name].url ?? null });
    return out;
  }

  async has(name: string): Promise<boolean> { return (await this.key(name)) !== null; }

  /** Copy an image in as the person's logo; the original stays where it was. */
  async setLogo(name: string, image: string): Promise<ContributorInfo> {
    const n = name.trim();
    if (!n) throw new Error('A contributor needs a name');
    const ext = extname(image).toLowerCase();
    if (!LOGO_TYPES[ext]) throw new Error('A logo must be a PNG, JPEG, WebP, GIF or SVG image');
    if ((await stat(image)).size > LOGO_MAX_BYTES) throw new Error('That image is over 2 MB. A small logo is plenty.');
    const people = await this.load();
    const k = (await this.key(n)) ?? n;
    const file = `${k.replace(/[^A-Za-z0-9]+/g, '_').toLowerCase() || 'logo'}-${Date.now().toString(36)}${ext}`;
    await mkdir(this.logos, { recursive: true });
    await cp(image, join(this.logos, file));
    const old = people[k]?.logo;
    if (old && old === basename(old)) await rm(join(this.logos, old), { force: true });
    people[k] = { ...people[k], logo: file };
    await this.save();
    return { name: k, logo: await this.logoUrl(file), url: people[k].url ?? null };
  }

  async clearLogo(name: string): Promise<void> {
    const people = await this.load();
    const k = await this.key(name);
    if (!k || !people[k].logo) return;
    const old = people[k].logo!;
    if (old === basename(old)) await rm(join(this.logos, old), { force: true });
    delete people[k].logo;
    if (!people[k].url) delete people[k];
    await this.save();
  }

  async setUrl(name: string, url: string): Promise<void> {
    const n = name.trim();
    if (!n) throw new Error('A contributor needs a name');
    const clean = cleanUrl(url);
    const people = await this.load();
    const k = (await this.key(n)) ?? n;
    const next: ContributorMeta = { ...people[k] };
    if (clean) next.url = clean; else delete next.url;
    if (next.logo || next.url) people[k] = next; else delete people[k];
    await this.save();
  }

  /** The link stored for a person, for opening: never a link the renderer made up. */
  async urlOf(name: string): Promise<string | null> {
    const k = await this.key(name);
    return k ? (await this.load())[k].url ?? null : null;
  }
}
