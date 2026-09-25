# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-styles` (archived as `openspec/changes/archive/2026-09-24-baseline-styles/`, design.md Findings table).

## Why

"Demo any premade or created style" rests on the preview telling the truth. Today:
- A layer the simulator does not model can cover the whole blade.
- The warning about unmodelled parts appears only in the full editor.
- Several simplifications go unreported.
- The 2D preview always behaves as if the prop were Fett263.
- The built-in styles are simulated from hand-written copies no one checks against the compiled code.

## What Changes

- **ST19:** An unmodelled layer paints nothing (is transparent) and is named.
- **ST20:** Wherever a pasted or built style previews (Styles, Presets, demo room), the owner is told when parts are not modelled or only approximate.
- **ST21:** Each simplification (variation, alt fonts, colour change, time-bending, hard stripes, fire delay, very deep styles, the sound-length stand-in) is either modelled or reported as approximate.
- **ST22:** The 2D preview uses the working saber's prop, and plays preon and post-off.
- **ST23:** A test runs each built-in style's C++ through the style evaluator and compares it with its hand-written simulation, so the two cannot drift.
- A side-by-side pass against a real blade belongs to `hardware-verification-v2`.

## Non-goals

- Modelling every remaining template.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `style-simulator`: an unmodelled layer is transparent, and the report is shown wherever styles preview.
- `blade-preview`: follows the working saber's prop, plus preon and post-off.

## Impact

`packages/core/src/{styleTree,sim,lookSim}.ts`, `apps/desktop/src/renderer/src/{BladePreview,Looks,Presets}.tsx`, `packages/core/test/{sim,styleTree}.test.ts`.
