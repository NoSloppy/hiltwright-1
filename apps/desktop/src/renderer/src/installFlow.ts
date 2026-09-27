// The install and restore sequences of Build & Install, as plain functions: the calls to the flasher and the board
// come in as arguments, and every change to the page is a report. Build.tsx wraps them with the real calls and its
// state; tests drive them with fakes.
//
// Which board is written (install-target-safety): a connected saber is rebooted and the one bootloader that appears is
// its own; a board already in its bootloader is used only when its USB serial is this saber's, or the owner says it
// is. The bootloader's flash size must be the build's board. Every refusal comes before anything is read or written.

import type { PresetRecord, SaberConfigModel, VersionInfo } from '@hiltwright/core';
import type { BackupInfo, BuildResult, FlashTarget, HiltwrightApi, SaberPatch, SaberRecord } from '../../shared/api';
import { LEAVE_BOOTLOADER, NO_BOOTLOADER, SEVERAL_BOOTLOADERS, backupSizeMismatch, otherSaber, unknownBoard, wrongBoard } from '../../shared/boards';

export type InstallStep = 'backup' | 'bootloader' | 'driver' | 'writing' | 'verifying' | 'done' | 'failed' | 'built';
export interface InstallNote { tone: 'green' | 'amber' | 'red'; text: string }
/** A change to the page: any of the step, the note (null clears it) and the transfer progress. */
export interface InstallReport { step?: InstallStep; note?: InstallNote | null; xfer?: number }

export interface InstallDeps {
  flash: Pick<HiltwrightApi['flash'], 'usb' | 'waitForBootloader' | 'target' | 'backup' | 'write' | 'restore' | 'waitForRuntime'>;
  snapshots: Pick<HiltwrightApi['snapshots'], 'save'>;
  /** Remember what this saber's bootloader showed (its serial and flash size). */
  noteBootloader: HiltwrightApi['library']['noteBootloader'];
  /** Every saber Hiltwright knows, to name the one a board in its bootloader belongs to. */
  sabers: SaberRecord[];
  /** Ask the owner whether the board in its bootloader, which Hiltwright cannot place, is this saber. */
  confirmTarget: (saberName: string) => Promise<boolean>;
  /** The parts of the board link (board.ts useBoard) the sequences use. Described here so tests need no browser. */
  board: {
    info: { presets: PresetRecord[] } | null;
    send(command: string, opts: { idleMs: number }): Promise<unknown>;
    rebootToBootloader(): Promise<boolean>;
    connect(interactive?: boolean, opts?: { serial?: string | null }): Promise<unknown>;
    expectAfterInstall(id: string, configName: string): void;
    /** Reach only this board next, so another saber plugged in is not opened first when this one comes back. */
    reachNext(serial: string | null, hold?: boolean): Promise<boolean>;
    /** The saber on the other end now: after the reconnect, which one was reached. */
    currentSaber(): SaberRecord | null;
    updateSaber(patch: SaberPatch, id?: string): Promise<unknown>;
  };
  report: (r: InstallReport) => void;
  sleep: (ms: number) => Promise<void>;
}
/**
 * What is being installed: the saber, the model the build was made from, the build, what the saber last reported,
 * and whether it is connected now (a connected saber is rebooted; otherwise a board already in its bootloader is used).
 */
export interface InstallJob { saber: SaberRecord; model: SaberConfigModel | null; result: BuildResult; info: { version: VersionInfo | null } | null; connected?: boolean }

/**
 * The board an install or restore writes to. `observed`: seen appearing after this saber's own reboot. `asked`: the
 * owner said so. `pairable`: asked, and this saber's running serial was not present then, so seeing it appear after
 * the write proves the board was this saber.
 */
interface Target { serial: string | null; observed: boolean; asked: boolean; pairable?: boolean }

/** Shown under a stopped install or restore. */
export const STOPPED_HINT = 'If the saber does not show up after a reboot: hold BOOT, tap RESET, release BOOT, then press Install again. A backup can always be put back from the Backups tab.';

/** A USB serial belongs to a saber when it is the one it runs with, or the one its bootloader showed before. */
const belongsTo = (s: SaberRecord, serial: string | null) => !!serial && (s.identity.usbSerial === serial || s.bootloader?.serial === serial);

const fail = (deps: InstallDeps, text: string, tone: InstallNote['tone'] = 'red') => deps.report({ step: 'failed', note: { tone, text } });

/**
 * Bring this saber to its bootloader and say which board that is. A connected saber is rebooted, and the bootloader
 * that appears is its own. Otherwise one already there is used when its serial is this saber's, refused when it is
 * another saber's, and asked about when it is nobody's. Null: stopped (reported), or waiting on the driver.
 */
