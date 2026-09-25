# Proposal

**Milestone:** M2 (Beta 1 blocker). From `beta-1-roadmap` task 3.1, with SF34 (`baseline-sd-fonts`) and FW21 (`baseline-firmware`) as inputs.

## Why

Two features are in the code but not ready for testers: Blade ID (never run on hardware) and the Xenopixel import (tested only on a fabricated card). Both are still visible today.

## What Changes

- One switch, in one place, hides Blade ID ("Do you swap blades?" on Wiring, the Measure buttons) and the Xenopixel import panel on Fonts & SD in Beta 1 builds.
- Turning the switch on shows them again for Beta 2, with nothing else to change.
- The code, its tests and any saved Blade ID variants stay as they are. A saber whose model already has variants keeps building them.

## Non-goals

- Fixing Blade ID (`blade-id-verification`, M4) or the import (waits on references).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `blade-id`, `xenopixel-import`: both are hidden in Beta 1 builds.

## Impact

`apps/desktop/src/renderer/src/{Hardware.tsx,Wiring.tsx,Fonts.tsx}`, plus a single feature flag. Verified on a packaged build with the switch in each position.
