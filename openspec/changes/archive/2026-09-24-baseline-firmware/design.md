# Design

## Context

This change writes specs for behaviour that already exists (see proposal.md). It follows the method of the archived `baseline-board` (`openspec/changes/archive/2026-09-24-baseline-board/design.md`), decisions D1–D4, which are not repeated here. The behaviour was inventoried from the code at 9bfdf0e. The sources were:
- `packages/core/src/config/{generate,blades,emit,parse}.ts`, `looks.ts` and `lookLibrary.ts`
- `apps/desktop/src/main/{build,toolchain,flash,driver,ipc}.ts`
- `apps/desktop/src/renderer/src/{Wiring,Hardware,Build}.tsx`, `hardwareModel.ts`, `saberModel.ts`, `workspace.ts`, `transfer.ts` and `board.ts`

The evidence came from the tests, docs 00, 02, 06, 07 and 09, and commit messages.

The facts that shape the audit:
- Firmware has been built and installed from the app on one board only, the V2.2 hote2 (2026-09-09 and 2026-09-20).
- Many library styles have been compiled with the real toolchain, but no V3 build has ever come from the app.
- `flash.ts` and `driver.ts` have no tests.
- The Wiring page and its confirmation were introduced by the flow rewrite of 2026-09-22 and are untested on hardware.

## Goals / Non-Goals

**Goals:**
- Specs precise enough to sort every scenario by its evidence.
- One list of every defect and gap in this half of the app, merged with what `baseline-board` already found, for the second triage batch.

**Non-Goals:**
- Fixes, which come after triage.
- A hardware-verification task. This change touches no code; new runs belong to `hardware-verification-v2` and `v3-verification`.

## Decisions

### D1. `baseline-board`'s method applies unchanged
Specs state what holds, defects go in the Findings table, and code wins over the plan where they disagree. Evidence is classed as covered by a test, a hardware check, partial, or neither. Scenarios that only a real board can confirm are marked.
- *Rejected:* re-deciding the method per baseline. The five baselines must be comparable for triage.

### D2. A real-toolchain compile is its own kind of evidence
Several scenarios (a config compiles, a build reports its size) are covered by tests that run only with `HILTWRIGHT_TOOLCHAIN_DIR`, or by dated compiles in the plan, but never by a board. The audit records these as `test [toolchain]` or `toolchain: <date>`. They count as covered for generation and build scenarios, but not for anything that needs the firmware to run on a saber.
- *Rejected:* counting a compile as hardware evidence. A config that compiles can still have the wrong pins.

### D3. The wiring confirmation is specified narrowly
The spec states only what holds: the owner can confirm; board and blade changes withdraw it on the Wiring page; unconfirmed wiring locks Install; installed firmware counts as confirmed. What does not hold is left to findings FW1 and FW2: the confirmation being kept at all, and "until changed" for an installed saber. `wiring-confirmation-gate` rewrites the requirement.
- *Rejected:* specifying the plan's rule ("installed wiring counts as confirmed until changed"). No page implements it.

### D4. Things other capabilities own are referenced, not restated
- **The firmware record after install and restore:** `saber-library`.
- **Clearing staged presets during an install:** `preset-editing`.
- **Validation of pasted styles and the per-style flash cost of the library:** left to `baseline-styles`.
- **The config parser and its golden round trips:** not specified. The app never uses them (FW19), so they are not observable behaviour.

## Corrections to earlier findings

- **`baseline-board` F18 is wrong in one respect.** It says the Wiring page withdraws the confirmation after an installed saber's blades change. It does so only for about 300 ms: the page compares against the autosaved record, not against what was installed, and the firmware record holds no blades. The rule on every page is effectively "an installed saber is confirmed for good". FW2 below supersedes F18. `wiring-confirmation-gate` should read FW1 and FW2 before it is planned.
- **`safe-staged-install` gains a case (FW37).** Cancelling at the driver step leaves the saber in its bootloader with its presets already deleted.

## Findings for triage

Numbered FW to keep them apart from `baseline-board`'s F-numbers. Severity:
- **High:** can damage hardware, put the wrong firmware on a board, leave a board unusable, block the Beta 1 path, or run unverified code.
- **Med:** misleading, or a visible gap.
- **Low:** polish or stale docs.

