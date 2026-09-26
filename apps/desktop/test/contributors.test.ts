import { describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ContributorStore, cleanUrl } from '../src/main/contributors';
import { resetStoreProblems, storeProblems } from '../src/main/jsonStore';

const PNG = Buffer.from('89504e470d0a1a0a', 'hex');

describe('contributors', () => {
  it('keeps a logo and a link per person, matching names regardless of case', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hw-contrib-'));
    const store = new ContributorStore(dir);
    const png = join(dir, 'fett.png'); await writeFile(png, PNG);
    await store.setLogo('Fett263', png);
    await store.setUrl('fett263', 'fett263.com');
    let [p] = await store.list();
    expect(p.name).toBe('Fett263');
    expect(p.logo).toMatch(/^data:image\/png;base64,/);
    expect(p.url).toBe('https://fett263.com/');
    expect(await store.urlOf('FETT263')).toBe('https://fett263.com/');

    // A fresh store reads the same from disk.
    [p] = await new ContributorStore(dir).list();
    expect(p).toMatchObject({ name: 'Fett263', url: 'https://fett263.com/' });

    await expect(store.setLogo('Fett263', join(dir, 'x.exe'))).rejects.toThrow(/PNG/);
    await expect(store.setUrl('Fett263', 'javascript:alert(1)')).rejects.toThrow();
    await store.clearLogo('Fett263');
    expect((await store.list())[0]).toEqual({ name: 'Fett263', logo: null, url: 'https://fett263.com/' });
    // Nothing left to say about them: they drop off the list.
    await store.setUrl('Fett263', '');
    expect(await store.list()).toEqual([]);
    expect(JSON.parse(await readFile(join(dir, 'contributors.json'), 'utf8')).people).toEqual({});
  });

  it('accepts web addresses only', () => {
    expect(cleanUrl('https://example.com/a')).toBe('https://example.com/a');
    expect(cleanUrl('  ')).toBeNull();
    expect(() => cleanUrl('file:///C:/x')).toThrow();
  });
});

// contributors-integrity (SR33-SR36).
describe('the contributors list kept safely', () => {
  const fresh = async () => { resetStoreProblems(); return mkdtemp(join(tmpdir(), 'hw-contrib-')); };

  it('sets a damaged file aside and still saves a new link (SR33)', async () => {
    const dir = await fresh();
    await writeFile(join(dir, 'contributors.json'), '{ "people": { oops');
    const store = new ContributorStore(dir);
    await store.setUrl('Kyberphonic', 'kyberphonic.com');
    const [p] = storeProblems();
    expect(p).toMatchObject({ store: 'contributors', place: 'data', startedFrom: 'nothing' });
    expect(await readFile(join(dir, p.keptAs), 'utf8')).toBe('{ "people": { oops');
    expect(await new ContributorStore(dir).urlOf('kyberphonic')).toBe('https://kyberphonic.com/');
  });

  it('drops a hand-edited link that is not a web address, and keeps the original aside', async () => {
    const dir = await fresh();
    const original = JSON.stringify({ version: 1, people: { Evil: { url: 'file:///C:/Windows/System32/calc.exe' }, Script: { url: 'javascript:alert(1)' }, Good: { url: 'https://fett263.com/' } } });
    await writeFile(join(dir, 'contributors.json'), original);
    const store = new ContributorStore(dir);
    expect(await store.list()).toEqual([{ name: 'Good', logo: null, url: 'https://fett263.com/' }]);
    expect(await store.urlOf('Evil')).toBeNull();
    expect(storeProblems()[0].startedFrom).toBe('readable records');
    expect(await readFile(join(dir, storeProblems()[0].keptAs), 'utf8')).toBe(original);
  });

  it('keeps two changes made at the same moment (SR34)', async () => {
    const dir = await fresh();
    const store = new ContributorStore(dir);
    const png = join(dir, 'k.png'); await writeFile(png, PNG);
    await Promise.all([store.setUrl('Fett263', 'fett263.com'), store.setLogo('Kyberphonic', png), store.setUrl('Saberforge', 'saberforge.com')]);
    const back = await new ContributorStore(dir).list();
    expect(back.map((p) => [p.name, !!p.logo, p.url])).toEqual([['Fett263', false, 'https://fett263.com/'], ['Kyberphonic', true, null], ['Saberforge', false, 'https://saberforge.com/']]);
  });

  it('keeps the old logo, named and on disk, when a new one cannot be saved (SR35)', async () => {
    const dir = await fresh();
    const store = new ContributorStore(dir);
    const png = join(dir, 'a.png'); await writeFile(png, PNG);
    await store.setLogo('Fett263', png);
    const oldFile = (JSON.parse(await readFile(join(dir, 'contributors.json'), 'utf8')) as { people: Record<string, { logo: string }> }).people.Fett263.logo;
    await rm(join(dir, 'contributors.json')); await mkdir(join(dir, 'contributors.json')); // the next save cannot land
    const png2 = join(dir, 'b.png'); await writeFile(png2, PNG);
    await expect(store.setLogo('Fett263', png2)).rejects.toThrow();
    const [p] = await store.list();
    expect(p.logo).toMatch(/^data:image\/png;base64,/);
    expect(existsSync(join(dir, 'contributors', oldFile))).toBe(true);
    expect(await readdir(join(dir, 'contributors'))).toEqual([oldFile]);
  });

  it('copies a logo and link to a renamed author, and leaves the old name its own (SR36)', async () => {
    const dir = await fresh();
    const store = new ContributorStore(dir);
    const png = join(dir, 'f.png'); await writeFile(png, PNG);
    await store.setLogo('Fet263', png);
    await store.setUrl('Fet263', 'fett263.com');
    expect(await store.copyTo('fet263', 'Fett263')).toBe(true);
    const all = await store.list();
    const by = (n: string) => all.find((p) => p.name === n)!;
    expect(by('Fett263')).toMatchObject({ url: 'https://fett263.com/' });
    expect(by('Fett263').logo).toBe(by('Fet263').logo);
    expect(by('Fet263').url).toBe('https://fett263.com/');
    expect((await readdir(join(dir, 'contributors'))).length).toBe(2);
    await expect(store.copyTo('Fet263', 'fett263')).rejects.toThrow(/already has/);
    expect(await store.copyTo('Nobody', 'Someone')).toBe(false);
  });
});
