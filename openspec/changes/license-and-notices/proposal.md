# Proposal

**Milestone:** M2 (Beta 1 blocker). From `beta-1-roadmap` task 3.2, with SF30 (`baseline-sd-fonts`) as an input and `style-attribution` and `pack-integrity` feeding it.

## Why

Hiltwright is GPL-3.0, because its simulator is ported from ProffieOS's GPL headers. The repository is public, but it has no LICENSE file. Handing testers a binary requires the licence, a way to get the source, and the notices of what it bundles.

## What Changes

- A GPL-3.0 `LICENSE` at the repository root.
- An About screen, and the installer, show:
  - the app's licence
  - a link to the exact tagged source of this build
  - third-party notices: ProffieOS; the free ProffieOS fonts in packs (CC BY-SA 4.0); the PunkSaber hilt; Electron and the other bundled libraries
  - the statement from `style-attribution` about how Hiltwright's own styles were made
- **SF30:** Decide whether each install also puts the exact config and a pointer to the ProffieOS source on the saber's card, as the plan once tied to GPL compliance, or record why the release link is enough.

## Non-goals

- Signing (Beta 2, `signpath-signing`).

## Capabilities

### New Capabilities

- `licensing`: the app's licence, source offer and third-party notices, where they appear.

### Modified Capabilities

- `app-shell`: an About screen.

## Impact

`LICENSE`, `apps/desktop/src/renderer/src` (About), `apps/desktop/package.json` (installer licence), a notices file generated from dependencies. Verified in a packaged build.
