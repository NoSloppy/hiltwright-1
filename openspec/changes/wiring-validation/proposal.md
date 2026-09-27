# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-firmware` (archived as `openspec/changes/archive/2026-09-24-baseline-firmware/`, design.md Findings table). This is Wave C task 3.15.

## Why

The pin table shows problems that the build then accepts. Some can damage hardware: a motor on a low-current PWM pin, or a star LED with one pin for all three colours. Others produce a config with an empty blade or overlapping ranges. Wiring edits can also be lost or overwritten. The page and the build each keep their own list of rules today (`pinTable` in the renderer, `validateModel` in core), and the lists disagree.

## What Changes

- **One set of wiring rules.** A new `wiringProblems(blades, board)` in core is used by both the Wiring page and the build. Every problem the page shows stops the build, with the same words.
- **FW6:** the rules add:
  - a low-current PWM pin driving a motor or a star LED
  - a chain whose parent is missing or is not a pixel strip on its own line
  - a chain placed before its parent
  - a pin the chosen board does not have (for example V3-only pins after switching to V2)
  - one pin used both as a data line and as a PWM power pin
  - the same pin twice within one blade
- **FST-3** (from `firmware-side-test-coverage`): switching a blade to a star LED gives each of its three channels a free pin of its own, while any remain. Its expected-failure test becomes a normal test.
- **FW27,** as the owner chose on 2026-09-26:
  - **A slot with no style.** The build still fills it with the role's default, as the spec says, but lists each filled slot as a warning, for example "Preset Valkyrie, crystal: no style chosen, using Follow the blade".
  - **A style that does not suit its blade.** A motor takes only motor styles: anything else on a motor is refused, naming the slot. Elsewhere, for example a main-blade style on a crystal, the build goes ahead with a warning naming the slot.
- **FW22:**
  - A wiring change made just before leaving the page is saved, not dropped.
  - When the saber's model changes elsewhere (adoption, a restore), the page takes the new model instead of later overwriting it with its stale copy.
- **FW23:** on a V3, only the V3-only data pins (`blade5Pin`–`blade7Pin`) are labelled "(Free)". The main data pin was labelled too, because of a string comparison.

## Non-goals

- Changing the wiring editor's layout.
- New blade kinds or boards.
- Checking style code against the blade in any deeper way than the look's declared roles.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `hardware-wiring`:
  - "Each blade says what it is built from": a star LED gets three pins of its own.
  - "Only suitable pins are offered": only the V3-only pins are labelled.
  - "Wiring problems are shown while describing it": the full list, the same rules as the build.
  - "Wiring is saved as it is described": saved on leaving, and a stale draft never overwrites.
- `config-generation`:
  - "Presets carry their fonts, tracks, names and styles": filled slots and mismatched styles are listed.
  - "Invalid models are refused before building": the new reasons, including a non-motor style on a motor.

## Impact

- **Core:**
  - `packages/core/src/config/`: a new `pinRules.ts` with `BOARD_PINS` and `wiringProblems`, used by `validateModel`, plus the slot checks and warnings in `generate.ts`
  - tests in `packages/core/test/generate.test.ts` and `wiring.test.ts`
- **Renderer:** in `apps/desktop/src/renderer/src/`:
  - `hardwareModel.ts`: `pinTable` takes its problems from core, and `withKind` picks the star's pins
  - `Hardware.tsx`: the free label
  - `Wiring.tsx`: flush on leave, and noticing an outside change
- **Tests:** `apps/desktop/test/hardware.test.ts`.
- **Checks:**
  - Every saber in the owner's library is run through the new rules, read-only, to be sure none is refused wrongly.
  - The owner builds and installs V2.2 hote2 with its real wiring, and checks the V3 labels on the Wiring page.
