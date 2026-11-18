// Font packs carry the font's whole folder and can be copied to a card, all or nothing (free-fonts-as-packs).
// Temporary folders stand in for the card; no real card is touched.

import { describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readManifest, writePack } from '../src/main/hwpack';
import { collectFontItems } from '../src/main/fontPackFiles';
import { checkEntryName, copyPackFontToCard, unpackFont } from '../src/main/packCopy';

function wav(extra = 0, fill = 0): Buffer {
  const b = Buffer.alloc(44 + extra, fill);
  b.write('RIFF', 0); b.writeUInt32LE(36 + extra, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(44100, 24); b.writeUInt32LE(88200, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(extra, 40);
  return b;
}

/** A small font with everything a real one has: sounds in subfolders, ini files, a licence, a readme, a sound the demo does not play. */
async function fixtureFont(name = 'TestSF'): Promise<string> {
  const dir = join(await mkdtemp(join(tmpdir(), 'hw-pf-src-')), name);
  await mkdir(join(dir, 'swing'), { recursive: true });
  await mkdir(join(dir, 'tracks'), { recursive: true });
  await mkdir(join(dir, 'extras', 'deep'), { recursive: true });
  for (const [n, d] of [['hum01.wav', wav(64, 1)], ['clsh01.wav', wav(32, 2)], ['clsh02.wav', wav(32, 3)], ['font01.wav', wav(16, 4)], ['original_hum01.wav', wav(16, 5)], ['swing/swng01.wav', wav(8, 6)], ['tracks/theme.wav', wav(128, 7)], ['extras/deep/odd.dat', Buffer.from([0, 255, 1, 254])]] as const) await writeFile(join(dir, n), d);
  await writeFile(join(dir, 'config.ini'), 'ProffieOSHumDelay=100\r\nProffieOSSwingSensitivity=1.5\r\n');
  await writeFile(join(dir, 'smoothsw.ini'), 'SwingSharpness=1.2\n');
  await writeFile(join(dir, 'license.txt'), 'Attribution-ShareAlike 4.0 International\n');
  await writeFile(join(dir, 'readme.txt'), 'Made by somebody.\n');
  return dir;
}

/** Every file under a folder with its bytes, by relative path. */
async function tree(dir: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const rel of (await readdir(dir, { recursive: true, withFileTypes: true })).filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name).slice(dir.length + 1).replace(/\\/g, '/'))) out[rel] = (await readFile(join(dir, rel))).toString('base64');
  return out;
}

async function packOf(dir: string, copy: boolean, name = 'TestSF') {
  const buf = writePack({ id: `font-${name.toLowerCase()}`, kind: 'font', name, creator: 'Someone', licence: 'CC BY-SA 4.0', allow: { copyToCard: copy, demoPlayback: true } }, collectFontItems(dir, copy));
  const { manifest, itemsStart } = readManifest(buf);
  return { buf, manifest, itemsStart };
}

const emptyCard = () => mkdtemp(join(tmpdir(), 'hw-pf-card-'));

describe('what a font pack carries', () => {
  it('a pack made for copying holds every file of the folder; one made for playing holds only the playable sounds', async () => {
    const dir = await fixtureFont();
    const whole = collectFontItems(dir, true);
    expect(whole.map((i) => i.name).sort()).toEqual(Object.keys(await tree(dir)).sort());
    // Playable sounds stay 'wav' so the demo room plays the same from either pack; the rest is 'file'.
    expect(whole.filter((i) => i.kind === 'wav').map((i) => i.name).sort()).toEqual(['clsh01.wav', 'clsh02.wav', 'font01.wav', 'hum01.wav', 'swing/swng01.wav']);
    expect(whole.find((i) => i.name === 'original_hum01.wav')?.kind).toBe('file');
    expect(whole.find((i) => i.name === 'license.txt')?.kind).toBe('file');
    const playOnly = collectFontItems(dir, false);
    expect(playOnly.map((i) => i.name).sort()).toEqual(['clsh01.wav', 'clsh02.wav', 'font01.wav', 'hum01.wav', 'swing/swng01.wav']);
    expect(playOnly.every((i) => i.kind === 'wav')).toBe(true);
  });
});

