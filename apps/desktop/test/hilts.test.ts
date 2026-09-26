import { describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeZip } from '../src/main/zip';
import { extractZip, listZip } from '../src/main/unzip';
import { HiltStore, type HiltInput } from '../src/main/hilts';
import { resetStoreProblems, storeProblems } from '../src/main/jsonStore';
import { cleanFit, cleanScene, DEFAULT_FIT, DEFAULT_SCENE } from '../src/shared/demoSettings';

// demo-hilt-safety (SR1-SR5).
describe('stored scene settings and fits are checked (SR5)', () => {
  it('repairs a scene value out of range or of the wrong kind, and keeps the rest', () => {
    const s = cleanScene({ bladeInches: 500, glow: 2, bladeDiameter: 'x', ledsPerMetre: 144, haze: 'thick', grid: 'yes', staff: true });
    expect(s).toEqual({ ...DEFAULT_SCENE, glow: 2, staff: true });
    expect(cleanScene(null)).toEqual(DEFAULT_SCENE);
    expect(cleanScene({ bladeDiameter: '7/8', ledsPerMetre: 100, bladeInches: 24 })).toMatchObject({ bladeDiameter: '7/8', ledsPerMetre: 100, bladeInches: 24 });
    expect(cleanScene({ ledsPerMetre: 99, glowSpread: Number.NaN }).ledsPerMetre).toBe(144);
  });

  it('repairs a fit value out of range or of the wrong kind, and keeps the rest', () => {
    const f = cleanFit({ seatMm: 'deep', rollDeg: 999, axis: 'z', flip: true, tiltXDeg: -12.5, lengthCm: 28 });
    expect(f).toEqual({ ...DEFAULT_FIT, flip: true, tiltXDeg: -12.5, lengthCm: 28 });
    expect(cleanFit({ lengthCm: 400 }).lengthCm).toBeNull();
    expect(cleanFit({ lengthCm: null, axis: 'origin' })).toMatchObject({ lengthCm: null, axis: 'origin' });
    expect(cleanFit(undefined)).toEqual(DEFAULT_FIT);
  });
});

describe('the export zip', () => {
  it('reads back through listZip and extractZip with the same bytes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hw-zip-'));
    const big = Buffer.alloc(200_000, 7); big[5] = 1;
    await writeFile(join(dir, 'model.stl'), big);
    const zip = join(dir, 'out.zip');
    await writeZip(zip, [{ name: 'hilts.json', data: '{"version":1}' }, { name: 'abc123/model.stl', from: join(dir, 'model.stl') }, { name: 'abc123/Grip é.mtl', data: Buffer.from([0, 1, 2]) }]);
    const list = await listZip(zip);
    expect(list.map((e) => e.name)).toEqual(['hilts.json', 'abc123/model.stl', 'abc123/Grip é.mtl']);
    expect(list[1].compressed).toBeLessThan(big.length);
    const out = join(dir, 'x');
    expect(await extractZip(zip, out)).toBe(3);
    expect(await readFile(join(out, 'abc123', 'model.stl'))).toEqual(big);
    expect(await readFile(join(out, 'hilts.json'), 'utf8')).toBe('{"version":1}');
    expect([...await readFile(join(out, 'abc123', 'Grip é.mtl'))]).toEqual([0, 1, 2]);
  });
});

const stl = (n: number) => new Uint8Array(Buffer.alloc(84 + n, n % 251));
const hilt = (name: string, n = 1, more: Partial<HiltInput> = {}): HiltInput => ({ name, format: 'stl', data: stl(n), sideFiles: [], ...more });
const fresh = async () => { resetStoreProblems(); return mkdtemp(join(tmpdir(), 'hw-hilts-')); };
const added = (r: Awaited<ReturnType<HiltStore['add']>>) => { if (!('added' in r)) throw new Error('not added'); return r.added; };
const bytes = (d: ArrayBuffer | Uint8Array) => [...new Uint8Array(d)];

