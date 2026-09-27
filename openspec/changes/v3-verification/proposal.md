# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-board` (archived as `openspec/changes/archive/2026-09-24-baseline-board/`, design.md Findings table).

## Why

Beta 1 promises Proffieboard V3 support, and nothing has ever been compiled for, flashed to or run on a V3. The owner has one.

## What Changes

- The roadmap's V3 sequence: compile, flash budget on the V3 scale, backup, DFU, write, reconnect, a live preset edit, restore.
- Every scenario marked *Needs a real board* in the archived specs, run on the V3: 23 from `baseline-board`, plus its OS 8 framing scenarios 3.10 and 3.13, which are tested and were run on the V2.2 but never on a V3:
  - board-connection 3.1, 3.2, 3.7, 3.10, 3.13, 3.15, 3.17, 3.18
  - saber-library 1.3, 1.8, 1.16, 1.19
  - diagnostics 4.1, 4.3, 4.6
  - preset-editing 6.1, 6.4, 6.5, 6.7, 6.9, 6.10, 6.12, 6.13, 6.15, 6.19
- Scenarios from later baselines, as they are archived.
- **From `baseline-firmware`, every board-marked scenario on the V3:** version after install (4.4), backup (5.4), reboot (5.6), driver (5.8), install (5.10) and restore (5.14). Also a V3 build from the app with its flash budget (3.3, FW13), and an install started from the V3's bootloader (5.7).
- **From `baseline-sd-fonts`, on the V3:** sharing its card over USB (2.11) and giving it back (2.13).
- **From `baseline-styles`:** the same side-by-side blade sample on the V3 (2.2), since the V3's LEDs and power path differ.
- **From `library-integrity` 6.3 (deferred by the owner, 2026-09-25)**, run once the app can reach the right board after an install (HW-2026-09-25c in `install-target-safety`), with V2.2 hote2 and the V3.9 plugged in together:
  - **Unblocked by `install-target-safety` (archived 2026-09-27):** after an install, only the saber installed may be opened, and it is reached by its USB serial. That change's 5.3 passed the install of hote2 with both plugged in.
  - After a reflash, hote2 reconnects to its own record with its USB serial (the log shows `[usb] want 209133815232` and "expected … matched" with the same id), with no second record.
  - Putting back a backup Hiltwright took (the backup now records its config) brings hote2 back to the same record, with its firmware record cleared.

## Non-goals

- Fixing what the pass finds. Each failure becomes a change, or joins an existing one.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change records evidence only (`skip_specs` when planned).

## Impact

No code unless the pass fails. Results go into this change's tasks.md.
