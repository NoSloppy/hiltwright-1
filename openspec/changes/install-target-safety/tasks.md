# Tasks

## 1. Hardware facts

- [x] 1.1 On the V2.2 hote2 and the V3.9 (design D7), before any code. Check the connected board first (PnP `VID_1209&PID_6668`), and ask the owner before rebooting a board into its bootloader. Record in design.md:
  - each board's bootloader serial (PnP instance id and `dfu-util -l` `serial=`) next to its running serial
  - a `dfu-util -l` listing with both boards in their bootloaders
  - Electron's `select-serial-port` port list with both running: whether `serialNumber` or `deviceInstanceId` is filled
  - that `dfu-util -d 0483:df11 -S <serial> -l` lists only that board

  Leave both boards back in their firmware, and confirm with `version`. Verify: the values are written into design.md's Context, and D4/D6 are adjusted if they contradict it.
  - **Result, 2026-09-27.** Both boards were plugged in together, and the open development window was closed by the owner first. The table is in design.md's Context.
    - **Serials:** each bootloader uses the same serial as its firmware: hote2 `209133815232`, V3.9 `207A349A5430`.
    - **Flash:** hote2 reports `0128*0002Kg` (256 KB), the V3 `0256*0002Kg` (512 KB).
    - **Targeting:** `-S <serial>` lists only that board.
    - **Leaving:** a 4-byte read ending in `:leave` returns a board to its firmware. Both answered `version` afterwards, unchanged.
    - **Ports:** `requestPort()` needs a click, so the reconnect cannot use `select-serial-port`. The device permission handler gets each interface's instance id, whose PnP parent is the serial.

    Adjusted to match:
    - **Recognising a saber (D4):** a bootloader is recognised by the saber's running serial as well as a recorded bootloader serial. The spec's recognition wording follows.
    - **The reconnect (D6):** it filters the permission handler rather than using `select-serial-port`.
    - **Proposal:** corrected.
    - **FW29:** the leave step is noted in `install-safety-nets`.

## 2. Knowing the board

- [x] 2.1 In `apps/desktop/src/main/flash.ts`:
  - `usbState` lists bootloaders with serials, and the running serials
  - `dfuInfo` returns one entry per device, with its serial and flash size
  - add `boardForFlash`
  - `backupFlash`, `writeFirmware` and `restoreBackup` take a target serial and use `-d 0483:df11 -S <serial>` (design D3, D6)
  - add `flash.target(serial)` through `ipc.ts`, `preload` and `shared/api.ts`

  Verify with a new `apps/desktop/test/flash.test.ts`: parsing the 1.1 listings, `boardForFlash` for 262144, 524288 and others, the serial read from an instance id (and none from a generated `&` id), and the dfu-util arguments for each call. Then `npm test`.
  - **Result, 2026-09-27.**
    - **`usbState`** (through `usbStateFrom`) lists `bootloaders` with serials, and `runtimeSerials`, from whole devices only. `serialFromInstanceId` returns null for a Windows-made id.
    - **Parsing:** `parseDfuList` gives one device per board, with its serial and "@Internal Flash" size. `boardForFlash` maps 262144 to V2 and 524288 to V3.
    - **Targeting:** `pickDevice` takes the serial's board, or with none, only a single bootloader. `flashTarget` backs the new `flash.target(serial)`.
    - **Backup, write and restore** take the serial, with `dfuDeviceArgs` = `-d 1209:6668,0483:df11 -S <serial>`.
      - **Changed from design D6:** the running id stays, because dfu-util checks a `.dfu` file's id against it. The serial limits the match instead, and design D6 is updated.
    - **IPC:**
      - `flash:restore` looks up the board's flash itself and refuses another size.
      - `flash:waitForBootloader` takes the serials present before a reboot, and returns the new ones.
      - `flash:waitForRuntime` takes the saber's serial.

    `apps/desktop/test/flash.test.ts` has 13 tests, all passing: the 1.1 listing with both boards, serial-less devices, the board sizes, instance ids, the USB state, new bootloaders, picking a device, the arguments for backup, write and target, and a 256 KB backup refused on a 512 KB board. The whole desktop suite passes: 281 tests, 13 gated skipped. The live `usbState` check listed both boards' serials.
