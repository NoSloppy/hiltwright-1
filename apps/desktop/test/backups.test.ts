// library-integrity 3.3: a backup remembers the config the saber reported when it was taken, so a restore can expect
// the saber back with it; backups from before this have none.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { listBackups, restoreBackup } from '../src/main/flash';

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

// Baseline audit (baseline-firmware firmware-install 5.15): an erased or wrong-size read is never offered back.
describe('firmware-install audit', () => {
  it('5.15 an erased read: listed as not a usable image, and putting it back is refused', async () => {
    writeFileSync(join(dir, '2026-09-25T16-00-00-000Z-before-install.bin'), Buffer.alloc(262144, 0xff));
    const [b] = await listBackups(dir);
    expect(b.valid).toBe(false);
    const r = await restoreBackup(join(dir, 'no-toolchain'), join(dir, b.file), () => undefined);
    expect(r).toEqual({ ok: false, ms: 0, detail: 'That backup does not look like firmware (it may be an erased or protected read), so it was not written.' });
  });

  it('5.15 a wrong-size read that starts like firmware: putting it back is refused', async () => {
    const short = image().subarray(0, 100 * 1024);
    writeFileSync(join(dir, '2026-09-25T16-00-00-000Z-before-install.bin'), short);
    const r = await restoreBackup(join(dir, 'no-toolchain'), join(dir, '2026-09-25T16-00-00-000Z-before-install.bin'), () => undefined);
    expect(r).toEqual({ ok: false, ms: 0, detail: 'That file is not a full flash backup (256 KB or 512 KB).' });
  });

  // FST-1 (install-safety-nets, beside FW7): the list checks only the first bytes, so a wrong-size read is offered as
  // usable until the owner presses Restore. The spec lists it as not usable.
  it.fails('5.15 a wrong-size read is listed as not a usable image', async () => {
    writeFileSync(join(dir, '2026-09-25T16-00-00-000Z-before-install.bin'), image().subarray(0, 100 * 1024));
    const [b] = await listBackups(dir);
    expect(b.valid).toBe(false);
  });
});
