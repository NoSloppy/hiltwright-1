# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-firmware` (archived as `openspec/changes/archive/2026-09-24-baseline-firmware/`, design.md Findings table).

## Why

`flash.ts` and `driver.ts` have no tests, and every failure path of an install is unevidenced. Several kinds of blade have never been compiled with the real toolchain. Beta 1 testers will hit exactly these paths.

## What Changes

- **Unit tests,** with small seams so the install sequence and the flasher can run against fakes. Audit numbers are from `baseline-firmware`:
  - hardware-wiring: adding a crystal (1.3), the first guess from a connected saber (1.4), a free pin (1.10)
  - toolchain: path too long (2.3), low disk space (2.4), recovery after a failed download (2.6)
  - config-generation: the V3 include (3.3)
  - firmware-install: the backup fails (5.5), a tampered driver download (5.9), the saber does not come back (5.11), an unexpected error (5.13), an erased read (5.15)
- **FW20:** Compile tests with the real toolchain for chained sub-blades, single LED, star LED, motor, 3 buttons, extra defines, and RGBW colour orders (confirming or fixing their spelling). Also a V3 build.

## Non-goals

- Component tests for screens. Those scenarios are checked by hand in `hardware-verification-v2`.
- Fixing defects the tests expose. Each becomes its own change or joins an existing one.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change adds evidence only (`skip_specs` when planned).

## Impact

`apps/desktop/test/*`, `packages/core/test/*`, small seams in `apps/desktop/src/main/{flash,driver,toolchain}.ts` and the install sequence in `Build.tsx`.
