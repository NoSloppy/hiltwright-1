# Proposal

**Milestone:** M2 (Beta 1 blocker). From `beta-1-roadmap` (Wave A, task 3.4; the roadmap's design D5), covering SF34 (`baseline-sd-fonts`) and FW21 (`baseline-firmware`).

## Why

Two features are in the code but not ready for testers, and both are still visible today:
- **Blade ID** has never run on hardware.
- **The Xenopixel import** has been tested only on a fabricated card.

Testers would find them and report on things we already know are unverified.

## What Changes

- **One place, two switches.** A single file of Beta 1 feature switches, with one switch for Blade ID and one for the Xenopixel import, both off:
  - With Blade ID off, the Wiring page no longer asks "Do you swap blades on this saber?", so the variant list and Measure buttons go too.
  - With the import off, Fonts & SD no longer shows the Xenopixel import panel.
- **Turning back on.** Setting a switch on shows its feature again for Beta 2, with nothing else to change.
- **Nothing else changes.** The code, its tests, the main-process handlers and any saved Blade ID variants stay as they are. A saber whose model already has variants keeps building them. None of the owner's sabers has any today.

## Non-goals

- Fixing Blade ID (`blade-id-verification`, M4) or the import (waits on real Xenopixel references).
- A setting or hidden gesture that lets testers turn the features on.
- Hiding anything else.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `blade-id`: not offered while its Beta 1 switch is off.
- `xenopixel-import`: not offered while its Beta 1 switch is off.

## Impact

- **New:** `apps/desktop/src/renderer/src/features.ts`.
- **Changed:** `Wiring.tsx` (the swap props), `Fonts.tsx` (the import panel), and a small test.
- **Checks:** a development run with the switches off, and again with them on. Then a packaged build check by the owner.
