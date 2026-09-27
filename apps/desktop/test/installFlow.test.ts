// The install and restore sequences of Build & Install, run against a fake USB world: which boards are running, which
// are in their bootloaders, and each one's flash. Baseline audit (baseline-firmware firmware-install 5.5, 5.11, 5.13),
// and install-target-safety (design D3-D6): which board is written, and every refusal before anything is touched.

import { describe, expect, it, vi } from 'vitest';
import type { SaberConfigModel } from '@hiltwright/core';
import type { BackupInfo, BuildResult, SaberRecord, UsbState } from '../src/shared/api';
import { STOPPED_HINT, installSequence, restoreSequence, writeFromBootloader, type InstallDeps, type InstallJob, type InstallReport } from '../src/renderer/src/installFlow';

const HOTE2 = '209133815232';
const V3 = '207A349A5430';
const model = { name: 'hiltwright_hote2', board: 'V2', boardFrom: 'owner', buttons: 2, prop: 'fett263', blades: [], presets: [] } as unknown as SaberConfigModel;
const saberRec = (over: Partial<SaberRecord> = {}): SaberRecord => ({ id: 's1', name: 'hote2', identity: { usbSerial: HOTE2 }, ...over } as unknown as SaberRecord);
const v3Rec: SaberRecord = { id: 's3', name: 'The V3', identity: { usbSerial: V3 } } as unknown as SaberRecord;
const build = (board: 'V2' | 'V3' = 'V2') => ({ ok: true, board, dfuPath: 'C:\\b\\s1\\ProffieOS.ino.dfu', manifest: { hash: 'abc', looks: [] }, os: 'v8.10' }) as unknown as BuildResult;
const jobFor = (over: Partial<InstallJob> = {}): InstallJob => ({
  saber: saberRec(), model, result: build(), connected: true,
  info: { version: { config: 'config/hiltwright_hote2.h' } } as unknown as InstallJob['info'], ...over,
});

