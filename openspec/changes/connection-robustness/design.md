# Design

## Context

- **`serial.ts`.** `WebSerialTransport.readLoop` reads until `done` or an error. Only an error calls `onClose`. When the stream ends with `done` (seen when the device goes away quietly), the loop exits and nobody is told (F1). No code listens for `navigator.serial`'s `disconnect` event.
- **`board.ts`:**
  - `connectTo` creates the transport with `onClose → disconnect('Port closed: …')`, which sets status `error`. So a plain unplug reads as an error rather than "Not connected".
  - `identify` sends eleven commands in turn and sets `connected` before creating or matching the record. A silent board goes through all of them (F2).
- **`client.ts`:**
  - A tagged command waits up to `taggedTimeoutMs` (30 s), kicking a silent board every 800 ms, up to 30 kicks. An untagged one waits `timeoutMs` (8 s), or ends by idle when it has no `until`.
  - A dead OS 8 board costs 30 s per command, minutes per connect (F3).
  - Nothing distinguishes "timed out while the board talked" from "heard nothing at all", and the connection never learns that the board is gone (HW-2026-09-26b). In the owner's log, `h11` and `h12` each ran to 30 s with 30 and 90 unanswered kicks, and the header stayed "Connected".
- **The public `send`.** `board.send` is public and unqueued. The console, `Controls.tsx`, `Build.tsx` (voice-pack check) and `Fonts.tsx` (`sd 1`/`sd 0`) call it directly, and the blade-off poll calls `client.send` directly (F5). Preset edits go through `run → enqueue(runNow)`.
- **`runNow`** returns at once when `client.current` is null, so an edit queued before an unplug vanishes with no save state (BST-4).

## Goals / Non-Goals

**Goals:**
- A gone board and a silent board are each noticed and named, within seconds.
- One order for everything that talks to the board.
- Pure logic moved where a node test can reach it, as in `board-side-test-coverage`.

**Non-Goals:**
- An idle heartbeat (the owner chose "only when sending").
- Multiple boards.
- Changing how a busy but talking board is waited for.

## Decisions

### D1. The client knows total silence (`client.ts`)
- **`Response.silent`:** true when nothing at all was heard from the board after the command was written, no line and no chunk (`lastHeard < started`).
- **`ClientOptions.silentMs`** (default 10000):
  - In tagged mode, the kick timer also checks total silence. When the board has sent nothing for `silentMs` since the command started, the command ends with `timedOut: true, silent: true`, without waiting for the 30 s ceiling.
  - Untagged commands keep their 8 s timeout, and a timed-out one reports `silent` the same way. An idle-ended untagged command (a write with no `until`) is not a timeout and is never silent.
- **`ClientOptions.onSilent(response)`:** called once for each command that ends `timedOut && silent`, unless the command was sent with `SendOptions.expectSilence` (used by `RebootDFU`).
- A board that keeps printing, even without answering, refreshes `lastHeard` and never counts as silent (the "slow but talking" scenario).

**Rejected:**
- *Lowering `taggedTimeoutMs`.* A busy V2 with a heavy style answers seconds late but does answer. Silence, not duration, is the sign of a dead board.
- *An idle heartbeat.* The owner chose not to have one.

### D2. Not answering on connect, stopped answering later (`board.ts`)
- **During `identify`:**
  - An `identifying` ref is set, and `onSilent` does nothing.
  - After `detectTagging` and after each command, a response with `timedOut && silent` throws `NotAnswering`, before `setStatus('connected')` and before `library.upsert`.
  - `connectTo` catches it and calls `disconnect('The saber is not answering. Unplug it and plug it back in.')`, with status `error` and no record (F2).
  - Worst case on OS 7: the probe (6 s) plus `version` (8 s). On OS 8: the probe (6 s). Both are under the 15 s bound (F3).
- **While connected:** `onSilent` calls `disconnect('The saber stopped answering. Unplug it and plug it back in.')`. `client.close()` ends the waiting command, and later commands end at once because the client is closed. The port is closed, so the Web Serial `connect` event reconnects on replug, as today.
- **`rebootToBootloader`** sends `RebootDFU` with `expectSilence`.

