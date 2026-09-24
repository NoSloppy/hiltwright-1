# Proposal

**Milestone:** M2 (Beta 1 blocker; candidate to move to M4 if Beta 1 scope needs trimming). Triaged on 2026-09-24 from the findings of `baseline-board` (archived as `openspec/changes/archive/2026-09-24-baseline-board/`, design.md Findings table).

## Why

Loading a preset set can quietly go wrong. Warnings about missing styles, blade kinds the saber lacks, and empty names or fonts are no longer shown. Loading silently replaces staged edits. Sets saved from a saber map styles to presets by position, so a reorder since the install puts styles on the wrong presets.

## What Changes

- **F35:** Show a set's problems before it is loaded. Confirm before replacing staged edits. Let sets be renamed, and stop saving duplicates.
- **F39:** Match styles to presets by name when saving a set from a saber, as the rest of the app does.

## Non-goals

- Sharing sets between computers.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `preset-editing`: the preset-sets requirement gains the warnings, confirmation and name matching.

## Impact

`packages/core/src/banks.ts`, `apps/desktop/src/main/banksStore.ts`, `renderer/src/Presets.tsx`, `packages/core/test/banks.test.ts`.