/** The boards plugged in: serial → flash size, and whether each is running or in its bootloader. */
type Board = { serial: string | null; flash: number; mode: 'run' | 'boot' };
type Over = { backup?: { ok: boolean; detail?: string }; write?: () => Promise<{ ok: boolean; detail: string }>; runtime?: boolean; confirm?: boolean; connectedSerial?: string; noDriver?: boolean };
function world(boards: Board[], over: Over = {}) {
  const calls: string[] = [];
  const reports: InstallReport[] = [];
  const connectedSerial = over.connectedSerial ?? HOTE2;
  const usb = (): UsbState => {
    const boots = boards.filter((b) => b.mode === 'boot');
    return {
      runtimePresent: boards.some((b) => b.mode === 'run'), bootloaderPresent: boots.length > 0, bootloaderDriver: boots.length ? 'WinUSB' : null, bootloaderProblem: null,
      bootloaders: boots.map((b) => ({ serial: b.serial, driver: over.noDriver ? null : 'WinUSB', problem: over.noDriver ? 28 : 0 })),
      runtimeSerials: boards.filter((b) => b.mode === 'run' && b.serial).map((b) => b.serial!),
    };
  };
  const deps: InstallDeps = {
    flash: {
      usb: vi.fn(async () => { calls.push('usb'); return usb(); }),
      waitForBootloader: vi.fn(async (_ms: number, before?: (string | null)[]) => {
        calls.push('waitForBootloader');
        const fresh = usb().bootloaders.filter((b) => !(before ?? []).includes(b.serial));
        return { ok: fresh.length > 0 && !over.noDriver, text: over.noDriver ? 'Windows has no usable driver' : 'Bootloader ready (WinUSB).', serials: fresh.map((b) => b.serial) };
      }),
      target: vi.fn(async (serial: string | null) => {
        calls.push(`target ${serial}`);
        const boots = boards.filter((b) => b.mode === 'boot');
        const b = serial ? boots.find((x) => x.serial === serial) : boots.length === 1 ? boots[0] : undefined;
        const board = b?.flash === 262144 ? 'V2' as const : b?.flash === 524288 ? 'V3' as const : null;
        return { serial, flashBytes: b?.flash ?? null, board, found: !!b };
      }),
      backup: vi.fn(async (_id: string, _l: string, _c?: string | null, serial?: string | null) => { calls.push(`backup ${serial}`); return { ok: true, ms: 1, detail: 'backup written', file: 'C:\\backups\\before-install.bin', ...over.backup }; }),
      write: vi.fn(async (_p: string, serial?: string | null) => {
        calls.push(`write ${serial}`);
        const r = over.write ? { ms: 1, ...(await over.write()) } : { ok: true, ms: 1, detail: 'wrote' };
        if (r.ok) for (const b of boards) if (b.mode === 'boot' && b.serial === serial) b.mode = 'run';
        return r;
      }),
      restore: vi.fn(async (_id: string, _f: string, serial?: string | null) => { calls.push(`restore ${serial}`); for (const b of boards) if (b.serial === serial) b.mode = 'run'; return { ok: true, ms: 1, detail: 'restored' }; }),
      waitForRuntime: vi.fn(async (_ms: number, serial?: string | null) => { calls.push(`waitForRuntime ${serial}`); return over.runtime ?? true; }),
    },
    snapshots: { save: vi.fn() },
    noteBootloader: vi.fn(async (id: string, seen: { serial: string | null; flashBytes: number }) => { calls.push(`note ${id} ${seen.serial} ${seen.flashBytes}`); return {} as SaberRecord; }),
    sabers: [saberRec(), v3Rec],
    confirmTarget: vi.fn(async (name: string) => { calls.push(`ask ${name}`); return over.confirm ?? true; }),
    board: {
      info: null,
      send: vi.fn(),
      rebootToBootloader: vi.fn(async () => { calls.push('reboot'); for (const b of boards) if (b.serial === connectedSerial) b.mode = 'boot'; return true; }),
      connect: vi.fn(async (_i?: boolean, o?: { serial?: string | null }) => { calls.push(`connect ${o?.serial ?? null}`); }),
      expectAfterInstall: vi.fn(),
      updateSaber: vi.fn(async () => { calls.push('updateSaber'); }),
    } as unknown as InstallDeps['board'],
    report: (r) => reports.push(r),
    sleep: async () => undefined,
  };
  /** What the page shows at the end: the last step and note reported. */
  const shown = () => ({ step: [...reports].reverse().find((r) => r.step)?.step, note: [...reports].reverse().find((r) => r.note !== undefined)?.note ?? null });
  const touched = () => calls.filter((c) => /^(backup|write|restore)/.test(c));
  return { deps, calls, shown, touched, boards };
}
const hote2 = (mode: Board['mode'] = 'run'): Board => ({ serial: HOTE2, flash: 262144, mode });
const theV3 = (mode: Board['mode'] = 'run'): Board => ({ serial: V3, flash: 524288, mode });

