# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-firmware` (archived as `openspec/changes/archive/2026-09-24-baseline-firmware/`, design.md Findings table).

## Why

A few build defects will reach Beta 1's style builders directly: V3 flash percentages read low, unexplained compile errors, a style name that breaks the compile, and a config name that can write outside the build folder.

## What Changes

- **FW13:** Use the real V3 flash limit, or the size arduino-cli reports, for the flash budget.
- **FW14:** Name the preset and style an error comes from, test the remaining translation patterns, and check pins and prop defines before compiling.
- **FW15:** Style names and authors are escaped wherever they enter the config.
- **FW16:** The config name is validated before any file is written, and the path is checked to stay in the build folder.

## Non-goals

- The build cache (`firmware-side-polish`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `firmware-build`: the flash budget uses the board's real limit, and error messages name the preset and style.
- `config-generation`: any style name produces a config that compiles.

## Impact

`apps/desktop/src/main/build.ts`, `packages/core/src/config/generate.ts`, `apps/desktop/test/build.test.ts`, `packages/core/test/generate.test.ts`.
