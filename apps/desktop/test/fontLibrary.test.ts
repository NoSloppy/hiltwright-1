import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';
import { FontLibrary, INDEX_FILE, MAKERS_DIR, classifyFontFile, nameFor, safeFolderName } from '../src/main/fontLibrary';
import { resetStoreProblems, storeProblems } from '../src/main/jsonStore';

/** A minimal 16-bit mono 44.1 kHz PCM wav, `samples` long. */
function wav(samples = 0): Buffer {
  const b = Buffer.alloc(44 + samples * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + samples * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(44100, 24); b.writeUInt32LE(88200, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(samples * 2, 40);
  return b;
}

/** A zip with every entry deflated and its real CRC-32; `badCrc` names an entry whose recorded CRC is wrong. */
function zip(files: Record<string, Buffer>, badCrc?: string): Buffer {
  const locals: Buffer[] = []; const central: Buffer[] = []; let offset = 0;
  for (const [name, data] of Object.entries(files)) {
    const n = Buffer.from(name, 'utf8'); const body = deflateRawSync(data);
    const sum = (crc32(data) ^ (name === badCrc ? 0x1 : 0)) >>> 0;
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x800, 6); lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(sum, 14); lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(n.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x800, 8); ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(sum, 16); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(n.length, 28); ch.writeUInt32LE(offset, 42);
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

// font-library-integrity (SF1-SF8).
const trash = async (p: string) => { trashed.push(p); await rm(p, { recursive: true, force: true }); };
const tmp = (name: string) => mkdtemp(join(tmpdir(), `hw-${name}-`));
async function font(dir: string, ...extra: [string, Buffer][]): Promise<void> {
  await mkdir(dir, { recursive: true });
  for (const f of ['hum.wav', 'out.wav', 'in.wav', 'clash1.wav']) await writeFile(join(dir, f), wav());
  for (const [rel, data] of extra) { await mkdir(join(dir, rel, '..'), { recursive: true }); await writeFile(join(dir, rel), data); }
}
const meta = (name: string) => ({ name, maker: '', notes: '', added: '2026-09-25T00:00:00Z' });

describe('the font details file (SF2)', () => {
  it('sets an unreadable details file aside, starts from its backup, and saves the next change', async () => {
    resetStoreProblems();
    const root = await tmp('lib');
    await font(join(root, 'Kylo'));
    await writeFile(join(root, INDEX_FILE), '{ "fonts": { broken');
    await writeFile(join(root, 'hiltwright-fonts.bak.json'), JSON.stringify({ version: 1, fonts: { Kylo: meta('Kylo from backup') }, makers: {} }));
    const lib = new FontLibrary(root, trash);
    const [f] = await lib.list();
    expect(f.meta.name).toBe('Kylo from backup');
    const [p] = storeProblems();
    expect(p).toMatchObject({ store: 'font details', startedFrom: 'backup', place: 'fonts' });
    expect(await readFile(join(root, p.keptAs), 'utf8')).toBe('{ "fonts": { broken');
    await lib.setMeta('Kylo', { name: 'Kylo Ren' });
    expect((await new FontLibrary(root, trash).list())[0].meta.name).toBe('Kylo Ren');
    expect(await readFile(join(root, p.keptAs), 'utf8')).toBe('{ "fonts": { broken');
  });
});

describe('a missing library folder (SF1)', () => {
  it('is reported, not recreated, when the owner chose it', async () => {
    const base = await tmp('gone');
    const gone = join(base, 'USB drive', 'Fonts');
    const lib = new FontLibrary(gone, trash, join(base, 'default'));
    expect(await lib.missing()).toBe(true);
    expect(await lib.list()).toEqual([]);
    expect(existsSync(gone)).toBe(false);
    await expect(lib.importFrom(base)).rejects.toThrow(/cannot be found/);
    expect(existsSync(gone)).toBe(false);
  });

  it('is simply made when it is the default folder', async () => {
    const base = await tmp('default');
    const def = join(base, 'fonts');
    const lib = new FontLibrary(def, trash, def);
    expect(await lib.missing()).toBe(false);
    expect(await lib.list()).toEqual([]);
    expect(existsSync(def)).toBe(true);
  });
});

describe('moving the library (SF3, SF4)', () => {
  it('refuses the library folder itself, a folder inside it, and a folder that holds it', async () => {
    const root = await tmp('lib');
    await font(join(root, 'Alpha'));
    const lib = new FontLibrary(root, trash);
    expect((await lib.planMove(root)).refused).toMatch(/already the font library/);
    expect((await lib.planMove(join(root, 'Sub'))).refused).toMatch(/inside the font library/);
    expect((await lib.planMove(join(root, '..'))).refused).toMatch(/holds the font library/);
    await expect(lib.moveTo(join(root, 'Sub'), true)).rejects.toThrow(/inside the font library/);
    expect((await lib.list()).map((f) => f.folder)).toEqual(['Alpha']);
    expect(existsSync(join(root, 'Sub'))).toBe(false);
  });

  it('lists clashes, keeps them back untouched, moves the rest with their details, and keeps an existing logo', async () => {
    const root = await tmp('lib');
    const next = await tmp('next');
    for (const f of ['Alpha', 'Beta', 'Gamma']) await font(join(root, f));
    const lib = new FontLibrary(root, trash);
    await lib.setMeta('Alpha', { name: 'Our Alpha' });
    await lib.setMeta('Gamma', { name: 'Our Gamma', maker: 'Kyberphonic' });
    await font(join(next, 'Alpha'), ['theirs.txt', Buffer.from('theirs')]);
    await writeFile(join(next, INDEX_FILE), JSON.stringify({ version: 1, fonts: { Beta: meta('Their Beta') }, makers: {} }));
    await mkdir(join(root, MAKERS_DIR), { recursive: true });
    await writeFile(join(root, MAKERS_DIR, 'k.png'), 'ours');
    await mkdir(join(next, MAKERS_DIR), { recursive: true });
    await writeFile(join(next, MAKERS_DIR, 'k.png'), 'theirs');
    await writeFile(join(root, MAKERS_DIR, 'only-ours.png'), 'ours only');

    const plan = await lib.planMove(next);
    expect(plan).toEqual({ refused: null, clashes: ['Alpha', 'Beta'] });
    await lib.moveTo(next, true, undefined, { keepBack: plan.clashes });

    expect(lib.root).toBe(next);
    // Kept back: untouched in the old folder, with their details, and nothing renamed at the destination.
    expect(existsSync(join(root, 'Alpha', 'hum.wav'))).toBe(true);
    expect(existsSync(join(root, 'Beta', 'hum.wav'))).toBe(true);
    const old = new FontLibrary(root, trash);
    expect((await old.list()).find((f) => f.folder === 'Alpha')?.meta.name).toBe('Our Alpha');
    expect(await readFile(join(next, 'Alpha', 'theirs.txt'), 'utf8')).toBe('theirs');
    expect(existsSync(join(next, 'Alpha-2'))).toBe(false);
    // Moved, with its details.
    expect(existsSync(join(root, 'Gamma'))).toBe(false);
    const moved = await new FontLibrary(next, trash).list();
    expect(moved.find((f) => f.folder === 'Gamma')?.meta).toMatchObject({ name: 'Our Gamma', maker: 'Kyberphonic' });
    // Beta was named in their details (no folder there): ours stays back, and their entry is untouched.
    expect(existsSync(join(next, 'Beta'))).toBe(false);
    expect((JSON.parse(await readFile(join(next, INDEX_FILE), 'utf8')) as { fonts: Record<string, { name: string }> }).fonts.Beta.name).toBe('Their Beta');
    // A logo already there is kept; ours stays where it was; one they did not have comes across.
    expect(await readFile(join(next, MAKERS_DIR, 'k.png'), 'utf8')).toBe('theirs');
    expect(await readFile(join(root, MAKERS_DIR, 'k.png'), 'utf8')).toBe('ours');
    expect(await readFile(join(next, MAKERS_DIR, 'only-ours.png'), 'utf8')).toBe('ours only');
  });

  it('stops part-way with a report, keeps the library where it was, and each moved font keeps its details', async () => {
    const root = await tmp('lib');
    const next = await tmp('next');
    for (const f of ['Alpha', 'Beta', 'Gamma']) await font(join(root, f));
    const lib = new FontLibrary(root, trash);
    await lib.setMeta('Alpha', { name: 'Our Alpha' });
    await writeFile(join(next, 'Beta'), 'a file where the Beta folder would go');
    await expect(lib.moveTo(next, true)).rejects.toThrow(/Moved 1 of 3 fonts to .*\(Alpha\); Beta could not be moved: .*The library is still at/);
    expect(lib.root).toBe(root);
    expect((await new FontLibrary(next, trash).list()).map((f) => [f.folder, f.meta.name])).toEqual([['Alpha', 'Our Alpha']]);
    expect((await lib.list()).map((f) => f.folder)).toEqual(['Beta', 'Gamma']);
  });
});

describe('adding fonts (SF5-SF8)', () => {
  it('refuses a package whose contents do not match their checksum, and adds nothing (SF8)', async () => {
    const lib = await newLibrary();
    const dir = await tmp('zip');
    const pkg = join(dir, 'Broken.zip');
    await writeFile(pkg, zip({ 'Font/hum.wav': wav(), 'Font/clash1.wav': wav() }, 'Font/clash1.wav'));
    await expect(lib.importFrom(pkg)).rejects.toThrow(/damaged.*clash1\.wav/);
    expect(await lib.list()).toEqual([]);
  });

  it('brings every file of a font in, but not system clutter (SF7)', async () => {
    const lib = await newLibrary();
    const src = await tmp('src');
    const f = join(src, 'Ahsoka');
    await font(f,
      ['License.rtf', Buffer.from('l')], ['Readme.docx', Buffer.from('r')], ['preview.mp3', Buffer.from('m')], ['v1.2/extra.wav', wav()],
      ['Thumbs.db', Buffer.from('t')], ['desktop.ini', Buffer.from('d')], ['.hidden', Buffer.from('h')], ['__MACOSX/._hum.wav', Buffer.from('x')]);
    expect((await lib.importFrom(f)).added).toEqual(['Ahsoka']);
    const got = join(lib.root, 'Ahsoka');
    for (const kept of ['License.rtf', 'Readme.docx', 'preview.mp3', 'v1.2/extra.wav']) expect(existsSync(join(got, kept))).toBe(true);
    for (const dropped of ['Thumbs.db', 'desktop.ini', '.hidden', '__MACOSX']) expect(existsSync(join(got, dropped))).toBe(false);
  });

  it('keeps every font of a folder even when one is named after Proffie (SF5)', async () => {
    const lib = await newLibrary();
    const src = await tmp('src');
    for (const n of ['Grey Jedi', 'Kylo', 'ProffieOS Default']) await font(join(src, n));
    const r = await lib.importFrom(src);
    expect(r.added.sort()).toEqual(['Grey Jedi', 'Kylo', 'ProffieOS Default']);
    expect(r.skipped).toEqual([]);
  });

  it('leaves another board\'s copy out and says so (SF5)', async () => {
    const lib = await newLibrary();
    const dir = await tmp('zip');
    const pkg = join(dir, 'Rey.zip');
    await writeFile(pkg, zip({ 'Rey/Proffie/hum.wav': wav(), 'Rey/Proffie/out.wav': wav(), 'Rey/CFX/hum.wav': wav(), 'Rey/Xenopixel/hum.wav': wav() }));
    const r = await lib.importFrom(pkg);
    expect(r.added).toEqual(['Rey']);
    expect(r.skipped.map((s) => s.name).sort()).toEqual(['CFX', 'Xenopixel']);
    expect(r.skipped[0].why).toMatch(/another board, not Proffie/);
  });

  it('takes tracks only from inside what was picked (SF6)', async () => {
    const lib = await newLibrary();
    const downloads = await tmp('downloads');
    await font(join(downloads, 'Vader'));
    await mkdir(join(downloads, 'tracks'), { recursive: true });
    await writeFile(join(downloads, 'tracks', 'unrelated.wav'), wav());
    await lib.importFrom(join(downloads, 'Vader'));
    expect(existsSync(join(lib.root, 'Vader', 'tracks'))).toBe(false);

    const dir = await tmp('zip');
    const pkg = join(dir, 'Obi.zip');
    await writeFile(pkg, zip({ 'Obi/hum.wav': wav(), 'Obi/out.wav': wav(), 'tracks/theme.wav': wav() }));
    await lib.importFrom(pkg);
    expect(existsSync(join(lib.root, 'Obi', 'tracks', 'theme.wav'))).toBe(true);
  });
});
