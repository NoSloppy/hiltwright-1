# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-styles` (archived as `openspec/changes/archive/2026-09-24-baseline-styles/`, design.md Findings table).

## Why

A few style scenarios have logic that can be tested without a screen or a board, but is not.

## What Changes

Unit tests. Audit numbers are from `baseline-styles`:
- **style-library:**
  - every blade style answers clash, blast and lockup, not only Steady (1.2)
  - the queued count (1.12)
- **style-simulator:**
  - clash placement by tilt (2.4)
  - saved styles get a simulator, and an edited one gets a fresh one (2.13)

## Non-goals

- Screen tests; the screen-level scenarios are checked by hand in `hardware-verification-v2`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change adds evidence only (`skip_specs` when planned).

## Impact

`packages/core/test/{sim,looks}.test.ts`, `apps/desktop/test/saberModel.test.ts`.
