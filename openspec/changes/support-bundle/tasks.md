# Tasks

## 1. Redaction and the log file

- [x] 1.1 Add `apps/desktop/src/main/redact.ts` (design D3): a replacer built from the home folder, user name and computer name. It is case-insensitive, handles both slash directions, and matches names only as whole words. Verify with `apps/desktop/test/redact.test.ts`:
  - a home path in either slash direction becomes `%USERPROFILE%\...`
  - the user name and computer name are replaced in any case
  - "Al" inside "Alert" is left alone
  - text with none of them is unchanged
  - **Result, 2026-09-25.** `redact.test.ts`: 4 tests pass.
- [x] 1.2 Add `apps/desktop/src/main/log.ts` (design D1):
  - start a per-run log in `<userData>/logs`
  - prune to the ten newest runs
  - timestamp and redact each line
  - cut lines longer than 4,000 characters
  - stop at 5 MB with one "log full" line
  - tee `console.log`, `console.warn` and `console.error`

  Start it in `main/index.ts` right after the `HILTWRIGHT_USER_DATA` override. Verify with `apps/desktop/test/log.test.ts` on a temporary folder:
  - twelve old logs become ten plus the new one
  - lines are timestamped and redacted
  - the cap line appears once and nothing follows it
  - a long line is cut and marked
  - **Result, 2026-09-25.** `log.test.ts`: 4 tests pass. Started in `main/index.ts` after the data-folder override, with a first line giving the version, build kind, Electron and Windows versions.
- [x] 1.3 Pass the console level through the `console-message` handler in `main/index.ts` (`[renderer:warn]`, `[renderer:error]`). Verify in task 5.1 that a page error appears in the log with its level.

  - **Result, 2026-09-25.** In task 5.1 the log shows `WARN [renderer:warn]` for a page warning and `ERROR [renderer:error]` for the fault.
## 2. What the log records

- [x] 2.1 Add the optional `onTraffic(direction, text)` hook to `BoardClient` (design D2). Verify with a new case in `packages/core/test/tagged.test.ts`, which drives `BoardClient` over a fake transport: sent commands, kicks and every received line reach the hook in order, and a client without the hook behaves as before.
  - **Result, 2026-09-25.** New case in `tagged.test.ts`: the probe, commands, sentinels and kicks are reported once each, in write order, and every heard line is reported. All 9 tagged tests pass, and so do the other core tests (176).
- [x] 2.2 In `board.ts`, pass an `onTraffic` handler that `console.log`s `[board] > …` and `[board] < …`. Verify in task 5.2 on hote2.
  - **Result, 2026-09-25.** In task 5.2 the log holds 35 sent and 194 heard lines, starting with `> hwt| version` and its tagged answers.
- [x] 2.3 Add `logged(channel, fn)` in `apps/desktop/src/main/ipcLog.ts`, which logs `[ipc] <channel> failed: <message>` and rethrows. Register every handler in `main/ipc.ts` through it (design D6). Also log one line for each result of the build and flash steps named in design D5. Verify:
  - with `apps/desktop/test/ipcLog.test.ts`: a throwing handler is logged and still rejects with the same error, and a handler that succeeds is not logged
  - that `npm run typecheck` passes
  - **Result, 2026-09-25.** `ipcLog.test.ts`: 2 tests pass. All 68 handlers in `ipc.ts` go through `logged()`. `build:run` logs a one-line result, and each flash step logs its result. The type check is clean.
- [x] 2.4 Add `error` and `unhandledrejection` listeners in the renderer entry that `console.error` the message and stack. Log `render-process-gone`, `child-process-gone` and `unhandledRejection` in main (design D6). Verify in task 5.1 with a thrown error from the page (development hook), which appears in the log.

  - **Result, 2026-09-25.** The listeners are in `renderer/src/main.tsx`, and the ErrorBoundary now logs at error level. Main logs lost page and helper processes and unhandled rejections. In task 5.1 the forced fault shows in the log with its stack and the page it happened on. A development hook, `hiltwrightFault()` (DEV only), was added for this; the fault belongs to the page it was raised on.
## 3. The diagnostics file

- [x] 3.1 Keep the last build result in memory in the `build:run` handler (design D5). Verify through task 3.2's test input shape, and in task 5.1: after a build, the file shows it.
  - **Result, 2026-09-25.** In task 5.1 the file saved after the failed build shows the build: failed, 5.9 s, flash use unknown, and the compiler problem. The earlier files say "No build in this run."
- [x] 3.2 Add `apps/desktop/src/main/supportBundle.ts` (design D4): a pure `composeBundle(input)` plus the file writer, which also prunes to ten files. Verify with `apps/desktop/test/supportBundle.test.ts`:
  - every section named in the `support-bundle` spec is present
  - "no saber connected" and "no build in this run" are shown when those are absent
  - `looks`, `lookArgs` and config text never appear, even when the saber record has them
  - an oversized log is cut from the oldest end with a note, and the file stays under 2 MB
  - the output is redacted
  - **Result, 2026-09-25.** `supportBundle.test.ts`: 9 tests pass. One was added after task 5.2 found a gap: with no saved model, the file now lists the saber's reported presets (name, font and track), still without their styles.
