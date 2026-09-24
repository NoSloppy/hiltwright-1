# Tasks

This change touches no code. Its tasks are the evidence audit, as in `baseline-board`, with one addition from design.md D2: toolchain evidence. For each scenario, confirm the candidate by opening the named test or source, then append the result:
- `→ test: <file> › <name>`
- `→ test [toolchain]: …` for tests gated on the real toolchain
- `→ toolchain: <date>, <source>`
- `→ hardware: <board>, <date>, <source>`
- `→ partial: …`
- `→ neither`

Tick the box only once the result is recorded. The candidates below come from the inventory and are not yet confirmed.

## 1. hardware-wiring

- [x] 1.1 No saber yet. Candidate: neither. → neither
- [x] 1.2 Choosing the prop. Candidate: partial. `generate.test.ts` checks the Fett263 include only; SA22C was flashed on V2.2 on 2026-09-09 through the pre-rewrite form. → partial: test `generate.test.ts` › "produces a config that parses back…" asserts the Fett263 prop include only; SA22C was flashed on V2.2 on 2026-09-09 (commit b329367) through the pre-rewrite form; the Wiring page choice is untested
- [x] 1.3 Adding a crystal. Candidate: partial. `hardware.test.ts` › "a new blade takes the first free data pin and power pin" covers the model; the stepper is untested. → partial: test `hardware.test.ts` › "a new blade takes the first free data pin and power pin" covers the model; the stepper is untested
- [x] 1.4 A connected saber seen for the first time. Candidate: neither (the first-guess blades are untested). → neither
- [x] 1.5 A star LED accent. Candidate: partial. `generate.test.ts` › "emits a chained sub-blade, a single LED, a star LED and a motor…" covers the config; the card is untested. → partial: test `generate.test.ts` › "emits a chained sub-blade, a single LED, a star LED and a motor, and parses back" covers the config; the card is untested
- [x] 1.6 Chaining a crystal after the main blade. Candidate: test. `config.test.ts` › "computes sub-blade ranges…"; `hardware.test.ts` › "flags two separate strips on one data pin, but not a chained one" (range summary). → test: `config.test.ts` › "computes sub-blade ranges from \"continues Blade N's wire\""; `hardware.test.ts` › "flags two separate strips on one data pin, but not a chained one" (range summary "pixels 132–151")
- [x] 1.7 A motor on a V3. Candidate: partial. `hardware.test.ts` › "shared power is a note, PWM pins refuse motors and star LEDs…" covers the flag; the pins offered on the card are untested. → partial: test `hardware.test.ts` › "shared power is a note, PWM pins refuse motors and star LEDs, and a main blade is required" asserts the flag; the pins offered on the card are untested
- [x] 1.8 Two strips on one pin. Candidate: test. `hardware.test.ts` › "flags two separate strips on one data pin, but not a chained one"; `generate.test.ts` › "validates the model before generating". → test: `hardware.test.ts` › "flags two separate strips on one data pin, but not a chained one"; `generate.test.ts` › "validates the model before generating"
- [x] 1.9 Shared power (wiring). Candidate: test. `hardware.test.ts` (shared LED 3); `config.test.ts` › "shared power pins are reported, not rejected". → test: `hardware.test.ts` › "shared power is a note…" (shared LED pin); `config.test.ts` › "shared power pins are reported, not rejected"
- [x] 1.10 A free pin. Candidate: neither (check whether `hardware.test.ts` asserts a "free" row). → neither (no test asserts a "free" row; correction to the candidate)
- [x] 1.11 Leaving and coming back. Candidate: neither. → neither
- [x] 1.12 Changing a blade withdraws the confirmation. Candidate: neither (see FW1). → neither

## 2. toolchain

