# Tasks

## 1. M0 Checkpoint

- [x] 1.1 Commit the uncommitted working tree in logical commits (font library, contributors, flow and presets, Styles rename, brand and icons, OpenSpec tooling); verify `git status` shows nothing but files deliberately left untracked, and that `npm test` passes at the resulting commit
  - Done on branch `beta-1-roadmap` as 530e80e (OpenSpec), d406220 (brand sources), 94b47fc (app). The app features share files (IPC, preload, styles, shared controls), so they are one commit that builds rather than several that do not. `npm test` 276 passed (gated skipped), typecheck clean. Left untracked: root `hiltwright-logo.svg`, `hiltwright.png` (owner to decide).
- [x] 1.2 Fill `openspec/config.yaml` `context` with the project background from design.md D4; verify `openspec instructions proposal --change beta-1-roadmap --json` returns it under `context`
- [x] 1.3 Add the D4 `rules` (proposal, tasks, specs, Beta 1 freeze) to `openspec/config.yaml`; verify `openspec instructions proposal|tasks|specs --change beta-1-roadmap --json` each return their rules
- [x] 1.4 Add a note at the top of `docs/00-plan.md` saying the roadmap now lives in OpenSpec (`openspec/changes/beta-1-roadmap`); verify the note and the path it names both exist

## 2. M1 Baseline

