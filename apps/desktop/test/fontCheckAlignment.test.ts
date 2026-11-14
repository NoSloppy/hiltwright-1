import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';
import { FontLibrary } from '../src/main/fontLibrary';
import { checkFontDir } from '../src/main/sd';

/** A 16-bit PCM wav header; `chunk` bytes of a LIST chunk go before fmt, as some editors write. */
function wav(opts: { channels?: number; chunk?: number } = {}): Buffer {
  const channels = opts.channels ?? 1; const chunk = opts.chunk ?? 0;
  const extra = chunk ? 8 + chunk : 0;
  const b = Buffer.alloc(44 + extra);
  b.write('RIFF', 0); b.writeUInt32LE(36 + extra, 4); b.write('WAVE', 8);
  if (chunk) { b.write('LIST', 12); b.writeUInt32LE(chunk, 16); }
  const o = 12 + extra;
  b.write('fmt ', o); b.writeUInt32LE(16, o + 4); b.writeUInt16LE(1, o + 8); b.writeUInt16LE(channels, o + 10); b.writeUInt32LE(44100, o + 12);
  b.writeUInt32LE(44100 * channels * 2, o + 16); b.writeUInt16LE(channels * 2, o + 20); b.writeUInt16LE(16, o + 22); b.write('data', o + 24); b.writeUInt32LE(0, o + 28);
  return b;
}

const library = async () => new FontLibrary(await mkdtemp(join(tmpdir(), 'hw-lib-')), async (p) => { await rm(p, { recursive: true, force: true }); });

async function put(dir: string, files: Record<string, Buffer>): Promise<void> {
  for (const [rel, data] of Object.entries(files)) { await mkdir(dirname(join(dir, rel)), { recursive: true }); await writeFile(join(dir, rel), data); }
}

/** The same font as the card's checker and the library's checker see it. */
async function bothVerdicts(files: Record<string, Buffer>) {
  const lib = await library();
  await put(join(lib.root, 'Font'), files);
  const card = await mkdtemp(join(tmpdir(), 'hw-card-'));
  await put(join(card, 'Font'), files);
  return { onCard: (await checkFontDir(join(card, 'Font'))).report, inLibrary: (await lib.detail('Font')).report };
}

const layouts: Record<string, string[]> = {
  flat: ['hum01.wav', 'out01.wav', 'in01.wav', 'clsh01.wav', 'clsh02.wav', 'swng01.wav'],
  'per-sound folders, hum01.wav': ['hum/hum01.wav', 'out/out01.wav', 'in/in01.wav', 'clsh/clsh01.wav', 'clsh/clsh02.wav', 'swng/swng01.wav'],
  'per-sound folders, hum1.wav': ['hum/hum1.wav', 'out/out1.wav', 'in/in1.wav', 'clsh/clsh1.wav', 'clsh/clsh2.wav', 'swng/swng1.wav'],
};

describe('one font checker for the library and the card (SF21)', () => {
  for (const [label, names] of Object.entries(layouts)) {
    it(`gives the same verdict, with no issues, for ${label}`, async () => {
      const files = Object.fromEntries(names.map((n) => [n, wav()]));
      const { onCard, inLibrary } = await bothVerdicts(files);
      expect(onCard).toEqual(inLibrary);
      expect(onCard.issues).toEqual([]);
      expect(onCard.type).toBe('polyphonic');
      expect(onCard.effects.clash?.poly).toBe(2);
    });
  }

  it('gives the same issues on both sides, and leaves tracks out of the sound checks', async () => {
    const files = Object.fromEntries(layouts['per-sound folders, hum1.wav'].map((n) => [n, wav()]));
    files['clsh/clsh2.wav'] = wav({ channels: 2 });
    files['tracks/song.wav'] = wav({ channels: 2 });
    files['tracks/hum1.wav'] = wav();
    const { onCard, inLibrary } = await bothVerdicts(files);
    expect(onCard).toEqual(inLibrary);
    expect(onCard.issues.map((i) => i.kind)).toEqual(['stereo']);
    expect(onCard.issues[0].files).toEqual(['clsh02.wav']);
    expect(onCard.files).toBe(6);
  });

  it('reads headers far enough to find the format behind a long extra chunk', async () => {
    const files = Object.fromEntries(layouts.flat.map((n) => [n, wav()]));
    files['hum01.wav'] = wav({ channels: 2, chunk: 300 });
    const { onCard, inLibrary } = await bothVerdicts(files);
    expect(onCard).toEqual(inLibrary);
    expect(onCard.issues.map((i) => i.kind)).toEqual(['stereo']);
  });

  it('a hum in a hum folder is not "no hum" on the card', async () => {
    const { onCard } = await bothVerdicts({ 'hum/hum1.wav': wav() });
    expect(onCard.issues.some((i) => i.kind === 'missing-hum')).toBe(false);
  });
});

/** A zip with every entry deflated and its real CRC-32. */
function zip(files: Record<string, Buffer>): Buffer {
  const locals: Buffer[] = []; const central: Buffer[] = []; let offset = 0;
  for (const [name, data] of Object.entries(files)) {
    const n = Buffer.from(name, 'utf8'); const body = deflateRawSync(data); const sum = crc32(data) >>> 0;
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

describe('what the library shows for other files and non-fonts (SF13, SF14)', () => {
  it('shows an unrecognised wav as an other file, not a special effect', async () => {
    const lib = await library();
    await put(join(lib.root, 'Font'), { 'hum01.wav': wav(), 'out01.wav': wav(), 'lock01.wav': wav(), 'readme.wav': wav(), 'notes/info.wav': wav() });
    const d = await lib.detail('Font');
    expect(d.sounds.find((s) => s.path === 'readme.wav')).toMatchObject({ effect: 'other files', kind: 'other' });
    expect(d.sounds.find((s) => s.path === 'notes/info.wav')?.effect).toBe('other files');
    expect(d.support.special).toEqual(['lockup']);
    expect(d.support.effects).not.toContain('other files');
    expect(d.support.effects).not.toContain('readme');
  });

  it('says which core sounds make a font, and does not count __MACOSX junk as sounds', async () => {
    const lib = await library();
    const dir = await mkdtemp(join(tmpdir(), 'hw-zip-'));
    const pkg = join(dir, 'Pack.zip');
    await writeFile(pkg, zip({ 'Pack/readme.wav': wav(), 'Pack/clsh01.wav': wav(), '__MACOSX/Pack/._clsh01.wav': Buffer.from('x'), '__MACOSX/Pack/._readme.wav': Buffer.from('x') }));
    const lines: string[] = [];
    await expect(lib.importFrom(pkg, (l) => lines.push(l))).rejects.toThrow(/core sounds \(hum, font, out \(ignition\), poweron or in \(retraction\)\)/);
    expect(lines[0]).toMatch(/\(2 sounds\)/);

    const junkOnly = join(dir, 'Junk.zip');
    await writeFile(junkOnly, zip({ '__MACOSX/Pack/._hum01.wav': Buffer.from('x') }));
    await expect(lib.importFrom(junkOnly)).rejects.toThrow(/has no sounds in it/);
  });
});
