# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-styles` (archived as `openspec/changes/archive/2026-09-24-baseline-styles/`, design.md Findings table).

## Why

Putting a style on the working saber from Styles can land it on the wrong preset, silently tie it to another preset's slot, or drop colours the owner set earlier.

## What Changes

- **ST3:** "Use it in" honours a staged preset list: it stages the change instead of writing to the live saber by position.
- **ST4:** A live "Use it in" is recorded in the saber's plan, so a later rebuild keeps it. It uses the slot rule `withSlotChoice` from `preset-editor-fixes` (design D1, owner's decision 2026-09-29: two changes sharing one rule), so the Styles page and the Presets page record choices the same way.
- **ST5:** The blade's existing custom colours are kept, or the owner is told they will be replaced.
- **ST6:** Messages match the situation (offline, installed, queued), and unreachable text is removed.
- **ST7:** A pasted style can be marked for the kinds of blade it suits.
- **HW-2026-09-26a** (seen on hote2 during `style-save-integrity` 5.2): the Styles detail's preset action ignores where the style already is. With "Test Style 1" already queued for Preset 4 it offers "Also use it in Preset: 4", and once it is installed on Preset 4 it offers "Use it in Preset: 4" ("already on hotetest, written to the preset now"). The action should say the style is already in that preset, or default to a preset that does not have it.

## Non-goals

- Edited styles reaching sabers (`style-save-integrity`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `style-library`: putting a style on the working saber respects staged presets, records the choice and keeps colours; pasted styles carry their blade kinds.

## Impact

`apps/desktop/src/renderer/src/{Looks.tsx,slotModel.ts,board.ts}`. Hardware check on V2.2: "Use it in" with a staged list and with a live list.