- [x] 2.1 Propose, audit and archive `baseline-board` (board-connection, saber-library, preset-editing, presets-ini, diagnostics, app-shell) at the D2 depths; verify `openspec validate baseline-board --strict` passes, every scenario is sorted as test, hardware or neither, and the specs appear under `openspec/specs/`
- [x] 2.2 Propose, audit and archive `baseline-firmware` (hardware-wiring, config-generation, toolchain, firmware-build, firmware-install, blade-id stub); verify as in 2.1
- [x] 2.3 Propose, audit and archive `baseline-sd-fonts` (sd-card, font-library, xenopixel-import stub); verify as in 2.1
- [x] 2.4 Propose, audit and archive `baseline-styles` (style-library, style-simulator, style-editor, blade-preview); verify as in 2.1
- [x] 2.5 Propose, audit and archive `baseline-showroom` (demo-room, hwpack, contributors); verify as in 2.1, and that `hwpack` records the key open question from design.md
- [x] 2.6 Triage every scenario marked neither on an F capability: each gets a blocker change, joins `hardware-verification-v2`/`v3-verification`, or is moved past Beta 1 with a reason; decide here whether a support bundle / log export is a blocker; verify `openspec list` shows a change for every item kept, and the moves are recorded in this file
  - Closed 2026-09-24: all five batches triaged (198 findings, each placed once), and the owner decided the support bundle is a Beta 1 blocker (`support-bundle`).
  - Inputs from baseline-board: the Findings table in `baseline-board/design.md` (F1–F47; after archive under `openspec/changes/archive/`), and the scenarios marked neither or partial in `baseline-board/tasks.md` (44 neither and 14 partial of 78).
  - **Triage of the baseline-board batch, 2026-09-24** (owner asked to triage this batch now; the other four baselines are triaged as they archive):

    | Change | Milestone | Findings | Scenarios |
    |---|---|---|---|
    | connection-robustness | M2 | F1, F2, F3, F5, F7 | |
    | library-integrity | M2 | F14, F15, F16, F17 | |
    | wiring-confirmation-gate | M2 | F18 | needs `baseline-firmware` archived first |
    | safe-staged-install | M2 | F31, F32, F47 | |
    | preset-history-restore | M2 | F33, F34 | |
    | preset-editor-fixes | M2 | F36, F37, F38, F41, F43, F44, F45 | |
    | sets-safety | M2 (could move to M4) | F35, F39 | |
    | diagnostics-feedback | M2 (could move to M4) | F6, F9, F11, F12, F13 | |
    | release-hardening | M2 | F25, F26, F27, F28, F29 | |
    | board-side-test-coverage | M2 | | 1.1, 1.2, 1.4-1.7, 1.9, 1.15, 1.18, 1.20, 3.3, 3.14, 5.3, 6.14, 6.16 |
    | hardware-verification-v2 | M2 | F10 | 15 board scenarios + 28 hand-checked screen scenarios |
    | v3-verification | M2 | | all 23 board-marked scenarios + OS 8 framing (3.10, 3.13) |
    | board-side-polish | M4 | F4, F19, F20, F21, F23, F24, F40, F42 | |
    | board-side-later | M5+ | F22, F30, F46 | |
    | blade-id-verification (task 5.1) | M4 | F8 (connect re-runs blade detection) | |
  - Inputs from baseline-firmware: the Findings table in `baseline-firmware/design.md` (FW1–FW37, which also corrects F18 and extends F31), and the scenarios marked neither or partial in `baseline-firmware/tasks.md` (18 neither and 10 partial of 55).
  - **Triage of the baseline-firmware batch, 2026-09-24:**

    | Change | Milestone | Findings | Scenarios |
    |---|---|---|---|
    | wiring-confirmation-gate (rewritten) | M2 | FW1, FW2 (supersede F18) | 5.1 once fixed |
    | install-target-safety | M2 | FW3, FW4, FW5, FW31 | |
    | wiring-validation | M2 | FW6, FW22, FW23, FW27 | |
    | install-safety-nets | M2 | FW7, FW8, FW9, FW10, FW12, FW29 | |
    | toolchain-integrity | M2 | FW11, FW28, FW32, FW36 | |
    | build-correctness | M2 | FW13, FW14, FW15, FW16 | |
    | firmware-side-test-coverage | M2 | FW20 | 1.3, 1.4, 1.10, 2.3, 2.4, 2.6, 3.3, 5.5, 5.9, 5.11, 5.13, 5.15 |
    | safe-staged-install (extended) | M2 | FW37 | |
    | release-hardening (extended) | M2 | FW33 | |
    | library-integrity (extended) | M2 | FW26 | |
    | hardware-verification-v2 (extended) | M2 | | 14 hand checks + 5.7, 5.11 on hote2 |
    | v3-verification (extended) | M2 | | 4.4, 5.4, 5.6, 5.8, 5.10, 5.14, 5.7, V3 build (3.3) |
    | firmware-side-polish | M4 | FW17, FW18, FW24, FW25, FW34, FW35 | |
    | firmware-side-later | M5+ | FW19, FW30 | |
    | blade-id-verification (task 5.1) | M4 | FW21 | 6.1 |
  - Inputs from baseline-sd-fonts: the Findings table in `baseline-sd-fonts/design.md` (SF1–SF34), and the scenarios marked neither or partial in `baseline-sd-fonts/tasks.md` (14 neither and 8 partial of 33).
  - **Triage of the baseline-sd-fonts batch, 2026-09-24:**

    | Change | Milestone | Findings | Scenarios |
    |---|---|---|---|
    | font-library-integrity | M2 | SF1, SF2, SF3, SF4, SF5, SF6, SF7, SF8 | |
    | card-safety | M2 | SF22, SF23, SF24, SF25, SF26, SF27, SF28 | |
    | font-check-alignment | M2 | SF13, SF14, SF21 | |
    | sd-fonts-test-coverage | M2 | | 1.2, 1.3, 1.5, 1.11, 2.4, 2.7, 2.8, 2.9, 2.10, 2.14, 3.1 |
    | hardware-verification-v2 (extended) | M2 | SF9 | 8 real-card scenarios, 7 hand checks, a listening pass |
    | v3-verification (extended) | M2 | | 2.11, 2.13 |
    | license-and-notices (task 3.2) | M2 | SF30 (config and source pointer on the card) | |
    | hide-for-beta-1 (task 3.1) | M2 | SF34 (Xenopixel still visible) | |
    | sd-fonts-polish | M4 | SF10, SF11, SF12, SF15, SF16, SF17, SF18, SF19, SF20, SF29, SF31, SF33 | |
    | firmware-side-later (extended) | M5+ | SF32 | |
  - Inputs from baseline-styles: the Findings table in `baseline-styles/design.md` (ST1–ST40), and the scenarios marked neither or partial in `baseline-styles/tasks.md` (18 neither and 15 partial of 49).
  - **Triage of the baseline-styles batch, 2026-09-24:**

    | Change | Milestone | Findings | Scenarios |
    |---|---|---|---|
    | style-save-integrity | M2 | ST1, ST2, ST8, ST9, ST10, ST29, ST30, ST31 | |
    | style-to-saber-fixes | M2 | ST3, ST4, ST5, ST6, ST7 | |
    | style-attribution | M2 | ST13, ST14, ST15, ST16, ST17, ST18, ST40 | feeds license-and-notices (task 3.2) |
    | preview-honesty | M2 | ST19, ST20, ST21, ST22, ST23 | |
    | editor-output-safety | M2 | ST32, ST33, ST34 | |
    | styles-test-coverage | M2 | | 1.2, 1.12, 2.4, 2.13 |
    | hardware-verification-v2 (extended) | M2 | | side-by-side blade pass (2.2, 1.13, 4.4) + 25 hand checks |
    | v3-verification (extended) | M2 | | the blade sample on the V3 |
    | styles-polish | M4 | ST11, ST12, ST24-ST28, ST35-ST39 | |
  - Inputs from baseline-showroom: the Findings table in `baseline-showroom/design.md` (SR1–SR40), and the scenarios marked neither or partial in `baseline-showroom/tasks.md` (16 neither and 5 partial of 33).
  - **Triage of the baseline-showroom batch, 2026-09-24:**

    | Change | Milestone | Findings | Scenarios |
    |---|---|---|---|
    | demo-hilt-safety | M2 | SR1, SR2, SR3, SR4, SR5 | |
    | demo-room-fixes | M2 | SR6, SR9, SR12 | |
    | demo-sound-fidelity | M2 | SR10, SR11, SR13 | |
    | pack-integrity | M2 | SR17, SR18, SR19, SR21, SR24, SR26, SR32 | decides the hwpack key question |
    | contributors-integrity | M2 | SR33, SR34, SR35, SR36, SR39 | |
    | release-hardening (extended) | M2 | SR22 | |
    | hardware-verification-v2 (extended) | M2 | | demo-room listening pass + 15 hand checks + a real GLB |
    | showroom-polish | M4 | SR7, SR8, SR14, SR15, SR16, SR20, SR23, SR25, SR27-SR31, SR37, SR38, SR40 | |

