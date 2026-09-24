# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-sd-fonts` (archived as `openspec/changes/archive/2026-09-24-baseline-sd-fonts/`, design.md Findings table).

## Why

The font library holds fonts the owner paid for, and what they wrote about them. Several paths can lose that information, hide fonts, leave fonts out of an import without a word, or quietly change which font a preset plays.

## What Changes

- **SF2:** The details file is written safely (a temporary file then a swap, keeping the last good copy). An unreadable file is set aside and reported, never overwritten.
- **SF3:** Moving the library into itself or into a parent of itself is refused before anything moves.
- **SF4:** A move that meets a same-named font at the destination asks the owner, instead of silently renaming it and leaving presets pointing at the other font.
- **SF1:** When the library folder is missing (for example the drive is gone or its letter changed), the owner is told and offered to find it, instead of getting an empty library.
- **SF5:** "Keep only the Proffie variant" applies only to a package with several board variants, judged by folder names, never by a font's own name. Fonts left out are listed.
- **SF6:** Tracks are taken only from inside what the owner picked.
- **SF7:** Every file of a font comes in (licences, readmes, other audio), or the owner is told what was left out.
- **SF8:** Zip entries are checked against their CRCs.

## Non-goals

- Low-severity library polish (`sd-fonts-polish`).
- Building fonts (`font-construction`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `font-library`: requirements for a safe details file, safe moves, a missing library, variant filtering by folder, complete imports, and verified packages.

## Impact

`apps/desktop/src/main/{fontLibrary,unzip,ipc}.ts`, `apps/desktop/src/renderer/src/FontLibrary.tsx`, `apps/desktop/test/fontLibrary.test.ts`.
