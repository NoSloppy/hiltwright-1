# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-firmware` (archived as `openspec/changes/archive/2026-09-24-baseline-firmware/`, design.md Findings table).

## Why

The install's normal path works on hote2, but its safety nets are thin:
- A useless backup counts as success.
- A restore overwrites firmware without a backup.
- The saber record can end up wrong after a timeout.
- There is no verify step.

## What Changes

- **FW7: A backup counts only when it is usable.** It must have the right size and look like firmware for this chip.
  - **Owner's decision, 2026-09-27:** an all-erased read (a blank or wiped board, so nothing to lose) lets the install go on, and says there was no previous firmware to keep.
  - Any other unusable read stops the install with nothing written.
- **FW8: Restore is as safe as an install.** Putting a backup back first backs up what is on the board. It handles the Windows driver like an install does, and after the driver it resumes the restore, not an install.
- **FW9: The record is made right, even on a slow return.** The saber record is updated as soon as the write succeeds, not after the saber returns: the firmware record after an install, cleared after a restore. So a slow return no longer leaves it wrong.
- **FW10: Main refuses anything but this saber's last build.** The main process writes only the last successful build made for this saber in this run, from wiring the owner confirmed. It no longer accepts any file in the build folder.
- **FW12: The install is checked.** After a write, the version and config name the saber reports are read back and compared with the build before the page says "Installed". A mismatch, or no reading, is said plainly.
- **FW29: Stuck boards are handled.**
  - A saber that ignores the reboot, and is still running, is reported as such.
  - Any stop before the write sends the saber back to its firmware by itself. That covers a failed backup, a refused board, or an unknown size. It uses the leave step measured in `install-target-safety` 1.1 (a 4-byte read ending in `:leave`, nothing written). Only if that fails is the owner told to press RESET.
  - After a failed write the board stays in its bootloader, so a backup can be put back.
- **HW-2026-09-24b** (hote2): rebooting into the bootloader takes anything from an instant to 30 s or more, and the install waits 20 s, plus 5 s for the driver. Measure the spread on the V2.2 and the V3. Then set the wait, and what the owner is told while waiting, from the measurements.
- **HW-2026-09-24c** (hote2): when saving the saber record fails after a successful install, the page shows "Stopped" with a red error, although the firmware is installed, and the long error text is clipped instead of wrapping. The page will say the install succeeded, and report the record problem separately, in words that fit.
- **FST-1** (from `firmware-side-test-coverage`, beside FW7): the Backups tab marks a backup of the wrong size as usable, because `listBackups` checks only the image's first bytes. The spec lists a wrong-size file as not usable. Putting it back is refused, but only after the owner has pressed Restore. Pinned by the expected failure "5.15 a wrong-size read is listed as not a usable image" in `apps/desktop/test/backups.test.ts`.

## Non-goals

- Which board is the target (`install-target-safety`, archived).
- Staged presets during an install (`safe-staged-install`).
- Reading the whole flash back after a write to compare it byte for byte. The version and config check (FW12) is the verify step. A full read-back doubles the install time.
- Recovering a board whose bootloader itself is damaged. The ST bootloader is in ROM and cannot be overwritten by an install.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `firmware-install`: the requirements on:
  - only Hiltwright's build being written
  - backup validity
  - the bootloader wait
  - the driver step for restores
  - writing, checking and recording
  - stopping safely, and putting a backup back
  - the words after a refusal

## Impact

- **Code:**
  - `apps/desktop/src/main/{flash,ipc}.ts`
  - `apps/desktop/src/renderer/src/{installFlow.ts,Build.tsx}`
  - `apps/desktop/src/shared/boards.ts`
- **Hardware:**
  - measure the reboot times on the V2.2 hote2 and the V3.9
  - an owner check of a normal install, a restore with its backup first, and the verify step
  - a failed write and a slow return, both forced through development aids

  Real failures are not induced.
