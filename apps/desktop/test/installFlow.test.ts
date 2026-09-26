// Baseline audit (baseline-firmware firmware-install 5.5, 5.11, 5.13): the install sequence of Build & Install, run
// against fake flash and board calls. What the page shows is the last step and note reported.

import { describe, expect, it, vi } from 'vitest';
import type { SaberConfigModel } from '@hiltwright/core';
import type { BuildResult, SaberRecord } from '../src/shared/api';
import { STOPPED_HINT, installSequence, type InstallDeps, type InstallJob, type InstallReport } from '../src/renderer/src/installFlow';

const model = { name: 'hiltwright_hote2', board: 'V2', buttons: 2, prop: 'fett263', blades: [], presets: [] } as unknown as SaberConfigModel;
const job: InstallJob = {
  saber: { id: 's1', name: 'hote2' } as unknown as SaberRecord,
  model,
  result: { ok: true, dfuPath: 'C:\\ProgramData\\Hiltwright\\builds\\s1\\ProffieOS.ino.dfu', manifest: { hash: 'abc', looks: [] }, os: 'v8.10' } as unknown as BuildResult,
  info: { version: { config: 'config/hiltwright_hote2.h' } } as unknown as InstallJob['info'],
};

type Over = { backup?: { ok: boolean; detail?: string }; write?: () => Promise<{ ok: boolean; detail: string }>; runtime?: boolean };
function fakes(over: Over = {}) {
  const calls: string[] = [];
  const reports: InstallReport[] = [];
  const deps: InstallDeps = {
    flash: {
      usb: vi.fn(async () => { calls.push('usb'); return { runtimePresent: true, bootloaderPresent: false, bootloaderDriver: null, bootloaderProblem: null }; }),
      waitForBootloader: vi.fn(async () => { calls.push('waitForBootloader'); return { ok: true, text: 'Bootloader ready (WinUSB).' }; }),
      backup: vi.fn(async () => { calls.push('backup'); return { ok: true, ms: 1, detail: 'backup written', file: 'C:\\backups\\before-install.bin', ...over.backup }; }),
      write: vi.fn(async () => { calls.push('write'); return over.write ? { ms: 1, ...(await over.write()) } : { ok: true, ms: 1, detail: 'wrote' }; }),
      restore: vi.fn(),
      waitForRuntime: vi.fn(async () => { calls.push('waitForRuntime'); return over.runtime ?? true; }),
    },
    snapshots: { save: vi.fn() },
    board: {
      info: null,
      send: vi.fn(),
      rebootToBootloader: vi.fn(async () => { calls.push('reboot'); return true; }),
      connect: vi.fn(async () => { calls.push('connect'); }),
      expectAfterInstall: vi.fn(),
      updateSaber: vi.fn(async () => { calls.push('updateSaber'); }),
    } as unknown as InstallDeps['board'],
    report: (r) => reports.push(r),
    sleep: async () => undefined,
  };
  /** What the page shows at the end: the last step and note reported. */
  const shown = () => ({ step: [...reports].reverse().find((r) => r.step)?.step, note: [...reports].reverse().find((r) => r.note !== undefined)?.note ?? null });
  return { deps, calls, shown };
}

describe('firmware-install audit', () => {
  it('a normal install: backup, write, wait, reconnect, record, and "Installed" with the backup location', async () => {
    const f = fakes();
    await installSequence(f.deps, job);
    expect(f.calls).toEqual(['usb', 'reboot', 'waitForBootloader', 'backup', 'write', 'waitForRuntime', 'connect', 'updateSaber']);
    expect(f.shown()).toEqual({ step: 'done', note: { tone: 'green', text: 'Installed. Backup of the previous firmware: C:\\backups\\before-install.bin' } });
    expect(f.deps.board.expectAfterInstall).toHaveBeenCalledWith('s1', 'config/hiltwright_hote2.h');
  });

  it('5.5 the backup fails: the install stops with "Backup failed, so nothing was written", and nothing is written', async () => {
    const f = fakes({ backup: { ok: false, detail: 'dfu-util: Cannot open DFU device' } });
    await installSequence(f.deps, job);
    expect(f.deps.flash.write).not.toHaveBeenCalled();
    expect(f.shown().step).toBe('failed');
    expect(f.shown().note?.text).toMatch(/^Backup failed, so nothing was written\./);
  });

  it('5.11 the saber does not come back: the page says it was written and asks to unplug, replug and connect', async () => {
    const f = fakes({ runtime: false });
    await installSequence(f.deps, job);
    expect(f.calls).not.toContain('connect');
    expect(f.shown().note).toEqual({ tone: 'amber', text: 'The firmware was written but the saber has not reappeared yet. Unplug and replug it, then press Connect.' });
    // Today the saber's record is not updated when it is slow to return; install-safety-nets FW9 changes that.
    expect(f.calls).not.toContain('updateSaber');
  });

  it('5.13 an unexpected error: the page shows "Stopped" with the error, the BOOT/RESET steps and the backup reminder', async () => {
    const f = fakes({ write: async () => { throw new Error('dfu-util crashed'); } });
    await installSequence(f.deps, job);
    expect(f.shown().step).toBe('failed');
    expect(f.shown().note).toEqual({ tone: 'red', text: 'Error: dfu-util crashed' });
    expect(STOPPED_HINT).toMatch(/hold BOOT, tap RESET, release BOOT/);
    expect(STOPPED_HINT).toMatch(/backup can always be put back from the Backups tab/);
  });
});
