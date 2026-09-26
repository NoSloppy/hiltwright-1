// Preset banks (the owner's saved preset sets), shared across sabers: one JSON file in userData, kept by the safe store
// (jsonStore.ts) like the saber library.

import { join } from 'node:path';
import { isBank, type PresetBank } from '@hiltwright/core';
import { JsonStore } from './jsonStore';

interface BanksFile { version: 1; banks: PresetBank[] }

/** The sets that have the expected shape, and how many did not. Null when the file is not a sets file. */
export function cleanBanks(raw: unknown): { value: BanksFile; dropped: number } | null {
  const f = raw as Partial<BanksFile> | null;
  if (!f || typeof f !== 'object' || !Array.isArray(f.banks)) return null;
  const banks = f.banks.filter(isBank);
  return { value: { version: 1, banks }, dropped: f.banks.length - banks.length };
}

export class BanksStore {
  private store: JsonStore<BanksFile>;
  constructor(file: string) {
    this.store = new JsonStore(file, { name: 'preset sets', place: 'data', empty: () => ({ version: 1, banks: [] }), clean: cleanBanks });
  }
  async list(): Promise<PresetBank[]> { return [...(await this.store.read()).banks]; }
  /** Add or replace by id, keeping the list's order for a replacement. */
  save(bank: PresetBank): Promise<PresetBank[]> {
    return this.store.update((f) => {
      const i = f.banks.findIndex((b) => b.id === bank.id);
      if (i >= 0) f.banks[i] = bank; else f.banks.push(bank);
      return [...f.banks];
    });
  }
  remove(id: string): Promise<PresetBank[]> {
    return this.store.update((f) => { f.banks = f.banks.filter((b) => b.id !== id); return [...f.banks]; });
  }
}

export function banksPath(userData: string): string { return join(userData, 'banks.json'); }