## 3. M2 Beta 1 blockers, in waves (design D7)

Each "Deliver" task means: complete the change's specs, design and tasks with `/opsx:propose` (or continue it), apply it, and archive it after its own verification. Changes that touch the board link, build, install or the SD card carry their own hardware check (config rule), so hardware time is spread across waves B-D, not saved for wave F. Within a wave, the order given is the recommended one. Waves B-E share no code except where noted in design D8, so separate sessions can work on them in parallel once wave A is done.

### Wave A: unblock and equip

- [x] 3.1 Deliver `wiring-confirmation-gate`: first, because FW1 blocks every first install; verify it is archived
- [x] 3.2 Deliver `release-hardening`: development aids off in packaged builds, before any packaged verification; verify it is archived
- [x] 3.3 Deliver `support-bundle`: a log and a diagnostics file, useful for every hardware check that follows; verify it is archived
- [x] 3.4 Deliver `hide-for-beta-1`: covers SF34 and FW21; verify it is archived
- [x] 3.4a Deliver `dev-no-board-switch`: filed 2026-09-25 after verification runs reached hote2; do it before the next verification run that could see a board; verify it is archived

### Wave B: nothing the owner made is lost

- [x] 3.5 Deliver `board-side-test-coverage`: characterisation tests before the library and presets are touched; verify it is archived
- [x] 3.6 Deliver `library-integrity`: builds the shared safe store (design D8) that 3.7-3.9 reuse; also covers the unflagged preset-sets store; verify it is archived
- [x] 3.7 Deliver `font-library-integrity`; verify it is archived
- [x] 3.8 Deliver `style-save-integrity`; verify it is archived
- [x] 3.9 Deliver `contributors-integrity`; verify it is archived
- [x] 3.10 Deliver `demo-hilt-safety`; verify it is archived