describe('hilts kept in the data folder', () => {
  it('keeps a pack fit and an owner hilt of the same name apart (SR1)', async () => {
    const dir = await fresh();
    const store = new HiltStore(dir);
    await store.setPackFit('ys-pack', { seatMm: 9 });
    const ys = added(await store.add(hilt('YS'), 'new'));
    await store.setFit(ys.id, { seatMm: 12 });
    await store.resetPackFit('ys-pack');
    expect(await store.packFits()).toEqual({});
    const [back] = await new HiltStore(dir).list();
    expect(back).toMatchObject({ id: ys.id, name: 'YS' });
    expect(back.fit.seatMm).toBe(12);
    expect(bytes((await store.model(ys.id)).data)).toEqual(bytes(stl(1)));
  });

  it('asks about a taken name, keeps both as "YS 2", or replaces keeping the fit and credit (SR1)', async () => {
    const dir = await fresh();
    const store = new HiltStore(dir);
    const ys = added(await store.add(hilt('YS', 1, { sideFiles: [{ name: 'ys.mtl', data: new Uint8Array([1]) }] }), 'new'));
    await store.setFit(ys.id, { seatMm: 12 }); await store.setCreator(ys.id, 'Shadowfoil Props');
    const oldFiles = await readdir(join(dir, 'hilts', ys.id));
    expect(await store.add(hilt('ys', 2), 'new')).toEqual({ taken: { id: ys.id, name: 'YS' } });
    expect((await store.list()).length).toBe(1);
    expect(await readdir(join(dir, 'hilts'))).toEqual([ys.id]);
    const two = added(await store.add(hilt('YS', 2), 'keepBoth'));
    expect(two.name).toBe('YS 2');
    expect(two.fit).toEqual(DEFAULT_FIT);
    const rep = added(await store.add(hilt('YS', 3), { replace: ys.id }));
    expect(rep).toMatchObject({ id: ys.id, name: 'YS', creator: 'Shadowfoil Props' });
    expect(rep.fit.seatMm).toBe(12);
    const files = await readdir(join(dir, 'hilts', ys.id));
    expect(files.length).toBe(1);
    expect(files.some((f) => oldFiles.includes(f))).toBe(false);
    expect((await store.model(ys.id)).sideFiles).toEqual([]);
    expect(bytes((await store.model(ys.id)).data)).toEqual(bytes(stl(3)));
  });

  it('says so when a hilt cannot be kept, and lists nothing (SR3)', async () => {
    const dir = await fresh();
    const store = new HiltStore(dir);
    await store.list();
    await mkdir(join(dir, 'hilts.json')); // the save cannot land
    await expect(store.add(hilt('YS'), 'new')).rejects.toThrow();
    expect(await store.list()).toEqual([]);
    expect(existsSync(join(dir, 'hilts')) ? await readdir(join(dir, 'hilts')) : []).toEqual([]);
  });

  it('keeps a hilt and its files when removing it cannot be saved (SR3)', async () => {
    const dir = await fresh();
    const store = new HiltStore(dir);
    const ys = added(await store.add(hilt('YS'), 'new'));
    await rm(join(dir, 'hilts.json')); await mkdir(join(dir, 'hilts.json'));
    await expect(store.remove(ys.id)).rejects.toThrow();
    expect((await store.list()).map((h) => h.id)).toEqual([ys.id]);
    expect((await readdir(join(dir, 'hilts', ys.id))).length).toBe(1);
    await rm(join(dir, 'hilts.json'), { recursive: true });
    await store.remove(ys.id);
    expect(await store.list()).toEqual([]);
    expect(existsSync(join(dir, 'hilts', ys.id))).toBe(false);
  });

  it('sets a damaged hilts.json aside and says so (SR5)', async () => {
    const dir = await fresh();
    await writeFile(join(dir, 'hilts.json'), '{ "hilts": [ oops');
    const store = new HiltStore(dir);
    expect(await store.list()).toEqual([]);
    expect(storeProblems()[0]).toMatchObject({ store: 'demo room hilts', place: 'data', startedFrom: 'nothing' });
  });

  it('repairs a stored scene out of range (SR5)', async () => {
    const dir = await fresh();
    await writeFile(join(dir, 'hilts.json'), JSON.stringify({ version: 1, hilts: [], packFits: {}, room: { scene: { bladeInches: 500, glow: 2 } } }));
    expect((await new HiltStore(dir).room()).scene).toMatchObject({ bladeInches: 36, glow: 2 });
  });
});

