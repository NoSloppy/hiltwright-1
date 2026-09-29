// Audit of baseline-sd-fonts, sd-card 2.10 (sd-fonts-test-coverage design D2): the presets' fonts missing from the
// card are found in the library and copied. A temporary folder stands in for the card.

import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FontLibrary } from '../src/main/fontLibrary';
import { listFonts } from '../src/main/sd';
import { fontsForPresets } from '../src/renderer/src/fontNeeds';

/** A minimal 16-bit mono 44.1 kHz PCM wav header with no samples. */
function wav(): Buffer {
  const b = Buffer.alloc(44);
  b.write('RIFF', 0); b.writeUInt32LE(36, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(44100, 24); b.writeUInt32LE(88200, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(0, 40);
  return b;
}

describe('the fonts the presets use', () => {
  it('2.10 two fonts in the library but not on the card: both copyable, and copying puts both on the card', async () => {
    const lib = new FontLibrary(await mkdtemp(join(tmpdir(), 'hw-lib-')), async (p) => { await rm(p, { recursive: true, force: true }); });
    const src = await mkdtemp(join(tmpdir(), 'hw-src-'));
    for (const f of ['Mara', 'Valkyrie', 'Ember']) { await mkdir(join(src, f)); await writeFile(join(src, f, 'hum01.wav'), wav()); await writeFile(join(src, f, 'clsh01.wav'), wav()); }
    await lib.importFrom(src);
    const cardRoot = await mkdtemp(join(tmpdir(), 'hw-card-'));
    await mkdir(join(cardRoot, 'Ember')); await writeFile(join(cardRoot, 'Ember', 'hum01.wav'), wav());

    const presets = [{ font: 'Mara;common' }, { font: 'valkyrie;common' }, { font: 'Ember;common' }, { font: 'Mara;common' }, { font: 'Nowhere' }, { font: 'common' }];
    const needs = fontsForPresets(presets, await listFonts(cardRoot), await lib.list());
    expect(needs.needed).toEqual(['Mara', 'valkyrie', 'Ember', 'Nowhere']);
    expect(needs.copyable).toEqual(['Mara', 'valkyrie']);
    expect(needs.missing).toEqual(['Nowhere']);

    // "Copy all 2" copies each through the library, as the page does.
    for (const f of needs.copyable) await lib.copyToCard(needs.inLibrary(f)!.folder, cardRoot, false);
    const after = fontsForPresets(presets, await listFonts(cardRoot), await lib.list());
    expect(after.copyable).toEqual([]);
    expect((await listFonts(cardRoot)).map((f) => f.name)).toEqual(['Ember', 'Mara', 'Valkyrie']);
  });
});
