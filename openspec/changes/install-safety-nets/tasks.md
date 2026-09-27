# Tasks

## 1. Reboot times

- [ ] 1.1 Measure the reboot into the bootloader on the V2.2 hote2 and the V3.9 (design D6), before setting the wait.
  - **Before:** check which boards are connected (PnP `VID_1209&PID_6668`), and ask the owner before rebooting any board.
  - **For each board, twenty times:** send `RebootDFU`, time until its bootloader is present in PnP, then leave with `dfu-util -S <serial> -a 0 -s 0x08000000:4:leave -U <temp>`, and time until it runs again. Nothing is written.
  - **Afterwards:** leave both on their firmware, and confirm with `version`.

  Verify: the minimum, median and maximum for each board are recorded in design.md's Context, and `BOOTLOADER_WAIT_MS` is chosen from them in D6.

## 2. Backups that count

- [ ] 2.1 In `apps/desktop/src/main/flash.ts`:
  - add `imageKind(path, flashBytes)`
  - `backupFlash` returns `kind`; it is `ok` only for `'firmware'`, and deletes an erased read
  - `listBackups` marks `valid` from `imageKind` with the file's size (FST-1)

  `FlashStepResult` gains `kind` in `shared/api.ts`. Verify:
  - `apps/desktop/test/flash.test.ts`: `imageKind` for a firmware, an erased, a short and a garbage image; `backupFlash` for each, with the erased file gone
  - in `backups.test.ts`, the FST-1 expected failure becomes a normal test
  - `npm test`

## 3. The sequences

- [ ] 3.1 In `installFlow.ts`:
  - `stopInBootloader` sends this saber's board back to its firmware and reports the stop (design D2). Use it for every stop before the write, with this saber's board in its bootloader: an unknown size, the wrong board, a failed or unusable backup, and restore's size mismatch or failed backup.
  - Report a saber that ignored the reboot, when its running serial is still present.
  - Set the bootloader wait from 1.1 (`BOOTLOADER_WAIT_MS`).

  Verify in `apps/desktop/test/installFlow.test.ts`:
  - a leave after each of those stops, then a reconnect, with "back on the firmware it had"
  - no leave after a failed write, for another saber's board, or with two bootloaders
  - the RESET words when the leave fails
  - the ignored reboot
- [ ] 3.2 Backups in the sequences (design D1, D4):
  - an erased read goes on, with the note, and an unusable one stops
  - `restoreSequence` backs up first (`'before-restore'`)
  - `restoreFromBootloader` resumes a restore after the driver step

  Verify in `installFlow.test.ts`: erased goes on; unusable stops, with a leave; the restore's backup comes before its write; the restore after the driver is a restore, not an install.
- [ ] 3.3 Record and check (design D3):
  - the record is updated right after a successful write or restore, and a failure to save it becomes a separate amber note
  - after the reconnect, the version and config name are compared with the build ("Installed and checked", a mismatch, nothing read)
  - `InstallReport.notes` carries the second note

  Verify in `installFlow.test.ts`:
  - the record is written before the runtime wait, and kept when the return times out
  - the restore's clear is written before its wait
  - a record failure still says installed, with the warning
  - match, mismatch (another config), and nothing read

## 4. The page and main

- [ ] 4.1 In `Build.tsx`:
  - `paused` remembers whether an install or a restore met the driver step, and "Install the driver" and "Check again" resume that one
  - the second note is rendered
  - after 5 s in the bootloader step, the waiting words are shown
  - add `hiltwrightFlashFault('write' | 'return' | 'record')` for development runs

  Verify with `npm run typecheck`, and in 5.2.
- [ ] 4.2 Main writes only this saber's last build (design D5):
  - `build:run` keeps `lastBuildBySaber`
  - `flash:write(saberId, dfuPath, serial)` checks it through a pure `writeAllowed(...)`, which also checks the saved model's wiring confirmation against the build's layout
  - the page passes the saber id

  Verify in a new `apps/desktop/test/writeGuard.test.ts`: the last build allowed; an older path, another saber's build, no build, unconfirmed wiring and a confirmation for other blades all refused, each with its words. Then `npm run typecheck`.

## 5. Checks

- [ ] 5.1 Run `npm test` and `npm run typecheck`; verify both pass.
- [ ] 5.2 Development run with no board, on a scratch folder with a saber that has a model, using `hiltwrightPretendBuilt` and `hiltwrightFlashFault`. Verify the page's words for:
  - a failed write (names the backup, the board left in bootloader)
  - a slow return (written; the record already updated)
  - a record failure (installed, plus a wrapping amber warning with a long reason)
  - the waiting words after 5 s in the bootloader step
- [ ] 5.3 Hardware check by the owner, from a development build:
  - **V2.2 hote2:** build and install. It finishes "Installed and checked: the saber reports config/hiltwright_hote2.h, v8.10 hiltwright …".
  - **V2.2 hote2:** put the backup from before that install back. The Backups tab then lists a new "before restore" backup, and the saber runs its previous firmware.
  - **V3.9, plugged in alone:** set its Wiring to V2, and try to install. The install stops with the V2-on-V3 words, then the V3 comes back on its firmware by itself, with no RESET.
- [ ] 5.4 After archive, tick roadmap task 3.17 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
