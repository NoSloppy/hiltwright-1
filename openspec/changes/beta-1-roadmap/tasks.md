# Tasks

## 1. M0 Checkpoint

- [ ] 1.1 Commit the uncommitted working tree in logical commits (font library, contributors, flow and presets, Styles rename, brand and icons, OpenSpec tooling); verify `git status` shows nothing but files deliberately left untracked, and that `npm test` passes at the resulting commit
- [ ] 1.2 Fill `openspec/config.yaml` `context` with the project background from design.md D4; verify `openspec instructions proposal --change beta-1-roadmap --json` returns it under `context`
- [ ] 1.3 Add the D4 `rules` (proposal, tasks, specs, Beta 1 freeze) to `openspec/config.yaml`; verify `openspec instructions proposal|tasks|specs --change beta-1-roadmap --json` each return their rules
- [ ] 1.4 Add a note at the top of `docs/00-plan.md` saying the roadmap now lives in OpenSpec (`openspec/changes/beta-1-roadmap`); verify the note and the path it names both exist

## 2. M1 Baseline

- [ ] 2.1 Propose, audit and archive `baseline-board` (board-connection, saber-library, preset-editing, presets-ini, diagnostics, app-shell) at the D2 depths; verify `openspec validate baseline-board --strict` passes, every scenario is sorted as test, hardware or neither, and the specs appear under `openspec/specs/`
- [ ] 2.2 Propose, audit and archive `baseline-firmware` (hardware-wiring, config-generation, toolchain, firmware-build, firmware-install, blade-id stub); verify as in 2.1
- [ ] 2.3 Propose, audit and archive `baseline-sd-fonts` (sd-card, font-library, xenopixel-import stub); verify as in 2.1
- [ ] 2.4 Propose, audit and archive `baseline-styles` (style-library, style-simulator, style-editor, blade-preview); verify as in 2.1
- [ ] 2.5 Propose, audit and archive `baseline-showroom` (demo-room, hwpack, contributors); verify as in 2.1, and that `hwpack` records the key open question from design.md
- [ ] 2.6 Triage every scenario marked neither on an F capability: each gets a blocker change, joins `hardware-verification-v2`/`v3-verification`, or is moved past Beta 1 with a reason; decide here whether a support bundle / log export is a blocker; verify `openspec list` shows a change for every item kept, and the moves are recorded in this file

## 3. M2 Beta 1 blockers

- [ ] 3.1 `hide-for-beta-1`: one switch hides Blade ID and the Xenopixel import; verify neither appears in a packaged build and both reappear when the switch is flipped
- [ ] 3.2 `license-and-notices`: add a GPL-3.0 LICENSE, third-party notices (ProffieOS, fonts, styles, hilts) in the app and installer, and a source link to the tagged release; verify the About screen shows the notices and a working link in a packaged build
- [ ] 3.3 `unsigned-install-guide`: spike on a PC with Smart App Control on (install, toolchain, build, flash), then write the guide (browser download warning, Unblock, SmartScreen, SAC, Defender, S mode, the driver's UAC prompt) and a first-run check that names blocked tools; verify by following the guide on a clean Windows 11 PC
- [ ] 3.4 `hardware-verification-v2`: run the unverified scenarios on hote2 (live presets since the rewrite, adopting a planned saber and installing it, staged presets including the edge case where the board is already in its bootloader, pending colours, installing a pasted style, SD eject, style editor output on a blade, a sample of styles against the simulator, fonts heard); verify each scenario's evidence is recorded as hardware with the date
- [ ] 3.5 `v3-verification`: compile, flash budget on the V3 scale, backup, DFU, write, reconnect, a live preset edit, restore; verify each on the owner's V3 with the evidence recorded
- [ ] 3.6 Deliver every blocker change created in 2.6; verify each is archived
- [ ] 3.7 Dry run: someone other than the owner installs from the packaged installer on a clean PC using only the guide, and runs the promise end to end; verify their notes are triaged into changes or rejected

## 4. M3 Beta 1 ship

- [ ] 4.1 Version `0.x.y-beta.1`, tag it, and publish a GitHub release with the installer, the install guide and release notes that state the promise and what is hidden; verify the release downloads and installs on a clean PC
- [ ] 4.2 Set up the tester feedback channel and the triage rule (each report becomes a change tagged M4 or M5+, or is closed with a reason); verify it is written in the release notes
- [ ] 4.3 Invite the testers; verify the invite links the release and the guide

## 5. Hand-off to Beta 2

- [ ] 5.1 Create proposal-only changes `signpath-signing` and `blade-id-verification` tagged M4; verify `openspec list` shows both
