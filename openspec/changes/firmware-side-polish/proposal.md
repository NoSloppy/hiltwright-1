# Proposal

**Milestone:** M4 (Beta 2). Triaged on 2026-09-24 from the findings of `baseline-firmware` (archived as `openspec/changes/archive/2026-09-24-baseline-firmware/`, design.md Findings table).

## Why

Low-severity findings from the firmware baseline. None blocks Beta 1.

## What Changes

- **FW17:** Make the build cache real, or remove it: the app always rebuilds today.
- **FW18:** Keep each saber's sketch copy clean between builds.
- **FW24:** Check the voice pack for every prop that needs one in SD-mount mode, and correct the comments and docs about `MOUNT_SD_SETTING`.
- **FW25:** Check what BC supports for special abilities, test the default-prop warning, and detect other prop features pasted styles need (alt fonts).
- **FW34:** Bring doc 07 §7a in line with the wiring editor.
- **FW35:** Make "strips on this wire" mean something in the build, or remove it.
- **TI-1** (from `toolchain-integrity`, 2026-09-26): when a toolchain only needs part of the pinned set (for example the ProffieOS source re-checked, 4.7 MB), the setup panel still says "Download about 360 MB" and "one-time download". Size the figures from the parts actually missing.

## Non-goals

- Anything that blocks Beta 1.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `firmware-build`, `config-generation`, `hardware-wiring`: small requirement additions per item.

## Impact

`apps/desktop/src/main/build.ts`, `packages/core/src/config/generate.ts`, `packages/core/src/voicepack.ts`, docs 07 and 09.
