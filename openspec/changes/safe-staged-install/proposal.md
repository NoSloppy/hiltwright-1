# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-board` (archived as `openspec/changes/archive/2026-09-24-baseline-board/`, design.md Findings table).

## Why

Installing staged presets deletes the saber's `presets.ini` before the reboot without checking that the delete worked. If the install then fails, the saber is left with no presets file. A board already in its bootloader skips the delete, yet the staged list is still dropped. Either way, an owner can lose presets without being told.

## What Changes

- **F31:** Check the replies to the `presets.ini` and `presets.tmp` deletes. Refuse to reboot if they fail. If the write fails after the delete, offer to put the snapshot back. Make the "Check again" path clear the presets too.
- **F32:** For a board already in its bootloader, either clear the presets after the new firmware boots, or keep the list staged and tell the owner what happened.
- **F47:** Label the pre-install snapshot plainly ("Before install with staged presets"), not `Before bank "edits made here"`.
- **FW37** (from `baseline-firmware`): Cancelling at the Windows driver step must not leave the saber in its bootloader with its presets already deleted. Clear the presets as late as possible, or put them back on cancel.

## Non-goals

- The install sequence beyond the preset steps (belongs to `firmware-install`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `preset-editing`: "Staged presets replace the saber's at install" gains failure handling and the bootloader case.

## Impact

`apps/desktop/src/renderer/src/Build.tsx`, `board.ts`. Hardware check on V2.2 and V3: staged install from running mode, from the bootloader, and with a forced write failure.
