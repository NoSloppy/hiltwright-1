# Proposal

**Milestone:** M2 (Beta 1 tooling). Filed by the owner's request on 2026-09-25, during `release-hardening`.

## Why

Verification runs drive the real app offscreen, on a scratch data folder. The app connects to any Proffieboard it finds, by itself. During `release-hardening` on 2026-09-25, two such runs connected to the owner's hote2 while it was plugged in, and ran the identify sequence (reads only, plus `scanid`, which re-runs blade detection). Nothing was written to the saber. But a test run must never be able to reach a real board unless the test is meant to, and the remaining M2 work is full of such runs.

## What Changes

- A development-only switch, `HILTWRIGHT_NO_BOARD=1`, makes the app unable to reach any board:
  - the main process grants no serial device and selects no port
  - the page's automatic connection is skipped
  - pressing Connect says that board access is off for this run
- Like every `HILTWRIGHT_*` switch, it is removed from packaged builds (`release-hardening`).
- The verification harness in use (offscreen run, page dump) sets it by default, and a run that is meant to use a board says so explicitly.

## Non-goals

- A simulated board for development (the existing `fake:` connection covers screenshots).
- Any change to how a packaged build connects.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-shell`: the development-aids requirement gains the no-board switch.

## Impact

`apps/desktop/src/main/index.ts` (serial permission and port selection), `apps/desktop/src/renderer/src/board.ts` (auto-connect and Connect), and the verification scripts' defaults. Verified by a run with a board plugged in and the switch on: no port is opened.
