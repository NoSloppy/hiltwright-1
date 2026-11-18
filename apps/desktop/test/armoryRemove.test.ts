// Removing a saber from the Armory: who may be removed, what the confirmation says, and what removal deletes and keeps
// in the stores (the library record goes; backups and preset history stay on disk; a saber plugged in again is new).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Library } from '../src/main/library';
import { Snapshots } from '../src/main/snapshots';
import { listBackups } from '../src/main/flash';
import { resetStoreProblems } from '../src/main/jsonStore';
import { keptFolders, removeBlock, removeWords } from '../src/renderer/src/armoryRemove';
import { EXAMPLE_SABER } from '../src/renderer/src/tourSaber';
import type { SaberIdentity, SaberRecord } from '../src/shared/api';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'hw-remove-')); resetStoreProblems(); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const hote2: SaberIdentity = {
  usbSerial: '209133815232', configName: 'config/hiltwright_hote2.h', version: 'v8.10 hiltwright ce12a06', prop: 'SaberFett263Buttons',
  buttons: 2, installed: 'Sep 24 2026 18:48:49', pixelBlades: [132, 1, 2], bladeConfig: 0,
};
const preset = { font: 'Jedi;common', track: '', styles: ['builtin 0 1'], name: 'Jedi', variation: 0 };
const connect = (lib: Library) => lib.upsert({ identity: hote2, presets: [preset], fonts: ['Jedi'], tracks: [] });

describe('who can be removed', () => {
  const rec = (over: Partial<SaberRecord> = {}): SaberRecord => ({ id: 'abc123', name: 'Kylo', identity: hote2, firstSeen: '', lastSeen: '', presets: [], fonts: [], tracks: [], ...over });
  it('a remembered saber that is not plugged in can be', () => {
    expect(removeBlock(rec(), null)).toBeNull();
    expect(removeBlock(rec(), 'other')).toBeNull();
  });
  it('a plugged-in saber cannot, and the reason says to unplug it', () => {
    expect(removeBlock(rec(), 'abc123')).toMatch(/Unplug it first/);
  });
  it("the tour's example saber never can", () => {
    expect(removeBlock(EXAMPLE_SABER, null)).not.toBeNull();
  });
});

describe('the confirmation words', () => {
  const rec: SaberRecord = { id: 'abc123', name: 'Kylo', identity: hote2, firstSeen: '', lastSeen: '', presets: [], fonts: [], tracks: [] };
  it('names the saber, labels the button, and says what goes and what stays', () => {
    const w = removeWords(rec, 'C:\\Users\\me\\AppData\\Roaming\\Hiltwright');
    expect(w.title).toBe('Remove Kylo?');
    expect(w.button).toBe('Remove Kylo');
    expect(w.removed.join(' ')).toMatch(/wiring, presets and staged presets/);
    const kept = w.kept.join('\n');
    expect(kept).toContain('C:\\Users\\me\\AppData\\Roaming\\Hiltwright\\sabers\\abc123\\backups');
    expect(kept).toContain('C:\\Users\\me\\AppData\\Roaming\\Hiltwright\\sabers\\abc123\\snapshots');
    expect(kept).toMatch(/fonts, styles and preset sets are not touched/);
    expect(w.after).toMatch(/remembers it again as a new saber/);
  });
  it('still says the files are kept when the data folder is not known', () => {
    expect(removeWords(rec, null).kept.join(' ')).toMatch(/firmware backups stay as files/);
  });
  it('a plan has no backups or history to mention', () => {
    expect(removeWords({ ...rec, planned: true }, null).kept.join(' ')).not.toMatch(/backups/);
  });
  it('the kept folders are the ones the app writes', () => {
    expect(keptFolders('/data/', 'abc')).toEqual({ backups: '/data/sabers/abc/backups', history: '/data/sabers/abc/snapshots' });
  });
});

describe('what removal does to the stores', () => {
  it('deletes the record and its plan, keeps backups and history on disk, and a saber plugged in again is a new one', async () => {
    const lib = new Library(join(dir, 'library.json'));
    const old = await connect(lib);
    const other = await lib.plan('Spare', { name: 'x', board: 'V2', buttons: 2, prop: 'fett263', blades: [], presets: [], looks: [], generator: 't' });
    await lib.update(old.id, { presets: [preset] });
    await new Snapshots(dir).save(old.id, 'Before: edit', [preset]);
    const backups = join(dir, 'sabers', old.id, 'backups');
    mkdirSync(backups, { recursive: true });
    writeFileSync(join(backups, '2026-09-24T18-48-49-000Z-first.bin'), Buffer.alloc(262144));

    await lib.remove(old.id);

    // Gone: the record (and so its model and presets); the other record is not touched.
    expect((await new Library(join(dir, 'library.json')).list()).map((s) => s.id)).toEqual([other.id]);
    // Kept: the preset history and the backup file, where they were.
    expect(readdirSync(join(dir, 'sabers', old.id, 'snapshots'))).toHaveLength(1);
    expect(existsSync(join(backups, '2026-09-24T18-48-49-000Z-first.bin'))).toBe(true);
    expect(await listBackups(backups)).toHaveLength(1);
    expect(await new Snapshots(dir).list(old.id)).toHaveLength(1);

    // Plugged in again: remembered as a new saber, with no history or backups listed for it.
    const again = await connect(new Library(join(dir, 'library.json')));
    expect(again.id).not.toBe(old.id);
    expect(again.model).toBeUndefined();
    expect(await new Snapshots(dir).list(again.id)).toEqual([]);
    expect(await listBackups(join(dir, 'sabers', again.id, 'backups'))).toEqual([]);
  });
});
