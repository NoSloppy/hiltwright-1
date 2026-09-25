# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-styles` (archived as `openspec/changes/archive/2026-09-24-baseline-styles/`, design.md Findings table).

## Why

What the editor saves is compiled into firmware, yet most of what it can produce has never been compiled. Nothing checks a style compiles before it is saved. Two colours can silently share one live setting on the saber.

## What Changes

- **ST33:** Before saving, check the style against the catalogue (unknown names, wrong kinds). The amber note stops promising that anything unmodelled compiles.
- **ST32:** Each colour in a built style gets its own live setting, or the owner is told which colours share one on the saber.
- **ST34:** Real-toolchain compile tests for every Simple base and transition, every recipe and new-layer starting point, the forms that switching shape, trigger or strength writes, "Reacts to…" rewrites, pattern swaps, and the Simple-to-tree conversion.

## Non-goals

- Compiling in the background while editing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `style-editor`: a style is checked before saving, and each colour's live setting is its own.

## Impact

`packages/core/src/{styleBuilder,styleTree,layerCard}.ts`, `apps/desktop/src/renderer/src/{StyleEditor,TreeEditor}.tsx`, `apps/desktop/test/styleCompile.test.ts`.
