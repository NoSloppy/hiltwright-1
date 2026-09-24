# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-board` (archived as `openspec/changes/archive/2026-09-24-baseline-board/`, design.md Findings table).

## Why

Wrong wiring in a `BladeConfig` can damage hardware, which is the top risk in the plan. The Wiring page withdraws the confirmation when the blades change after an install, but the Armory rail and Build & Install still count the wiring as confirmed. So changed wiring can be installed without the owner confirming it.

## What Changes

- **F18:** Wiring counts as confirmed only while it matches what the owner confirmed or what was installed. Any change needs a fresh confirmation before Build & Install will install. The Armory rail and Build & Install follow the same rule as the Wiring page.

## Non-goals

- Changes to the wiring editor itself.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `hardware-wiring`: the confirmation rule. This spec arrives with `baseline-firmware`, which must be archived before this change writes its spec delta.
- `app-shell`: the progress rail shows wiring as unconfirmed after a change.

## Impact

`apps/desktop/src/renderer/src/{Build,Wiring}.tsx`, `workspace.ts`. Hardware check: change a blade on an installed V2.2, confirm the install is refused until reconfirmed.
