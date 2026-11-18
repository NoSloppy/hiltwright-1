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
- **STC-1** (found while planning `styles-test-coverage`, 2026-09-29): the `style-simulator` scenario "Clash on a raised blade" says the clash lands "nearer the hilt than it would on a lowered blade". That is the opposite of the firmware.
  - ProffieOS's `ResponsiveClashL`, whose defaults the Hiltwright blade styles use, places a clash at `Scale<BladeAngle<>, TOP, BOTTOM>` (`proffieCatalogue.ts`), where:
    - TOP = `Scale<BladeAngle<0,16000>, Int<4000>, Int<26000>>`
    - BOTTOM = `Int<6000>`
  - That gives about 0.12 of the blade pointing down, the middle when level, and about 0.18 pointing up. The simulator (`hitPos` in `packages/core/src/sim.ts`) matches it: on 132 LEDs the peak is at LED 26 pointing down, 64 level, and 29 pointing up.
  - **The fix:** correct the scenario. A level blade is met in the middle, and a raised or lowered one near the hilt, as the style places it. `styles-test-coverage` pins the firmware's placement in the meantime.

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