describe('firmware-install audit', () => {
  it('a normal install: reboot, check, backup, write, wait, reconnect, record, and "Installed" with the backup location', async () => {
    const f = world([hote2()]);
    await installSequence(f.deps, jobFor());
    expect(f.calls).toEqual(['usb', 'reboot', 'waitForBootloader', `target ${HOTE2}`, `note s1 ${HOTE2} 262144`, `backup ${HOTE2}`, `write ${HOTE2}`, `waitForRuntime ${HOTE2}`, `connect ${HOTE2}`, 'updateSaber']);
    expect(f.shown()).toEqual({ step: 'done', note: { tone: 'green', text: 'Installed. Backup of the previous firmware: C:\\backups\\before-install.bin' } });
    expect(f.deps.board.expectAfterInstall).toHaveBeenCalledWith('s1', 'config/hiltwright_hote2.h');
  });

  it('5.5 the backup fails: the install stops with "Backup failed, so nothing was written", and nothing is written', async () => {
    const f = world([hote2()], { backup: { ok: false, detail: 'dfu-util: Cannot open DFU device' } });
    await installSequence(f.deps, jobFor());
    expect(f.deps.flash.write).not.toHaveBeenCalled();
    expect(f.shown().step).toBe('failed');
    expect(f.shown().note?.text).toMatch(/^Backup failed, so nothing was written\./);
  });

  it('5.11 the saber does not come back: the page says it was written and asks to unplug, replug and connect', async () => {
    const f = world([hote2()], { runtime: false });
    await installSequence(f.deps, jobFor());
    expect(f.calls.some((c) => c.startsWith('connect'))).toBe(false);
    expect(f.shown().note).toEqual({ tone: 'amber', text: 'The firmware was written but the saber has not reappeared yet. Unplug and replug it, then press Connect.' });
    // Today the saber's record is not updated when it is slow to return; install-safety-nets FW9 changes that.
    expect(f.calls).not.toContain('updateSaber');
  });

  it('5.13 an unexpected error: the page shows "Stopped" with the error, the BOOT/RESET steps and the backup reminder', async () => {
    const f = world([hote2()], { write: async () => { throw new Error('dfu-util crashed'); } });
    await installSequence(f.deps, jobFor());
    expect(f.shown().step).toBe('failed');
    expect(f.shown().note).toEqual({ tone: 'red', text: 'Error: dfu-util crashed' });
    expect(STOPPED_HINT).toMatch(/hold BOOT, tap RESET, release BOOT/);
    expect(STOPPED_HINT).toMatch(/backup can always be put back from the Backups tab/);
  });

  it('the bootloader has no driver yet: the install pauses at the driver step with nothing touched', async () => {
    const f = world([hote2()], { noDriver: true });
    await installSequence(f.deps, jobFor());
    expect(f.shown().step).toBe('driver');
    expect(f.touched()).toEqual([]);
  });
});

describe('the board type (design D3)', () => {
  it('a V2 build on a board whose bootloader reports 512 KB: stopped with the words, and nothing read or written', async () => {
    const f = world([theV3()], { connectedSerial: V3 });
    await installSequence(f.deps, jobFor({ saber: v3Rec }));
    expect(f.touched()).toEqual([]);
    expect(f.shown().note?.text).toBe('This saber is a Proffieboard V3, but this firmware was built for a V2. Nothing was written. Choose V3 on the Wiring page and build again. To bring the saber back to its firmware, press RESET on the board, or unplug it and plug it back in.');
    expect(f.calls.some((c) => c.startsWith('note'))).toBe(false);
  });

  it('a board Hiltwright knows is a V3 is not even rebooted for a V2 build', async () => {
    const f = world([theV3()], { connectedSerial: V3 });
    await installSequence(f.deps, jobFor({ saber: { ...v3Rec, bootloader: { serial: V3, flashBytes: 524288, board: 'V3', at: '' } } }));
    expect(f.calls).toEqual([]);
    expect(f.shown().note?.text).toBe('This saber is a Proffieboard V3, but this firmware was built for a V2. Nothing was written. Choose V3 on the Wiring page and build again.');
  });

  it('a flash size Hiltwright does not know: stopped, nothing written', async () => {
    const f = world([{ serial: HOTE2, flash: 131072, mode: 'run' }]);
    await installSequence(f.deps, jobFor());
    expect(f.touched()).toEqual([]);
    expect(f.shown().note?.text).toMatch(/^Hiltwright does not recognise this board \(its bootloader reports 128 KB of flash\)\. Nothing was written\./);
  });

  it('a V3 build on the V3: goes ahead, and its board is remembered', async () => {
    const f = world([theV3()], { connectedSerial: V3 });
    await installSequence(f.deps, jobFor({ saber: v3Rec, result: build('V3') }));
    expect(f.calls).toContain(`note s3 ${V3} 524288`);
    expect(f.shown().step).toBe('done');
  });
});

