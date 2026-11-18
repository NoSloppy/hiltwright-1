// preset-editing "Saved preset sets survive a damaged file" (library-integrity).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { newBank } from '@hiltwright/core';
import { BanksStore } from '../src/main/banksStore';
import { resetStoreProblems, storeProblems } from '../src/main/jsonStore';

let dir = '';
let file = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'hw-banks-')); file = join(dir, 'banks.json'); resetStoreProblems(); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('saved preset sets', () => {
  it('a damaged sets file is kept aside, and a new set is still saved', async () => {
    writeFileSync(file, '{"banks": [ oops');
    const store = new BanksStore(file);
    expect(await store.list()).toEqual([]);
    const [p] = storeProblems();
    expect(p).toMatchObject({ store: 'preset sets', startedFrom: 'nothing' });
    const bank = { ...newBank('Kylo sets'), id: 'bank_kylo' };
    expect((await store.save(bank)).map((b) => b.name)).toEqual(['Kylo sets']);
    expect(readFileSync(join(dir, p.keptAs), 'utf8')).toBe('{"banks": [ oops');
    expect((await new BanksStore(file).list()).map((b) => b.id)).toEqual(['bank_kylo']);
  });

  it('keeps the readable sets from a partly bad file', async () => {
    const good = { ...newBank('Good'), id: 'bank_good' };
    writeFileSync(file, JSON.stringify({ version: 1, banks: [good, { id: 'bank_bad' }] }));
    expect((await new BanksStore(file).list()).map((b) => b.id)).toEqual(['bank_good']);
    expect(storeProblems()[0].startedFrom).toBe('readable records');
  });
});
