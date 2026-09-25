# Tasks

This change touches no code. Its tasks are the evidence audit, as in the earlier baselines, with the evidence kinds from design D2. For each scenario, confirm the candidate by opening the named test or source, then append the result:
- `→ test: <file> › <name>`
- `→ test [toolchain]: …`
- `→ blade: <board>, <date>, <source>`
- `→ owner by eye: <date>, <source>`
- `→ partial: …`
- `→ neither`

Tick the box only once the result is recorded. The candidates below come from the inventory and are not yet confirmed.

## 1. style-library

- [x] 1.1 A crystal's default style. Candidate: test. `looks.test.ts` › "each blade role has a default look, and it is the first one listed for that role". → test: `looks.test.ts` › "each blade role has a default look, and it is the first one listed for that role"
- [x] 1.2 Every blade style answers the effects. Candidate: test. `sim.test.ts` › "a clash is a localised white bump…", "a blast ring travels outward…", "lockup holds…" (confirm these run on library styles). → partial: `sim.test.ts` › "a clash is a localised white bump…", "a blast ring travels outward…", "lockup holds…" all run on Steady (`hw_blade`) only; the other blade styles are covered only by "covers every look in the library" (values in range) (correction to the candidate)
- [x] 1.3 Reading a style's colours. Candidate: test. `looks.test.ts` › "arguments and default colours are read from the C++, so they cannot drift"; "reads numeric argument slots and named colours". → test: `looks.test.ts` › "arguments and default colours are read from the C++, so they cannot drift"; "reads numeric argument slots and named colours"
- [x] 1.4 Comparing costs. Candidate: partial. test [toolchain] `lookSizes.test.ts` › "every look compiles, and its flash cost is known" measures the costs; the values shown are copied by hand, and the page is untested. → partial: test [toolchain] `lookSizes.test.ts` › "every look compiles, and its flash cost is known" measures the costs; the values shown are hand-copied, and the page is untested
- [x] 1.5 Pasting a library style. Candidate: partial. `looks.test.ts` › "keeps the library header apart from the expression and finds the runtime arguments"; the dialog is untested. → partial: `looks.test.ts` › "keeps the library header apart from the expression and finds the runtime arguments"; the dialog is untested
- [x] 1.6 Pasting something that is not a style. Candidate: partial. `looks.test.ts` › "rejects things that are not a style expression"; the disabled Save is untested. → partial: `looks.test.ts` › "rejects things that are not a style expression"; the disabled Save is untested
- [x] 1.7 A style for every saber. Candidate: neither. → neither
- [x] 1.8 Styles that respond to motion. Candidate: neither. → neither
- [x] 1.9 A contributor's styles. Candidate: neither (`contributors.test.ts` covers logo name matching only). → neither (`contributors.test.ts` covers logo name matching only)
- [x] 1.10 Trying a colour. Candidate: partial. `looks.test.ts` › "converts colours between hex and 16-bit words"; the page is untested. → partial: `looks.test.ts` › "converts colours between hex and 16-bit words"; the page is untested
- [x] 1.11 Correcting an author. Candidate: neither. → neither
- [x] 1.12 After choosing a new style. Candidate: neither (the queued count is untested). → neither (the queued count is untested)
- [x] 1.13 A style already on the saber. Candidate: partial. The write-and-read-back was confirmed on hote2 on 2026-09-10 from the old Presets page; the Styles-page path was never run on hardware. → partial: the write and read-back were confirmed on hote2 on 2026-09-10 from the old Presets page (plan, commit 6e4277a); the Styles-page path was never run on hardware
- [x] 1.14 A style the saber lacks. Candidate: partial. `saberModel.test.ts` › "keeps the colours beside the look, per blade"; the page is untested. → partial: `saberModel.test.ts` › "keeps the colours beside the look, per blade"; the page is untested
- [x] 1.15 Reopening a built style. Candidate: neither. → neither

## 2. style-simulator