async function reachBootloader(deps: InstallDeps, saber: SaberRecord, connected: boolean, before?: () => Promise<void>): Promise<Target | null> {
  const { flash, board } = deps;
  const usb = await flash.usb();
  if (connected) {
    const was = usb.bootloaders.map((b) => b.serial);
    await before?.();
    const touched = await board.rebootToBootloader();
    if (!touched) { fail(deps, 'Could not reboot the saber into bootloader mode. Hold BOOT, tap RESET, release BOOT, then press Install again.'); return null; }
    const boot = await flash.waitForBootloader(20000, was);
    if (boot.serials.length > 1) { fail(deps, SEVERAL_BOOTLOADERS); return null; }
    if (!boot.ok) {
      // The board is there but Windows has no WinUSB driver for it: a one-time step, then the install resumes.
      if (boot.serials.length === 1) { deps.report({ step: 'driver', note: null }); return null; }
      fail(deps, boot.text); return null;
    }
    return { serial: boot.serials[0] ?? null, observed: true, asked: false };
  }
  const boots = usb.bootloaders;
  const mine = boots.filter((b) => belongsTo(saber, b.serial));
  if (mine.length === 1) return { serial: mine[0].serial, observed: false, asked: false };
  if (boots.length === 0) { fail(deps, NO_BOOTLOADER); return null; }
  if (boots.length > 1) { fail(deps, SEVERAL_BOOTLOADERS); return null; }
  const other = deps.sabers.find((s) => s.id !== saber.id && belongsTo(s, boots[0].serial));
  if (other) { fail(deps, `${otherSaber(other.name, saber.name)} ${LEAVE_BOOTLOADER}`); return null; }
  if (!(await deps.confirmTarget(saber.name))) { deps.report({ step: 'built', note: null }); return null; }
  const own = saber.identity.usbSerial;
  return { serial: boots[0].serial, observed: false, asked: true, pairable: !!own && !usb.runtimeSerials.includes(own) };
}

/**
 * The bootloader's flash size must mean a board Hiltwright knows, and, for an install, the build's board. The pairing
 * is remembered when it is certain: seen after this saber's reboot, or recognised by serial; never on the owner's word.
 */
async function checkTarget(deps: InstallDeps, saber: SaberRecord, target: Target, built: 'V2' | 'V3' | null): Promise<FlashTarget | null> {
  const t = await deps.flash.target(target.serial);
  if (!t.found) { fail(deps, NO_BOOTLOADER); return null; }
  if (!t.board) { fail(deps, `${unknownBoard(t.flashBytes)} ${LEAVE_BOOTLOADER}`); return null; }
  // Learnt even when this build is refused: the Wiring page then shows the board the saber really has.
  if (!target.asked && t.flashBytes) { try { await deps.noteBootloader(saber.id, { serial: target.serial, flashBytes: t.flashBytes }); } catch { /* the install goes on; the board is learnt next time */ } }
  if (built && t.board !== built) { fail(deps, `${wrongBoard(t.board, built)} ${LEAVE_BOOTLOADER}`); return null; }
  return t;
}

/**
 * The serial to wait for and reconnect to once the saber is back: its own, or, when never read, the bootloader's (a
 * board keeps its serial). None when the owner only said which saber it was: any board coming back will do.
 */
const runningSerial = (saber: SaberRecord, target: Target) => (target.asked ? null : saber.identity.usbSerial ?? target.serial);

/**
 * From a board sitting in its bootloader with a usable driver: which board, check it, backup, write, wait, reconnect,
 * record. `target` is given when the install sequence rebooted the saber itself.
 */
export async function writeFromBootloader(deps: InstallDeps, job: InstallJob, given?: Target): Promise<void> {
  const { flash, board, report } = deps;
  const { saber, model, result, info } = job;
  if (!result?.ok || !result.dfuPath || !saber) return;
  try {
    const target = given ?? (await reachBootloader(deps, saber, false));
    if (!target) return;
    const checked = await checkTarget(deps, saber, target, result.board);
    if (!checked) return;
    // The board comes back as this saber, reporting this config, whether or not a USB serial can be read.
    if (model) board.expectAfterInstall(saber.id, `config/${model.name}.h`);
    report({ xfer: 0, step: 'backup' });
    const bak = await flash.backup(saber.id, 'before-install', info?.version?.config ?? null, target.serial);
    if (!bak.ok) { report({ step: 'failed', note: { tone: 'red', text: `Backup failed, so nothing was written. ${bak.detail}` } }); return; }
    const serial = runningSerial(saber, target);
    // From here, the saber coming back is the only board the page may open (HW-2026-09-25c).
    if (serial) await board.reachNext(serial);
    report({ xfer: 0, step: 'writing' });
    const w = await flash.write(result.dfuPath, target.serial);
    if (!w.ok) { report({ step: 'failed', note: { tone: 'red', text: `Writing failed. The backup from just now is at ${bak.file}. ${w.detail}` } }); return; }
    report({ step: 'verifying' });
    const back = await flash.waitForRuntime(25000, serial);
    if (!back) { report({ step: 'failed', note: { tone: 'amber', text: 'The firmware was written but the saber has not reappeared yet. Unplug and replug it, then press Connect.' } }); return; }
    // The owner said which saber this was, and its running serial appeared only now: the pairing is certain.
    const own = saber.identity.usbSerial;
    const cameBackAs = target.pairable && own && (await flash.usb()).runtimeSerials.includes(own);
    if (cameBackAs && checked.flashBytes) { try { await deps.noteBootloader(saber.id, { serial: target.serial, flashBytes: checked.flashBytes }); } catch { /* learnt next time */ } }
    await deps.sleep(1500);
    await board.connect(false, { serial: cameBackAs ? own : serial });
    const reached = board.currentSaber();
    report({ step: 'done', note: reached && reached.id !== saber.id
      ? { tone: 'amber', text: `Installed on ${saber.name}. Reconnected to ${reached.name}, which is also plugged in. Backup of the previous firmware: ${bak.file}` }
      : { tone: 'green', text: `Installed. Backup of the previous firmware: ${bak.file}` } });
    // Once installed, the bank's presets are the saber's own; the next draft reads them back from the saber.
    if (model && result.manifest) { const { presetsFrom: _loaded, ...settled } = model; await board.updateSaber({ model: settled, firmware: { ...result.manifest, os: result.os, at: new Date().toISOString() } }, saber.id); }
  } catch (err) {
    report({ step: 'failed', note: { tone: 'red', text: String(err) } });
  }
}

