# Tasks

## 1. Hardware facts

- [ ] 1.1 On the V2.2 hote2 and the V3.9 (design D7), before any code. Check the connected board first (PnP `VID_1209&PID_6668`), and ask the owner before rebooting a board into its bootloader. Record in design.md:
  - each board's bootloader serial (PnP instance id and `dfu-util -l` `serial=`) next to its running serial
  - a `dfu-util -l` listing with both boards in their bootloaders
  - Electron's `select-serial-port` port list with both running: whether `serialNumber` or `deviceInstanceId` is filled
  - that `dfu-util -d 0483:df11 -S <serial> -l` lists only that board

  Leave both boards back in their firmware, and confirm with `version`. Verify: the values are written into design.md's Context, and D4/D6 are adjusted if they contradict it.

## 2. Knowing the board

- [ ] 2.1 In `apps/desktop/src/main/flash.ts`:
  - `usbState` lists bootloaders with serials, and the running serials
  - `dfuInfo` returns one entry per device, with its serial and flash size
  - add `boardForFlash`
  - `backupFlash`, `writeFirmware` and `restoreBackup` take a target serial and use `-d 0483:df11 -S <serial>` (design D3, D6)
  - add `flash.target(serial)` through `ipc.ts`, `preload` and `shared/api.ts`

  Verify with a new `apps/desktop/test/flash.test.ts`: parsing the 1.1 listings, `boardForFlash` for 262144, 524288 and others, the serial read from an instance id (and none from a generated `&` id), and the dfu-util arguments for each call. Then `npm test`.
- [ ] 2.2 Add `SaberRecord.bootloader` and `library.noteBootloader(id, …)` in main, which refuses a serial over 40 characters or an unknown flash size (design D1). Verify in `apps/desktop/test/library.test.ts`: the record is stored, bad input is refused, and a normal connect's identity merge keeps it.
- [ ] 2.3 In `packages/core/src/config/generate.ts`:
  - `SaberConfigModel.boardFrom`
  - `validateModel` refuses a model without it: "Choose the board (Proffieboard V2 or V3) on the Wiring page."
  - `boardHint(configName)`

  Update the test models and fixtures that build to carry `boardFrom`. Verify in `packages/core/test/generate.test.ts`: the refusal, and the hint for a V3 name, a V2 name and a neutral name. Then `npm test` in `packages/core`.
- [ ] 2.4 `draftModel` decides the board as in design D2 (bootloader record, then firmware record, then the owner's choice, else not chosen), and sets `boardCorrected`. The Wiring page:
  - shows neither board pressed when not chosen, with the label note and the hint
  - saves `boardFrom: 'owner'` on a press
  - shows the corrected-board note

  Turn the BST-3 test in `apps/desktop/test/draftModel.test.ts` into a normal test: a config naming a V3 suggests V3 and chooses neither. Add one test per source and the corrected case. Verify with `npm test` and `npm run typecheck`, and in 5.2.

## 3. Installing to the right board

- [ ] 3.1 In `installFlow.ts` (design D3, D4, D6):
  - note the bootloaders before the reboot, and take the one new serial as the target
  - recognise a board already in its bootloader, refuse another saber's, and ask about an unknown one through a new `confirmTarget` report
  - stop on several unknown bootloaders
  - check the target's board against the build's before the backup, and refuse early when the saber's recorded board differs
  - record the pairing with `noteBootloader`, and after a confirmed unknown board, only when the saber returns with its own running serial

  Restore gets the same target checks plus the backup size. Verify in `apps/desktop/test/installFlow.test.ts`: one test per refusal (nothing backed up or written), the pairing after a reboot, no pairing after a mistaken confirmation, the early refusal with no reboot, and restore refusing a 256 KB backup on a 512 KB board.
- [ ] 3.2 In `Build.tsx` (design D5):
  - keep `built: { model, result }`, and mark the build out of date when `preview.hash` differs, with Install locked and the note
  - pass `built.model` to the install
  - show the "Is it <saber>?" confirmation with Yes and Cancel
  - show the refusals

  `BuildResult` gains `board`. Verify in `installFlow.test.ts` that the built model, not a later one, is recorded, and that `expectAfterInstall` gets its name. Then `npm run typecheck`, and see 5.2.

## 4. Reconnecting to the installed saber

- [ ] 4.1 Add `usb.wantSerial(serial)` in main. `select-serial-port` picks the port with that USB serial, using `serialNumber` or the PnP parent as 1.1 found (design D6). `board.connect(interactive, { serial })` passes it, and the identity takes it. The install and restore flows reconnect with the saber's serial. When the saber reached is not the installed one, the page says "Installed on <saber>. Reconnected to <other>, which is also plugged in." Verify in `apps/desktop/test/serialGate.test.ts` (choosing by serial, falling back to the first Proffieboard when none matches or none is wanted), and in `installFlow.test.ts` (the reconnect asks for the serial, and the note when another saber answers).

## 5. Checks

- [ ] 5.1 Run `npm test` and `npm run typecheck`; verify both pass.
- [ ] 5.2 Development run with no board, on a scratch folder holding a saber that has no firmware and no bootloader record, and a saber with a firmware record. Verify that:
  - the first saber's Wiring page chooses neither board, shows the note, and the Build page refuses. Choosing V3 clears both.
  - the second saber's board is chosen without asking
  - after `hiltwrightPretendBuilt(true)`, changing a pixel count shows "The setup changed after this build" with Install locked, and changing it back unlocks it
- [ ] 5.3 Hardware check by the owner, from a development build:
  - **V3.9:** set its Wiring to V2, confirm, build, and install. The install stops at the bootloader with the V2-on-V3 words, and nothing is written. RESET brings the saber back on its old firmware. Set it back to V3.
  - **V2.2 hote2:** build, change a preset's style, and see Install locked as out of date. Build again and install; it finishes "Installed", and the Wiring page shows V2 chosen from the saber.
  - **Both plugged in:** install hote2. Only hote2 reboots and is written, and the app reconnects to hote2, not the V3.
  - **hote2 already in its bootloader** (BOOT+RESET), no saber connected: Install on hote2 goes on without asking. Install on the V3's record is refused, naming hote2.
- [ ] 5.4 After archive, tick roadmap task 3.16 in `openspec/changes/beta-1-roadmap/tasks.md`. Also note in `v3-verification`'s proposal that its deferred two-boards step is unblocked. Verify both edits.
