# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-showroom` (archived as `openspec/changes/archive/2026-09-24-baseline-showroom/`, design.md Findings table).

## Why

"Demo any … font in the demo room" is in the promise, yet the sound engine has never been heard and has no tests. It also differs from ProffieOS in ways a font's owner will hear at once: melt plays drag sounds, and fonts without SmoothSwing make no swing sounds.

## What Changes

- **SR10:** Melt plays the font's own melt sounds when it has them, falling back to drag as ProffieOS does. A lockup without an end sound ends with a clash, as ProffieOS does.
- **SR11:** Fonts without SmoothSwing play their plain and accent swing sounds as ProffieOS does, and the room stops saying "no swing sounds".
- **SR13:** Unit tests for the font engine: grouping a font's files, choosing sounds per effect, the ignition sequence (pre-on, out, fast out) and retraction (in, post-off), and SmoothSwing pairing.
- The listening pass is in `hardware-verification-v2`.

## Non-goals

- New sound features.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `demo-room`: the sound requirement matches ProffieOS for melt, lockup endings and non-SmoothSwing swings.

## Impact

`apps/desktop/src/renderer/src/fontEngine.ts`, a new `apps/desktop/test/fontEngine.test.ts`, and a reference to `hybrid_font.h` behaviour.
