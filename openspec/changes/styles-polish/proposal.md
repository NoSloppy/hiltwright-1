# Proposal

**Milestone:** M4 (Beta 2). Triaged on 2026-09-24 from the findings of `baseline-styles` (archived as `openspec/changes/archive/2026-09-24-baseline-styles/`, design.md Findings table).

## Why

Low-severity findings from the styles baseline. None blocks Beta 1.

## What Changes

- **ST11:** Recognise the same code pasted twice.
- **ST12:** Correct the stale statements in the plan and comments, and test the shown flash costs against the measurement.
- **ST24:** The Presets preview uses the blade's real LED count and follows the picker while dragging.
- **ST25:** Offer every special ability the saber's prop has.
- **ST26:** Correct the stale "cannot be simulated" texts and the fallback bar's hint.
- **ST27:** Re-measure preview performance, record the catalogue's ProffieOS version and check it against the pinned one, and settle the documented-entry count.
- **ST28:**
  - an unknown prop is not assumed to be Fett263
  - long blades are not cut
  - the glow does not depend on LED count
  - the preview dev hook is development-only
  - an edited pasted style gets a fresh simulator
- **ST35:** Keep the code as written when printing it back.
- **ST36:** Update the plan's "not yet" lists and record the editor work of 94b47fc.
- **ST37:** "Copy the style" copies something the paste box accepts.
- **ST38:** Allow saving a copy, and going back from tree to Simple where possible.
- **ST39:** Keep layer selection stable across a paste, stop a second ignition/retraction layer being added, and keep undo history while the editor stays open in the session.

## Non-goals

- Anything that blocks Beta 1.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `style-library`, `style-simulator`, `style-editor`, `blade-preview`: small requirement additions per item.

## Impact

Renderer style pages, `packages/core/src/{sim,styleTree,lookSim}.ts`, docs.