- [x] 2.1 First visit on a new computer. Candidate: hardware (clean PC, 2026-09-20, plan). → hardware: clean Windows PC, 2026-09-20, plan ("toolchain installed by the app"); commit 1c4342d added the panel on 2026-09-13
- [x] 2.2 Installing from nothing. Candidate: test [toolchain] `toolchain.test.ts` › "installs everything from nothing and compiles" (`HILTWRIGHT_INSTALL_TEST`); run on 2026-09-13 and on the clean PC, 2026-09-20. → test [toolchain]: `toolchain.test.ts` › "installs everything from nothing and compiles" (`HILTWRIGHT_INSTALL_TEST`), run 2026-09-13 (commit 1c4342d); hardware: clean PC, 2026-09-20
- [x] 2.3 A folder path that is too long. Candidate: neither (the refusal has never been triggered). → neither
- [x] 2.4 Low disk space. Candidate: neither. → neither
- [x] 2.5 Watching the install. Candidate: neither (implied on the clean PC, not stated). → neither
- [x] 2.6 The network drops mid-install. Candidate: partial. The gated test re-runs a finished install; no failure has been recovered from. → partial: the gated install test re-runs a finished install; no interrupted install has been recovered from

## 3. config-generation

- [x] 3.1 Generating twice. Candidate: test. `generate.test.ts` › "is deterministic". → test: `generate.test.ts` › "is deterministic"
- [x] 3.2 Colours chosen after a build. Candidate: test. `saberModel.test.ts` › "never reaches the firmware…". → test: `saberModel.test.ts` › "never reaches the firmware: colours live in the saber's presets, not the config" (text and hash equal)
- [x] 3.3 A V3 saber. Candidate: partial. V3 configs are generated in tests, but the V3 include is never asserted. → partial: `generate.test.ts` › "emits a chained sub-blade…" generates a V3 config but never asserts the V3 include; no V3 config has been compiled by the app
- [x] 3.4 A Fett263 saber. Candidate: test. `generate.test.ts` › "produces a config…" (edit-mode menu); hardware: Fett263 build installed on hote2, 2026-09-13 (commit 6e38086). → test: `generate.test.ts` › "produces a config that parses back…" (`FETT263_EDIT_MODE_MENU`, `ENABLE_ALL_EDIT_OPTIONS` path, no `DISABLE_DIAGNOSTIC_COMMANDS`); hardware: Fett263 build installed on hote2, 2026-09-13 (commit 6e38086)
- [x] 3.5 A one-button saber. Candidate: test. `generate.test.ts` › "chained blades become SubBlade rows…" (no Aux at 1 button). → test: `generate.test.ts` › "chained blades become SubBlade rows and a motor gets the motor look" (buttons 1, no `AuxButton`)
- [x] 3.6 A crystal chained after the main blade (config). Candidate: test. `config.test.ts` › "a reversed chained blade emits SubBladeReverse"; `generate.test.ts` › "chained blades become SubBlade rows…". Never compiled with the real toolchain (FW20). → test: `config.test.ts` › "a reversed chained blade emits SubBladeReverse"; `generate.test.ts` › "chained blades become SubBlade rows…"; never compiled with the real toolchain (FW20)
- [x] 3.7 Shared power (config). Candidate: test. `config.test.ts` › "shared power pins are reported, not rejected"; `generate.test.ts` › "produces a config…". → test: `config.test.ts` › "shared power pins are reported, not rejected"; `generate.test.ts` › "produces a config…" (`SHARED_POWER_PINS`, shared pin reported)
- [x] 3.8 A preset with no style chosen for the crystal. Candidate: test. `looks.test.ts` › "each blade role has a default style…". → test: `generate.test.ts` › "produces a config…" (presets with no style get HwBlade, HwAccent, HwAccent); correction: the candidate named the role-defaults test in `looks.test.ts`, which checks the mapping only
- [x] 3.9 A pasted library style. Candidate: test. `looks.test.ts` › "…keeps the library header once"; test [toolchain] `build.test.ts` hote2 with the pasted style; toolchain: 2026-09-10 (commit 6e4277a). → test: `looks.test.ts` › "compiles the chosen look into its slot and keeps the library header once"; test [toolchain]: `build.test.ts` › "compiles the generated hote2 config for a V2…" (pasted `ember` in a slot); toolchain: 84% of V2, 2026-09-10 (commit 6e4277a)
- [x] 3.10 A special ability on SA22C. Candidate: test. `looks.test.ts` › "warns that the sa22c prop…". → test: `looks.test.ts` › "warns that the sa22c prop cannot raise abilities"
- [x] 3.11 Looking up a slot. Candidate: test. `looks.test.ts` › "compiles the chosen style into its slot…". → test: `looks.test.ts` › "compiles the chosen look into its slot and keeps the library header once" (slot lookup)
- [x] 3.12 Two strips on one data pin (config). Candidate: test. `generate.test.ts` › "validates the model before generating". → test: `generate.test.ts` › "validates the model before generating"

