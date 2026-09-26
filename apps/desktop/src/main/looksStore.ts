// The owner's pasted and built styles ("looks" in code), shared across sabers: one JSON file in userData, kept by the
// safe store (jsonStore.ts). One shape check, cleanLook, serves both saving a style and reading the file back.

import { join } from 'node:path';
import { isStyleDoc, isTreeDoc, type LookDef } from '@hiltwright/core';
import { JsonStore } from './jsonStore';
import { hexMap } from './firmwareRecord';

interface LooksFile { version: 1; looks: LookDef[] }

const ROLES = ['main', 'crystal', 'accent', 'side', 'motor'];
const HEX = /^#[0-9a-fA-F]{6}$/;

/** A string no longer than `max`, else undefined (the look is refused). */
const text = (v: unknown, max: number): string | undefined => (typeof v === 'string' && v.length <= max ? v : undefined);

/**
 * A style as it may be stored: every field checked and rebuilt, nothing else kept. Null when it is not a style (a bad
 * id, no code, or a field of the wrong kind or too long).
 */
export function cleanLook(v: unknown): LookDef | null {
  const l = v as LookDef;
  if (!l || typeof l !== 'object' || !/^[A-Za-z_][A-Za-z0-9_]{0,60}$/.test(String(l.id))) return null;
  const name = text(l.name, 120);
  const by = text(l.by ?? '', 120);
  const code = text(l.code, 200000);
  const description = text(l.description ?? '', 2000);
  const header = l.header == null ? null : text(l.header, 20000);
  if (name === undefined || by === undefined || code === undefined || description === undefined || header === undefined) return null;
  const define = l.define === undefined ? undefined : text(l.define, 200000);
  if (l.define !== undefined && define === undefined) return null;
  return {
    id: l.id, name, source: l.source === 'built' ? 'built' : 'pasted', by, code, header,
    roles: Array.isArray(l.roles) ? l.roles.filter((r): r is LookDef['roles'][number] => ROLES.includes(String(r))) : ['main'],
    args: Array.isArray(l.args) ? l.args.map(Number).filter((n) => Number.isInteger(n) && n > 0 && n < 100) : [],
    preview: HEX.test(String(l.preview)) ? l.preview : '#ffffff', description,
    ...(l.defaults ? { defaults: hexMap(l.defaults) } : {}),
    ...(l.preview2 && HEX.test(String(l.preview2)) ? { preview2: l.preview2 } : {}),
    // A look built in the style editor: its alias define is what gets compiled, its layers let it be edited again.
    ...(define !== undefined ? { define } : {}),
    ...(l.usesFx ? { usesFx: true } : {}),
    ...(isStyleDoc(l.style) || isTreeDoc(l.style) ? { style: JSON.parse(JSON.stringify(l.style)) as unknown } : {}),
  } as LookDef;
}

/** The styles that pass cleanLook, and how many did not. Null when the file is not a styles file. */
export function cleanLooks(raw: unknown): { value: LooksFile; dropped: number } | null {
  const f = raw as Partial<LooksFile> | null;
  if (!f || typeof f !== 'object' || !Array.isArray(f.looks)) return null;
  const looks = f.looks.map(cleanLook).filter((l): l is LookDef => !!l);
  return { value: { version: 1, looks }, dropped: f.looks.length - looks.length };
}

export class LooksStore {
  private store: JsonStore<LooksFile>;
  constructor(file: string) {
    this.store = new JsonStore(file, { name: 'styles', place: 'data', empty: () => ({ version: 1, looks: [] }), clean: cleanLooks });
  }

  async list(): Promise<LookDef[]> {
    return [...(await this.store.read()).looks];
  }

  /** Add, or replace by id in its place. */
  add(look: LookDef): Promise<LookDef[]> {
    return this.store.update((f) => {
      const i = f.looks.findIndex((l) => l.id === look.id);
      if (i >= 0) f.looks[i] = look; else f.looks.push(look);
      return [...f.looks];
    });
  }

  remove(id: string): Promise<LookDef[]> {
    return this.store.update((f) => { f.looks = f.looks.filter((l) => l.id !== id); return [...f.looks]; });
  }
}

export function looksPath(userData: string): string {
  return join(userData, 'looks.json');
}