describe('which board (design D4, D6)', () => {
  it('two sabers plugged in: only the connected one is rebooted, checked, backed up and written', async () => {
    const f = world([theV3(), hote2()]);
    await installSequence(f.deps, jobFor());
    expect(f.touched()).toEqual([`backup ${HOTE2}`, `write ${HOTE2}`]);
    expect(f.boards.find((b) => b.serial === V3)!.mode).toBe('run');
  });

  it('another board already in its bootloader while installing the connected saber: the new one is the target', async () => {
    const f = world([theV3('boot'), hote2()]);
    await installSequence(f.deps, jobFor());
    expect(f.touched()).toEqual([`backup ${HOTE2}`, `write ${HOTE2}`]);
  });

  it('two bootloaders appear after one reboot: stopped, nothing read', async () => {
    const f = world([hote2(), { serial: 'OTHER1', flash: 262144, mode: 'run' }]);
    (f.deps.board.rebootToBootloader as ReturnType<typeof vi.fn>).mockImplementation(async () => { for (const b of f.boards) b.mode = 'boot'; return true; });
    await installSequence(f.deps, jobFor());
    expect(f.touched()).toEqual([]);
    expect(f.shown().note?.text).toBe('More than one board is in bootloader mode. Unplug the other Proffieboards, then press Install again.');
  });

  it("this saber's board already in its bootloader, not connected: recognised by its serial, no reboot, no question", async () => {
    const f = world([hote2('boot')]);
    await installSequence(f.deps, jobFor({ connected: false }));
    expect(f.calls).not.toContain('reboot');
    expect(f.deps.confirmTarget).not.toHaveBeenCalled();
    expect(f.touched()).toEqual([`backup ${HOTE2}`, `write ${HOTE2}`]);
    expect(f.calls).toContain(`note s1 ${HOTE2} 262144`);
  });

  it('recognised by the serial its bootloader showed before, when that differs from its running serial', async () => {
    const f = world([{ serial: '206033865232', flash: 262144, mode: 'boot' }]);
    await installSequence(f.deps, jobFor({ connected: false, saber: saberRec({ bootloader: { serial: '206033865232', flashBytes: 262144, board: 'V2', at: '' } }) }));
    expect(f.deps.confirmTarget).not.toHaveBeenCalled();
    expect(f.touched()).toEqual(['backup 206033865232', 'write 206033865232']);
  });

  it("another saber's board in its bootloader: stopped, naming it, nothing read or written", async () => {
    const f = world([theV3('boot')]);
    await installSequence(f.deps, jobFor({ connected: false }));
    expect(f.touched()).toEqual([]);
    expect(f.shown().note?.text).toMatch(/^The board in bootloader mode is The V3, not hote2\. Nothing was written\./);
  });

  it('a board nobody knows: the owner is asked, naming the saber; Cancel touches nothing', async () => {
    const f = world([{ serial: 'NEW123', flash: 262144, mode: 'boot' }], { confirm: false });
    await installSequence(f.deps, jobFor({ connected: false }));
    expect(f.deps.confirmTarget).toHaveBeenCalledWith('hote2');
    expect(f.touched()).toEqual([]);
    expect(f.shown()).toEqual({ step: 'built', note: null });
  });

  it('a board nobody knows, confirmed: installed, but the pairing is not remembered when the saber does not come back as itself', async () => {
    const f = world([{ serial: 'NEW123', flash: 262144, mode: 'boot' }]);
    await installSequence(f.deps, jobFor({ connected: false }));
    expect(f.touched()).toEqual(['backup NEW123', 'write NEW123']);
    expect(f.calls.some((c) => c.startsWith('note'))).toBe(false);
    expect(f.calls).toContain('waitForRuntime null');
  });

  it('a board nobody knows, confirmed, that comes back running as this saber: now the pairing is remembered', async () => {
    const f = world([{ serial: 'BOOT999', flash: 262144, mode: 'boot' }]);
    (f.deps.flash.write as ReturnType<typeof vi.fn>).mockImplementation(async (_p: string, serial?: string | null) => {
      f.calls.push(`write ${serial}`);
      f.boards[0] = { serial: HOTE2, flash: 262144, mode: 'run' };
      return { ok: true, ms: 1, detail: 'wrote' };
    });
    await installSequence(f.deps, jobFor({ connected: false }));
    expect(f.calls).toContain('note s1 BOOT999 262144');
    expect(f.calls).toContain(`connect ${HOTE2}`);
  });

  it('a mistaken confirmation: a V3 board said to be the V2 saber is still refused by its flash size', async () => {
    const f = world([{ serial: 'NEW123', flash: 524288, mode: 'boot' }]);
    await installSequence(f.deps, jobFor({ connected: false }));
    expect(f.touched()).toEqual([]);
    expect(f.shown().note?.text).toMatch(/^This saber is a Proffieboard V3, but this firmware was built for a V2/);
  });

  it('two bootloaders, neither this saber: stopped, nothing read', async () => {
    const f = world([{ serial: 'A1', flash: 262144, mode: 'boot' }, { serial: 'B2', flash: 262144, mode: 'boot' }]);
    await installSequence(f.deps, jobFor({ connected: false }));
    expect(f.touched()).toEqual([]);
    expect(f.shown().note?.text).toBe('More than one board is in bootloader mode. Unplug the other Proffieboards, then press Install again.');
  });

  it('two bootloaders, one of them this saber: that one is written', async () => {
    const f = world([theV3('boot'), hote2('boot')]);
    await installSequence(f.deps, jobFor({ connected: false }));
    expect(f.touched()).toEqual([`backup ${HOTE2}`, `write ${HOTE2}`]);
  });

  it('after the driver step, writing from the bootloader finds the saber by its serial again', async () => {
    const f = world([theV3('run'), hote2('boot')]);
    await writeFromBootloader(f.deps, jobFor());
    expect(f.touched()).toEqual([`backup ${HOTE2}`, `write ${HOTE2}`]);
  });
});

