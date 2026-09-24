# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-board` (archived as `openspec/changes/archive/2026-09-24-baseline-board/`, design.md Findings table).

## Why

History's "Undo" restores the snapshot into whichever preset is selected. After a move, duplicate or delete, it overwrites a different preset with the old values. Move, duplicate and delete also report success without checking what the saber did.

## What Changes

- **F33:** Restore finds the right preset (by its identity in the snapshot, or by restoring the whole list), and the History view says plainly what a restore will change before it does it.
- **F34:** Move, duplicate and delete are confirmed against the list read back from the saber, like every other write.

## Non-goals

- Editing snapshots or keeping fewer of them (F22).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `preset-editing`: the snapshot and History requirement, and the reorder, duplicate and delete requirement, gain read-back confirmation and a correct restore target.

## Impact

`packages/core/src/protocol/session.ts`, `apps/desktop/src/renderer/src/{board.ts,Presets.tsx}`, `packages/core/test/session.test.ts`. Hardware check on V2.2: move, then restore.
