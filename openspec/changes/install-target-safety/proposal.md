# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-firmware` (archived as `openspec/changes/archive/2026-09-24-baseline-firmware/`, design.md Findings table).

## Why

Nothing makes sure the firmware being written matches the board it lands on. The board type is never detected, so everything defaults to V2. With nothing connected, Install writes to whatever board is in its bootloader. A build stays installable after the model changes. With two boards plugged in, the first one wins. Any of these can put the wrong firmware, or the wrong pin map, on a saber.

## What Changes

- **FW3:** Know the board. Detect V2 or V3 from what the board reports where it can, ask when it cannot, and refuse to write an image whose board does not match the flash size the bootloader reports. A restore uses the same check.
- **FW4:** Install to a board in its bootloader only when the app can tell it is the saber being worked on, or after the owner explicitly says which saber it is.
- **FW5:** A build becomes stale as soon as the model it was built from changes. Install offers only a current build, and the record stored after an install is the model that was actually built.
- **FW31:** With more than one board plugged in, say so and do not guess.

## Non-goals

- Choosing among several connected boards for editing (`board-side-polish`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `firmware-install`: the target is checked against the build's board and the saber's identity; a stale build cannot be installed.
- `firmware-build`: a build records the model it was made from and becomes stale when that model changes.
- `hardware-wiring`: the board choice is detected or asked for, not defaulted.

## Impact

`apps/desktop/src/renderer/src/{Build.tsx,saberModel.ts,board.ts}`, `apps/desktop/src/main/{flash,ipc}.ts`. Hardware check on V2.2 and V3: a V2 image refused on a V3, an unknown bootloader board refused, a stale build refused.