- [x] 2.2 Add `SaberRecord.bootloader` and `library.noteBootloader(id, …)` in main, which refuses a serial over 40 characters or an unknown flash size (design D1). Verify in `apps/desktop/test/library.test.ts`: the record is stored, bad input is refused, and a normal connect's identity merge keeps it.
  - **Result, 2026-09-27.**
    - **The record:** `SaberRecord.bootloader` holds `{ serial, flashBytes, board, at }`.
    - **Storing it:** `Library.noteBootloader` refuses:
      - any flash size except 262144 or 524288
      - a serial that is not 1–40 letters and digits

      A recorded serial is taken off any other record. It is wired as `library.noteBootloader` through IPC and the preload.
    - **Normal connects:** `upsert` leaves the field alone, so it is kept.

    Four new tests in `apps/desktop/test/library.test.ts` pass (21 in the file):
    - kept through a connect and a restart
    - V3 without a serial
    - refusals
    - one board per serial
- [x] 2.3 In `packages/core/src/config/generate.ts`:
  - `SaberConfigModel.boardFrom`
  - `validateModel` refuses a model without it: "Choose the board (Proffieboard V2 or V3) on the Wiring page."
  - `boardHint(configName)`

  Update the test models and fixtures that build to carry `boardFrom`. Verify in `packages/core/test/generate.test.ts`: the refusal, and the hint for a V3 name, a V2 name and a neutral name. Then `npm test` in `packages/core`.
  - **Result, 2026-09-27.**
    - **The model:** `SaberConfigModel.boardFrom` (`'bootloader' | 'firmware' | 'owner'`).
    - **The refusal:** `validateModel` refuses a model without it with `BOARD_NOT_CHOSEN`, "Choose the board (Proffieboard V2 or V3) on the Wiring page."
    - **The hint:** `boardHint(configName)` returns V2 or V3 only when the name mentions exactly one of them as a word part. `saber_v31` and `v2_to_v3` give none.
    - **Test models:** every model that is validated or built got `boardFrom: 'owner'`:
      - core: banks, generate, looks, styleBuilder, wiring
      - desktop: build, hardware, styleCompile, toolchain, saberModel, lookSizes, firmwareRecord, supportBundle

    Two new tests in `packages/core/test/generate.test.ts` pass: the refusal from each missing source, and the hints. Core: 204 tests pass, and the type check is clean. Desktop: 285 tests pass.
