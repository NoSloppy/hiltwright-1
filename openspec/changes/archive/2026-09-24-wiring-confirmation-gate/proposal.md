# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from `baseline-board` F18, then rewritten the same day from `baseline-firmware` FW1 and FW2, which correct F18.

## Why

Wrong wiring in a `BladeConfig` can damage hardware, and the confirmation that is meant to guard against it does not work.
- **FW1:** The confirmation is dropped from the working model, so a saber without Hiltwright firmware (a plan, or vendor firmware being adopted) can never be confirmed, and Install stays locked. This blocks the Beta 1 promise's main path. It was reproduced on 2026-09-24.
- **FW2:** A saber with Hiltwright firmware counts as confirmed for good on every page, even after its blades change, because the firmware record keeps no blade layout to compare against. This supersedes `baseline-board` F18.

## What Changes

- **FW1:** The confirmation is part of the working model and survives every page's saves.
- **FW2:**
  - The firmware record stores the board and blade layout that were installed.
  - Wiring counts as confirmed only while the board and blades match what the owner confirmed or what was installed. Any change needs a fresh confirmation before Install unlocks.
  - The switch can be turned off.
  - The Wiring page, the Armory rail and Build & Install all use the same rule.
- Verified by driving the real page: plan a saber, confirm the wiring, build, and see Install unlock; then change a blade on an installed saber and see Install lock again.

## Non-goals

- Changes to the wiring editor itself (`wiring-validation`).
- Blade ID variants withdrawing the confirmation (`blade-id-verification`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `hardware-wiring`: the confirmation requirement is rewritten to the rule above.
- `saber-library`: the installed firmware record includes the board and blade layout.
- `app-shell`: the progress rail follows the same rule.

## Impact

`apps/desktop/src/renderer/src/{saberModel.ts,workspace.ts,Wiring.tsx,Build.tsx,App.tsx}`, `packages/core/src/looks.ts` (firmware record). Hardware check on V2.2: change a blade on an installed saber and confirm Install is refused until reconfirmed.
