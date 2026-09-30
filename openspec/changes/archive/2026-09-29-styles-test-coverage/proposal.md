# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-styles` (archived as `openspec/changes/archive/2026-09-24-baseline-styles/`, design.md Findings table).

## Why

A few style scenarios have logic that can be tested without a screen or a board, but is not.

## What Changes

Unit tests. Audit numbers are from `baseline-styles`:
- **style-library:**
  - **Every blade style answers clash, blast and lockup,** not only Steady (1.2).
  - **The queued count (1.12)** is already covered. The "6.14" tests in `apps/desktop/test/saberModel.test.ts` were added after the audit (`board-side-test-coverage`), and test this exact scenario. They are recorded as the evidence, not duplicated.
- **style-simulator:**
  - **Clash placement by tilt (2.4).**
    - Reading the code before planning showed the simulator places a clash as the firmware's own `ResponsiveClashL` default does: `Scale<BladeAngle<>, Scale<BladeAngle<0,16000>, 4000, 26000>, 6000>`. That gives about 0.12 of the blade pointing down, the middle when level, and about 0.18 pointing up.
    - The spec's scenario says a raised blade's clash lands "nearer the hilt than it would on a lowered blade". That is the opposite of the firmware, so the spec is what is wrong.
    - The test pins the firmware's placement. The spec correction is filed as **STC-1** in `preview-honesty`, which owns the simulator's faithfulness to the firmware, and changes `style-simulator`.
  - **Saved styles get a simulator, and an edited one gets a fresh one (2.13).**

## Non-goals

- Screen tests. The screen-level scenarios are checked by hand in `hardware-verification-v2`.
- Fixing what the tests expose, including the 2.4 wording. Defects are pinned by an expected-failure test, and filed with their owning change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change adds evidence only (`skip_specs`).

## Impact

- **Tests:** `packages/core/test/{sim,lookSim}.test.ts`, the second of which is new.
- **The finding:** STC-1 is added to `preview-honesty`'s proposal.
- **Hardware:** none. Everything is pure simulation in node.
