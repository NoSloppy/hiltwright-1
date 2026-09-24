import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ContributorStore, cleanUrl } from '../src/main/contributors';

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
