# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-styles` (archived as `openspec/changes/archive/2026-09-24-baseline-styles/`, design.md Findings table).

## Why

Putting a style on the working saber from Styles can land it on the wrong preset, silently tie it to another preset's slot, or drop colours the owner set earlier.

## What Changes

- **ST3:** "Use it in" honours a staged preset list: it stages the change instead of writing to the live saber by position.
- **ST4:** A live "Use it in" is recorded in the saber's plan, so a later rebuild keeps it.
- **ST5:** The blade's existing custom colours are kept, or the owner is told they will be replaced.
- **ST6:** Messages match the situation (offline, installed, queued), and unreachable text is removed.
- **ST7:** A pasted style can be marked for the kinds of blade it suits.

## Non-goals

- Edited styles reaching sabers (`style-save-integrity`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `style-library`: putting a style on the working saber respects staged presets, records the choice and keeps colours; pasted styles carry their blade kinds.

## Impact

`apps/desktop/src/renderer/src/{Looks.tsx,slotModel.ts,board.ts}`. Hardware check on V2.2: "Use it in" with a staged list and with a live list.