- [x] 2.4 `draftModel` decides the board as in design D2 (bootloader record, then firmware record, then the owner's choice, else not chosen), and sets `boardCorrected`. The Wiring page:
  - shows neither board pressed when not chosen, with the label note and the hint
  - saves `boardFrom: 'owner'` on a press
  - shows the corrected-board note

  Turn the BST-3 test in `apps/desktop/test/draftModel.test.ts` into a normal test: a config naming a V3 suggests V3 and chooses neither. Add one test per source and the corrected case. Verify with `npm test` and `npm run typecheck`, and in 5.2.
  - **Result, 2026-09-27.**
    - **Where the board comes from:** `knownBoard(saber)` in `saberModel.ts` tries, in order:
      - the bootloader record
      - the firmware record's board, when the saved wiring names the same board or there is none
      - the saved model's `boardFrom: 'owner'`

      A saved `boardFrom` of anything but `'owner'` does not count by itself.
    - **The draft:** `draftModel` takes that board and `boardFrom`. When nothing is known, it keeps the saved board, or V2, only for the pin lists, with no `boardFrom`.
    - **The design's `boardCorrected` flag became `boardCorrection(saber)`**, computed from the record. The note then stays until the corrected wiring is saved, which the lapsed confirmation forces anyway.
    - **`boardSuggestion(saber)`** gives the name hint only while the board is not known.
    - **The Wiring page:**
      - **Not known:** neither board is pressed, and a note asks for the label (with the hint). A press saves `boardFrom: 'owner'`.
      - **From the bootloader:** the board is fixed. The other button is disabled, with "Read from the saber at its last install."
      - **Corrected:** a note says the board was corrected.
      - **Outside changes:** `boardFrom` is part of the wiring the page compares.

    BST-3 is a normal test ("V3 is suggested, and no board is chosen"). Six new tests in `apps/desktop/test/draftModel.test.ts` pass (14 in the file): nothing chosen, the owner's choice, firmware with and without saved wiring, the owner switching away, the bootloader winning with the correction, and a planned saber. Desktop: 291 tests pass. The type check is clean, except for installFlow's fakes, which 3.1 rewrites. The page itself is checked in 5.2.

## 3. Installing to the right board

- [x] 3.1 In `installFlow.ts` (design D3, D4, D6):
  - note the bootloaders before the reboot, and take the one new serial as the target
  - recognise a board already in its bootloader, refuse another saber's, and ask about an unknown one through a new `confirmTarget` report
  - stop on several unknown bootloaders
  - check the target's board against the build's before the backup, and refuse early when the saber's recorded board differs
  - record the pairing with `noteBootloader`, and after a confirmed unknown board, only when the saber returns with its own running serial

  Restore gets the same target checks plus the backup size. Verify in `apps/desktop/test/installFlow.test.ts`: one test per refusal (nothing backed up or written), the pairing after a reboot, no pairing after a mistaken confirmation, the early refusal with no reboot, and restore refusing a 256 KB backup on a 512 KB board.
  - **Result, 2026-09-27.** `installFlow.ts`:
    - **`reachBootloader`:**
      - **A connected saber:** notes the bootloaders present, reboots, and waits for a new one. That one is the target, or it stops when two appear at once.
      - **Otherwise:** takes the one bootloader that belongs to this saber (its running serial, or its recorded bootloader serial). It refuses one that belongs to another saber, naming it, and stops when there are several or none. For a board belonging to no saber, it asks `confirmTarget(saber name)`. Cancel returns to "built".
    - **`checkTarget`:**
      - refuses a flash size Hiltwright does not know, or the other board type, both with how to leave the bootloader
      - records the pairing with `noteBootloader`, except on the owner's word
    - **After a confirmed board is written:** the pairing is recorded only when this saber's running serial was absent before and is present after.
    - **Before any reboot:** `installSequence` refuses early when the saber's recorded board is not the build's.
    - **`restoreSequence(deps, saber, backup, connected)`** gets the same target checks, plus the backup size. Its signature changed from `(deps, saberId, backup)`.
    - **Backup, write, restore, the runtime wait and the reconnect** all use the target's serial.
    - **The refusal words** live in the new `shared/boards.ts`, which main's `flash.ts` also uses.

    `apps/desktop/test/installFlow.test.ts` was rewritten around a fake USB world (boards running or in bootloader, each with its flash). All 26 tests pass:
    - the four audit tests and the driver pause
    - the board type: V2 build on a V3, early refusal with no reboot, unknown size, and a V3 build remembered
    - which board:
      - two sabers
      - another bootloader present
      - two new bootloaders
      - recognised by running serial and by recorded bootloader serial
      - another saber's board
      - asked and cancelled
      - asked, with no pairing, and asked with the pairing
      - a mistaken answer still refused by size
      - two unknown bootloaders
      - two with one ours
      - after the driver step
    - the built model recorded
    - restore: wrong size, own board with reconnect, another saber's
- [x] 3.2 In `Build.tsx` (design D5):
  - keep `built: { model, result }`, and mark the build out of date when `preview.hash` differs, with Install locked and the note
  - pass `built.model` to the install
  - show the "Is it <saber>?" confirmation with Yes and Cancel
  - show the refusals

  `BuildResult` gains `board`. Verify in `installFlow.test.ts` that the built model, not a later one, is recorded, and that `expectAfterInstall` gets its name. Then `npm run typecheck`, and see 5.2.
  - **Result, 2026-09-27.**
    - **What the build keeps:** `Build.tsx` keeps `builtModel`, the model passed to `build.run`. The install and the record use it. `BuildResult` gains `board` (set in main's `build.ts`).
    - **Out of date:** the build is stale when `preview.hash` differs from `result.configHash`. Then:
      - the Build step reads "out of date", with the note "The setup changed after this build. Build again to install it."
      - Install and its confirmation are locked, and an armed install is disarmed
      - the hint says the same
    - **The question:** "Is it <saber>?" appears in the Install step, with "Yes, it is <saber>" and Cancel. It is wired as the flow's `confirmTarget`.
    - **What the flow is given:** `noteBootloader` refreshes the library, `sabers` is the library, and `connected` is the live status.
    - **The development aid:** `hiltwrightPretendBuilt` now pretends a build of the current setup, for 5.2.

    Verified by the `installFlow.test.ts` test "the record after the install is the model the job carries": the name and model come from the built model. The type check is clean in both workspaces, and desktop has 313 tests passing. See 5.2.

## 4. Reconnecting to the installed saber

- [x] 4.1 Add `usb.wantSerial(serial)` in main. While a serial is wanted, the device permission handler allows only the Proffieboard interface whose PnP parent has that serial, and `getPorts()` returns only that board (design D6, as changed after 1.1). `board.connect(interactive, { serial })` passes it, and the identity takes it. The install and restore flows reconnect with the saber's serial. When the saber reached is not the installed one, the page says "Installed on <saber>. Reconnected to <other>, which is also plugged in." Verify in `apps/desktop/test/serialGate.test.ts` (choosing by serial, falling back to the first Proffieboard when none matches or none is wanted), and in `installFlow.test.ts` (the reconnect asks for the serial, and the note when another saber answers).
  - **Result, 2026-09-27.**
    - **Main:**
      - `serialGate.ts` holds the wanted serial (`wantSerial`, `activeWant`, `setWantedInterfaces`, lapsing after 5 minutes). While a serial is wanted, `serialAllowed` lets through only the interfaces known to be that board's.
      - `usb.ts` has `interfacesOf` (interface ids whose PnP parent carries the serial), `proffieInterfaces` (one PnP query) and `lookUpWanted` (one lookup at a time).
      - The permission handler starts a lookup when it holds a board back.
      - `usb:wantSerial` returns how many interfaces were found.
    - **The page (`board.ts`):**
      - `reachNext(serial, hold)`: without `hold`, a board that cannot be found is given up on.
      - `connect(interactive, { serial })`. The owner's own Connect clears the want.
      - The identity takes the wanted serial.
      - `saberRef` is set on identify, and exposed as `currentSaber()`.
    - **The flows** call `reachNext` before the write or restore, then reconnect with the serial. When another saber answers, the page says "Installed on <saber>. Reconnected to <other>, which is also plugged in. …"
    - **Changed from design D6:** the want starts before the write, because the connect event raced the flow (HW-2026-09-25c). Design D6 is updated.

    Verified by four new tests in `apps/desktop/test/serialGate.test.ts`:
    - no want
    - only the wanted interface, once known
    - interfaces of a board no longer wanted, and the lapse
    - `interfacesOf` on the 1.1 instance ids

    And by three new tests in `installFlow.test.ts`:
    - the hold comes before the write, and the reconnect uses the serial
    - the amber note when another saber answers
    - no serial wait for a board the owner vouched for

    35 tests pass across the two files. Desktop has 320 tests passing and core 204, and the type check is clean.

## 5. Checks

- [x] 5.1 Run `npm test` and `npm run typecheck`; verify both pass.
  - **Result, 2026-09-27.** From the repository root: `npm test` passes 204 core tests and 320 desktop tests (13 gated skipped), and `npm run typecheck` is clean in both workspaces.
- [x] 5.2 Development run with no board, on a scratch folder holding a saber that has no firmware and no bootloader record, and a saber with a firmware record. Verify that:
  - the first saber's Wiring page chooses neither board, shows the note, and the Build page refuses. Choosing V3 clears both.
  - the second saber's board is chosen without asking
  - after `hiltwrightPretendBuilt(true)`, changing a pixel count shows "The setup changed after this build" with Install locked, and changing it back unlocks it
  - **Result, 2026-09-27.** Scratch folder copied from the remembered-hote2 one, with no board:
    - "Fresh V3": no firmware or bootloader record, config name `config/proffieboard_v3_config.h`.
    - hote2: given a V2 firmware record.
    - A development-only `hiltwrightChangeSetup` was added to the Build page. The page unmounts on every page switch, so this is how to change the saved setup while it stays open.

    Everything held:
    - **Fresh V3:**
      - The Wiring page showed neither board pressed, with "Which Proffieboard is this? Check the label on the board (V2.2 or V3.x) and choose it above. Nothing is built until you do. Its config name suggests a V3."
      - The Build page showed "Choose the board (Proffieboard V2 or V3) on the Wiring page."
      - Choosing V3 pressed it, cleared both notes, and saved `V3 owner`.
    - **hote2:** V2 was pressed without a note, and nothing asked for a board.
    - **The stale build:**
      - After `hiltwrightPretendBuilt(true)`, the Build step read "unchanged, reused", with Install enabled.
      - Blade 1 one pixel shorter: "out of date", the note "The setup changed after this build. Build again to install it.", and Install disabled.
      - Changed back: "unchanged, reused", with Install enabled again.
- [ ] 5.3 Hardware check by the owner, from a development build:
  - **V3.9:** set its Wiring to V2, confirm, build, and install. The install stops at the bootloader with the V2-on-V3 words, and nothing is written. RESET brings the saber back on its old firmware. Set it back to V3.
  - **V2.2 hote2:** build, change a preset's style, and see Install locked as out of date. Build again and install; it finishes "Installed", and the Wiring page shows V2 chosen from the saber.
  - **Both plugged in:** install hote2. Only hote2 reboots and is written, and the app reconnects to hote2, not the V3.
  - **hote2 already in its bootloader** (BOOT+RESET), no saber connected: Install on hote2 goes on without asking. Install on the V3's record is refused, naming hote2.
- [ ] 5.4 After archive, tick roadmap task 3.16 in `openspec/changes/beta-1-roadmap/tasks.md`. Also note in `v3-verification`'s proposal that its deferred two-boards step is unblocked. Verify both edits.