"From code reading" means the defect was found by reading the code and has not been reproduced.

| # | Capability | Finding | Severity |
|---|---|---|---|
| FW1 | hardware-wiring | The "I checked the wiring" stamp is never kept. The working model is rebuilt from the saved record by a function that leaves the stamp out, and other pages save that model back. On a saber without Hiltwright firmware (a plan, or vendor firmware), the confirmation cannot take effect, so Install stays locked. This is the Beta 1 promise's main path. Reproduced on 2026-09-24 at the model level: a saved record carrying the stamp gives a working model without it, so the Build & Install gate stays shut (the page itself was not driven, because the app has no separate data folder and a test plan would have gone into the owner's real library). Probably since 2026-09-22. | High |
| FW2 | hardware-wiring | Every page treats a saber with Hiltwright firmware as confirmed for good, even after its blades change, and the switch cannot be turned off. The firmware record keeps no blade layout to compare against. This supersedes `baseline-board` F18. | High |
| FW3 | config-generation, firmware-install | The board type is never detected. It defaults to V2, because the V3 check reads the OS version string, and planned sabers are always V2. The build's board is never compared with the flash size the bootloader reports, and a restore accepts either size. A V2 image can be written to a V3. | High |
| FW4 | firmware-install | With nothing connected, Install writes the selected saber's build to whatever board is in its bootloader. There is no check that it is the same board. | High |
| FW5 | firmware-build, firmware-install | A build is not invalidated when the model changes afterwards. Install then writes the old image but records the current model with the old firmware record. That mislabels styles and colours, and can drop staged presets that were never built. | High |
| FW6 | hardware-wiring, config-generation | The build validates less than the pin table shows. These all build: a low-current PWM pin driving a motor or star LED (reachable by switching a V3 single LED's kind); a chain whose parent is missing or not an own-line strip (it emits an empty blade expression); a chain placed before its parent, giving overlapping ranges; V3-only pins after switching to V2; one V3 pin used as both data and PWM; a star LED with the same pin for all three colours. | High |
| FW7 | firmware-install | A backup counts as successful if dfu-util exits cleanly with a non-empty file. An erased or protected read passes, and the install goes ahead. The only backup is later marked "not a usable image". | High |
| FW8 | firmware-install | Restoring overwrites the current firmware without backing it up first, and the restore path has no driver step. | Med |
| FW9 | firmware-install | If the saber does not reappear in time, the firmware record is not stored after an install and the staged mark stays. After a restore it is not cleared, so the record still claims Hiltwright firmware. | Med |
| FW10 | firmware-install | The "only Hiltwright-built firmware" guard only checks that the file is under the toolchain folder. The main process does not check wiring or whether the file matches the model; the gate is in the page only. | Med |
| FW11 | toolchain | Toolchain downloads are not verified. arduino-cli and the ProffieOS zip (from a movable tag) have no hash. The board-support core is unpinned, so the compiler and dfu-util can change silently. Versions are assumed, not read. Downloads have no timeout, the setup cannot be cancelled, and two setups can run at once. | High |
| FW12 | firmware-install | There is no verify step. After a write the app waits for USB and reconnects, but does not check the reported version or config. The plan and the page's own comment promise "write → verify". | Med |
| FW13 | firmware-build | The V3 flash budget uses 524,288 bytes, but the measured limit is 507,904, so percentages read about 3% low. The size arduino-cli reports is ignored. | Med |
| FW14 | firmware-build | Error translation is half-done. Preset names are unused, there is no config line map, and two patterns are untested. The planned pre-compile checks (prop define conflicts, pin names for the board) do not exist. | Med |
| FW15 | config-generation | Style names and authors are put into C comments unescaped, so a name containing `*/` or a line break breaks the compile. | Med |
| FW16 | firmware-build | The config file is written to a path built from the model's name before the name is validated. A name with `..` could write outside the build folder. | Med |
| FW17 | firmware-build | The build cache is never used: the app always forces a rebuild. Eviction is not oldest-first, the cache key leaves out the core version, and the hash leaves out the config name. | Low |
| FW18 | firmware-build | Each saber's sketch copy accumulates commented-out config lines and old config files. | Low |
| FW19 | config-generation | The config parser and emitter, with golden round trips, exist but the app never uses them. The plan's "import as text" is not reachable. | Low |
| FW20 | config-generation | Never compiled with the real toolchain: chained sub-blades, single LED, star LED, motor, 3 buttons, extra defines. RGBW colour orders may be emitted with the wrong spelling for ProffieOS (unverified). | Med |
| FW21 | blade-id | Blade ID is visible today (covered by `hide-for-beta-1`). A failed Measure gives no feedback. Unmeasured variants drop out of the build silently. A chained main blade gets no power-for-ID. Variant changes do not withdraw the wiring confirmation. | Low (hidden in Beta 1) |
| FW22 | hardware-wiring | Leaving Wiring within 300 ms of the last change loses it. A stale draft can overwrite a model changed elsewhere, for example by adoption. | Med |
| FW23 | hardware-wiring | On a V3, the main data pin is labelled "(Free)" (string comparison bug). | Low |
| FW24 | config-generation | Every build turns on SD-mount mode through the edit options, but the voice pack check covers Fett263 only. Comments and docs about `MOUNT_SD_SETTING` are stale. | Low |
| FW25 | config-generation | Special abilities: BC is assumed to support them with no check, the default-prop warning is untested, and other prop features pasted styles need (alt fonts) are not detected. | Low |
| FW26 | config-generation | Adopting a saber replaces its compiled styles with Hiltwright's, and nobody tells the owner. A kept `presets.ini` then points at different styles. | Med |
| FW27 | config-generation | A preset's style row is not validated against its blades. A blade style can land on a motor, and missing entries are silently filled with defaults. | Med |
| FW28 | docs | Contradictions: the path limit (40 in code, 120 in the plan), disk footprint (1.6/1.7/2.0 GB), the driver helper (libwdi in the plan, the ProffieOS installer in code), backup timing, the toolchain folder in the plan, and the 83%/70% figures being conflated. | Low |
| FW29 | firmware-install | The "could not reboot" message can never show for a connected saber, so a board that ignores the reboot surfaces only as the bootloader timeout. After a failed backup the board is left in its bootloader and the owner is not told to reset it. | Med |
| FW30 | firmware-install | Installing cannot work on macOS or Linux (the USB check is a stub). | Low (Windows-only beta) |
| FW31 | firmware-install | With two boards plugged in, the USB check and dfu-util take the first match. Related to `baseline-board` F15. | Med |
| FW32 | toolchain | The toolchain folder is created when the app starts, before the owner agrees to anything. Whether other Windows users can tamper with the machine-wide folder, from which GCC and dfu-util run, has not been examined. | Med |
| FW33 | firmware-install | A development hook confirms the wiring as a side effect and is live in packaged builds (overlaps `baseline-board` F25). | Med |
| FW34 | hardware-wiring | Doc 07 §7a disagrees with the code on five points: motor pins, the Advanced disclosure, star LED pin count, read-only after setup, and per-preset style validation. | Low |
| FW35 | hardware-wiring | "Strips on this wire" (parallel strips) has no effect on the build. | Low |
| FW36 | toolchain | A toolchain that is already installed at a path that is too long is not flagged; builds then fail with the translated error. | Low |
| FW37 | firmware-install, preset-editing | Cancelling at the driver step leaves the saber in its bootloader with its staged-install presets already deleted. This extends `baseline-board` F31. | High |

## Risks / Trade-offs

- [FW1 was reproduced at the model level only] → The fix change (`wiring-confirmation-gate`) must drive the real page: plan a saber, confirm the wiring, build, and see Install unlock.
- [Many High findings in one area] → Expected, because this is the riskiest area. Several share a root (no record of installed wiring; no board identity at install), so triage can group them.
- [Specs describe a confirmation rule that is about to change] → D3 keeps it narrow on purpose. `wiring-confirmation-gate` will modify it.

## Owner review

Approved by the owner on 2026-09-24 with no overrules: the six specs, D1-D4, the correction to `baseline-board` F18 and the Findings severities stand as written. The batch is triaged straight after archive, as with `baseline-board`.
