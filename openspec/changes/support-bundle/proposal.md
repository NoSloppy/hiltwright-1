# Proposal

**Milestone:** M2 (Beta 1 blocker). The owner decided this on 2026-09-24, which closed the open question in `beta-1-roadmap` task 2.6. It is Wave A task 3.3.

## Why

Beta 1 testers are remote experts. Many of the baseline findings can only be diagnosed from what the app saw at the time:
- a board that goes quiet
- an install that times out
- a toolchain that fails to set up
- a font that will not load

Today the app writes nothing down. Everything goes to the console and is lost when the app closes. Without a log and an easy way to send it, most reports will be "it didn't work".

## What Changes

- **A rolling log on disk, one file per run.** It records:
  - connection attempts and their outcome
  - the conversation with the board: commands, answers and lines it prints on its own
  - toolchain, build and install steps, with their output and results
  - failed operations and unexpected faults, in main and in the pages

  Old runs are pruned.
- **A "Save diagnostics" action** writes one readable text file and shows it in its folder. The file holds:
  - the recent log
  - the app, ProffieOS, Windows and toolchain versions and state
  - the USB state
  - the connection state
  - the working saber's identity and model: board, blades, prop, and each preset's name, font and track
  - the last build's result, warnings, problems and flash use

  The owner can read the file before sending it.
- **Where it's offered:** on the Diagnostics page, on the "Something went wrong" screen, and beside a failure on Build & Install.
- **Nothing is sent anywhere by the app.** The owner chooses where the file goes.
- **Personal details are replaced** in the log and the file: the user folder, the Windows user name and the computer name.

The stub said "Copy diagnostics". This version saves a file instead: testers attach the file to a report, and a large clipboard paste is awkward.

## Non-goals

- Automatic crash reporting, telemetry, or any upload.
- Including the owner's fonts, style code, generated config, hilt models or firmware backups.
- Choosing the reporting channel or writing the tester guide. That belongs to `unsigned-install-guide` and the Beta 1 notes.
- Making the Diagnostics console show the traffic it hides today (the identify probe and polls). The log records that traffic, and the console stays as it is.
- Fixing the failures the log will reveal. Each one goes to its own change.

## Capabilities

### New Capabilities

- `support-bundle`: the on-disk log, keeping personal details out, and the diagnostics file.

### Modified Capabilities

- `app-shell`: the "Something went wrong" screen offers to save diagnostics.
- `diagnostics`: the page offers "Save diagnostics".
- `firmware-install`: a failed build or install offers to save diagnostics.

## Impact

- **Main process:**
  - a logger that tees main's console into a file
  - redaction
  - a wrapper that logs failed IPC calls
  - main-side logging of flash step results and the last build result
  - a `support:save` IPC call that composes the file
- **Core:** an optional traffic hook on `BoardClient` in `packages/core/src/protocol/client.ts`.
- **Renderer:** in `apps/desktop/src/renderer/src/`:
  - `board.ts`: traffic logging and a connection snapshot
  - `App.tsx`: the Diagnostics button
  - `ErrorBoundary.tsx`
  - `Build.tsx`
  - a small `support.ts`
  - global error listeners
- **Checks:** a hardware check on V2.2 (hote2), and a packaged-build check.
