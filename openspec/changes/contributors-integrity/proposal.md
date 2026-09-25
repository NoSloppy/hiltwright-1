# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-showroom` (archived as `openspec/changes/archive/2026-09-24-baseline-showroom/`, design.md Findings table).

## Why

The contributors list is the owner's record of who made what, with logos and links they collected by hand. A damaged file wipes it. Saves can collide. A renamed author loses their credit. A hand-edited link can open something other than a web page.

## What Changes

- **SR33:** The list is written safely. A damaged file is set aside and reported, never overwritten.
- **SR34:** Saves are serialised, and changes wait for the start-up handover of old logos.
- **SR35:** Changing a logo keeps the old one until the new list is saved.
- **SR36:** Renaming a style's author offers to move their logo and link to the new name.
- **SR39:** Opening a link checks again that it is a web address.

## Non-goals

- Minor display issues (`showroom-polish`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `contributors`: requirements for a safe store, serialised saves, credit following a rename, and links re-checked on open.

## Impact

`apps/desktop/src/main/{contributors,ipc}.ts`, `apps/desktop/src/renderer/src/{credits.tsx,Looks.tsx}`, `apps/desktop/test/contributors.test.ts`.
