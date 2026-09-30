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

Two small seams, neither changing behaviour:
- **The fonts a saber's presets need, and which are copyable.** This is worked out inside `Fonts.tsx` today. It moves to a pure `fontsForPresets` that the page calls.
- **The Xenopixel "none found" words** move from `XenoImport.tsx` into a shared constant that the page shows.

## Non-goals

- Component tests for screens. Those scenarios are checked by hand in `hardware-verification-v2`.
- Fixing what the tests expose. Any defect found is pinned by an expected-failure test, and filed with the change that owns it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change adds evidence only (`skip_specs`).

## Impact

- **Tests:**
  - `apps/desktop/test/{fontLibrary,sdLayout,importer}.test.ts`
  - a new `apps/desktop/test/fontLibraryMove.test.ts` for the move across drives
  - a new `apps/desktop/test/fontNeeds.test.ts`
- **Seams:**
  - `apps/desktop/src/renderer/src/{Fonts.tsx,XenoImport.tsx}`
  - a new `renderer/src/fontNeeds.ts`
  - `shared/importWords.ts`
- **Hardware:** none. Everything runs against temporary folders. The two scenarios the spec marks "Needs a real card" (2.8 and 2.10) keep their hand checks in `hardware-verification-v2`, and gain these folder-level tests.
