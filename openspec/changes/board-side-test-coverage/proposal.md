# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-board` (archived as `openspec/changes/archive/2026-09-24-baseline-board/`, design.md Findings table).

## Why

The baseline audit found that the full-depth board-side capabilities have many scenarios with no evidence that do not need a board. The logic behind them can be unit-tested, but nobody has. Without tests, the fix changes above can regress these behaviours unnoticed.

## What Changes

Add unit tests, under node, for the logic behind these scenarios (audit numbers from `baseline-board`), making small seams where the code cannot run outside Electron today (for example, the draft model reads the app version from the window):
- **saber-library:** still listed after a restart (1.1), unreadable store (1.2), no serial number (1.4), a plan is never matched (1.5), presets changed on the saber (1.6), named from the config (1.7), snapshot usable outside the app (1.9), first visit draft (1.15), drop a plan (1.18), rename (1.20).
- **board-connection:** one connection attempt at a time (3.3) and operations queued in order (3.14), where they can be separated from React.
- **presets-ini:** a preset with no track (5.3).
- **preset-editing:** a new style on a live saber counts as queued (6.14), and styles follow presets by name (6.16).

## Non-goals

- Component tests for screens. The screen-level scenarios are checked by hand in `hardware-verification-v2`.
- Fixing defects the tests expose. Each becomes its own change or joins an existing one.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change adds evidence only (`skip_specs` when planned).

## Impact

`apps/desktop/test/*`, `packages/core/test/*`, small seams in `apps/desktop/src/main/library.ts`, `snapshots.ts`, `renderer/src/saberModel.ts`, `board.ts`.
