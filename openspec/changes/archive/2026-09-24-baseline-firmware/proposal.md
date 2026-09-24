# Proposal

**Milestone:** M1 (Baseline), second of the five baseline changes scheduled by `beta-1-roadmap`.

## Why

The firmware half of Hiltwright is the riskiest part of Beta 1: describing the saber's wiring, generating its `config.h`, installing the compiler, building, and writing firmware to the board. A wrong `BladeConfig` can damage hardware, and a failed write can leave a board without working firmware. None of it has a written contract. This change writes the existing behaviour down as specs and audits the evidence for every scenario, so the Beta 1 blockers in this area come from facts. It also unblocks `wiring-confirmation-gate`, which needs the `hardware-wiring` spec to exist.

## What Changes

- New specs describing behaviour that already exists. There is no code change. Where the code and the plan disagree, the spec follows the code, and the disagreement is listed in design.md for triage. Clear defects are logged as findings, not specified (same rule as `baseline-board`, design D1).
- An evidence audit in tasks.md: one line per scenario, sorted as covered by a test (naming the test and saying whether it needs the real toolchain), by a hardware check (board and date), partial, or neither.

## Non-goals

- Changing any behaviour, even where the audit finds a bug. Fixes become their own changes after triage.
- Preset editing, including what happens to staged presets during an install. That is already specified in `preset-editing`. This change states only the install sequence around it.
- Styles themselves (`baseline-styles`) and SD card contents (`baseline-sd-fonts`). Here, styles appear only as inputs to config generation and build.
- New hardware runs. Those belong to `hardware-verification-v2` and `v3-verification`.

## Capabilities

### New Capabilities

- `hardware-wiring`: describing a saber's board, buttons, prop and blades (role, what each is built from, pixel count, colour order, data and power wiring), with pin conflict checks, a live diagram and pin table, and the owner's confirmation that the wiring is right. Full depth.
- `config-generation`: turning a saber's build model into a ProffieOS `config.h` with its hashed header, board include, defines, blade rows, presets and style aliases, plus the firmware manifest and the warnings the owner sees. Full depth.
- `toolchain`: first-run installation of the compiler, the board support, `dfu-util` and the pinned ProffieOS, where it lives, how size and free space are reported, and recovery from failure. Full depth.
- `firmware-build`: compiling a saber's config with plain-language errors, the build cache, and the flash budget for V2 and V3. Full depth.
- `firmware-install`: backup, reboot into the bootloader, the Windows driver step, write, wait for the saber and reconnect, installing from a board already in its bootloader, and putting a backup back. Full depth.
- `blade-id`: blade variants measured by Blade ID for sabers with swappable blades. Stub: hidden in Beta 1, planned for Beta 2.

### Modified Capabilities

None. The six existing specs are not changed. Where this change's behaviour touches them (the saber record keeps the firmware manifest; staged presets are replaced at install), the new specs refer to them.

## Impact

- `openspec/specs/`: six new capability specs once this change is archived.
- No code, API, dependency or data changes.
- Feeds a second triage batch in roadmap task 2.6, and unblocks `wiring-confirmation-gate`.