describe('copying a font pack to a card', () => {
  it('unpacks to a folder byte-identical to the original', async () => {
    const dir = await fixtureFont();
    const { buf, manifest, itemsStart } = await packOf(dir, true);
    const dest = await mkdtemp(join(tmpdir(), 'hw-pf-out-'));
    const folder = await unpackFont(buf, manifest, itemsStart, dest);
    expect(await tree(folder)).toEqual(await tree(dir));
  });

  it('lands on the card identical to the source, with progress, and leaves no temporary files', async () => {
    const dir = await fixtureFont();
    const { buf, manifest, itemsStart } = await packOf(dir, true);
    const root = await emptyCard();
    const temp = await mkdtemp(join(tmpdir(), 'hw-pf-tmp-'));
    const seen: [number, number][] = [];
    const entry = await copyPackFontToCard(buf, manifest, itemsStart, root, { onProgress: (d, t) => seen.push([d, t]) }, temp);
    expect(entry.name).toBe('TestSF');
    expect(await readdir(root)).toEqual(['TestSF']);
    expect(await tree(join(root, 'TestSF'))).toEqual(await tree(dir));
    expect(seen.at(-1)).toEqual([12, 12]);
    expect(await readdir(temp)).toEqual([]);
  });

  it('refuses a pack whose creator did not allow copying, and touches nothing', async () => {
    const dir = await fixtureFont();
    const { buf, manifest, itemsStart } = await packOf(dir, false);
    const root = await emptyCard();
    const temp = await mkdtemp(join(tmpdir(), 'hw-pf-tmp-'));
    await expect(copyPackFontToCard(buf, manifest, itemsStart, root, {}, temp)).rejects.toThrow(/not allowed/);
    expect(await readdir(root)).toEqual([]);
    expect(await readdir(temp)).toEqual([]);
  });

  it('refuses a crafted entry path before writing anything', async () => {
    for (const bad of ['../evil.txt', 'a/../../evil.txt', '/abs.txt', 'C:\\evil.txt', 'a\\b.txt', 'C:evil.txt', 'x/./y.txt', 'dir//file.txt']) {
      const buf = writePack({ id: 'font-bad', kind: 'font', name: 'Bad', creator: 'x', licence: 'x', allow: { copyToCard: true, demoPlayback: true } }, [{ name: 'hum01.wav', kind: 'wav', data: wav() }, { name: bad, kind: 'file', data: Buffer.from('x') }]);
      const { manifest, itemsStart } = readManifest(buf);
      const root = await emptyCard();
      const temp = await mkdtemp(join(tmpdir(), 'hw-pf-tmp-'));
      await expect(copyPackFontToCard(buf, manifest, itemsStart, root, {}, temp), bad).rejects.toThrow(/not safe to copy/);
      expect(await readdir(root), bad).toEqual([]);
      expect(await readdir(temp), bad).toEqual([]);
    }
    expect(() => checkEntryName('license.txt')).not.toThrow();
    expect(() => checkEntryName('tracks/theme.wav')).not.toThrow();
  });

  it('refuses a pack that claims more than a font can be, and a size that does not match the file', async () => {
    const root = await emptyCard();
    const temp = await mkdtemp(join(tmpdir(), 'hw-pf-tmp-'));
    const big = writePack({ id: 'font-big', kind: 'font', name: 'Big', creator: 'x', licence: 'x', allow: { copyToCard: true, demoPlayback: true } }, [{ name: 'hum01.wav', kind: 'wav', data: wav() }]);
    const { manifest, itemsStart } = readManifest(big);
    manifest.items[0].bytes = 1e12;
    await expect(copyPackFontToCard(big, manifest, itemsStart, root, {}, temp)).rejects.toThrow(/bigger than a sound font/);
    manifest.items[0].bytes = 5;
    await expect(copyPackFontToCard(big, manifest, itemsStart, root, {}, temp)).rejects.toThrow(/damaged/);
    expect(await readdir(root)).toEqual([]);
    expect(await readdir(temp)).toEqual([]);
  });

  it('a copy that fails part way leaves no partial font on the card and no temporary files', async () => {
    const dir = await fixtureFont();
    const { buf, manifest, itemsStart } = await packOf(dir, true);
    const root = await emptyCard();
    const temp = await mkdtemp(join(tmpdir(), 'hw-pf-tmp-'));
    let n = 0;
    const copyOne = async () => { if (++n === 4) throw Object.assign(new Error('UNKNOWN: unknown error, copyfile'), { code: 'UNKNOWN' }); };
    await expect(copyPackFontToCard(buf, manifest, itemsStart, root, { copyOne }, temp)).rejects.toThrow(/stopped part way/);
    expect(await readdir(root)).toEqual([]);
    expect(await readdir(temp)).toEqual([]);
  });

  it('keeps the old font when the card already has one, unless replacing, and then swaps it whole', async () => {
    const dir = await fixtureFont();
    const { buf, manifest, itemsStart } = await packOf(dir, true);
    const root = await emptyCard();
    await mkdir(join(root, 'TestSF'));
    await writeFile(join(root, 'TestSF', 'old.wav'), wav());
    const temp = await mkdtemp(join(tmpdir(), 'hw-pf-tmp-'));
    await expect(copyPackFontToCard(buf, manifest, itemsStart, root, { replace: false }, temp)).rejects.toThrow(/already on the card/);
    expect(await readdir(join(root, 'TestSF'))).toEqual(['old.wav']);
    await copyPackFontToCard(buf, manifest, itemsStart, root, { replace: true }, temp);
    expect(await tree(join(root, 'TestSF'))).toEqual(await tree(dir));
    expect(await readdir(temp)).toEqual([]);
  });
});
