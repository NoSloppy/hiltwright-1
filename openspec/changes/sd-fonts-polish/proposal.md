# Proposal

**Milestone:** M4 (Beta 2). Triaged on 2026-09-24 from the findings of `baseline-sd-fonts` (archived as `openspec/changes/archive/2026-09-24-baseline-sd-fonts/`, design.md Findings table).

## Why

Low-severity findings from the SD and fonts baseline. None blocks Beta 1.

## What Changes

- **SF10:** The old-font-folder offer stays when its import added nothing.
- **SF11:** "Set maker for all" with a blank maker asks first, and a partial failure is reported.
- **SF12:** Sounds changed outside the app are picked up without a restart.
- **SF15:** Show whether a font has `smoothsw.ini`.
- **SF16:** The size chip counts consistently.
- **SF17:** Correct the stale docs about logos and editable sources.
- **SF18:** A removed contributor logo stays removed.
- **SF19:** Adding the library folder, or a font already in it, is refused instead of duplicated.
- **SF20:** Strip trailing dots from folder names, clean up leftover staging folders, and key details by folder regardless of case.
- **SF29:** Don't offer a copy that is bound to fail when a non-font folder of that name is on the card.
- **SF31:** Notice a card being inserted, and let the owner choose among several cards; report a failing drive query. (The development override being live in packaged builds is covered by `release-hardening` F25.)
- **SF33:** Show `presets.tmp` honestly, report the voice pack version only from its file, and list lockup once.

## Non-goals

- Anything that blocks Beta 1.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `font-library`, `sd-card`: small requirement additions per item.

## Impact

`apps/desktop/src/main/{fontLibrary,sd,contributors}.ts`, `apps/desktop/src/renderer/src/{FontLibrary,Fonts}.tsx`, `packages/core/src/fonts.ts`, docs.
