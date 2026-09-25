# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-showroom` (archived as `openspec/changes/archive/2026-09-24-baseline-showroom/`, design.md Findings table).

## Why

Owners put real effort into fitting their hilts in the demo room, and it can be lost silently:
- A same-named file overwrites a hilt and its hand-set fit.
- Pack hilts and the owner's hilts can overwrite each other.
- A removal cannot be undone.
- A failed save looks like a success.
- Hilts loaded in development never reach an installed build.

## What Changes

- **SR1:** Loaded hilts and pack-fit adjustments get their own identities, so a same-named file never replaces a stored hilt without asking, and pack hilts and the owner's hilts never collide. "Reset fit" only ever touches the pack's adjustment.
- **SR2:** Removing a hilt asks first.
- **SR3:** A hilt that fails to save (for example, when storage is full) says so.
- **SR4:** Hilts and room settings are stored somewhere that survives the move from a development build to an installed one, with a way to export and re-import them.
- **SR5:** Stored room settings are checked on load, and invalid values fall back to defaults.

## Non-goals

- New hilt formats (`showroom-polish`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `demo-room`: hilts are kept under stable identities, removal is confirmed, save failures are reported, and settings are validated and portable.

## Impact

`apps/desktop/src/renderer/src/{Demo.tsx,hiltStore.ts,demoScene.ts}`, possibly moving hilt storage into the main process. Verified in an installed build.
