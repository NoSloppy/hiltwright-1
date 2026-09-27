// Baseline audit (baseline-firmware firmware-install 5.9): the Windows driver installer is checked (size and pinned
// SHA-256) right before it runs with administrator rights, and a file that fails is deleted and never launched.

import { describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { DRIVER_BYTES, DRIVER_SHA256, installBootloaderDriver, type DriverSys } from '../src/main/driver';

const noDriver = { runtimePresent: false, bootloaderPresent: true, bootloaderDriver: null, bootloaderProblem: 28, bootloaders: [{ serial: '209133815232', driver: null, problem: 28 }], runtimeSerials: [], runtimeNoSerial: 0 };

function fakes(file: (dest: string) => Promise<void>) {
  const sys: DriverSys = {
    platform: 'win32',
    usbState: vi.fn(async () => noDriver),
    download: vi.fn(async (_url: string, dest: string) => file(dest)),
    launchElevated: vi.fn(async () => ({ ok: true, err: '' })),
    waitFor: vi.fn(async () => ({ ...noDriver, bootloaderDriver: 'WinUSB', bootloaderProblem: 0 })),
  };
  return sys;
}

describe('firmware-install audit', () => {
  it('5.9 a tampered download: a file of the wrong size is deleted, not run, and the owner is told', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hw-drv-'));
    const sys = fakes((dest) => writeFile(dest, Buffer.alloc(1000)));
    const r = await installBootloaderDriver(dir, () => undefined, sys);
    expect(r).toEqual({ ok: false, text: 'The downloaded driver installer is not the file Hiltwright expects, so it was not run. Use the setup page instead.' });
    expect(sys.launchElevated).not.toHaveBeenCalled();
    expect(existsSync(join(dir, 'proffie-dfu-setup.exe'))).toBe(false);
  });

  it('5.9 a tampered download: a file of the right size with the wrong SHA-256 is deleted and not run', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hw-drv-'));
    // Already on disk at the right size, so it is not downloaded again; the hash is still checked before running.
    await writeFile(join(dir, 'proffie-dfu-setup.exe'), Buffer.alloc(DRIVER_BYTES));
    const sys = fakes(async () => { throw new Error('should not download'); });
    const r = await installBootloaderDriver(dir, () => undefined, sys);
    expect(r.ok).toBe(false);
    expect(r.text).toMatch(/not the file Hiltwright expects/);
    expect(sys.download).not.toHaveBeenCalled();
    expect(sys.launchElevated).not.toHaveBeenCalled();
    expect(existsSync(join(dir, 'proffie-dfu-setup.exe'))).toBe(false);
  });

  it('launches a file that passes the check, once, and waits for the driver', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hw-drv-'));
    const sys = fakes((dest) => writeFile(dest, Buffer.alloc(DRIVER_BYTES)));
    // Stand in for the published file: pin this file's hash for the test. The real installer is not a file of zeros.
    const sha256 = createHash('sha256').update(Buffer.alloc(DRIVER_BYTES)).digest('hex');
    expect(sha256).not.toBe(DRIVER_SHA256);
    const r = await installBootloaderDriver(dir, () => undefined, { ...sys, expected: { bytes: DRIVER_BYTES, sha256 } });
    expect(r).toEqual({ ok: true, text: 'Driver installed. The bootloader is ready.' });
    expect(sys.launchElevated).toHaveBeenCalledTimes(1);
  });
});
