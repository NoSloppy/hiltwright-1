# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-sd-fonts` (archived as `openspec/changes/archive/2026-09-24-baseline-sd-fonts/`, design.md Findings table).

## Why

The same font can be "Ready" in the library and show issues on the card, because two checkers read fonts differently. The card's checker even raises a false "no hum" error for `hum/hum1.wav`. Style builders will compare the two.

## What Changes

- **SF21:** One font checker serves both the library and the card. It handles per-sound folders with numbered files (`clsh/clsh1.wav`, `hum/hum1.wav`), leaves tracks out of the sound checks, and reads WAV headers far enough to find the format.
- **SF13:** Unrecognised `.wav` names are shown as "other files", not as special effects.
- **SF14:** "Not a font" messages name the core sounds that qualify, and packaging junk (`__MACOSX`) is not counted.

## Non-goals

- New checks (`font-construction`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `sd-card`, `font-library`: a font gets the same verdict wherever it is shown.

## Impact

`packages/core/src/fonts.ts`, `apps/desktop/src/main/{sd,fontLibrary}.ts`, `packages/core/test/fonts.test.ts`, `apps/desktop/test/{sdLayout,fontLibrary}.test.ts`.
