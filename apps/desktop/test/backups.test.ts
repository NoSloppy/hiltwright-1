// library-integrity 3.3: a backup remembers the config the saber reported when it was taken, so a restore can expect
// the saber back with it; backups from before this have none.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { listBackups } from '../src/main/flash';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'hw-backups-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

// 256 KB that starts like firmware: stack pointer in SRAM, reset vector in flash.
const image = () => { const b = Buffer.alloc(262144); b[3] = 0x20; b[7] = 0x08; return b; };

describe('backups', () => {
  it('carry the config recorded beside them, and older ones have none', async () => {
    writeFileSync(join(dir, '2026-09-25T16-00-00-000Z-before-install.bin'), image());
    writeFileSync(join(dir, '2026-09-25T16-00-00-000Z-before-install.bin.json'), JSON.stringify({ configName: 'config/default_proffieboard_config.h' }));
    writeFileSync(join(dir, '2026-09-24T10-00-00-000Z-before-install.bin'), image());
    writeFileSync(join(dir, '2026-09-23T10-00-00-000Z-before-install.bin'), image());
    writeFileSync(join(dir, '2026-09-23T10-00-00-000Z-before-install.bin.json'), '{ not json');
    const list = await listBackups(dir);
    expect(list.map((b) => [b.at, b.configName, b.valid])).toEqual([
      ['2026-09-25T16:00:00.000Z', 'config/default_proffieboard_config.h', true],
      ['2026-09-24T10:00:00.000Z', null, true],
      ['2026-09-23T10:00:00.000Z', null, true],
    ]);
  });
});
