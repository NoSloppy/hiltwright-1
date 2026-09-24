import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { FontLibrary, INDEX_FILE, MAKERS_DIR, classifyFontFile, nameFor, safeFolderName } from '../src/main/fontLibrary';

/** A minimal 16-bit mono 44.1 kHz PCM wav, `samples` long. */
function wav(samples = 0): Buffer {
  const b = Buffer.alloc(44 + samples * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + samples * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(44100, 24); b.writeUInt32LE(88200, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(samples * 2, 40);
  return b;
}

/** A zip with every entry deflated (CRCs left at zero: the reader does not check them). */
function zip(files: Record<string, Buffer>): Buffer {
  const locals: Buffer[] = []; const central: Buffer[] = []; let offset = 0;
  for (const [name, data] of Object.entries(files)) {
    const n = Buffer.from(name, 'utf8'); const body = deflateRawSync(data);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x800, 6); lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(n.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x800, 8); ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(n.length, 28); ch.writeUInt32LE(offset, 42);
    locals.push(lh, n, body); central.push(ch, n); offset += 30 + n.length + body.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

const trashed: string[] = [];
const newLibrary = async () => new FontLibrary(await mkdtemp(join(tmpdir(), 'hw-lib-')), async (p) => { trashed.push(p); await rm(p, { recursive: true, force: true }); });

describe('font library', () => {
  it('names sounds the way ProffieOS plays them', () => {
    expect(classifyFontFile('clsh/001.wav')).toMatchObject({ effect: 'clash', kind: 'poly' });
    expect(classifyFontFile('clsh/clsh1.wav')).toMatchObject({ effect: 'clash', kind: 'poly' });
    expect(classifyFontFile('bgnlb/bgnlb2.wav').effect).toBe('lightning block');
    expect(classifyFontFile('clash3.wav')).toMatchObject({ effect: 'clash', kind: 'mono' });
    expect(classifyFontFile('swingl/swingl01.wav').effect).toBe('smoothswing');
    expect(classifyFontFile('tr/001/000.wav').effect).toBe('blade transitions');
    expect(classifyFontFile('bgnlb01.wav').effect).toBe('lightning block');
    expect(safeFolderName('Dark; Side: v2')).toBe('Dark_ Side_ v2');
    expect(nameFor('/x/pkg/Grey Jedi/Proffie', '/x/pkg', 'Pkg')).toBe('Grey Jedi');
    expect(nameFor('/x/pkg/Proffie', '/x/pkg', 'Pkg')).toBe('Pkg');
  });

  it('adds a zip package, keeps only the Proffie variant, and describes what it supports', async () => {
    const lib = await newLibrary();
    const dir = await mkdtemp(join(tmpdir(), 'hw-zip-'));
    const pkg = join(dir, 'Kyber_Ember.zip');
    await writeFile(pkg, zip({
      'Kyber Ember/Proffie/hum01.wav': wav(10), 'Kyber Ember/Proffie/out01.wav': wav(), 'Kyber Ember/Proffie/in01.wav': wav(),
      'Kyber Ember/Proffie/clsh/001.wav': wav(), 'Kyber Ember/Proffie/clsh/002.wav': wav(), 'Kyber Ember/Proffie/swingl/swingl01.wav': wav(), 'Kyber Ember/Proffie/swingh/swingh01.wav': wav(),
      'Kyber Ember/Proffie/lock01.wav': wav(), 'Kyber Ember/Proffie/tracks/theme.wav': wav(44100),
      'Kyber Ember/Proffie/smoothsw.ini': Buffer.from('Version=2\n'),
      'Kyber Ember/CFX/hum.wav': wav(), 'Kyber Ember/CFX/clash1.wav': wav(),
      '__MACOSX/Kyber Ember/._hum01.wav': Buffer.from('junk'),
    }));
    const r = await lib.importFrom(pkg);
    expect(r.added).toEqual(['Kyber Ember']);
    const [font] = await lib.list();
    expect(font.meta).toMatchObject({ name: 'Kyber Ember', from: 'Kyber_Ember.zip' });
    expect(font.support).toMatchObject({ type: 'polyphonic', smoothSwing: true, tracks: 1 });
    expect(font.support.special).toContain('lockup');
    const d = await lib.detail('Kyber Ember');
    expect(d.tracks[0]).toMatchObject({ path: 'tracks/theme.wav' });
    expect(d.tracks[0].seconds).toBeCloseTo(1, 2);
    expect(d.sounds.map((s) => s.path)).toContain('clsh/001.wav');
    // No staging left behind.
    expect((await readdir(lib.root)).filter((n) => n.startsWith('.'))).toEqual([]);

    const bytes = await lib.readSound('Kyber Ember', 'clsh/001.wav');
    expect(bytes.byteLength).toBe(44);
    await expect(lib.readSound('Kyber Ember', '../../outside.wav')).rejects.toThrow();
    await expect(lib.readSound('..', 'x.wav')).rejects.toThrow();
  });

  it('adds a folder of fonts, keeps names unique, remembers what the owner said, and moves', async () => {
    const lib = await newLibrary();
    const src = await mkdtemp(join(tmpdir(), 'hw-src-'));
    for (const f of ['Alpha', 'Beta']) { await mkdir(join(src, f)); await writeFile(join(src, f, 'hum.wav'), wav()); await writeFile(join(src, f, 'clash1.wav'), wav()); }
    expect((await lib.importFrom(src)).added).toEqual(['Alpha', 'Beta']);
    expect((await lib.importFrom(join(src, 'Alpha'))).added).toEqual(['Alpha-2']);
    expect(existsSync(join(src, 'Alpha', 'hum.wav'))).toBe(true); // originals untouched
    await lib.setMeta('Beta', { name: 'The Beta', maker: 'Someone', notes: 'Bright' });
    expect((await lib.list()).find((f) => f.folder === 'Beta')?.meta).toMatchObject({ name: 'The Beta', maker: 'Someone' });

    const next = await mkdtemp(join(tmpdir(), 'hw-lib2-'));
    await lib.moveTo(next, true);
    const moved = await lib.list();
    expect(moved.map((f) => f.folder)).toEqual(['Alpha', 'Alpha-2', 'Beta']);
    expect(moved.find((f) => f.folder === 'Beta')?.meta.maker).toBe('Someone');

    await lib.remove('Alpha-2');
    expect(trashed.some((p) => p.endsWith('Alpha-2'))).toBe(true);
    expect((await lib.list()).map((f) => f.folder)).toEqual(['Alpha', 'Beta']);
  });

  it('bundles several fonts from one package, and hands old makers logos over', async () => {
    const lib = await newLibrary();
    const src = await mkdtemp(join(tmpdir(), 'hw-src-'));
    const pack = join(src, 'Dark_Side_Pack');
    for (const f of ['Vader', 'Sidious']) { await mkdir(join(pack, f), { recursive: true }); await writeFile(join(pack, f, 'hum01.wav'), wav()); }
    await lib.importFrom(pack);
    const fonts = await lib.list();
    expect(fonts.map((f) => f.meta.bundle)).toEqual(['Dark Side Pack', 'Dark Side Pack']);
    // A single font is not a bundle.
    await lib.importFrom(join(pack, 'Vader'));
    expect((await lib.list()).find((f) => f.folder === 'Vader-2')?.meta.bundle).toBeUndefined();
    await lib.setMeta('Vader', { maker: 'Kyberphonic', bundle: '' });
    expect((await lib.detail('Vader')).meta.bundle).toBeUndefined();

    // A library from before the contributors list: its index names a logo in hiltwright-makers.
    await mkdir(join(lib.root, MAKERS_DIR), { recursive: true });
    await writeFile(join(lib.root, MAKERS_DIR, 'kyber.png'), Buffer.from('89504e470d0a1a0a', 'hex'));
    const raw = JSON.parse(await readFile(join(lib.root, INDEX_FILE), 'utf8')) as Record<string, unknown>;
    await writeFile(join(lib.root, INDEX_FILE), JSON.stringify({ ...raw, makers: { Kyberphonic: { logo: 'kyber.png' } } }));
    lib.forget();
    expect(await lib.legacyLogos()).toEqual([{ name: 'Kyberphonic', file: join(lib.root, MAKERS_DIR, 'kyber.png') }]);
    // Editing a font keeps the old entry rather than dropping it.
    await lib.setMeta('Sidious', { maker: 'Kyberphonic' });
    lib.forget();
    expect(await lib.legacyLogos()).toHaveLength(1);
  });

  it('refuses a zip entry that escapes its folder', async () => {
    const lib = await newLibrary();
    const dir = await mkdtemp(join(tmpdir(), 'hw-zip-'));
    const pkg = join(dir, 'evil.zip');
    await writeFile(pkg, zip({ 'Font/hum.wav': wav(), '../../escape.wav': wav() }));
    await expect(lib.importFrom(pkg)).rejects.toThrow(/outside/);
  });
});