describe('what is recorded (design D5)', () => {
  it('the record after the install is the model the job carries, the one the build was made from', async () => {
    const f = world([hote2()]);
    const builtFrom = { ...model, name: 'hiltwright_built' } as SaberConfigModel;
    await installSequence(f.deps, jobFor({ model: builtFrom }));
    expect(f.deps.board.expectAfterInstall).toHaveBeenCalledWith('s1', 'config/hiltwright_built.h');
    expect(f.deps.board.updateSaber).toHaveBeenCalledWith(expect.objectContaining({ model: expect.objectContaining({ name: 'hiltwright_built' }) }), 's1');
  });
});

describe('putting a backup back', () => {
  const backup = (bytes: number): BackupInfo => ({ file: 'b.bin', at: '2026-09-27T10:00:00.000Z', label: 'before install', bytes, valid: true, configName: 'config/hiltwright_hote2.h' });

  it('a 256 KB backup on a board whose bootloader reports 512 KB: stopped, nothing written', async () => {
    const f = world([theV3()], { connectedSerial: V3 });
    await restoreSequence(f.deps, v3Rec, backup(262144), true);
    expect(f.touched()).toEqual([]);
    expect(f.shown().note?.text).toMatch(/^This backup is from a Proffieboard V2 \(256 KB\); this saber is a Proffieboard V3 \(512 KB\)\. Nothing was written\./);
  });

  it("the saber's own backup goes back to its own board, and it reconnects to it", async () => {
    const f = world([theV3(), hote2()]);
    await restoreSequence(f.deps, saberRec(), backup(262144), true);
    expect(f.touched()).toEqual([`restore ${HOTE2}`]);
    expect(f.calls).toContain(`connect ${HOTE2}`);
    expect(f.shown().step).toBe('done');
  });

  it("another saber's board in its bootloader: a restore is refused like an install", async () => {
    const f = world([theV3('boot')]);
    await restoreSequence(f.deps, saberRec(), backup(262144), false);
    expect(f.touched()).toEqual([]);
    expect(f.shown().note?.text).toMatch(/^The board in bootloader mode is The V3, not hote2\./);
  });
});