- [x] 2.1 Every built-in style previews. Candidate: test. `sim.test.ts` › "covers every look in the library". → test: `sim.test.ts` › "covers every look in the library"
- [x] 2.2 Matching the real blade. Candidate: neither (never compared side by side; the owner judged the first 14 by eye in the app, recorded in session notes only). → neither (never compared side by side with a blade; the owner judged the first 14 by eye in the app, session notes only)
- [x] 2.3 A slower ignition. Candidate: test. `sim.test.ts` › "honours the preset arguments…" (confirm ignition time is covered). → test: `sim.test.ts` › "honours the preset arguments: base colour and a slower ignition"
- [x] 2.4 Clash on a raised blade. Candidate: partial. `sim.test.ts` › "gravity: …" places lockup by tilt; confirm whether clash placement by tilt is asserted. → partial: `sim.test.ts` › "gravity: … a lockup slides with the tilt…" places lockup by tilt; clash placement by tilt is not asserted
- [x] 2.5 Holding a lockup. Candidate: test. `sim.test.ts` › "lockup holds…". → test: `sim.test.ts` › "lockup holds while active and lets go afterwards"
- [x] 2.6 A tilt-driven style. Candidate: test. `sim.test.ts` › "unfold… horizon follows the tilt". → test: `sim.test.ts` › "unfold opens from the middle; the spark rides the ignition edge; horizon follows the tilt"
- [x] 2.7 A library style pasted as is. Candidate: test. `styleTree.test.ts` › "parses, prints and round-trips with the trailing comma dropped"; "parses and prints the user example without loss". → test: `styleTree.test.ts` › "parses, prints and round-trips with the trailing comma dropped"; "parses and prints the user example without loss"
- [x] 2.8 Broken input. Candidate: test. `styleTree.test.ts` › "rejects broken input with a useful message". → test: `styleTree.test.ts` › "rejects broken input with a useful message"
- [x] 2.9 A library-shaped style. Candidate: test. `styleTree.test.ts` › "models every template in it"; "answers clash, blast, lockup, drag, melt and lightning block distinctly". → test: `styleTree.test.ts` › "models every template in it"; "answers clash, blast, lockup, drag, melt and lightning block distinctly"
- [x] 2.10 A style that shorts the blade out. Candidate: partial. `styleTree.test.ts` › "turns the saber off on an armed clash…"; the Ignite button following it is untested. → partial: `styleTree.test.ts` › "turns the saber off on an armed clash, sparks at the emitter, then re-ignites it"; the Ignite button following it is untested
- [x] 2.11 The same style on SA22C. Candidate: test. `styleTree.test.ts` › "sa22c ignores a style turning the saber off; Fett263 obeys it". → test: `styleTree.test.ts` › "sa22c ignores a style turning the saber off; Fett263 obeys it"
- [x] 2.12 A fully modelled style. Candidate: partial. Tests assert that nothing is unsupported; the editor's note is untested. → partial: tests assert nothing unsupported (`styleTree.test.ts`, `addLayers.test.ts`); the editor's note is untested
- [x] 2.13 A pasted style on Presets. Candidate: neither (the simulator registration for saved styles is untested). → neither (the simulator registration for saved styles is untested)

## 3. blade-preview

- [x] 3.1 A gallery of styles. Candidate: owner by eye (2026-09-20, the Styles gallery; session notes). → owner by eye: 2026-09-20, the Styles gallery, session notes ("owner judged the simulated blades accurate")
- [x] 3.2 Trying an effect. Candidate: neither. → neither
- [x] 3.3 Dragging the colour picker. Candidate: neither. → neither
- [x] 3.4 Swinging with the mouse. Candidate: neither. → neither

## 4. style-editor

