// Audit of baseline-sd-fonts, font-library 1.3 (sd-fonts-test-coverage design D3): moving the library to another
// drive. Across drives `rename` fails with EXDEV and the library copies instead. Here `rename` fails that way for
// font folders (names without a dot), so the copy path runs on one drive; the store's own files rename as usual.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';

const crossDrive = vi.hoisted(() => ({ renames: 0 }));
vi.mock('node:fs/promises', async (importOriginal) => {
  const real = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...real,
    rename: async (from: string, to: string) => {
      if (!basename(String(from)).includes('.')) {
        crossDrive.renames++;
        throw Object.assign(new Error(`EXDEV: cross-device link not permitted, rename '${from}' -> '${to}'`), { code: 'EXDEV' });
      }
      return real.rename(from, to);
    },
  };
});

const { FontLibrary } = await import('../src/main/fontLibrary');

/** A minimal 16-bit mono 44.1 kHz PCM wav. */
function wav(): Buffer {
  const b = Buffer.alloc(44);
  b.write('RIFF', 0); b.writeUInt32LE(36, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(44100, 24); b.writeUInt32LE(88200, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(0, 40);
  return b;
}

const made: string[] = [];
const temp = async (p: string) => { const d = await mkdtemp(join(tmpdir(), p)); made.push(d); return d; };
afterEach(async () => { for (const d of made.splice(0)) await rm(d, { recursive: true, force: true }); });

describe('font-library audit: moving across drives', () => {
  it('1.3 every font and its details are in the new folder, none left behind, and the library shows the same fonts', async () => {
    const lib = new FontLibrary(await temp('hw-lib-'), async (p) => { await rm(p, { recursive: true, force: true }); });
    const src = await temp('hw-src-');
    for (const f of ['Alpha', 'Beta']) {
      await mkdir(join(src, f, 'clsh'), { recursive: true });
      await writeFile(join(src, f, 'hum.wav'), wav()); await writeFile(join(src, f, 'clsh', '001.wav'), wav());
    }
    await lib.importFrom(src);
    await lib.setMeta('Beta', { name: 'The Beta', maker: 'Someone' });
    const before = (await lib.list()).map((f) => ({ folder: f.folder, name: f.meta.name, maker: f.meta.maker }));
    const old = lib.root;

    const next = await temp('hw-lib-other-drive-');
    crossDrive.renames = 0;
    await lib.moveTo(next, true);

    expect(crossDrive.renames).toBeGreaterThanOrEqual(2); // each font took the copy path
    for (const f of ['Alpha', 'Beta']) {
      expect(existsSync(join(next, f, 'hum.wav'))).toBe(true);
      expect(existsSync(join(next, f, 'clsh', '001.wav'))).toBe(true);
      expect(existsSync(join(old, f))).toBe(false);
    }
    expect((await readdir(old)).filter((n) => !n.startsWith('hiltwright-'))).toEqual([]);
    expect((await lib.list()).map((f) => ({ folder: f.folder, name: f.meta.name, maker: f.meta.maker }))).toEqual(before);
  });
});
