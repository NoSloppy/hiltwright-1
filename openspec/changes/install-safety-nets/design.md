# Design

## Context

See proposal.md for why. What the code does now, after `install-target-safety`:

- **The backup.** `backupFlash` in `apps/desktop/src/main/flash.ts` returns `ok` when dfu-util exits 0 and the file is not empty.
  - `looksLikeFirmware` (stack pointer `0x20…`, reset vector `0x08…`) is used only by `listBackups` and `restoreBackup`.
  - `listBackups` marks `valid` by the first 8 bytes alone (FST-1). `restoreBackup` checks the size, but only when Restore is pressed.
- **The sequences** live in `apps/desktop/src/renderer/src/installFlow.ts`:
  - `reachBootloader`: reboot and wait (`waitForBootloader(20000, before)`), or recognise a board already in its bootloader.
  - `checkTarget`: the board type.
  - `writeFromBootloader`: backup, write, `waitForRuntime(25000)`, reconnect, then `board.updateSaber(...)` with the firmware record.
  - `restoreSequence`: no backup first, and the record is cleared only after the saber returns.
  - Any throw, including one from `updateSaber`, ends in `{ step: 'failed' }` (HW-2026-09-24c).
- **The driver step.** `reachBootloader` reports `step: 'driver'`. `Build.tsx` then resumes with `writeFromBootloader()`, an install, from both "Install the driver" and "Check again", even when a restore was paused (FW8).
- **Main's write check.** `flash:write` in `ipc.ts` checks only that the path is under `userBuildRoot()` (FW10). `build:run` already keeps `lastBuild` for diagnostics, but not per saber, and without the path.
- **Leaving the bootloader.** `leaveBootloader(root, serial)` exists (`install-target-safety` D8), and `checkBoard` uses it. After a refusal or a failed backup, the flows only tell the owner to press RESET.
- **The reconnect.** `board.currentSaber()` returns the record read after the reconnect, with `identity.configName` and `identity.version`. A Hiltwright build reports `v8.10 hiltwright <sha>` (`firmware-build`) and `config/<model.name>.h`.
- **Reboot time.** From 1.1 of `install-target-safety`: "after 3 s" on both boards. From 2026-09-24 on hote2: anything up to 30 s or more (HW-2026-09-24b).

## Goals / Non-Goals

**Goals:**
- No install or restore ends with the board stuck in its bootloader when nothing was written.
- No install ends with a record that disagrees with the board.
- Every result the page shows is backed by something read from the board.

**Non-Goals:**
- A byte-for-byte read-back after the write (see proposal).
- New refusal rules for which board (`install-target-safety`).

## Decisions

### D1. What kind of image a backup read is
`imageKind(path, flashBytes)` in `flash.ts` returns one of three kinds:
- **`'firmware'`:** the full size, and `looksLikeFirmware`.
- **`'erased'`:** the full size, and every byte `0xFF`.
- **`'unusable'`:** anything else.

`backupFlash` returns it as `kind` on `FlashStepResult`:
- **`ok`** only for `'firmware'`.
- **`'erased'`:** the file is deleted, and `ok` is false.
- **`'unusable'`:** the file is kept, and the Backups tab lists it as unusable.

The install flow goes on after `'erased'`, and notes "The board had no firmware on it, so there was nothing to back up." It stops on `'unusable'` or a failed read: "Backup failed, so nothing was written. The read was not usable firmware.", or dfu-util's own words.

`listBackups` sets `valid` from `imageKind(path, size)` with the size being 262144 or 524288, which fixes FST-1.

**Rejected:**
- *Going on after any read with an explicit "install without a backup".* The owner chose to allow only the erased case.
- *Keeping an erased read as a backup.* Putting it back would erase the saber.

### D2. Sending the board back after a stop (FW29)
`stopInBootloader(deps, target, text)` is a new helper in `installFlow.ts`:
- For a target that is this saber's, it calls `flash.leave(serial)`. It then waits for this saber (`waitForRuntime`), reconnects, and reports the stop with "The saber is back on the firmware it had."
- If the leave fails, or the saber does not come back, it reports the stop with `LEAVE_BOOTLOADER`.

**Where it is used:** after every refusal or failure that happens with this saber's board in its bootloader, and before the write:
- an unknown size
- the wrong board type
- a failed or unusable backup
- restore: the size mismatch, or a failed pre-restore backup

**Where it is not used:**
- a board recognised as another saber: it is not ours to move
- two bootloaders: which one is unknown
- the driver step: dfu-util cannot reach it without WinUSB
- a failed write

**A saber that ignores the reboot:** when `waitForBootloader` ends with no new bootloader, the flow reads `flash.usb()`. If this saber's running serial is still there, it says: "The saber did not restart into bootloader mode; it is still running its firmware. Hold BOOT, tap RESET, release BOOT, then press Install again." The "could not reboot" words stay for a reboot that throws.

**Rejected:**
- *Always leaving it to the owner.* It is reliable to do (1.1), and a board stuck in its bootloader looks dead to the owner.
- *Leaving after a failed write.* The image is partial, so the board would start broken firmware. In the bootloader, a backup can still be put back.

### D3. Record at the write, check after the return (FW9, FW12, HW-2026-09-24c)
**When the record is written:**
- In `writeFromBootloader`, right after `flash.write` succeeds, the flow calls `board.updateSaber({ model, firmware })` inside its own try.
- `restoreSequence` clears the firmware record right after `flash.restore` succeeds.
- A record failure is kept as `recordProblem`, and never ends the sequence. The final note is then the install's own result, followed by a separate amber note: "Installed, but Hiltwright could not update its record of the saber: <reason>." The page's notes already wrap (`.note>span`, `connection-robustness`); 5.2 checks a long reason.

