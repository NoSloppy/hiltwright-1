# Proposal

**Milestone:** M1 (Baseline), first of the five baseline changes scheduled by `beta-1-roadmap`.

## Why

Hiltwright's board-facing half (connecting to a saber, remembering it, editing its presets live or staged, the Diagnostics controls, and the app frame they sit in) exists only as code and a narrative in `docs/00-plan.md`. There is no written contract for what it must do, so nothing can be marked verified, broken, or out of scope. This change writes down that behaviour as specs, and records for each scenario whether it is covered by a test, by a hardware check, or by neither. The scenarios covered by neither on full-depth capabilities feed the Beta 1 blocker triage (roadmap task 2.6).

## What Changes

- New specs describing behaviour that already exists. There is no code change. Where the code and the plan disagree, the spec follows the code, and the disagreement is listed in design.md for triage rather than fixed here.
- An evidence audit in tasks.md: one line per scenario, sorted as covered by a test (with the test file), by a hardware check (with the board and date), or by neither.

## Non-goals

- Changing any behaviour, even where the audit finds a bug or a gap. Each fix becomes its own change after triage.
- Specs for wiring, config generation, build and install (`baseline-firmware`), the SD card and fonts (`baseline-sd-fonts`), styles (`baseline-styles`), or the demo room (`baseline-showroom`). Where this change touches them (for example, staged presets are replaced during an install), it states only what the preset side guarantees and points to the other capability.
- Running hardware checks. The audit records existing evidence; new hardware runs belong to `hardware-verification-v2` and `v3-verification`.
- Dev-only aids (simulated connection, offscreen screenshots). They are mentioned in design.md, not specified.

## Capabilities

### New Capabilities

- `board-connection`: finding, connecting to, identifying and talking to a Proffieboard over USB serial on ProffieOS 7 and 8, including command framing, write serialisation and recovery when the board goes quiet. Full depth.
- `saber-library`: remembering sabers across sessions by identity, planned sabers with no board yet, adopting a plan when a real saber connects, the one working saber, and the per-saber record (model, firmware manifest, snapshots, backups). Full depth.
- `preset-editing`: editing a saber's presets, live on a connected board or staged in its build model, with snapshots before writes, read-back before anything is shown as saved, styles queued for a build, pending colours, and saved preset sets. Full depth.
- `presets-ini`: reading and writing the ProffieOS `presets.ini` format, with a round-trip guarantee. Full depth.
- `diagnostics`: live saber settings (volume, brightness, clash sensitivity), effect triggers and the voice pack check. Thin.
- `app-shell`: the window, navigation that reads as one flow from Armory to install, the fit-the-window layout rule, keyboard shortcuts, error containment and unsaved-work guards. Thin.

### Modified Capabilities

None. `openspec/specs/` is empty.

## Impact

- `openspec/specs/`: six new capability specs once this change is archived.
- No code, API, dependency or data changes.
- Feeds roadmap task 2.6 (blocker triage) and `hardware-verification-v2`.
