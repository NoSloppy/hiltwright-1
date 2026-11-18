# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-board` (archived as `openspec/changes/archive/2026-09-24-baseline-board/`, design.md Findings table). This is Wave C task 3.12: the unplug and silence handling that installs rely on.

## Why

The connection layer is the best-tested part of the app, but it has gaps a tester will hit:
- It can miss an unplug.
- It can report a dead board as connected.
- It can hang on "Reading the saber…" for minutes.
- Console commands can land in the middle of a preset edit.

The owner hit the dead-board case on hote2 on 2026-09-26. The board stopped answering, 120 nudges over two minutes got nothing back, and the header said "Connected" until the cable was pulled three minutes later.

## What Changes

- **F1:** Notice every unplug and return to "Not connected":
  - when the serial read ends quietly instead of with an error
  - when the system reports the device gone
- **F2:** A board that answers nothing on connect is reported as not answering. It does not reach "Connected", and it creates no saber record.
- **F3:** Bound the whole connect sequence on a dead board to seconds, not minutes. The first command met with total silence ends it.
- **HW-2026-09-26b,** seen on hote2 during `style-save-integrity` 5.2 (the owner's run log is `hiltwright-20260926-121012.log`):
  - A connected saber that answers nothing, not even the nudges, for about 10 seconds while a command waits is let go. The port is closed, and the Armory says "The saber stopped answering. Unplug it and plug it back in." Replugging reconnects on its own, as today.
  - Silence is noticed only when something is sent. There is no idle heartbeat, as the owner chose.
- **F5:** Everything else that talks to the board goes through the same operation queue as preset edits, so none of it can land between the steps of an edit:
  - console commands
  - the Try it and Diagnostics controls
  - the Build page's voice-pack check
  - sharing the card over USB
  - the blade-off poll for pending colours
- **BST-4** (from `board-side-test-coverage`): an operation that cannot reach the saber, for example an edit queued just before an unplug, says so in the save status ("Not sent: the saber is not connected"). It no longer vanishes. The operation runner moves into `boardOps.ts` so a test can pin this.
- **F7:** Correct the stale statements:
  - the test name in `protocol.test.ts` that says OS 8.10 has no tag framing
  - the 6 s ceiling in doc 09, where the code uses 10 s
  - `list_named_style` in the plan
  - the plan's "still to confirm" about the 1200-baud touch
- **A development switch** for the hardware check: `hiltwrightMuteBoard()` makes the app ignore everything the board sends, so a silent board can be shown on a real saber.

## Non-goals

- Choosing among several connected boards (F4, `board-side-polish`), and reconnecting to the right one after an install (HW-2026-09-25c, `install-target-safety`).
- An idle heartbeat.
- New protocol features, or changing how a busy but talking board is waited for.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `board-connection`:
  - "The connection state is always visible": an unplug returns to "Not connected", and a silent saber is named.
  - "Commands reach the board one at a time": every sender shares the queue, and an operation that cannot be sent says so.
  - New: "An unplug is always noticed".
  - New: "A saber that does not answer is not connected".
  - New: "A saber that stops answering is let go".

## Impact

- **Core:** `packages/core/src/protocol/client.ts` gains a total-silence give-up, a `silent` flag on each response, an `onSilent` callback, and an opt-out for commands that expect silence (`RebootDFU`). Tests go in `packages/core/test/protocol.test.ts`.
- **Renderer:**
  - `apps/desktop/src/renderer/src/serial.ts`: a quiet end of the read loop, and the system's disconnect event.
  - `board.ts`:
    - the not-answering handling
    - a public `send` that goes through the queue
    - the operation runner, moved to `boardOps.ts`
    - the development mute switch
  - `boardOps.ts`, with tests in `boardOps.test.ts`.
- **Docs:** `docs/09-board-protocol-notes.md` and `docs/00-plan.md`.
- **Hardware check:** V2.2 hote2 and the V3.9:
  - unplugging while idle and during a command
  - a muted, silent saber while connected and on connect
  - replugging after each
