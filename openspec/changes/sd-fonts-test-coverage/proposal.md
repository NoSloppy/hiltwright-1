# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-sd-fonts` (archived as `openspec/changes/archive/2026-09-24-baseline-sd-fonts/`, design.md Findings table).

## Why

Copying fonts to a card, the page-level library behaviours and the card's voice pack read have no tests, although each can run against a temporary folder standing in for a card.

## What Changes

Unit tests against temporary folders. Audit numbers are from `baseline-sd-fonts`:
- **font-library:**
  - a font folder is left untouched when its details change (1.2)
  - moving across drives, simulated where possible (1.3)
  - a package that is not a font (1.5)
  - the library reporting a stereo font (1.11)
- **sd-card:**
  - listing a card (2.4)
  - reading the voice pack from a card (2.7)
  - copying a new font (2.8)
  - refusing a font already there (2.9)
  - copying the presets' missing fonts from the library (2.10)
  - browsing changes nothing on the card (2.14)
- **xenopixel-import:** the "none found" message (3.1).

## Non-goals

- Component tests for screens; those scenarios are checked by hand in `hardware-verification-v2`.
- Fixing what the tests expose.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change adds evidence only (`skip_specs` when planned).

## Impact

`apps/desktop/test/*`, `packages/core/test/*`, and small seams in `apps/desktop/src/main/{sd,fontLibrary}.ts` if needed.
