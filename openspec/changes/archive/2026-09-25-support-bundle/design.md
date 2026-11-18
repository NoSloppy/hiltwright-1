# Design

## Context

Today nothing is written to disk.
- **Main.** Main logs a few things with `console.log`: serial selection and permission, auto-connect, pack failures, and every toolchain, build and flash line through `emit()` in `main/ipc.ts`. It also mirrors every page console message through the `console-message` handler in `main/index.ts`, but that drops the level.
- **Pages.** The pages log the identify summary, build summaries, SD scans and the ErrorBoundary stack.

Some things are not seen at all:
- **Board traffic outside the Diagnostics transcript.** The console transcript is an in-memory list of 400 lines in `board.ts`. It misses the tagging probe, the `get_on` poll, and the commands that core helpers send inside `runNow`.
- **Failed IPC calls.** They reject into the page and are logged nowhere.
- **Uncaught page errors.** There are no global listeners.
- **The last build.** Its `BuildResult` lives only in Build.tsx component state, so it is lost when the page changes.

The OS version is not read anywhere. No redaction exists. Several emitted lines carry full user paths: toolchain downloads, restore paths, backup file names and the SD root.

## Goals / Non-Goals

**Goals:**
- One log per run that answers "what did the app and the board do just before it failed", including traffic that the Diagnostics console does not show.
- A diagnostics file that is complete enough that a remote expert rarely needs to ask a follow-up question, and plain enough that the owner can read it before sending it.
- No personal details on disk in the log or the file. This matters because the repo, and so likely the issue tracker, is public.

**Non-Goals:**
- Log levels, filtering or a log viewer in the app. The file is read in a text editor.
- Changing what the Diagnostics console shows.
- Capturing main-process crashes that kill the app. See D6.

## Decisions

### D1. Tee main's console into the log
`main/log.ts` opens `<userData>/logs/hiltwright-<yyyymmdd-hhmmss>.log` at start-up with an append stream. It wraps `console.log`, `console.warn` and `console.error` in main so that each call still prints and also appends one timestamped line. The page's console already reaches main through the `console-message` handler. That handler gains the level (`[renderer:warn]`, `[renderer:error]`), so page messages land in the same file with no second channel. The existing log calls stay as they are.

The log is started right after `scrubDevEnv` and the `HILTWRIGHT_USER_DATA` override, so a development run on a scratch folder logs into that scratch folder.

Details:
- **Pruning.** At start-up, the ten newest `hiltwright-*.log` files are kept and the rest deleted.
- **Size cap.** A byte counter stops appending at 5 MB and writes one line saying the log is full.
- **Long lines.** A line longer than 4,000 characters is cut, and the cut is marked.

**Rejected:**
- *A logging library (electron-log and similar).* It adds a dependency for about 60 lines of code, and it has its own file locations and formats to learn.
- *Rewriting every `console.log` call site to a new `log()` function.* That is noisy, and a call site added later would be missed silently. The tee catches everything by default.
- *One log file for all runs, rotated by size.* A per-run file makes "the run where it failed" easy to find, and pruning is by count.

### D2. Board traffic from the core client
`BoardClient` in `packages/core` gains an optional `onTraffic(direction, text)` option:
- **Sent:** `out()` calls it with `'sent'` and the written text, including kicks and sentinels.
- **Heard:** `receive()` calls it with `'heard'` for every raw line before routing.

`board.ts` passes a handler that prints `[board] > text` and `[board] < text` through `console.log`, so D1 carries the lines to disk. The Diagnostics transcript is unchanged.

Style values travel over the board link only as `builtin P B args` references, not as style code, so traffic needs no scrubbing beyond D3.

**Rejected:**
- *Logging from the Diagnostics transcript (`log()` in board.ts).* It misses the probe, the polls and the helper commands, which are exactly where "the board went quiet" shows.
- *Logging in `WebSerialTransport`.* It sees raw chunks, not lines, and it cannot tell kicks from commands. Core already splits the chunks into lines.

### D3. Redaction at write time
`main/redact.ts` builds one replacer from these values:
- `os.homedir()`, replaced by `%USERPROFILE%`
- `os.userInfo().username`, replaced by `<user>`
- `os.hostname()`, replaced by `<computer>`

Matching is case-insensitive. The home folder is replaced first, with both slash directions, so a path keeps its shape. The user name and computer name are replaced only as whole words (bounded by non-letters and non-digits), so a short name like "Al" does not hit "Alert".

The replacer runs on every line before it reaches the log, and again on the whole diagnostics file.

**Rejected:**
- *Redacting only when the file is made.* The log files would then hold personal details on disk, and an owner could send a raw log from the folder.
- *Hashing the names.* A placeholder reads better, and the real value is not needed to diagnose anything.

