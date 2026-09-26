# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-board` (archived as `openspec/changes/archive/2026-09-24-baseline-board/`, design.md Findings table).

## Why

The saber library is the owner's record of every saber, and its build model, snapshots and firmware record. Several paths can lose or misfile that record. Installers, who are Beta 1 testers, are the most likely to have several boards plugged in.

## What Changes

- **F14:** Never overwrite a library file that could not be read. Keep it aside, tell the owner, and start from a safe state.
- **F15:** Without a USB serial (for example, two boards plugged in), do not create a duplicate record on reflash. Write the install's firmware record to the saber that was being worked on.
- **F16:** Offer adoption only to a saber without a saved build model, or warn before replacing one.
- **F17:** "New saber" while a saber is plugged in makes that plan's steps reachable, or explains why the plugged-in saber stays the working one.
- **FW26** (from `baseline-firmware`): Before adoption replaces a saber's compiled styles with Hiltwright's, tell the owner. That includes presets whose styles will point elsewhere.
- **Shared safe store** (roadmap design D8): build F14's fix as one safe store (write via a temporary file, keep the last good copy, set a damaged file aside and report it) that `font-library-integrity`, `style-save-integrity` and `contributors-integrity` reuse, and use it for the preset-sets store too, which has the same flaw but was never flagged.
- **HW-2026-09-24a** (seen on hote2 during `wiring-confirmation-gate` 5.3): two library writes at the same moment collide. The temporary file is named after the process, so the second rename fails with ENOENT (`library.json.<pid>.tmp`), and that write is lost; the install's firmware record won the race. The shared safe store must queue writes and give each one its own temporary file.
- **BST-1** (from `board-side-test-coverage`): a store whose records have the wrong shape (valid JSON, records missing fields) makes the library throw on listing and on the next connect, instead of reading as no sabers. It is pinned by the expected-failure test "1.2 a store whose records have the wrong shape reads as no sabers" in `apps/desktop/test/library.test.ts`. Make it a normal test when fixed.

## Non-goals

- Pruning snapshots and backups, or removing real sabers (F22, `board-side-later`).
- Which saber the demo room shows (F21, `board-side-polish`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `saber-library`: add requirements that an unreadable store is preserved, that a record matches across reflash when two boards are present, that the firmware record goes to the saber installed, and that adoption protects an existing model.

## Impact

`apps/desktop/src/main/library.ts`, `usb.ts`, `ipc.ts`, `renderer/src/{App,Build,workspace}.tsx|ts`. Hardware check: two boards plugged in on V2.2 + V3.