- [x] 3.3 Add the `support:save` IPC call (main validation, preload and `shared/api.ts`), and call `shell.showItemInFolder` on the new file. Add `renderer/src/support.ts` with the connection snapshot holder and `saveDiagnostics()`, and have `board.ts` update the snapshot. Verify with `npm run typecheck`, and with a snapshot validation case in `supportBundle.test.ts` covering bad shapes and over-long strings.

  - **Result, 2026-09-25.** `support:save` is in `ipc.ts`, preload and `shared/api.ts`. `renderer/src/support.ts` holds the snapshot, which `board.ts` updates for the connection and `workspace.ts` for the working saber. The snapshot validation tests pass, and the type check is clean.
## 4. Where it is offered

- [x] 4.1 Diagnostics: a "Save diagnostics" button in the Console panel header, shown with or without a saber, and a note naming the saved file (design D7). Verify in task 5.1 with the offscreen harness and no board: the button is present, pressing it writes a file, and the note names it.
  - **Result, 2026-09-25.** In task 5.1 the button sits under the Console header. It saved with no saber connected, and the page said "Saved hiltwright-diagnostics-20260925-155831.txt. Its folder is open; you can read the file before sending it."
- [x] 4.2 ErrorBoundary: add a Save diagnostics button after Try again and Reload the window. Verify in task 5.1 by forcing a page fault with a development hook, then pressing it: the file's log contains the fault.
  - **Result, 2026-09-25.** In task 5.1 the forced fault showed "Something went wrong in the Diagnostics page". Save diagnostics on it wrote a file, and that file's log contains the fault.
- [x] 4.3 Build & Install: add Save diagnostics inside the red failure note and the "Stopped" install message. Verify in task 5.1 with a build that fails on purpose (an invalid model on a scratch saber): the note offers the button, and the file shows the build's problems.

  - **Result, 2026-09-25.** A saber was planned on a scratch folder with a style that cannot compile (`StylePtr<ThisIsNotAStyle>()`). Building failed in 5.9 s with "The compiler did not understand part of the config". The failure note offered Save diagnostics, and the saved file shows the problem. The button is also offered on a toolchain setup failure, which is on the same page.
## 5. Checks

- [x] 5.1 Development run with no board, on a scratch folder: the harness default `HILTWRIGHT_NO_BOARD=1`. Drive:
  - Diagnostics, then save
  - a forced page fault, then save from the fault message
  - a failing build, then save from Build & Install

  Verify:
  - a log file exists under `logs`, with levels
  - three files exist under `support`
  - the scratch folder's path and the user name appear in neither, only the placeholders
  - each file has every section
  - **Result, 2026-09-25.** Run with `HILTWRIGHT_NO_BOARD=1` on a scratch folder, with the dev toolchain. There are two run logs, and three files under `support`, one from each place. None of the logs or files contains the Windows user name or computer name. The paths show `%USERPROFILE%`, and the user name inside a folder name shows as `<user>`. Each file has all eight sections, and the levels are present. Explorer opened each file's folder, which is expected.
- [x] 5.2 Hardware check on V2.2 hote2 (run with `-Board`): connect, send `battery` from the console, and save diagnostics. Verify:
  - the log shows the tagging probe, the identify commands, `battery` and their answers
  - the file shows hote2's identity, model, preset names and connection state
  - only read commands were sent
  - **Result, 2026-09-25, V2.2 hote2 (COM8), with `-Board` on a scratch folder.** The log shows the tagging probe and its answers, the identify commands, and `h17| battery` answered by `Battery voltage: 0.86`. The file shows hote2's identity (USB serial 209133815232), the connection (connected, 1209:6668, v8.10, 13 presets, 18 fonts, 22 tracks), and, after the fix in 3.2, all 13 preset names with their fonts and tracks. Only reads were sent: version, battery, get_volume, get_preset, list_presets, list_fonts, list_tracks, scanid, get_blade_dimming, get_clash_threshold, get_on, and the hw_end sentinels.
- [x] 5.3 Packaged build check: build the installer and have the owner install it and save diagnostics from Diagnostics. Verify:
  - the file appears in the installed app's `support` folder and opens selected
  - its header says packaged and shows 0.1.0
  - `%USERPROFILE%` appears in place of the owner's user folder
  - **Result, 2026-09-25, owner's installed build, hote2 connected.** The owner saved diagnostics from Diagnostics, and the folder opened with the file selected. I read the file from the owner's real data folder. The header says "0.1.0 (packaged build)". All sections are present, with the connected hote2 (record "hotetest"), its model with the wiring confirmed and 13 presets, the installed firmware record, "No build in this run", and 207 board lines in the log. It has no previous-run section: this was the first run to keep a log. Neither the user name nor the computer name appears. No path under the user folder came up in this run (the toolchain is in `C:\ProgramData\Hiltwright`), so `%USERPROFILE%` did not need to appear. The replacement itself is covered by task 5.1 and `redact.test.ts`.
- [x] 5.4 Run `npm test` and `npm run typecheck`; verify both pass.
  - **Result, 2026-09-25.** 176 core and 140 desktop tests pass (7 gated skipped), and the type check is clean. Run after the last code change.
- [ ] 5.5 After archive, tick roadmap task 3.3 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
