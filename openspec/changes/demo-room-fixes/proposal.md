# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-showroom` (archived as `openspec/changes/archive/2026-09-24-baseline-showroom/`, design.md Findings table).

## Why

Three demo-room behaviours mislead a style builder about what the saber will do, or disturb what they are watching.

## What Changes

- **SR9:** Special abilities are offered only as the chosen prop has them: by key as well as by button, with the blade off only where the prop allows it, and all eight for BC.
- **SR12:** "From <saber>" applies the preset's colours as well as its style and font, and says when the preset's style cannot be shown.
- **SR6:** Changing a Scene setting while the staff blade is on no longer replays its ignition or drops its held effect. Reproduce first, since this was found by reading the code.

## Non-goals

- Minor control quirks (`showroom-polish`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `demo-room`: abilities follow the prop exactly, "From <saber>" matches the preset, and the staff blade is undisturbed by scene changes.

## Impact

`apps/desktop/src/renderer/src/{Demo.tsx,demoScene.ts}`.
