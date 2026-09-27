# Tasks

## 1. Reboot times

- [x] 1.1 Measure the reboot into the bootloader on the V2.2 hote2 and the V3.9 (design D6), before setting the wait.
  - **Before:** check which boards are connected (PnP `VID_1209&PID_6668`), and ask the owner before rebooting any board.
  - **For each board, twenty times:** send `RebootDFU`, time until its bootloader is present in PnP, then leave with `dfu-util -S <serial> -a 0 -s 0x08000000:4:leave -U <temp>`, and time until it runs again. Nothing is written.
  - **Afterwards:** leave both on their firmware, and confirm with `version`.

  Verify: the minimum, median and maximum for each board are recorded in design.md's Context, and `BOOTLOADER_WAIT_MS` is chosen from them in D6.
  - **Result, 2026-09-27.** The owner allowed the reboots, and plugged hote2 in beside the V3. There were no writes, and no app running.
    - **Reboot times:** hote2 reached its bootloader in 0.66–1.43 s (median 1.02). The V3 took 0.65–16.0 s (median 0.9), and its 16 s was its first round.
    - **Back running:** 1.0–2.4 s on both.
    - **Answering `version`:** a median of about 3 s. hote2 twice took 22–24 s.
    - **No USB serial:** twice in twenty, the V3 came back running with no USB serial (a Windows-made id on a new COM port). A replug restored it, and the owner replugged it once midway.

    Recorded in design.md's Context, with these changes:
    - `BOOTLOADER_WAIT_MS` is 45 s (D6: the rule gives 35 s, raised to cover the owner's 30 s+ report).
    - The runtime wait stays at 25 s.
    - The check after an install gets one more try 10 s later.
    - **Added at the owner's choice:** D8, a saber coming back without its serial counts as back. It is `runtimeNoSerial` with `backAfter` in main, plus a spec scenario. It is tested in `flash.test.ts` using the V3's real instance id.
    - Both boards were left running, answering `version`. The V3 came back without its serial on the last round, and needs replugging before 5.3.

## 2. Backups that count

- [x] 2.1 In `apps/desktop/src/main/flash.ts`:
  - add `imageKind(path, flashBytes)`
  - `backupFlash` returns `kind`; it is `ok` only for `'firmware'`, and deletes an erased read
  - `listBackups` marks `valid` from `imageKind` with the file's size (FST-1)

  `FlashStepResult` gains `kind` in `shared/api.ts`. Verify:
  - `apps/desktop/test/flash.test.ts`: `imageKind` for a firmware, an erased, a short and a garbage image; `backupFlash` for each, with the erased file gone
  - in `backups.test.ts`, the FST-1 expected failure becomes a normal test
  - `npm test`
  - **Result, 2026-09-27.**
    - **`imageKind(path, flashBytes)`** in `flash.ts` returns:
      - `'firmware'`: exactly the flash size, and starts like firmware
      - `'erased'`: exactly the flash size, all `0xFF`
      - `'unusable'`: anything else, or unreadable
    - **`backupFlash`** returns `kind`, and is `ok` only for firmware. An erased read deletes its file, and says "The board had no firmware on it (its flash is erased), so there was nothing to back up." An unusable read keeps its file, and says "The read was not usable firmware (it may be short, protected, or damaged)."
    - **`listBackups`** marks `valid` only for 256 KB or 512 KB files that read as firmware (FST-1).
    - **`FlashStepResult.kind`** is added in `shared/api.ts`.

    Verified:
    - The fake dfu-util in `apps/desktop/test/flash.test.ts` now returns an image of the size asked for.
    - Four new tests pass: the kinds (including the other board's size, and a missing file); firmware kept with its config; erased not kept; garbage and short kept but listed unusable.
    - FST-1 in `backups.test.ts` is a normal test and passes.
    - Desktop tests pass.

## 3. The sequences

- [x] 3.1 In `installFlow.ts`:
  - `stopInBootloader` sends this saber's board back to its firmware and reports the stop (design D2). Use it for every stop before the write, with this saber's board in its bootloader: an unknown size, the wrong board, a failed or unusable backup, and restore's size mismatch or failed backup.
  - Report a saber that ignored the reboot, when its running serial is still present.
  - Set the bootloader wait from 1.1 (`BOOTLOADER_WAIT_MS`).

  Verify in `apps/desktop/test/installFlow.test.ts`:
  - a leave after each of those stops, then a reconnect, with "back on the firmware it had"
  - no leave after a failed write, for another saber's board, or with two bootloaders
  - the RESET words when the leave fails
  - the ignored reboot
  - **Result, 2026-09-27.** `installFlow.ts`:
    - **`stopInBootloader`:** leaves the bootloader, waits for this saber, and reconnects. It then reports the stop with "The saber is back on the firmware it had.", or with the RESET words if that failed. It is used for:
      - an unknown size and the wrong board (in `checkTarget`)
      - a failed or unusable backup, in the install and before a restore
      - restore's size mismatch
    - **Not used:** after a failed write, for another saber's board, or with two bootloaders.
    - **An ignored reboot:** when no bootloader appears and this saber's running serial is still present, the page says `IGNORED_REBOOT`.
    - **The waits:** `BOOTLOADER_WAIT_MS` (45 s, from 1.1) is used by install, restore and `checkBoard`, and `RUNTIME_WAIT_MS` (25 s) by every return wait.
    - **The words** are in `shared/boards.ts`.

    Verified by new tests in `installFlow.test.ts`:
    - a failed backup: leave, hold, wait, reconnect, and the words
    - the RESET words when the leave fails
    - no leave after a failed write
    - another saber's board and two bootloaders left alone
    - the ignored reboot

    The V2-on-V3 test now expects the leave and "back on the firmware".
- [x] 3.2 Backups in the sequences (design D1, D4):
  - an erased read goes on, with the note, and an unusable one stops
  - `restoreSequence` backs up first (`'before-restore'`)
  - `restoreFromBootloader` resumes a restore after the driver step

  Verify in `installFlow.test.ts`: erased goes on; unusable stops, with a leave; the restore's backup comes before its write; the restore after the driver is a restore, not an install.
  - **Result, 2026-09-27.**
    - **`takeBackup`:** a firmware read is the backup. An erased read goes on, with the note "The board had no firmware on it, so there was nothing to back up." Anything else stops through `stopInBootloader`.
    - **`restoreSequence`:** backs up first (`'before-restore'`, with the saber's reported config), and stops, with a leave, if that backup fails.
    - **With `connected: false`,** it restores from a board already in its bootloader. That is what the driver step resumes (4.1).

    Verified by new tests in `installFlow.test.ts`:
    - erased goes on, with no backup named and the note
    - unusable stops, with a leave
    - the restore's backup, with its label, comes before its write
    - a failed pre-restore backup puts nothing back
    - a restore from a board in its bootloader is a restore, with no write
- [x] 3.3 Record and check (design D3):
  - the record is updated right after a successful write or restore, and a failure to save it becomes a separate amber note
  - after the reconnect, the version and config name are compared with the build ("Installed and checked", a mismatch, nothing read)
  - `InstallReport.notes` carries the second note

  Verify in `installFlow.test.ts`:
  - the record is written before the runtime wait, and kept when the return times out
  - the restore's clear is written before its wait
  - a record failure still says installed, with the warning
  - match, mismatch (another config), and nothing read
  - **Result, 2026-09-27.**
    - **The record:**
      - It is updated right after a successful write: the model and firmware record, with the staged mark cleared.
      - After a restore, it is cleared right after the write.
      - A failure to save it becomes a separate amber note ("Installed, but Hiltwright could not update its record of the saber: …"), carried in `InstallReport.notes`, and the install still ends "done".
    - **The check:** `checkBack` compares the saber read after the reconnect with the build. It counts only a reading whose `lastSeen` is after the write, and compares the config name and the `<os> hiltwright` stamp:
      - a match reads "Installed and checked: the saber reports …"
      - a mismatch is amber, with what it reports and the backup
      - nothing read is amber, "could not be read to check it"
      - a restore compares the backup's recorded config
    - **One more try:** a failed reading is retried once after 10 s (from 1.1).

    Verified by new tests in `installFlow.test.ts`:
    - the restore clears before its wait
    - a record failure is a separate warning, with the IPC prefix stripped
    - a mismatched config, and a missing stamp
    - nothing read, and a stale reading ignored
    - the retry succeeding
    - the restore check, matching and mismatched

    The audit tests expect the record before the wait, and "Installed and checked". 52 tests pass in the file.

## 4. The page and main

- [x] 4.1 In `Build.tsx`:
  - `paused` remembers whether an install or a restore met the driver step, and "Install the driver" and "Check again" resume that one
  - the second note is rendered
  - after 5 s in the bootloader step, the waiting words are shown
  - add `hiltwrightFlashFault('write' | 'return' | 'record')` for development runs

  Verify with `npm run typecheck`, and in 5.2.
  - **Result, 2026-09-27.** `Build.tsx`:
    - **`paused`** records whether an install or a restore met the driver step. "Install the driver" and "Check again" call `resumeAfterDriver`, which runs a restore with `restoreSequence(..., false)`, or an install with `writeFromBootloader`.
    - **Restores** have a backup phase in the bar now.
    - **`notes`** are shown under the main note.
    - **Waiting:** the timer also runs during the bootloader and return waits. After 5 s in the bootloader step, "Still waiting for the saber to restart in bootloader mode. This can take up to 45 seconds." appears.
    - **Changed from the task:** in place of `hiltwrightFlashFault`, `hiltwrightPretendInstall(fault?)` runs the real `installSequence` against pretend flash and board calls (`'write' | 'return' | 'record' | 'slow'`). With no board, a fault switch alone would never get past the reboot. The pretend build now carries an OS tag and a manifest.

    The type check is clean. See 5.2.
- [x] 4.2 Main writes only this saber's last build (design D5):
  - `build:run` keeps `lastBuildBySaber`
  - `flash:write(saberId, dfuPath, serial)` checks it through a pure `writeAllowed(...)`, which also checks the saved model's wiring confirmation against the build's layout
  - the page passes the saber id

  Verify in a new `apps/desktop/test/writeGuard.test.ts`: the last build allowed; an older path, another saber's build, no build, unconfirmed wiring and a confirmation for other blades all refused, each with its words. Then `npm run typecheck`.
  - **Result, 2026-09-27.**
    - **The guard:** the new `apps/desktop/src/main/writeGuard.ts` has `writeAllowed(lastBuild, savedModel, dfuPath)`. It allows only this saber's last build (paths compared resolved and case-folded), with the saved model's wiring confirmed for exactly that build's board and blades (`wiringFingerprint`).
    - **What `build:run` keeps:** `lastBuildBySaber` per saber, set on every successful build.
    - **The write:** `flash:write(saberId, dfuPath, serial)` reads the saber's saved model from the library. It returns `{ ok: false, refused: true, detail }` when the guard refuses.
    - **Added beyond the task:** the flow treats `refused` as a stop before the write. It sends the board back with main's words, and leaves the record alone. `FlashStepResult.refused` and the saber id are added in `shared/api.ts` and the preload.

    Verified:
    - `apps/desktop/test/writeGuard.test.ts`, four tests:
      - allowed, with the path spelled differently
      - an older build refused, and no build refused
      - unconfirmed wiring, no saved model, other blades and another board refused
      - the words
    - `installFlow.test.ts`: main's refusal sends the board back, with no record written.
    - The type check is clean, and 357 desktop tests pass.

## 5. Checks

- [x] 5.1 Run `npm test` and `npm run typecheck`; verify both pass.
  - **Result, 2026-09-27.** From the repository root: `npm test` passes 204 core tests and 357 desktop tests (13 gated skipped), and `npm run typecheck` is clean in both workspaces.
- [x] 5.2 Development run with no board, on a scratch folder with a saber that has a model, using `hiltwrightPretendBuilt` and `hiltwrightFlashFault`. Verify the page's words for:
  - a failed write (names the backup, the board left in bootloader)
  - a slow return (written; the record already updated)
  - a record failure (installed, plus a wrapping amber warning with a long reason)
  - the waiting words after 5 s in the bootloader step
  - **Result, 2026-09-27.** Scratch folder with a saber that has a model, no board, `fake:build`, `hiltwrightPretendBuilt(true)`, then `hiltwrightPretendInstall` with each fault. Every note stayed within the rail (checked by its width):
    - **Normal:** "Installed", with the green "Installed and checked: the saber reports config/hiltwright_fresh_v3.h, v8.10 hiltwright pretend. Backup of the previous firmware: C:\…\before-install.bin".
    - **Write:** "Stopped", with the red "Writing failed. The backup from just now is at C:\…\before-install.bin. dfu-util: Error during download (pretend)", and Save diagnostics.
    - **Return:** "Stopped", with the amber "The firmware was written but the saber has not reappeared yet. Unplug and replug it, then press Connect." The record was already written before the wait, as `installFlow.test.ts` shows.
    - **Record:** "Installed", with the green check note, plus a separate amber "Installed, but Hiltwright could not update its record of the saber: EPERM: operation not permitted, rename 'C:\…\library.json.tmp' -> 'C:\…\library.json'", wrapped within the rail.
    - **Slow:** after 6 s in the bootloader step, "Still waiting for the saber to restart in bootloader mode. This can take up to 45 seconds."

    A first run showed "undefined hiltwright" and no record warning. Both came from the pretend build lacking an OS tag and a manifest, and were fixed in the development aid.
- [ ] 5.3 Hardware check by the owner, from a development build:
  - **V2.2 hote2:** build and install. It finishes "Installed and checked: the saber reports config/hiltwright_hote2.h, v8.10 hiltwright …".
  - **V2.2 hote2:** put the backup from before that install back. The Backups tab then lists a new "before restore" backup, and the saber runs its previous firmware.
  - **V3.9, plugged in alone, on a fresh scratch data folder** (the owner's library already knows it is a V3, so a V2 build is refused before any reboot): choose V2, confirm, build and install. The install stops at the bootloader with the V2-on-V3 words, then the V3 comes back on its firmware by itself, with no RESET. Run by me with the owner's go-ahead, or by the owner with `HILTWRIGHT_USER_DATA`.
- [ ] 5.4 After archive, tick roadmap task 3.17 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
