# Proposal

**Milestone:** M2 (Beta 1 blocker). Decided by the owner on 2026-09-24, closing the open question in `beta-1-roadmap` task 2.6.

## Why

Beta 1 testers are remote experts. Many of the baseline findings (a board that goes quiet, an install that times out, a toolchain that fails to set up, a font that will not load) can only be diagnosed from what the app saw. Today the app writes nothing down: everything goes to the console and is lost when it closes. Without a log and an easy way to send it, most reports will be "it didn't work".

## What Changes

- The app keeps a rolling log on disk for main and renderer events: connection states and the board conversation, build and install steps with their output, toolchain setup, SD card and font operations, and errors. Old logs are pruned.
- A "Copy diagnostics" action (on Diagnostics, and offered on error screens) gathers one file:
  - the recent log
  - the app and ProffieOS versions, the OS version and the toolchain state
  - the working saber's identity and model (board, blades, prop, preset names and fonts)
  - the last build's warnings and flash use

  The owner can read the file before sending it.
- Nothing is sent anywhere automatically. The owner chooses where the file goes.
- Paths and names that could identify the owner (user folder, computer name) are replaced in the bundle.

## Non-goals

- Automatic crash reporting or telemetry.
- Including the owner's fonts, styles' code, hilt models or firmware backups.

## Capabilities

### New Capabilities

- `support-bundle`: a local log, and a readable diagnostics file the owner can send.

### Modified Capabilities

- `app-shell`: error screens offer to copy diagnostics.
- `diagnostics`: the page offers "Copy diagnostics".

## Impact

`apps/desktop/src/main/*` (a small logger used by the existing `console.log` points), `apps/desktop/src/renderer/src/{Controls.tsx,ErrorBoundary.tsx}`, IPC for gathering the bundle. Verified on a packaged build.