### Wave C: the right firmware on the right board

- [x] 3.11 Deliver `firmware-side-test-coverage`: seams and tests for the flasher before it is changed; verify it is archived
- [x] 3.12 Deliver `connection-robustness`: unplug and silence handling that installs rely on; verify it is archived
- [x] 3.13 Deliver `toolchain-integrity`: pinned, verified toolchain before builds are relied on; verify it is archived
- [ ] 3.14 Deliver `build-correctness`; verify it is archived
- [ ] 3.15 Deliver `wiring-validation`; verify it is archived
- [ ] 3.16 Deliver `install-target-safety`: after 3.1, reusing the board and blade layout it adds to the firmware record; verify it is archived
- [ ] 3.17 Deliver `install-safety-nets`; verify it is archived
- [ ] 3.18 Deliver `safe-staged-install`; verify it is archived

### Wave D: the saber does what the app shows

- [ ] 3.19 Deliver `sd-fonts-test-coverage`; verify it is archived
- [ ] 3.20 Deliver `styles-test-coverage`; verify it is archived
- [ ] 3.21 Deliver `preset-editor-fixes`: together with 3.23; both change how queued and live styles meet in the model; verify it is archived
- [ ] 3.22 Deliver `preset-history-restore`; verify it is archived
- [ ] 3.23 Deliver `style-to-saber-fixes`; verify it is archived
- [ ] 3.24 Deliver `card-safety`: blocks preset writes while the card is shared, so after 3.21-3.22; verify it is archived
- [ ] 3.25 Deliver `font-check-alignment`; verify it is archived
- [ ] 3.26 Deliver `preview-honesty`; verify it is archived
- [ ] 3.27 Deliver `editor-output-safety`; verify it is archived
- [ ] 3.28 Deliver `demo-sound-fidelity`; verify it is archived
- [ ] 3.29 Deliver `demo-room-fixes`; verify it is archived
- [ ] 3.30 Deliver `diagnostics-feedback`: kept in Beta 1 by the owner, 2026-09-24; verify it is archived
- [ ] 3.31 Deliver `sets-safety`: kept in Beta 1 by the owner, 2026-09-24; verify it is archived

### Wave E: credit and licence

- [ ] 3.32 Deliver `style-attribution`; verify it is archived
- [ ] 3.33 Deliver `pack-integrity`: decides the hwpack key question before the Shadowfoil conversation; verify it is archived
- [ ] 3.34 Deliver `license-and-notices`: last in the wave, taking the statements from 3.32 and 3.33; decides SF30; verify it is archived

### Wave F: prove it

- [ ] 3.35 Deliver `unsigned-install-guide`: its Smart App Control spike needs only a clean Windows 11 PC and can run at any time from wave A on; verify it is archived
- [ ] 3.36 Deliver `hardware-verification-v2`: after waves B-D, re-running on hote2 everything they changed plus the remaining scenarios; verify it is archived
- [ ] 3.37 Deliver `v3-verification`: after 3.13, 3.14 and 3.16, which set up V3 builds and board detection; verify it is archived
- [ ] 3.38 Dry run: someone other than the owner installs from the packaged installer on a clean PC using only the guide, and runs the promise end to end; verify their notes are triaged into changes or rejected

## 4. M3 Beta 1 ship

- [ ] 4.1 Version `0.x.y-beta.1`, tag it, and publish a GitHub release with the installer, the install guide and release notes that state the promise and what is hidden; verify the release downloads and installs on a clean PC
- [ ] 4.2 Set up the tester feedback channel and the triage rule (each report becomes a change tagged M4 or M5+, or is closed with a reason); verify it is written in the release notes
- [ ] 4.3 Invite the testers; verify the invite links the release and the guide

## 5. Hand-off to Beta 2

- [ ] 5.1 Create proposal-only changes `signpath-signing` and `blade-id-verification` tagged M4; verify `openspec list` shows both