## 4. firmware-build

- [x] 4.1 Changing a preset updates the preview. Candidate: neither. → neither
- [x] 4.2 Building a planned saber. Candidate: neither (the plan says planned-saber builds are unverified). → neither (the plan says planned-saber builds are unverified; FW1 means the install that follows is blocked)
- [x] 4.3 A model with an error. Candidate: partial. Validation is tested in `generate.test.ts`; the Build button gate is untested. → partial: validation is tested (`generate.test.ts` › "validates the model before generating"); the Build button gate is untested
- [x] 4.4 Version after install. Candidate: hardware (clean PC, 2026-09-20: `v8.10 hiltwright ce12a06`). → hardware: clean PC, 2026-09-20 (board reported `v8.10 hiltwright ce12a06`), plan
- [x] 4.5 Watching a build. Candidate: neither. → neither
- [x] 4.6 A build near the limit. Candidate: partial. test [toolchain] `build.test.ts` hote2 (percentage under 100); toolchain: 87% of V2, 2026-09-22. The meter colours are untested. → partial: test [toolchain] `build.test.ts` › "compiles the generated hote2 config for a V2…" (percentage under 100); toolchain: 87% of V2, 2026-09-22; the meter colours are untested
- [x] 4.7 Too big for the board. Candidate: test. `build.test.ts` › "translateErrors" (confirm the flash-overflow pattern is among the six tested). → test: `build.test.ts` › translateErrors › "turns compiler output into owner language" (flash overflow → "too big")
- [x] 4.8 New styles waiting. Candidate: neither (the count shown is untested). → neither

## 5. firmware-install

- [x] 5.1 Wiring not yet confirmed. Candidate: neither (see FW1). → neither (see FW1, reproduced: the gate can never open for a saber without Hiltwright firmware)
- [x] 5.2 Confirming the install. Candidate: hardware (installs on V2.2 on 2026-09-09 and on the clean PC on 2026-09-20). → hardware: V2.2 hote2, 2026-09-09 (commit b329367); clean PC, 2026-09-20
- [x] 5.3 A path with different slashes. Candidate: hardware (V2.2, 2026-09-09: the first attempt stopped safely; the fix then flashed). → hardware: V2.2, 2026-09-09 (commit b329367: the write guard stopped the first attempt; the fix then flashed)
- [x] 5.4 A normal install keeps a backup. Candidate: hardware (doc 09 item 10, V2.2, 2026-09-09; clean PC, 2026-09-20). → hardware: doc 09 item 10, V2.2, 2026-09-09 (256 KB backup); clean PC, 2026-09-20
- [x] 5.5 The backup fails. Candidate: neither. → neither
- [x] 5.6 Reboot from running firmware. Candidate: hardware (doc 09 item 10, 2026-09-09; clean PC, 2026-09-20). → hardware: doc 09 item 10, V2.2, 2026-09-09 (RebootDFU); clean PC, 2026-09-20
- [x] 5.7 Board already in its bootloader. Candidate: partial (the clean PC resumed from the bootloader after the driver step; a fresh install from the bootloader is not recorded). → partial: the clean PC resumed from the bootloader after the driver step (2026-09-20); a fresh install started from the bootloader is not recorded
- [x] 5.8 A computer without the driver. Candidate: hardware (clean PC, 2026-09-20: one click, auto-resume). → hardware: clean PC, 2026-09-20 (commit b660c13; plan: one click through the Windows approval prompt, automatic resume)
- [x] 5.9 A tampered download. Candidate: neither. → neither
- [x] 5.10 A successful install. Candidate: hardware (V2.2, 2026-09-09; clean PC, 2026-09-20). → hardware: V2.2, 2026-09-09 (commit b329367); clean PC, 2026-09-20 (commit 6ea8968)
- [x] 5.11 The saber does not come back. Candidate: neither. → neither
- [x] 5.12 Progress lines cut into pieces. Candidate: test. `transfer.test.ts` › "copes with a line the pipe cut into pieces". → test: `transfer.test.ts` › "copes with a line the pipe cut into pieces"
- [x] 5.13 An unexpected error. Candidate: neither. → neither
- [x] 5.14 Restoring the previous firmware. Candidate: hardware (owner, 2026-09-20). → hardware: owner, 2026-09-20, plan (restore verified on hardware); commit 05a34d1
- [x] 5.15 An erased read. Candidate: neither (`flash.ts` has no tests). → neither (`flash.ts` has no tests)

