# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-firmware` (archived as `openspec/changes/archive/2026-09-24-baseline-firmware/`, design.md Findings table). This is Wave C task 3.14.

## Why

A few build defects will reach Beta 1's style builders directly:
- V3 flash percentages read low.
- Compile errors say nothing about which preset or style they come from.
- A style name can break the compile.
- A config name can write outside the build folder.
- A build that throws leaves Build & Install on "Building…" forever.

## What Changes

- **FW13:** The flash budget uses the board's real capacity: the size arduino-cli reports for the build, or else the limit the board support declares. That is V2 262,144 bytes and V3 507,904 bytes, not 524,288, which made V3 percentages read about 3% low.
- **FW14:**
  - **Naming the source.** An error inside a preset's style names the preset, the blade and the style. The generator records which config lines hold which preset slot, and the error translation reads the line number back.
  - **The untested patterns.** The two untested translation patterns ("options cannot be combined", and "a blade table that does not match the presets") get tests.
  - **Option conflicts, before compiling.** Options that conflict are caught before compiling, from the chosen prop's own `#error` rules in the installed ProffieOS. Examples are `FETT263_SPECIAL_ABILITIES` with `FETT263_MULTI_PHASE`, or an option that needs `ENABLE_ALL_EDIT_OPTIONS`. The owner reads the prop's own sentence, with the build stopped before the compiler runs.
  - Checking pin names for the board is FW6 in `wiring-validation`, and is not repeated here.
- **FW15:** Style names, authors and swappable-blade names are made safe wherever they go into comments in the config:
  - no `*/` inside a `/* … */` comment
  - no line break or trailing backslash in a `//` comment

  Any name then produces a config that compiles.
- **FW16:** The model is checked before any file is written. The config name is valid, and every path the build writes stays inside the saber's build folder.
- **HW-2026-09-25b** (seen on hote2 during `library-integrity` 6.3): a build that throws, instead of returning a failure, ends the step as failed. It shows the reason in plain words and offers Save diagnostics, and the timer stops. It never stays on "Building…".

## Non-goals

- The build cache (FW17, `firmware-side-polish`).
- Pin names checked against the board (FW6, `wiring-validation`).
- Explaining every compiler message. Anything not recognised still shows the compiler's first error line, now with the preset and style where known.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `firmware-build`:
  - "Building needs only the compiler and a valid model": nothing is written before the model is checked, and nothing outside the build folder.
  - "The flash budget is shown": the real capacity.
  - "Build errors are explained in plain words": the preset, blade and style named; prop option conflicts caught before compiling; a thrown build ending as failed.
- `config-generation`: new "Names never break the config".

## Impact

- **Core:** `packages/core/src/config/generate.ts`: safe comment text, and the slot line map in the result. Tests go in `packages/core/test/generate.test.ts`.
- **Main:** `apps/desktop/src/main/build.ts`:
  - the capacity
  - the line-map translation
  - the prop-rule pre-check, reading `props/<file>.h` from the installed ProffieOS
  - validate-before-write, and the path check
- **Renderer:** `apps/desktop/src/renderer/src/Build.tsx`: a thrown build ends as failed.
- **Tests:** `apps/desktop/test/build.test.ts`, some gated on the toolchain.
- **Hardware check:** gated compiles for V2 and V3, including a style named to break comments. Then the owner builds and installs V2.2 hote2.