**The check**, after `board.connect`, from `board.currentSaber()`:
- **Match:** the saber reached is this saber, `identity.configName === config/<model.name>.h`, and `identity.version` starts with `<result.os> hiltwright`. The note reads "Installed and checked: the saber reports <config>, <version>. Backup of the previous firmware: <file>."
- **Mismatch:** amber. "The firmware was written, but the saber reports <config>, <version> instead of <expected>. If it misbehaves, put the backup from just now back from the Backups tab."
- **Nothing read:** no saber reached, or another one. Amber: "The firmware was written, but the saber could not be read to check it. …" The reconnect-to-another-saber words stay.
- **For a restore:** the check compares `configName` with the backup's recorded `configName`, when there is one.

`InstallReport.notes?` lets a second note (the record problem) follow the main one. `Build.tsx` renders both.

**Rejected:**
- *Checking the version string only.* A cached build of another saber would pass.
- *Failing the install on a mismatch.* The firmware is on the board either way. The owner needs to know, and to have the backup to hand.

### D4. Restore backs up first, and resumes itself after the driver (FW8)
**Backing up first:** `restoreSequence` runs `flash.backup(saber.id, 'before-restore', <config reported>, serial)` after the target checks and before `flash.restore`, with D1's rules. `'erased'` goes on, and anything else stops through D2.

**Resuming after the driver:** `Build.tsx` keeps `paused: { kind: 'install' } | { kind: 'restore'; backup: BackupInfo } | null`, set when a sequence reports `step: 'driver'`. "Install the driver" and "Check again" resume by its kind:
- an install resumes with `writeFromBootloader`
- a restore resumes with `restoreFromBootloader`, which is `restoreSequence` without the reboot, the board already in its bootloader

**Rejected:**
- *Leaving restores without the driver step.* On a new computer, restoring is how a broken install is undone. It must work there first.

### D5. Main writes only this saber's last build (FW10)
**What `build:run` keeps:** `lastBuildBySaber: Map<saberId, { dfuPath, layout }>` on success. `layout` is `wiringFingerprint(model.board, model.blades)`.

**What `flash:write(saberId, dfuPath, serial)` checks,** in main (the page passes the saber id):
1. `dfuPath` is under `userBuildRoot()` (kept).
2. It equals `lastBuildBySaber.get(saberId).dfuPath`. Otherwise: "This is not the build just made for this saber. Build again, then install."
3. The saber's saved model, read from the library in main, is `wiringConfirmed`, and its confirmation's layout equals the build's `layout`. Otherwise: "The wiring this build was made from has not been confirmed. Confirm it on the Wiring page, then install."

The map lives only for the run, like the page's build (`firmware-install`: "a build in this session").

**Rejected:**
- *Recomputing the config hash from the saved model in main.* The page's model takes its presets from the saber, not the saved record, so a correct install would be refused.
- *Trusting a confirmation flag passed by the page.* That is the gap FW10 describes.

### D6. The bootloader wait, from measurements (HW-2026-09-24b)
**Measuring (1.1):** twenty reboots each on hote2 and the V3. Each is the ProffieOS reboot command, then the time until the bootloader is present, then a leave. The results are recorded in this design.

**The wait:** `BOOTLOADER_WAIT_MS` in `installFlow.ts` is set to about twice the slowest measured, rounded up to 5 s, and at least 30 s. It is used by install, restore and `checkBoard`.

**What the page says:** after 5 s in the `bootloader` step, "Still waiting for the saber to restart in bootloader mode. This can take up to <n> seconds."

**Rejected:**
- *A fixed longer wait without measuring.* The finding asks for the spread, and the wait decides how long a real failure takes to report.

### D7. Checks
**Unit tests:**
- `apps/desktop/test/flash.test.ts`: `imageKind` for firmware, erased, short and garbage images; `backupFlash`'s `kind`; the erased file deleted
- `backups.test.ts`: FST-1 becomes a normal test
- `installFlow.test.ts`:
  - D1: erased goes on, unusable stops
  - D2: the leave after each stop, not after a write failure or for another saber, the RESET words when the leave fails, and the ignored reboot
  - D3: the record before the wait, the record failure as a separate note, match, mismatch and nothing read
  - D4: backup before restore, and the restore resuming after the driver
- a new `apps/desktop/test/writeGuard.test.ts`, for D5 as a pure function `writeAllowed(lastBuild, savedModel, saberId, dfuPath)`

**Development aids,** development builds only:
- `hiltwrightFlashFault('write' | 'return' | 'record')` makes the next install's write fail, its return time out, or its record save throw, without touching dfu-util.
- These let 5.2 show the words, with no board.

**Hardware,** by the owner: a normal install shows "Installed and checked"; a restore takes its backup first; a slow reboot shows the waiting words.

## Risks / Trade-offs

- **[A version string that is not `v8.10 hiltwright …` on a correct install]** → For example a future ProffieOS tag. The check uses the build's own `os` value, and a mismatch only warns, never fails.
- **[An all-`0xFF` read from a board that is read-protected rather than blank]** → On STM32L4, a read of a protected board fails in dfu-util rather than returning `0xFF`, so a protected board stops. The erased rule applies only to a read that succeeded.
- **[The leave after a stop reaching the wrong board]** → It uses the target's serial only (`-S`). It is never used for a board recognised as another saber, or when two bootloaders are present.
- **[Main's map lost when the app restarts]** → The page's build is lost too (`firmware-install`: "a build in this session"). The owner builds again, from the cache.
