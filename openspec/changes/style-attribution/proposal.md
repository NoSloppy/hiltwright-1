# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-styles` (archived as `openspec/changes/archive/2026-09-24-baseline-styles/`, design.md Findings table).

## Why

Beta 1's testers include the style builders whose work gets pasted. Today the app credits every paste to Fett263 by default, can present someone else's style as the owner's own, and strips a library style's header when it is pasted into the editor. Hiltwright's standing in the community depends on credit being right.

## What Changes

- **ST13:** The paste author starts empty and must be given or explicitly marked unknown. It is never defaulted to a real person.
- **ST14:** "Unknown" is shown as unknown, never as "Yours".
- **ST15:** A paste without a header asks for confirmation. Notices anywhere in the pasted block are kept. Renaming an author reaches copies already in saber plans.
- **ST16:** Pasting into the style editor keeps the header and the author, and saving credits the original author with "edited by" the owner.
- **ST17:** The test fixture is credited to Hiltwright.
- **ST18:** Check whether preset sets can carry pasted library code off the machine, and keep the "never redistributes" promise true.
- **ST40:** State in the app's notices that Hiltwright's own styles were composed from ProffieOS building blocks, taking ideas only from public style descriptions.

## Non-goals

- The app's own licence and third-party notices (`license-and-notices`, roadmap task 3.2), which this change feeds.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `style-library`: pasted styles carry a real author and their notices.
- `style-editor`: pasted styles keep their credit through editing and saving.

## Impact

`apps/desktop/src/renderer/src/{Looks.tsx,StyleEditor.tsx,credits.tsx}`, `packages/core/src/{looks,styleTree}.ts`, `packages/core/test/looks.test.ts`.
