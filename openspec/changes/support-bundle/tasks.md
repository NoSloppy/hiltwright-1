# Tasks

## 1. Redaction and the log file

- [ ] 1.1 Add `apps/desktop/src/main/redact.ts` (design D3): a replacer built from the home folder, user name and computer name. It is case-insensitive, handles both slash directions, and matches names only as whole words. Verify with `apps/desktop/test/redact.test.ts`:
  - a home path in either slash direction becomes `%USERPROFILE%\...`
  - the user name and computer name are replaced in any case
  - "Al" inside "Alert" is left alone
  - text with none of them is unchanged
- [ ] 1.2 Add `apps/desktop/src/main/log.ts` (design D1):
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
- [ ] 1.3 Pass the console level through the `console-message` handler in `main/index.ts` (`[renderer:warn]`, `[renderer:error]`). Verify in task 5.1 that a page error appears in the log with its level.

## 2. What the log records

- [ ] 2.1 Add the optional `onTraffic(direction, text)` hook to `BoardClient` (design D2). Verify with a new case in `packages/core/test/tagged.test.ts`, which drives `BoardClient` over a fake transport: sent commands, kicks and every received line reach the hook in order, and a client without the hook behaves as before.
- [ ] 2.2 In `board.ts`, pass an `onTraffic` handler that `console.log`s `[board] > …` and `[board] < …`. Verify in task 5.2 on hote2.
- [ ] 2.3 Add `logged(channel, fn)` in `apps/desktop/src/main/ipcLog.ts`, which logs `[ipc] <channel> failed: <message>` and rethrows. Register every handler in `main/ipc.ts` through it (design D6). Also log one line for each result of the build and flash steps named in design D5. Verify:
  - with `apps/desktop/test/ipcLog.test.ts`: a throwing handler is logged and still rejects with the same error, and a handler that succeeds is not logged
  - that `npm run typecheck` passes
- [ ] 2.4 Add `error` and `unhandledrejection` listeners in the renderer entry that `console.error` the message and stack. Log `render-process-gone`, `child-process-gone` and `unhandledRejection` in main (design D6). Verify in task 5.1 with a thrown error from the page (development hook), which appears in the log.

## 3. The diagnostics file

- [ ] 3.1 Keep the last build result in memory in the `build:run` handler (design D5). Verify through task 3.2's test input shape, and in task 5.1: after a build, the file shows it.
- [ ] 3.2 Add `apps/desktop/src/main/supportBundle.ts` (design D4): a pure `composeBundle(input)` plus the file writer, which also prunes to ten files. Verify with `apps/desktop/test/supportBundle.test.ts`:
  - every section named in the `support-bundle` spec is present
  - "no saber connected" and "no build in this run" are shown when those are absent
  - `looks`, `lookArgs` and config text never appear, even when the saber record has them
  - an oversized log is cut from the oldest end with a note, and the file stays under 2 MB
  - the output is redacted
- [ ] 3.3 Add the `support:save` IPC call (main validation, preload and `shared/api.ts`), and call `shell.showItemInFolder` on the new file. Add `renderer/src/support.ts` with the connection snapshot holder and `saveDiagnostics()`, and have `board.ts` update the snapshot. Verify with `npm run typecheck`, and with a snapshot validation case in `supportBundle.test.ts` covering bad shapes and over-long strings.

## 4. Where it is offered

- [ ] 4.1 Diagnostics: a "Save diagnostics" button in the Console panel header, shown with or without a saber, and a note naming the saved file (design D7). Verify in task 5.1 with the offscreen harness and no board: the button is present, pressing it writes a file, and the note names it.
- [ ] 4.2 ErrorBoundary: add a Save diagnostics button after Try again and Reload the window. Verify in task 5.1 by forcing a page fault with a development hook, then pressing it: the file's log contains the fault.
- [ ] 4.3 Build & Install: add Save diagnostics inside the red failure note and the "Stopped" install message. Verify in task 5.1 with a build that fails on purpose (an invalid model on a scratch saber): the note offers the button, and the file shows the build's problems.

## 5. Checks

- [ ] 5.1 Development run with no board, on a scratch folder: the harness default `HILTWRIGHT_NO_BOARD=1`. Drive:
  - Diagnostics, then save
  - a forced page fault, then save from the fault message
  - a failing build, then save from Build & Install

  Verify:
  - a log file exists under `logs`, with levels
  - three files exist under `support`
  - the scratch folder's path and the user name appear in neither, only the placeholders
  - each file has every section
- [ ] 5.2 Hardware check on V2.2 hote2 (run with `-Board`): connect, send `battery` from the console, and save diagnostics. Verify:
  - the log shows the tagging probe, the identify commands, `battery` and their answers
  - the file shows hote2's identity, model, preset names and connection state
  - only read commands were sent
- [ ] 5.3 Packaged build check: build the installer and have the owner install it and save diagnostics from Diagnostics. Verify:
  - the file appears in the installed app's `support` folder and opens selected
  - its header says packaged and shows 0.1.0
  - `%USERPROFILE%` appears in place of the owner's user folder
- [ ] 5.4 Run `npm test` and `npm run typecheck`; verify both pass.
- [ ] 5.5 After archive, tick roadmap task 3.3 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