describe('bringing hilts over, and export and import (SR4)', () => {
  it('adopts page storage without replacing anything, and adds nothing a second time', async () => {
    const dir = await fresh();
    const store = new HiltStore(dir);
    const here = added(await store.add(hilt('YS', 1), 'new'));
    await store.setPackFit('punk-saber', { seatMm: 3 });
    await store.setRoom({ scene: { bladeInches: 30 } });
    const legacy = {
      origin: 'http://localhost:5173',
      hilts: [hilt('YS', 1, { fit: { seatMm: 40 } }), hilt('ys', 2, { fit: { seatMm: 12 }, creator: 'Kyber' }), hilt('Graflex', 3), { ...hilt('Punk', 0), packId: 'punk-saber', fit: { seatMm: 7 } }, { ...hilt('Other', 0), packId: 'other-pack', fit: { rollDeg: 90 } }],
      scene: { bladeInches: 24 }, chosen: 'name:Graflex',
    };
    expect(await store.adopt(legacy)).toEqual({ added: 2, fits: 1, skipped: 2 });
    const all = await store.list();
    expect(all.map((h) => h.name)).toEqual(['YS', 'ys 2', 'Graflex']);
    expect(all[0]).toMatchObject({ id: here.id, fit: { seatMm: 0 } });
    expect(all[1]).toMatchObject({ creator: 'Kyber', fit: { seatMm: 12 } });
    expect(await store.packFits()).toMatchObject({ 'punk-saber': { seatMm: 3 }, 'other-pack': { rollDeg: 90 } });
    expect(await store.room()).toMatchObject({ scene: { bladeInches: 30 }, chosen: all[2].id });
    // Once adopted, that origin is never brought over again, even if the page lost its own note of it.
    expect(await store.adopt(legacy)).toEqual({ added: 0, fits: 0, skipped: 5 });
    expect((await new HiltStore(dir).room()).adopted).toEqual(['http://localhost:5173']);
    // Another origin holding the same hilts adds nothing that is already here.
    expect(await store.adopt({ ...legacy, origin: 'file://' })).toEqual({ added: 0, fits: 0, skipped: 5 });
    expect((await store.list()).length).toBe(3);
    expect((await readdir(join(dir, 'hilts'))).length).toBe(3);
  });

  it('exports every hilt and pack fit, imports them elsewhere, and adds nothing on a second import', async () => {
    const a = await fresh();
    const store = new HiltStore(a);
    const ys = added(await store.add(hilt('YS', 1, { sideFiles: [{ name: 'ys.mtl', data: new Uint8Array([9, 8]) }] }), 'new'));
    await store.setFit(ys.id, { seatMm: 12, tiltXDeg: 4 }); await store.setCreator(ys.id, 'Shadowfoil Props');
    await store.add(hilt('Graflex', 2), 'new');
    await store.setPackFit('punk-saber', { seatMm: 3 });
    const zip = join(a, 'Hiltwright hilts.zip');
    expect(await store.exportTo(zip)).toEqual({ hilts: 2, packFits: 1 });
    const b = await fresh();
    const other = new HiltStore(b);
    expect(await other.importFrom(zip)).toEqual({ added: 2, fits: 1, skipped: 0 });
    const got = await other.list();
    expect(got.map((h) => [h.name, h.creator ?? null, h.fit.seatMm])).toEqual([['YS', 'Shadowfoil Props', 12], ['Graflex', null, 0]]);
    const m = await other.model(got[0].id);
    expect(m.sideFiles.map((s) => [s.name, bytes(s.data)])).toEqual([['ys.mtl', [9, 8]]]);
    expect(await other.packFits()).toEqual({ 'punk-saber': { ...DEFAULT_FIT, seatMm: 3 } });
    expect(await other.importFrom(zip)).toEqual({ added: 0, fits: 0, skipped: 3 });
    expect((await other.list()).length).toBe(2);
    expect((await readdir(b)).filter((n) => n.startsWith('hilts-import-'))).toEqual([]);
  });

  it('refuses a zip that is not a hilt export', async () => {
    const dir = await fresh();
    const zip = join(dir, 'fonts.zip');
    await writeZip(zip, [{ name: 'font/hum.wav', data: 'x' }]);
    await expect(new HiltStore(dir).importFrom(zip)).rejects.toThrow(/not a Hiltwright hilt export/);
    await writeFile(join(dir, 'x.zip'), 'not a zip');
    await expect(new HiltStore(dir).importFrom(join(dir, 'x.zip'))).rejects.toThrow(/not a Hiltwright hilt export/);
  });
});