### D3. An unplug is noticed, and reads as "Not connected" (`serial.ts`, `board.ts`)
- **`serial.ts`:** when `readLoop` ends with `done` and the transport was not closed on purpose, it calls `onClose('the serial read ended')` once. `onClose` is guarded so it fires once per transport, from whichever path comes first.
- **`board.ts`:**
  - It listens for `navigator.serial`'s `disconnect` event. When the event's port is the open transport's port, it calls the same handler.
  - The transport's `onClose` now calls `lost(reason)`. This logs `[board] port lost: <reason>` and calls `disconnect()` with no error, so the state is `idle` ("Not connected") and the live values are cleared.
  - A real error opening the port still shows as an error.

**Rejected:**
- *Keeping "error" for an unplug.* The spec says an unplug returns to "Not connected". An unplug is not a fault.

### D4. One queue for every sender (`board.ts`)
- The raw sender becomes `sendNow`, used only by `identify`, which runs before any operation can be queued.
- The public `send` becomes `(command, opts) => enqueue(() => sendNow(command, opts))`, so the console, `Controls`, `Build` and `Fonts` wait their turn without any change at their end.
- The blade-off poll uses the public `send`.
- Operations inside `run` keep using the client they are given, so a queued operation never waits on itself.

**Rejected:**
- *A separate queue for console commands.* Two queues would still interleave on the wire.

### D5. The operation runner in `boardOps.ts` (BST-4)
`runOperation(deps, label, op, withSnapshot)` holds today's `runNow` body verbatim. `deps` supplies `client()`, `setBusy`, `setSave`, `log` and `snapshot`.

The one change: with no client, it sets `save` to `{ kind: 'failed', what: label, error: 'Not sent: the saber is not connected.' }` and logs it, instead of returning silently. `useBoard.run` becomes `enqueue(() => runOperation(deps, …))`.

### D6. A development switch to make a saber silent
In development builds only (`import.meta.env.DEV`), `window.hiltwrightMuteBoard(on = true)` sets `WebSerialTransport.muted`. The read loop keeps reading but hands nothing to its listeners, so the app sees a silent saber while the board is fine. It stays muted for new transports until turned off, so it also covers connecting. Packaged builds do not have it.

### D7. Checks
- **Core, `packages/core/test/protocol.test.ts`,** with the client's injectable timers:
  - A tagged command to a board that sends nothing ends at 10 s with `silent`, and `onSilent` is called once.
  - A second queued command ends at once after `close()`.
  - A board that prints a line every 2 s for 15 s is not silent, and the command completes when its sentinel arrives.
  - `expectSilence` suppresses `onSilent`.
  - An untagged `until` command with no reply times out `silent`, and an idle-ended write is not silent.
- **Renderer:**
  - `serial.test.ts` (new), with a fake `SerialPort`: a read stream that ends with `done` calls `onClose` once, and `close()` then does not.
  - `boardOps.test.ts`: `runOperation` with no client reports "Not sent: the saber is not connected." (BST-4), and with a client runs the operation as before.
- **Hardware:**
  - **On hote2 (V2.2), a read-only `-Board` run by Claude,** after checking which board is plugged in:
    1. Connect.
    2. Mute and send a console `battery`: the state becomes the "stopped answering" error within about 12 s.
    3. Unmute and reconnect.
    4. Disconnect, mute and Connect: "not answering" within 15 s, and the saber list unchanged.
  - **On hote2 and the V3.9, by the owner:**
    - unplug while idle: "Not connected"
    - replug: reconnects
    - unplug during a long console `list_fonts`: the command ends and the state is "Not connected"
    - an edit made while unplugged says "Not sent"

### D8. Docs (F7)
- The `protocol.test.ts` test is renamed to "OS 8.10 has no help, id, list_named_style (singular) or get_style, and frames with a space after the pipe".
- Doc 09 says the read-back ceiling is 10 s.
- The plan names `list_named_styles`, and records the 1200-baud touch from Web Serial as confirmed on Windows (2026-09-09, the first install), with macOS, Linux and V3 still open.

## Risks / Trade-offs

- [A slow SD operation on a board that prints nothing for 10 s would be cut off] → Kicks make a live ProffieOS 8 board answer "Whut?" at once, which refreshes `lastHeard`. Only a board deaf to kicks is silent. OS 7 commands with `until` already time out at 8 s.
- [Queuing the console behind a long operation makes it feel slow] → The operation is short, and the console shows the command at once. Its answer follows the operation, which is the point of F5.
- [`onSilent` fires during the install's reboot] → `RebootDFU` carries `expectSilence`, and the transport is closed right after it.
