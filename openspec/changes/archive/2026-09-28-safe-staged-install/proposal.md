# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-board` (archived as `openspec/changes/archive/2026-09-24-baseline-board/`, design.md Findings table).

## Why

Installing staged presets deletes the saber's `presets.ini` before the reboot, without checking that the delete worked. If the install then fails, the saber is left with no presets file. A board already in its bootloader skips the delete, yet the staged list is still dropped. Either way, an owner can lose presets without being told.

## What Changes

- **The presets are cleared only after the install is checked.**
  - Nothing is removed before the reboot.
  - Once the new firmware is on the saber and checked (`firmware-install`, from `install-safety-nets`), the app snapshots the presets the saber reports, then removes `presets.ini` and `presets.tmp`. It restarts the saber (the ProffieOS `reset` command, available in every build), and reads the presets back.
  - Only when the saber reports the staged presets is the list no longer staged. Otherwise it stays staged, the saber keeps its own presets, and the page says so.
  - This one change answers F31, F32 and FW37 together.
- **F31: the delete is checked.**
  - ProffieOS's `del` prints nothing, whether or not the file went (`ProffieOS.ino`: `LSFS::Remove(e)`, result ignored). So there is no reply to check. The delete is confirmed by what the saber reports after the restart.
  - An install that fails never touches the presets, so there is nothing to put back.
  - "Check again" after the driver step goes through the same code.
- **F32: from a board already in its bootloader,** the staged presets are applied the same way, after the new firmware is up. The staged mark is no longer dropped silently.
- **FW37** (from `baseline-firmware`): cancelling at the Windows driver step leaves the presets untouched, because nothing is removed before the write.
- **Using the staged presets later.** While the saber is connected and its firmware carries the staged presets, the Build page offers "Use the staged presets". That is for when the saber was slow to return, or could not be checked, after an install.
- **Colours chosen with a style for a staged preset** are written only after the staged presets are applied. Otherwise they would land in the saber's old presets, and be removed with them.
- **F47:** the snapshot is labelled "Before install with staged presets", not `Before bank "edits made here"`.

## Non-goals

- The install sequence itself (`firmware-install`, done in `install-target-safety` and `install-safety-nets`).
- Keeping a saber's own presets.ini across an install when nothing is staged. That is today's behaviour, and it is unchanged.
- Presets on sabers whose configs use a save folder per blade layout. Hiltwright's generated configs use none, so presets.ini is at the card's root.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `preset-editing`: "Staged presets replace the saber's at install" changes in four ways:
  - it applies them after the install is checked, and verifies them
  - it covers the bootloader case
  - it offers applying them later
  - it gives the snapshot a plain label

## Impact

- **Code:**
  - `apps/desktop/src/renderer/src/installFlow.ts`: the preset step moves from before the reboot to after the check
  - `board.ts`: a restart, and the presets now on the saber
  - `Build.tsx`: notes, and "Use the staged presets"
  - `pendingColours.ts`: waits while staged
- **Hardware check on the V2.2 hote2:**
  - a staged install from running mode
  - a staged install from a board already in its bootloader
- **On the V3,** on a fresh data folder: a stopped install leaves its presets untouched.
