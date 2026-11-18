// saber-library 1.9 (baseline audit): a snapshot on disk is a presets.ini the codec reads back. Whether ProffieOS
// itself loads the file (with its # header and no installed= line) needs a board: hardware-verification-v2 (BST-5).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parsePresetsIni, planRestore } from '@hiltwright/core';
import { Snapshots } from '../src/main/snapshots';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'hw-snap-')); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-25T20:00:00.000Z')); });
afterEach(() => { vi.useRealTimers(); rmSync(dir, { recursive: true, force: true }); });

const presets = [
  { font: 'Mara Jade Skywalker;common', track: 'Mara Jade Skywalker/tracks/The_Force.wav', styles: ['builtin 0 1', 'builtin 0 2', 'builtin 0 3'], name: 'Mara Jade\\nSkywalker', variation: 0 },
  { font: 'Valkyrie;common', track: '', styles: ['builtin 1 1 ~ ~ 255,0,0', 'builtin 1 2', 'builtin 1 3'], name: 'Valkyrie', variation: 12 },
];

describe('snapshots', () => {
  it('1.9 a snapshot can be used outside the app: a presets.ini with a header that reads back the same', async () => {
    const snaps = new Snapshots(dir);
    const meta = await snaps.save('ea8dbea42e78', 'Before: Edit\npreset', presets);
    expect(meta.file).toBe('2026-09-25T20-00-00-000Z-before-edit-preset.ini');
    const text = readFileSync(join(dir, 'sabers', 'ea8dbea42e78', 'snapshots', meta.file), 'utf8');
    expect(text.split('\n').slice(0, 3)).toEqual(['# hiltwright snapshot', '# label=Before: Edit preset', '# at=2026-09-25T20:00:00.000Z']);
    expect(text.trimEnd().split('\n').at(-1)).toBe('end');
    const ini = parsePresetsIni(text);
    expect(ini.terminated).toBe(true);
    expect(ini.presets).toEqual(presets);
    expect(await snaps.read('ea8dbea42e78', meta.file)).toEqual(presets);
    expect(await snaps.list('ea8dbea42e78')).toEqual([{ file: meta.file, at: '2026-09-25T20:00:00.000Z', label: 'Before: Edit preset', presets: 2 }]);
  });

  it('preset-history-restore: a snapshot read back from disk plans no change against the list it was taken from, and finds a moved, edited preset', async () => {
    const snaps = new Snapshots(dir);
    const meta = await snaps.save('ea8dbea42e78', 'Before: Font', presets);
    const saved = await snaps.read('ea8dbea42e78', meta.file);
    expect(planRestore(saved, presets).same).toBe(true);
    const now = [{ ...presets[1], font: 'Other;common' }, presets[0]];
    expect(planRestore(saved, now).single).toMatchObject({ at: 0, snapshotAt: 1, patch: { font: 'Valkyrie;common' } });
  });
});