### D4. The file is composed in main, and the page supplies the connection
The page call is `support:save(pageState)`.
- **Page state.** A small snapshot kept by `board.ts` in a module-level holder in `renderer/src/support.ts`, updated on every status or info change:
  - connection status and last error
  - port ids
  - the board's version fields, battery and counts
  - the working saber's id

  Any caller can then use `saveDiagnostics()` with no arguments: Diagnostics, the ErrorBoundary and Build & Install. The ErrorBoundary has no board handle, and this keeps it that way.
- **Main.** Main validates the snapshot's shape and caps string lengths, as `identity()` does. It then gathers the rest itself:
  - `app.getVersion()`, `app.isPackaged`, `process.versions`, `os.version()` and `os.release()`
  - `toolchainStatus()` and `usbState()`
  - the saber record from `library.json`, by id
  - the last build (D5)
  - the current log and the tail of the previous one

  A pure `composeBundle(input)` builds the text, which is redacted (D3) and written to `<userData>/support/hiltwright-diagnostics-<yyyymmdd-hhmmss>.txt`. Main then calls `shell.showItemInFolder(file)`. The ten newest files are kept.
- **Contents.** The saber section lists:
  - board, buttons, prop
  - blades: type, count and role
  - whether the wiring is confirmed
  - each preset's name, font and track

  It leaves out `looks`, `lookArgs` and the generated config.
- **Size.** Section text is small. The remaining budget, up to 2 MB, goes to the log: newest lines first from the current run, then up to 200 KB from the end of the previous run. Where lines are dropped, the file says so.

**Rejected:**
- *Composing in the page.* The page cannot read the OS, the toolchain or the log files, and would need several new IPC calls.
- *Copying to the clipboard (the stub's wording).* Megabytes of text in a clipboard are awkward to attach, and a file can be read first.
- *A save dialog.* It adds a step and a path choice for no benefit. The fixed folder is inside userData, where `app:openPath` already allows opening.

### D5. Main remembers the last build and logs outcomes it returns quietly
The `build:run` handler keeps the latest result in memory for this run:
- the time and saber id
- ok, cached, ms
- textBytes, flashBytes, flashPct
- warnings and problems

It also logs a one-line summary. `flash:backup`, `flash:write`, `flash:restore`, `flash:waitForBootloader`, `flash:waitForRuntime` and `flash:installDriver` each log their result: ok, ms and detail. They return `ok: false` rather than throwing, so the wrapper in D6 would not see them.

**Rejected:**
- *Persisting the last build to disk.* The previous run's log already has its summary line, and persisting it adds another store to keep safe (see roadmap D8).

### D6. Failures nobody caught
- **Failed IPC calls.** `registerIpc` uses a local `handle(channel, fn)` in place of `ipcMain.handle`. It logs `[ipc] <channel> failed: <message>` and rethrows. This is a mechanical rename within `ipc.ts`.
- **Uncaught page errors.** The page adds `error` and `unhandledrejection` listeners on `window` that `console.error` the message and stack.
- **Main.** Main logs `render-process-gone` and `child-process-gone`, and `unhandledRejection` from Node.

Main does not add an `uncaughtException` listener. Adding one suppresses Electron's default crash dialog and leaves the process in an unknown state. A main crash is rare, and the log up to that point is still on disk.

**Rejected:**
- *Patching `ipcMain.handle` globally.* It is hidden magic. The rename is explicit and local to one file.

### D7. Where the button sits
- **Diagnostics:** a "Save diagnostics" button in the Console panel header, beside the quick commands. It is shown with or without a saber. A note under the header names the saved file.
- **ErrorBoundary:** a third button after Try again and Reload the window.
- **Build & Install:** a small "Save diagnostics" button inside the red note, and in the "Stopped" install message.

All three call the same `saveDiagnostics()`.

**Rejected:**
- *A menu item or a header button on every page.* The sidebar and header are full, and testers are pointed to Diagnostics by the Beta 1 notes.

## Risks / Trade-offs

- [Compiler errors can quote a line of the generated config, which may include the owner's style code] → Accepted. The owner reads the file first, and the translated problems usually show only the line in question.
- [The log could hold board lines the owner considers private, such as preset names] → The file says at the top that it is only sent if the owner sends it, and it can be read first.
- [Teeing console calls in main costs a disk write per line] → An append stream buffers the writes, and traffic is a few hundred lines per connect.
- [A user name that is a common word ("admin", "user") is replaced inside other text] → Whole-word matching limits this. A few over-replaced words cost nothing diagnostic.
- [The 5 MB cap is reached on a very long run, and the failure falls after it] → The line saying the log is full makes this visible. Restarting the app starts a new log.