- [x] 4.1 Starting a new style. Candidate: neither. → neither
- [x] 4.2 Reopening a tree style. Candidate: neither. → neither
- [x] 4.3 Adding an effect. Candidate: partial. `styleBuilder.test.ts` › "every base, effect and transition produces C++ and a simulator that runs"; the stack is untested. → partial: `styleBuilder.test.ts` › "every base, effect and transition produces C++ and a simulator that runs"; the stack is untested
- [x] 4.4 Colours stay changeable. Candidate: partial. `styleBuilder.test.ts` › "a built look carries its colours as live arguments, and its define reaches the config"; never tried on a saber. → partial: `styleBuilder.test.ts` › "a built look carries its colours as live arguments, and its define reaches the config"; never tried on a saber
- [x] 4.5 Pasting a library style into Full mode. Candidate: test. `styleTree.test.ts` parse tests; owner use: Acolyte pasted on 2026-09-21 (plan). → test: `styleTree.test.ts` parse tests; owner use: Acolyte pasted into Full mode on 2026-09-21 (plan)
- [x] 4.6 Reordering by dragging. Candidate: neither. → neither
- [x] 4.7 Hiding a layer while working. Candidate: neither. → neither
- [x] 4.8 Adding a recipe. Candidate: test. `addLayers.test.ts` › "%s shows on the blade". → test: `addLayers.test.ts` › "%s shows on the blade" (every recipe and picker entry)
- [x] 4.9 A pasted lockup layer. Candidate: test. `layerCard.test.ts` › "lays the pasted lockup out as a spot, during a lockup". → test: `layerCard.test.ts` › "lays the pasted lockup out as a spot, during a lockup"
- [x] 4.10 Changing where a layer lands. Candidate: test. `layerCard.test.ts` › "switches shape, keeping the colour and the position". → test: `layerCard.test.ts` › "switches shape, keeping the colour and the position"
- [x] 4.11 A value that follows tilt. Candidate: partial. `layerCard.test.ts` › "reads fixed and following values"; "writes them back, keeping the sensor it had"; the posing preview is untested. → partial: `layerCard.test.ts` › "reads fixed and following values"; "writes them back, keeping the sensor it had"; the posing preview is untested
- [x] 4.12 Swapping a template. Candidate: neither. → neither
- [x] 4.13 Editing with the preview running. Candidate: neither. → neither
- [x] 4.14 Undoing a slider drag. Candidate: partial. `editorHistory.test.ts` covers the step logic; the keyboard and slider wiring are untested. → partial: `editorHistory.test.ts` › "joins a quick burst of edits into one step" (step logic); the keyboard and slider wiring are untested
- [x] 4.15 Copying the code. Candidate: neither. → neither
- [x] 4.16 Save then use. Candidate: partial. test [toolchain] `styleCompile.test.ts` builds from saved-style data; the page flow is untested. → partial: test [toolchain] `styleCompile.test.ts` builds from saved-style data; the page flow is untested
- [x] 4.17 A saved style compiles. Candidate: test [toolchain]. `styleCompile.test.ts` › "every effect layer, lava base, spark ignition and centre retraction"; toolchain: 70% of V2, 2026-09-21. → test [toolchain]: `styleCompile.test.ts` › "every effect layer, lava base, spark ignition and centre retraction"; toolchain: 70% of V2, 2026-09-21 (plan)

## 5. Close-out

- [x] 5.1 Summarise the audit at the end of this file as counts per capability (covered / partial / neither); verify the counts add up to 49 scenarios
- [x] 5.2 In `openspec/changes/beta-1-roadmap/tasks.md` task 2.6, add this change's Findings (ST1–ST40) and uncovered scenarios as the fourth triage batch's inputs; verify the pointer resolves
- [x] 5.3 Owner review of the four specs and the Findings table, recording any overrules in design.md; verify `openspec validate baseline-styles --strict` passes afterwards
- [x] 5.4 Archive with `openspec archive baseline-styles`; verify the four specs appear in `openspec list --specs`

## Audit summary

"Covered" means a test (including a real-toolchain test), a blade comparison or an owner's check by eye covers the whole scenario. "Partial" means only part of it is covered.

| Capability | Covered | Partial | Neither | Scenarios |
|---|---|---|---|---|
| style-library | 2 | 7 | 6 | 15 |
| style-simulator | 8 | 3 | 2 | 13 |
| blade-preview | 1 | 0 | 3 | 4 |
| style-editor | 5 | 5 | 7 | 17 |
| **Total** | **16** | **15** | **18** | **49** |

No style of any kind has been compared with a real blade, and no editor output has been installed on a saber. The logic under the simulator and the layer cards is well tested; the screens are not. Correction to the candidates: 1.2 is partial, because the effect tests run on one blade style only.
