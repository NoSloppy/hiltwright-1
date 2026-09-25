# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from `baseline-board` (archived as `openspec/changes/archive/2026-09-24-baseline-board/`). This is Wave B task 3.5, first in the wave so that the stores and presets code is under test before `library-integrity` and the preset fixes change it.

## Why

The baseline audit found fifteen board-side scenarios with no evidence (or only partial evidence) that need no board. The logic behind them can be unit-tested, but nobody has done it. Wave B is about to rewrite the saber library store, and later waves change how styles follow presets. Without tests, those changes could break these behaviours without anyone noticing.

## What Changes

Unit tests under node for the logic behind these scenarios (audit numbers from `baseline-board`):
- **saber-library:**
  - still listed after a restart (1.1)
  - an unreadable store (1.2)
  - no serial number (1.4)
  - a plan never mistaken for a board (1.5)
  - presets changed on the saber (1.6)
  - named from the config (1.7)
  - a snapshot usable outside the app (1.9)
  - the first visit's draft (1.15)
  - dropping a plan (1.18)
  - rename (1.20)
- **board-connection:** one connection attempt at a time (3.3) and operations queued in order (3.14). The connect guard and the operation queue move out of the `useBoard` hook into a small module with no imports, so they can be tested. Behaviour is unchanged.
- **presets-ini:** a preset with no track (5.3).
- **preset-editing:** a new style on a live saber counts as queued (6.14), and styles follow presets by name (6.16).

**Defects found while planning.** Reading the code for these scenarios turned up defects. Each is pinned by an expected-failure test, which passes on the day the fix lands and then fails until someone turns it into a normal test. Each is filed in the change that owns it:
- A store whose records have the wrong shape makes the library throw instead of reading as empty → `library-integrity`.
- Two presets with the same name, or a blank name, all take the last one's styles, and a preset both renamed and moved takes its new position's styles → `preset-editor-fixes`.
- A new saber's first draft is always for V2, because the board is guessed from the ProffieOS version → `install-target-safety` (joins FW3).
- An edit queued just before an unplug is dropped with no failed state → `connection-robustness`.
- Whether ProffieOS accepts a snapshot with its `#` header and no `installed=` line needs a board → `hardware-verification-v2`.

## Non-goals

- Component tests for screens. Screen-level scenarios are checked by hand in `hardware-verification-v2`.
- Fixing the defects above. Each belongs to the change it is filed in.
- New requirements. This change adds evidence only (`skip_specs`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change adds evidence only.

## Impact

- **New tests:** `apps/desktop/test/library.test.ts` and `snapshots.test.ts`. More cases go in `draftModel.test.ts`, `saberModel.test.ts` and `packages/core/test/protocol.test.ts`.
- **A new pure module:** `apps/desktop/src/renderer/src/boardOps.ts` (the connect gate and the operation queue), with `boardOps.test.ts`. `board.ts` uses it.
- **Other proposals:** the five listed above each gain a finding.
- **Hardware check:** a read-only connect check on V2.2 hote2, because `board.ts` changes.
