# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-board` (archived as `openspec/changes/archive/2026-09-24-baseline-board/`, design.md Findings table).

## Why

The connection layer is the best-tested part of the app, but it has gaps a tester will hit: it can miss an unplug, report a dead board as connected, or hang on "Reading the saber…" for minutes. Console commands can also land in the middle of a preset edit.

## What Changes

- **F1:** Notice every unplug, including when the serial read ends quietly, and return to "Not connected".
- **F2:** A board that answers nothing on connect is reported as not answering. It does not reach "Connected", and it creates no saber record.
- **F3:** Bound the whole connect sequence on a dead ProffieOS 8 board to seconds, not minutes, and say what happened.
- **F5:** Route console commands and the Try it / Diagnostics controls through the same operation queue as preset edits, so they cannot land between the steps of an edit.
- **F7:** Correct the stale statements: the misleading test name in `protocol.test.ts`, the 6 s ceiling in doc 09, `list_named_style` and the 1200-baud note in the plan.

## Non-goals

- Choosing among several connected boards (F4, `board-side-polish`).
- New protocol features.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `board-connection`: add requirements for detecting an unplug, refusing a silent board, and a bounded connect time. Console commands share the operation queue.

## Impact

`apps/desktop/src/renderer/src/{serial,board}.ts`, `App.tsx` (console), `Controls.tsx`, `packages/core/src/protocol/client.ts`, `packages/core/test/protocol.test.ts`, `docs/09-board-protocol-notes.md`, `docs/00-plan.md`. Needs a hardware check on V2.2 and V3 (unplug mid-command, dead board).
