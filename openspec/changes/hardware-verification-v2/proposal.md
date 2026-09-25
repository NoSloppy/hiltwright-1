# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-board` (archived as `openspec/changes/archive/2026-09-24-baseline-board/`, design.md Findings table).

## Why

Almost everything rewritten on 2026-09-22 has never touched a saber. This change is the dated pass on the owner's V2.2 (hote2) that turns "neither" into evidence, in the real app, before any tester does it for us.

## What Changes

A scripted pass in the real app, recording board, date and result for each scenario. Inputs gathered so far:
- **Scenarios from `baseline-board` that need a board:**
  - saber-library 1.3, 1.16, 1.19
  - board-connection 3.17
  - diagnostics 4.3
  - preset-editing 6.1, 6.4, 6.5, 6.7, 6.9, 6.10, 6.12, 6.13, 6.15, 6.19
- **Screen-level scenarios from `baseline-board`, checked by hand (no board needed):**
  - saber-library 1.11, 1.12, 1.13, 1.14, 1.17
  - app-shell 2.1–2.10
  - board-connection 3.4, 3.5, 3.6, 3.9
  - diagnostics 4.2, 4.4, 4.5
  - preset-editing 6.2, 6.3, 6.8, 6.11, 6.17, 6.18
- **F10:** Do the Diagnostics settings survive a restart? If not, the page's claim is corrected.
- The roadmap's own list: installing a pasted style, SD eject, style editor output on a blade, a sample of styles against the simulator, fonts heard.
- Scenarios from the four later baselines, as they are archived.
- **From `baseline-firmware`, checked by hand in the real app:**
  - hardware-wiring 1.1, 1.2, 1.5, 1.7, 1.11, 1.12
  - toolchain 2.5
  - firmware-build 4.1, 4.2, 4.3, 4.5, 4.6, 4.8
  - firmware-install 5.1 (after the FW1 fix)
- **From `baseline-firmware`, on hote2:** a fresh install started from the bootloader (5.7), and a saber that is slow to return (5.11).
- **From `baseline-sd-fonts`, with a real card on hote2 or in a reader:**
  - sd-card 2.1, 2.2, 2.8, 2.9, 2.10, 2.12 (vendor firmware, after restoring a vendor backup), 2.13 and 2.14
- **From `baseline-sd-fonts`, checked by hand:**
  - font-library 1.1, 1.3 (move to another drive), 1.5, 1.12, 1.14, 1.16 (the real recycle bin), 1.17
- **Listening pass** (a person listening, with the V2.2 or none): library playback (1.15) and the Presets font picker.
- **SF9:** Removing a font to the recycle bin from a library on a USB drive.
- **From `baseline-styles`, a side-by-side blade pass on hote2 (2.2):** a sample of built-in styles (both early and late), two pasted library styles, and two editor-built styles, compared with the app's preview. Include the Styles-page "Use it in" (1.13) and changing a built style's colours on Presets without a rebuild (4.4).
- **From `baseline-styles`, checked by hand:**
  - style-library 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.14, 1.15
  - style-simulator 2.10, 2.12
  - blade-preview 3.2, 3.3, 3.4
  - style-editor 4.1, 4.2, 4.3, 4.6, 4.7, 4.11, 4.12, 4.13, 4.15, 4.16
- **From `baseline-showroom`, a listening pass in the demo room:** loading a library font (1.11), SmoothSwing (1.12), pre-on and post-off (1.13), effects including melt, a pack font playing (2.4), and a font without SmoothSwing.
- **From `baseline-showroom`, checked by hand:**
  - demo-room 1.1, 1.2, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.14
  - hwpack 2.6 (the built-in hilt on a fresh install), 2.7
  - contributors 3.4, 3.6, 3.7
  - loading a real `.glb` hilt

## Non-goals

- The V3 (`v3-verification`).
- Fixing what the pass finds. Each failure becomes a change, or joins an existing one.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change records evidence only (`skip_specs` when planned).

## Impact

No code. Results go into this change's tasks.md and are summarised in the roadmap.
