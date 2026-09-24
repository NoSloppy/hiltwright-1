# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-firmware` (archived as `openspec/changes/archive/2026-09-24-baseline-firmware/`, design.md Findings table).

## Why

The install's normal path works on hote2, but its safety nets are thin. A useless backup counts as success, a restore overwrites firmware without a backup, the saber record can end up wrong after a timeout, and there is no verify step.

## What Changes

- **FW7:** A backup counts as successful only if it has the right size and looks like firmware for this chip. Otherwise nothing is written.
- **FW8:** Putting a backup back first backs up what is on the board, and handles the Windows driver like an install does.
- **FW9:** When the saber is slow to return, the saber record is still made right (firmware record stored after an install, cleared after a restore), or the owner is told what to check.
- **FW10:** The main process refuses to write firmware that is not the current build for this saber, not only a file outside the toolchain folder.
- **FW12:** After a write, read back the version and config name and compare them with the build before saying "Installed".
- **FW29:** A board that ignores the reboot is reported as such. After a failed backup, the owner is told how to get the board out of its bootloader.

## Non-goals

- Which board is the target (`install-target-safety`).
- Staged presets during an install (`safe-staged-install`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `firmware-install`: requirements on backup validity, restore safety, verification after write, and failure messages.

## Impact

`apps/desktop/src/main/{flash,ipc}.ts`, `apps/desktop/src/renderer/src/{Build.tsx,board.ts}`. Hardware check on V2.2 and V3, including a forced write failure and a slow return.
