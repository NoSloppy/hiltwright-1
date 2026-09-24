# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-board` (archived as `openspec/changes/archive/2026-09-24-baseline-board/`, design.md Findings table).

## Why

Almost everything rewritten on 2026-09-22 has never touched a saber. This change is the dated pass on the owner's V2.2 (hote2) that turns "neither" into evidence, in the real app, before any tester does it for us.

## What Changes

A scripted pass in the real app, recording board, date and result for each scenario. Inputs gathered so far:
- **Scenarios from `baseline-board` that need a board:**
  - saber-library 1.3, 1.16, 1.19
  - board-connection 3.17
  - diagnostics 4.3
  - preset-editing 6.1, 6.4, 6.5, 6.7, 6.9, 6.10, 6.12, 6.13, 6.15, 6.19
- **Screen-level scenarios from `baseline-board`, checked by hand (no board needed):**
  - saber-library 1.11, 1.12, 1.13, 1.14, 1.17
  - app-shell 2.1–2.10
  - board-connection 3.4, 3.5, 3.6, 3.9
  - diagnostics 4.2, 4.4, 4.5
  - preset-editing 6.2, 6.3, 6.8, 6.11, 6.17, 6.18
- **F10:** Do the Diagnostics settings survive a restart? If not, the page's claim is corrected.
- The roadmap's own list: installing a pasted style, SD eject, style editor output on a blade, a sample of styles against the simulator, fonts heard.
- Scenarios from the four later baselines, as they are archived.

## Non-goals

- The V3 (`v3-verification`).
- Fixing what the pass finds. Each failure becomes a change, or joins an existing one.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change records evidence only (`skip_specs` when planned).

## Impact

No code. Results go into this change's tasks.md and are summarised in the roadmap.
