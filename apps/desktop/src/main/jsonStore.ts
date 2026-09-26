// One safe way to keep a JSON file in userData (roadmap design D8): writes are queued and each goes through its own
// temporary file, the previous good file is kept as <base>.bak.json, and a file that cannot be read (or holds records
// of the wrong shape) is set aside as <base>.damaged-<stamp>.json and never overwritten. Every set-aside is reported
// through storeProblems() so the Armory can tell the owner.

import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

export interface StoreProblem {
  /** What the owner calls it: "saber list", "preset sets". */
  store: string;
  /** File name the damaged store was kept as, in the same folder. */
  keptAs: string;
  startedFrom: 'backup' | 'readable records' | 'nothing';
}

const problems: StoreProblem[] = [];

/** Every store set aside in this run, oldest first. */
export function storeProblems(): StoreProblem[] {
  return [...problems];
}

/** Tests only: start a clean report. */
export function resetStoreProblems(): void {
  problems.length = 0;
}

export interface StoreOptions<T> {
  /** What the owner calls this store, used in the report. */
  name: string;
  empty: () => T;
  /** The readable part of what was on disk and how many records were left out, or null if it is not recognisable. */
  clean: (raw: unknown) => { value: T; dropped: number } | null;
  now?: () => Date;
}

const pad = (n: number) => String(n).padStart(2, '0');
const stamp = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

export class JsonStore<T> {
  private value: T | null = null;
  private loading: Promise<T> | null = null;
  private tail: Promise<unknown> = Promise.resolve();
  private writes = 0;
  /** The file on disk is a good copy worth keeping as the backup before it is replaced. */
  private fileGood = false;
  /** The damaged file could not be moved aside: writing would destroy it, so this run does not write. */
  private blocked: string | null = null;
  private readonly base: string;
  private readonly bak: string;

  constructor(private readonly file: string, private readonly opts: StoreOptions<T>) {
    this.base = join(dirname(file), basename(file).replace(/\.json$/i, ''));
    this.bak = `${this.base}.bak.json`;
  }

  read(): Promise<T> {
    this.loading ??= this.load();
    return this.loading;
  }

  /** Change the value and write it. Updates run one at a time, each with its own write, in the order asked. */
  update<R>(fn: (value: T) => R | Promise<R>): Promise<R> {
    const run = async () => {
      const v = await this.read();
      const r = await fn(v);
      await this.persist(v);
      return r;
    };
    const next = this.tail.then(run);
    this.tail = next.then(() => undefined, () => undefined);
    return next;
  }

  private async load(): Promise<T> {
    let text: string;
    try {
      text = await readFile(this.file, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return (this.value = this.opts.empty());
      return (this.value = await this.setAside(String(err)));
    }
    let raw: unknown;
    try { raw = JSON.parse(text); } catch (err) { return (this.value = await this.setAside(String(err))); }
    const cleaned = this.opts.clean(raw);
    if (!cleaned) return (this.value = await this.setAside('not in the expected shape'));
    if (cleaned.dropped > 0) {
      // Keep the original as it was; the readable records carry on, and the next write replaces the main file.
      const keptAs = this.asideName();
      try { await copyFile(this.file, join(dirname(this.file), keptAs)); } catch (err) { this.blocked = `could not keep a copy: ${String(err)}`; }
      this.report(keptAs, 'readable records', `${cleaned.dropped} record(s) not in the expected shape`);
      return (this.value = cleaned.value);
    }
    this.fileGood = true;
    return (this.value = cleaned.value);
  }

  /** Move an unusable file aside, then start from the backup when it reads, otherwise from nothing. */
  private async setAside(why: string): Promise<T> {
    const keptAs = this.asideName();
    try { await rename(this.file, join(dirname(this.file), keptAs)); } catch (err) { this.blocked = `could not move it aside: ${String(err)}`; }
    let from: StoreProblem['startedFrom'] = 'nothing';
    let value = this.opts.empty();
    try {
      const b = this.opts.clean(JSON.parse(await readFile(this.bak, 'utf8')));
      if (b) { value = b.value; from = 'backup'; }
    } catch { /* no usable backup */ }
    this.report(keptAs, from, why);
    return value;
  }

  private asideName(): string {
    const at = stamp((this.opts.now ?? (() => new Date()))());
    let name = `${basename(this.base)}.damaged-${at}.json`;
    for (let i = 2; existsSync(join(dirname(this.file), name)); i++) name = `${basename(this.base)}.damaged-${at}-${i}.json`;
    return name;
  }

  private report(keptAs: string, startedFrom: StoreProblem['startedFrom'], why: string): void {
    problems.push({ store: this.opts.name, keptAs, startedFrom });
    console.warn(`[store] the ${this.opts.name} could not be read (${why}); kept as ${keptAs}, started from ${startedFrom}${this.blocked ? `; not saving this run: ${this.blocked}` : ''}`);
  }

  private async persist(value: T): Promise<void> {
    if (this.blocked) throw new Error(`The ${this.opts.name} is not being saved in this run, to protect the damaged file (${this.blocked}).`);
    await mkdir(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.${++this.writes}.tmp`;
    await writeFile(tmp, JSON.stringify(value, null, 2), 'utf8');
    if (this.fileGood) { try { await copyFile(this.file, this.bak); } catch { /* the backup is a courtesy */ } }
    await rename(tmp, this.file);
    this.fileGood = true;
  }
}