/** The install sequence. The renderer does the reboot because it owns the serial port. */
export async function installSequence(deps: InstallDeps, job: InstallJob): Promise<void> {
  const { board, report } = deps;
  const { saber, model, result } = job;
  if (!result?.ok || !result.dfuPath || !saber) return;
  try {
    // A saber whose board is known from an earlier install is never rebooted for firmware built for the other one.
    if (saber.bootloader && saber.bootloader.board !== result.board) { fail(deps, wrongBoard(saber.bootloader.board, result.board)); return; }
    report({ step: 'bootloader' });
    // Presets loaded from a bank are compiled into this firmware; the saber only adopts compiled presets when it has
    // no presets.ini of its own, so that file goes before the reboot, with a snapshot kept first.
    const clearPresets = async () => {
      if (!model?.presetsFrom || !board.info) return;
      try { await deps.snapshots.save(saber.id, `Before bank "${model.presetsFrom.name}"`, board.info.presets); } catch { /* the snapshot is a courtesy */ }
      await board.send('del presets.ini', { idleMs: 400 });
      await board.send('del presets.tmp', { idleMs: 400 });
    };
    const target = await reachBootloader(deps, saber, !!job.connected, clearPresets);
    if (!target) return;
    await writeFromBootloader(deps, job, target);
  } catch (err) {
    report({ step: 'failed', note: { tone: 'red', text: String(err) } });
  }
}

/** Put a backup back, through the same bootloader sequence and the same checks, plus the backup's size. */
export async function restoreSequence(deps: InstallDeps, saber: SaberRecord, b: BackupInfo, connected: boolean): Promise<void> {
  const { flash, board, report } = deps;
  try {
    report({ step: 'bootloader' });
    const target = await reachBootloader(deps, saber, connected);
    if (!target) return;
    const t = await checkTarget(deps, saber, target, null);
    if (!t) return;
    if (t.flashBytes && b.bytes !== t.flashBytes) { fail(deps, `${backupSizeMismatch(b.bytes, t.flashBytes)} ${LEAVE_BOOTLOADER}`); return; }
    // The restored firmware reports the config it had when this backup was taken; expect the saber back with it.
    if (b.configName) board.expectAfterInstall(saber.id, b.configName);
    const serial = runningSerial(saber, target);
    if (serial) await board.reachNext(serial);
    report({ xfer: 0, step: 'writing' });
    const w = await flash.restore(saber.id, b.file, target.serial);
    if (!w.ok) { report({ step: 'failed', note: { tone: 'red', text: `The backup was not written. ${w.detail}` } }); return; }
    report({ step: 'verifying' });
    const back = await flash.waitForRuntime(25000, serial);
    if (!back) { report({ step: 'failed', note: { tone: 'amber', text: 'The backup was written but the saber has not reappeared yet. Unplug and replug it, then press Connect.' } }); return; }
    await deps.sleep(1500);
    // The restored firmware is not the one Hiltwright built: forget the manifest so looks and colours are not mislabelled.
    await board.updateSaber({ firmware: null }, saber.id);
    await board.connect(false, { serial });
    const reached = board.currentSaber();
    const when = new Date(b.at).toLocaleString();
    report({ step: 'done', note: reached && reached.id !== saber.id
      ? { tone: 'amber', text: `Restored the backup from ${when} on ${saber.name}. Reconnected to ${reached.name}, which is also plugged in.` }
      : { tone: 'green', text: `Restored the backup from ${when}.` } });
  } catch (err) { report({ step: 'failed', note: { tone: 'red', text: String(err) } }); }
}