## 6. blade-id

- [x] 6.1 Measuring before the first install. Candidate: partial. `generate.test.ts` › "swapping on but nothing measured yet…" covers the firmware record; the disabled Measure button is untested. → partial: `generate.test.ts` › "swapping on but nothing measured yet…" covers the firmware record; the disabled Measure button is untested
- [x] 6.2 Two blades too close to tell apart. Candidate: test. `generate.test.ts` › "refuses blades whose readings are too close to tell apart". → test: `generate.test.ts` › "refuses blades whose readings are too close to tell apart"

## 7. Close-out

- [x] 7.1 Summarise the audit at the end of this file as counts per capability (covered / partial / neither); verify the counts add up to 55 scenarios
- [x] 7.2 Check FW1 in the real app without a board: plan a saber, confirm its wiring, build, and see whether Install unlocks. Record the result against FW1 in design.md; verify the finding says "reproduced" or "not reproduced"
- [x] 7.3 In `openspec/changes/beta-1-roadmap/tasks.md` task 2.6, add this change's Findings (FW1–FW37) and uncovered scenarios as the second triage batch's inputs; verify the pointer resolves
- [x] 7.4 Owner review of the six specs and the Findings table, recording any overrules in design.md; verify `openspec validate baseline-firmware --strict` passes afterwards
- [x] 7.5 Archive with `openspec archive baseline-firmware`; verify the six specs appear in `openspec list --specs`

## Audit summary

"Covered" means a test (including a real-toolchain test), a hardware check, or both cover the whole scenario. "Partial" means only part of it is covered.

| Capability | Covered | Partial | Neither | Scenarios |
|---|---|---|---|---|
| hardware-wiring | 3 | 4 | 5 | 12 |
| toolchain | 2 | 1 | 3 | 6 |
| config-generation | 11 | 1 | 0 | 12 |
| firmware-build | 2 | 2 | 4 | 8 |
| firmware-install | 8 | 1 | 6 | 15 |
| blade-id | 1 | 1 | 0 | 2 |
| **Total** | **27** | **10** | **18** | **55** |

Nothing has been checked on a V3. The uncovered scenarios are mostly failure paths (backup failure, tampered download, saber not returning, unexpected error, erased read) and pages rewritten on 2026-09-22.

Corrections to the candidates:
- 1.10 is neither, because no test asserts a "free" pin row.
- 3.8 is covered by `generate.test.ts`, not by the role-defaults test.
- 5.1 is neither, and FW1 is now reproduced (7.2).
