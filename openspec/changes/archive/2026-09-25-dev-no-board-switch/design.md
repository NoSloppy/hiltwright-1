# Design

## Context

See proposal.md for why. The code at 48ebf36:

- **The page can only reach a board through main.** `main/index.ts`'s `grantSerial()` installs two handlers:
  - `select-serial-port` answers `requestPort()`
  - the device permission handler decides what `getPorts()` returns and what may be opened
- **Three things start a connection:**
  - main's `did-finish-load` handler calls `window.hiltwrightAutoConnect()` 400 ms after load, as a user gesture
  - the page's Web Serial `connect` listener (`board.ts`) reacts when a board is plugged in
  - the owner presses Connect
- **Development only already.** `release-hardening` scrubs every `HILTWRIGHT_*` variable in packaged builds, so a new switch is development-only with no extra code.

## Goals / Non-Goals

**Goals:**
- One switch that makes every board unreachable for a development run, however a connection is started.
- The owner, or a test, can see why nothing connected.

**Non-Goals:**
- A simulated board (the existing `fake:` view covers screenshots).
- Any effect on packaged builds (already scrubbed).

## Decisions

### D1. Main is the gate
With `HILTWRIGHT_NO_BOARD` set:
- the device permission handler refuses every serial device
- `select-serial-port` selects none
- main skips its start-up auto-connect call

Because the page can only open a port that main allows, this holds for all three ways a connection starts, including ones added later.
- *Rejected:* skipping connection in the page only. A new call site in the page would reach the board again, and the page cannot read environment variables anyway, being sandboxed.

### D2. The decision is a pure function
`serialAllowed(device, noBoard)` in a small module holds the existing Proffieboard recognition (vendor and product ids, or the Windows instance id) plus the switch. `grantSerial()` calls it. It is unit-tested without Electron.

### D3. The page says why
The interface gains `app.boardAccess(): Promise<boolean>`. When `connect()` finds it false, it sets the error state with "Board access is off for this run (HILTWRIGHT_NO_BOARD).", which the header chip and the Armory already show.
- *Rejected:* a new connection state. It would mean new chip and Armory wording for a development-only case.

### D4. Test runs use it by default
The offscreen verification harness (currently a scratch script, see the project notes) sets `HILTWRIGHT_NO_BOARD=1` unless a run is meant to use a board. The main-process comment listing the development aids documents the switch.

### D5. The hardware rule applies, in reverse
The change touches the board link, so it has a hardware check: with hote2 plugged in and the switch on, no port opens. That check is also the proof that it works, and it is safe to run for the same reason.

## Risks / Trade-offs

- [Forgetting the switch in a run that should not see a board] → The harness defaults to it, and the standing check for a connected board before any run stays.
