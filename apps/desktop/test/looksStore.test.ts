// style-library "The owner's styles are kept on this computer" (style-save-integrity ST8).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { LookDef } from '@hiltwright/core';
import { LooksStore, cleanLook } from '../src/main/looksStore';
import { resetStoreProblems, storeProblems } from '../src/main/jsonStore';

let dir = '';
let file = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'hw-looks-')); file = join(dir, 'looks.json'); resetStoreProblems(); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const look = (id: string, over: Partial<LookDef> = {}): LookDef => ({
  id, name: id, source: 'built', by: 'you', code: 'StylePtr<Red>()', header: null, roles: ['main'], args: [], preview: '#ff0000', description: '', ...over,
});

describe('the style store', () => {
  it('sets a damaged file aside and still saves a new style', async () => {
    writeFileSync(file, '{ "looks": [ nope');
    const store = new LooksStore(file);
    expect(await store.list()).toEqual([]);
    const [p] = storeProblems();
    expect(p).toMatchObject({ store: 'styles', place: 'data', startedFrom: 'nothing' });
    await store.add(look('look_red'));
    expect(readFileSync(join(dir, p.keptAs), 'utf8')).toBe('{ "looks": [ nope');
    expect((await new LooksStore(file).list()).map((l) => l.id)).toEqual(['look_red']);
  });

  it('leaves out a style of the wrong shape and keeps the original aside', async () => {
    const original = JSON.stringify({ version: 1, looks: [look('look_ok'), { id: 'bad id!', code: 'x' }, { id: 'look_nocode' }] });
    writeFileSync(file, original);
    expect((await new LooksStore(file).list()).map((l) => l.id)).toEqual(['look_ok']);
    expect(storeProblems()[0].startedFrom).toBe('readable records');
    expect(readFileSync(join(dir, storeProblems()[0].keptAs), 'utf8')).toBe(original);
  });

  it('replaces a style in its place', async () => {
    const store = new LooksStore(file);
    for (const id of ['look_a', 'look_b', 'look_c']) await store.add(look(id));
    await store.add(look('look_a', { name: 'A again' }));
    expect((await store.list()).map((l) => `${l.id}:${l.name}`)).toEqual(['look_a:A again', 'look_b:look_b', 'look_c:look_c']);
  });

  it('keeps exactly the fields a style may have', () => {
    const doc = { kind: 'style', name: 'x', layers: [] };
    const out = cleanLook({ ...look('look_x'), source: 'starter', preview: 'red', preview2: '#00ff00', kb: 12, extra: 'dropped', define: 'using X = StylePtr<Red>;', usesFx: true, style: doc });
    expect(out).toMatchObject({ id: 'look_x', source: 'pasted', preview: '#ffffff', preview2: '#00ff00', define: 'using X = StylePtr<Red>;', usesFx: true });
    expect(out && 'kb' in out).toBe(false);
    expect(out && 'extra' in out).toBe(false);
    expect(cleanLook({ ...look('look_x'), name: 'n'.repeat(121) })).toBeNull();
    expect(cleanLook({ id: '1bad', code: 'x' })).toBeNull();
  });

  it('keeps who edited a style, and nothing odd in its place', () => {
    expect(cleanLook(look('look_e', { by: 'Fett263', editedBy: 'you' }))).toMatchObject({ by: 'Fett263', editedBy: 'you' });
    expect(cleanLook(look('look_e', { editedBy: '' }))).not.toHaveProperty('editedBy');
    expect(cleanLook({ ...look('look_e'), editedBy: 5 })).not.toHaveProperty('editedBy');
  });
});
