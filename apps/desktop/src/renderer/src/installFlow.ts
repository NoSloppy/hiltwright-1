// The install and restore sequences of Build & Install, as plain functions: the calls to the flasher and the board
// come in as arguments, and every change to the page is a report. Build.tsx wraps them with the real calls and its
// state; tests drive them with fakes. The steps are exactly the ones the page ran before they were moved here.

import type { PresetRecord, SaberConfigModel, VersionInfo } from '@hiltwright/core';
import type { BackupInfo, BuildResult, HiltwrightApi, SaberPatch, SaberRecord } from '../../shared/api';

export type InstallStep = 'backup' | 'bootloader' | 'driver' | 'writing' | 'verifying' | 'done' | 'failed';
export interface InstallNote { tone: 'green' | 'amber' | 'red'; text: string }
/** A change to the page: any of the step, the note (null clears it) and the transfer progress. */
export interface InstallReport { step?: InstallStep; note?: InstallNote | null; xfer?: number }

export interface InstallDeps {
  flash: Pick<HiltwrightApi['flash'], 'usb' | 'waitForBootloader' | 'backup' | 'write' | 'restore' | 'waitForRuntime'>;
  snapshots: Pick<HiltwrightApi['snapshots'], 'save'>;
  /** The parts of the board link (board.ts useBoard) the sequences use. Described here so tests need no browser. */
  board: {
    info: { presets: PresetRecord[] } | null;
    send(command: string, opts: { idleMs: number }): Promise<unknown>;
    rebootToBootloader(): Promise<boolean>;
    connect(interactive?: boolean): Promise<unknown>;
    expectAfterInstall(id: string, configName: string): void;
    updateSaber(patch: SaberPatch, id?: string): Promise<unknown>;
  };
  report: (r: InstallReport) => void;
  sleep: (ms: number) => Promise<void>;
}
/** What is being installed: the saber, the model it was built from, the build, and what the saber last reported. */
export interface InstallJob { saber: SaberRecord; model: SaberConfigModel | null; result: BuildResult; info: { version: VersionInfo | null } | null }

/** Shown under a stopped install or restore. */
export const STOPPED_HINT = 'If the saber does not show up after a reboot: hold BOOT, tap RESET, release BOOT, then press Install again. A backup can always be put back from the Backups tab.';

/** From a board sitting in its bootloader with a usable driver: backup, write, wait, reconnect, record. */
export async function writeFromBootloader(deps: InstallDeps, job: InstallJob): Promise<void> {
  const { flash, board, report } = deps;
  const { saber, model, result, info } = job;
  if (!result?.ok || !result.dfuPath || !saber) return;
  try {
    // The board comes back as this saber, reporting this config, whether or not a USB serial can be read.
    if (model) board.expectAfterInstall(saber.id, `config/${model.name}.h`);
    report({ xfer: 0, step: 'backup' });
    const bak = await flash.backup(saber.id, 'before-install', info?.version?.config ?? null);
    if (!bak.ok) { report({ step: 'failed', note: { tone: 'red', text: `Backup failed, so nothing was written. ${bak.detail}` } }); return; }
    report({ xfer: 0, step: 'writing' });
    const w = await flash.write(result.dfuPath);
    if (!w.ok) { report({ step: 'failed', note: { tone: 'red', text: `Writing failed. The backup from just now is at ${bak.file}. ${w.detail}` } }); return; }
    report({ step: 'verifying' });
    const back = await flash.waitForRuntime(25000);
    if (!back) { report({ step: 'failed', note: { tone: 'amber', text: 'The firmware was written but the saber has not reappeared yet. Unplug and replug it, then press Connect.' } }); return; }
    await deps.sleep(1500);
    await board.connect(false);
    report({ step: 'done', note: { tone: 'green', text: `Installed. Backup of the previous firmware: ${bak.file}` } });
    // Once installed, the bank's presets are the saber's own; the next draft reads them back from the saber.
    if (model && result.manifest) { const { presetsFrom: _loaded, ...settled } = model; await board.updateSaber({ model: settled, firmware: { ...result.manifest, os: result.os, at: new Date().toISOString() } }, saber.id); }
  } catch (err) {
    report({ step: 'failed', note: { tone: 'red', text: String(err) } });
  }
}

