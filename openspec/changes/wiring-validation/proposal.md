# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-firmware` (archived as `openspec/changes/archive/2026-09-24-baseline-firmware/`, design.md Findings table).

## Why

The pin table shows problems that the build then accepts. Some of them (a motor on a low-current PWM pin, a star LED with one pin for all three colours) can damage hardware. Others produce a config with an empty blade or overlapping ranges. Wiring edits can also be lost or overwritten.

## What Changes

- **FW6:** The build refuses every wiring problem the page shows, plus these:
  - a PWM pin driving a motor or star LED
  - a chain with a missing parent, or placed before its parent
  - pins the chosen board does not have
  - one pin used for both data and PWM
  - duplicate pins within one blade
- **FW27:** Each preset's styles are checked against the blade kinds they land on (no blade style on a motor), and missing entries are reported rather than silently filled.
- **FW22:** A wiring change is never lost by leaving the page quickly, and a stale draft never overwrites a model changed elsewhere.
- **FW23:** On a V3, only the V3-only data pins are labelled free.
- **FST-3** (from `firmware-side-test-coverage`, beside FW6): switching a blade to a star LED keeps its one pin and fills the other two channels with the first FET (`withKind` in `hardwareModel.ts`). A new star LED therefore gets the same pin twice, and that pin may already belong to another blade. Each channel should get a free pin of its own while any remain. Pinned by the expected failure "a new star LED gets three pins of its own" in `apps/desktop/test/hardware.test.ts`.

## Non-goals

- Changing the wiring editor's layout.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `hardware-wiring`: problems are listed and enforced identically by the page and the build.
- `config-generation`: an invalid model is refused for the new reasons.

## Impact

`packages/core/src/config/{generate,blades}.ts`, `apps/desktop/src/renderer/src/{hardwareModel.ts,Hardware.tsx,Wiring.tsx}`, `packages/core/test/generate.test.ts`, `apps/desktop/test/hardware.test.ts`.
