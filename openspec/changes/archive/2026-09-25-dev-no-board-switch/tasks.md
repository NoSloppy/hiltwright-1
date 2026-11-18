# Tasks

## 1. The gate in main

- [x] 1.1 Move the Proffieboard recognition in `grantSerial()` into `serialAllowed(device, noBoard)` in `apps/desktop/src/main/serialGate.ts` (design D2). Use it in the device permission handler, and make `select-serial-port` select nothing when `HILTWRIGHT_NO_BOARD` is set. Verify with `apps/desktop/test/serialGate.test.ts`:
  - a Proffieboard by ids is allowed
  - a Proffieboard by Windows instance id is allowed
  - another serial device is refused
  - with `noBoard` true, the Proffieboard is refused both ways
- [x] 1.2 Skip main's start-up auto-connect call when `HILTWRIGHT_NO_BOARD` is set, and add the switch to the development-aid comments in `main/index.ts`. Verify in task 3.1 that the log shows no auto-connect attempt.

## 2. The page says why

- [x] 2.1 Add `app.boardAccess(): Promise<boolean>` (IPC `app:boardAccess`, preload, `shared/api.ts`). Make `connect()` in `board.ts` check it first; when it is false, set the error "Board access is off for this run (HILTWRIGHT_NO_BOARD)." and return (design D3). Verify in task 3.1 that pressing Connect shows that message. Verify with `npm run typecheck` that the interface is complete.

## 3. Hardware check (V2.2 hote2 plugged in)

- [x] 3.1 With hote2 plugged in, start the development app offscreen on a scratch folder with `HILTWRIGHT_NO_BOARD=1`, and drive it:
  - wait past start-up
  - press Connect
  - read the header chip and Armory message
  - read the log

  Verify that the log shows the permission handler refusing the board and no port opened, that no board identity was read, and that the Armory shows the no-board message.
  - **Result, 2026-09-25, V2.2 hote2 plugged in (COM8).** The log shows `auto-connect skipped: HILTWRIGHT_NO_BOARD`, and the permission handler refused hote2 (`VID_1209&PID_6668&MI_00` → false) and the other serial device. No `select-serial-port` line and no port opened: `getPorts()` returned 0. No board identity was read, and the header stayed on "No saber yet". Pressing Connect turned the chip to Error and showed "Board access is off for this run (HILTWRIGHT_NO_BOARD)."
- [x] 3.2 Plug hote2 in (or replug it) while the no-board run is going, and verify that the log shows no connection attempt reaching a port.
  - **Result, 2026-09-25, V2.2 hote2.** The owner unplugged and replugged hote2 during a three-minute no-board run. In the log, hote2 drops out of the permission checks and comes back, and it is refused each time (`→ false`). There is no `select-serial-port` line. The page saw no serial connect event, `getPorts()` stayed at 0, and the header stayed on "No saber yet".
- [x] 3.3 Without the switch, start the development app once with hote2 plugged in. Verify that it still connects on its own as before (identify sequence in the log). Only read commands run.
  - **Result, 2026-09-25, V2.2 hote2.** Started with `-Board`, which leaves the switch unset, on a scratch folder. The permission handler allowed hote2 (`→ true`) and refused the other serial device. The port opened and the auto-connect was attempted. The identify sequence read ProffieOS v8.10 `hiltwright_hote2.h`, 13 presets, 18 fonts and blades [132,1,2]. The commands were all reads: version, battery, get_volume, get_preset, list_presets, list_fonts, list_tracks and scanid. The header showed "hote2 · Connected · 1209:6668". Only the scratch folder's library recorded the saber.

## 4. Close

- [x] 4.1 Set `HILTWRIGHT_NO_BOARD=1` by default in the offscreen verification harness, and update the project note on test runs to say so (design D4). Verify by reading the harness.
  - **Result, 2026-09-25.** The scratch harness `run-app.ps1` sets `HILTWRIGHT_NO_BOARD=1` unless called with `-Board`. The project note on test runs says so.
- [x] 4.2 Run `npm test` and `npm run typecheck`; verify both pass.
  - **Result, 2026-09-25.** 175 core and 121 desktop tests pass (7 gated skipped), and the type check is clean.
- [x] 4.3 After archive, tick roadmap task 3.4a in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
  - **Result, 2026-09-25.** Archived as `2026-09-25-dev-no-board-switch` with the app-shell requirement synced; roadmap 3.4a is ticked.