/** The install sequence. The renderer does the reboot because it owns the serial port. */
export async function installSequence(deps: InstallDeps, job: InstallJob): Promise<void> {
  const { flash, board, report } = deps;
  const { saber, model, result } = job;
  if (!result?.ok || !result.dfuPath || !saber) return;
  try {
    report({ step: 'bootloader' });
    // A board already sitting in its bootloader (after an earlier failed attempt, or a manual BOOT+RESET) needs no reboot.
    const already = (await flash.usb()).bootloaderPresent;
    if (!already) {
      // Presets loaded from a bank are compiled into this firmware; the saber only adopts compiled presets when it has
      // no presets.ini of its own, so that file goes before the reboot, with a snapshot kept first.
      if (model?.presetsFrom && board.info) {
        try { await deps.snapshots.save(saber.id, `Before bank "${model.presetsFrom.name}"`, board.info.presets); } catch { /* the snapshot is a courtesy */ }
        await board.send('del presets.ini', { idleMs: 400 });
        await board.send('del presets.tmp', { idleMs: 400 });
      }
      const touched = await board.rebootToBootloader();
      if (!touched) { report({ step: 'failed', note: { tone: 'red', text: 'Could not reboot the saber into bootloader mode. Hold BOOT, tap RESET, release BOOT, then press Install again.' } }); return; }
    }
    const boot = await flash.waitForBootloader(20000);
    if (!boot.ok) {
      const usb = await flash.usb();
      // The board is there but Windows has no WinUSB driver for it: a one-time step, then the install resumes.
      if (usb.bootloaderPresent) { report({ step: 'driver', note: null }); return; }
      report({ step: 'failed', note: { tone: 'red', text: boot.text } }); return;
    }
    await writeFromBootloader(deps, job);
  } catch (err) {
    report({ step: 'failed', note: { tone: 'red', text: String(err) } });
  }
}

/** Put a backup back, through the same bootloader sequence. */
export async function restoreSequence(deps: InstallDeps, saberId: string, b: BackupInfo): Promise<void> {
  const { flash, board, report } = deps;
  try {
    report({ step: 'bootloader' });
    if (!(await flash.usb()).bootloaderPresent) {
      const touched = await board.rebootToBootloader();
      if (!touched) { report({ step: 'failed', note: { tone: 'red', text: 'Could not reboot the saber into bootloader mode. Hold BOOT, tap RESET, release BOOT, then try again.' } }); return; }
    }
    // The restored firmware reports the config it had when this backup was taken; expect the saber back with it.
    if (b.configName) board.expectAfterInstall(saberId, b.configName);
    const boot = await flash.waitForBootloader(20000);
    if (!boot.ok) { report({ step: 'failed', note: { tone: 'red', text: boot.text } }); return; }
    report({ xfer: 0, step: 'writing' });
    const w = await flash.restore(saberId, b.file);
    if (!w.ok) { report({ step: 'failed', note: { tone: 'red', text: `The backup was not written. ${w.detail}` } }); return; }
    report({ step: 'verifying' });
    const back = await flash.waitForRuntime(25000);
    if (!back) { report({ step: 'failed', note: { tone: 'amber', text: 'The backup was written but the saber has not reappeared yet. Unplug and replug it, then press Connect.' } }); return; }
    await deps.sleep(1500);
    // The restored firmware is not the one Hiltwright built: forget the manifest so looks and colours are not mislabelled.
    await board.updateSaber({ firmware: null }, saberId);
    await board.connect(false);
    report({ step: 'done', note: { tone: 'green', text: `Restored the backup from ${new Date(b.at).toLocaleString()}.` } });
  } catch (err) { report({ step: 'failed', note: { tone: 'red', text: String(err) } }); }
}
