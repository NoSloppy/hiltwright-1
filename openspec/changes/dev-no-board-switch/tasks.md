# Tasks

## 1. The gate in main

- [x] 1.1 Move the Proffieboard recognition in `grantSerial()` into `serialAllowed(device, noBoard)` in `apps/desktop/src/main/serialGate.ts` (design D2). Use it in the device permission handler, and make `select-serial-port` select nothing when `HILTWRIGHT_NO_BOARD` is set. Verify with `apps/desktop/test/serialGate.test.ts`:
  - a Proffieboard by ids is allowed
  - a Proffieboard by Windows instance id is allowed
  - another serial device is refused
  - with `noBoard` true, the Proffieboard is refused both ways
- [ ] 1.2 Skip main's start-up auto-connect call when `HILTWRIGHT_NO_BOARD` is set, and add the switch to the development-aid comments in `main/index.ts`. Verify in task 3.1 that the log shows no auto-connect attempt.

## 2. The page says why

- [ ] 2.1 Add `app.boardAccess(): Promise<boolean>` (IPC `app:boardAccess`, preload, `shared/api.ts`). Make `connect()` in `board.ts` check it first; when it is false, set the error "Board access is off for this run (HILTWRIGHT_NO_BOARD)." and return (design D3). Verify in task 3.1 that pressing Connect shows that message. Verify with `npm run typecheck` that the interface is complete.

## 3. Hardware check (V2.2 hote2 plugged in)

- [ ] 3.1 With hote2 plugged in, start the development app offscreen on a scratch folder with `HILTWRIGHT_NO_BOARD=1`, and drive it:
  - wait past start-up
  - press Connect
  - read the header chip and Armory message
  - read the log

  Verify that the log shows the permission handler refusing the board and no port opened, that no board identity was read, and that the Armory shows the no-board message.
- [ ] 3.2 Plug hote2 in (or replug it) while the no-board run is going, and verify that the log shows no connection attempt reaching a port.
- [ ] 3.3 Without the switch, start the development app once with hote2 plugged in. Verify that it still connects on its own as before (identify sequence in the log). Only read commands run.

## 4. Close

- [x] 4.1 Set `HILTWRIGHT_NO_BOARD=1` by default in the offscreen verification harness, and update the project note on test runs to say so (design D4). Verify by reading the harness.
  - **Result, 2026-09-25.** The scratch harness `run-app.ps1` sets `HILTWRIGHT_NO_BOARD=1` unless called with `-Board`. The project note on test runs says so.
- [x] 4.2 Run `npm test` and `npm run typecheck`; verify both pass.
  - **Result, 2026-09-25.** 175 core and 121 desktop tests pass (7 gated skipped), and the type check is clean.
- [ ] 4.3 After archive, tick roadmap task 3.4a in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
