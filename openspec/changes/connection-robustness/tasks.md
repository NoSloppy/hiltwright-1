# Tasks

## 1. The protocol client

- [x] 1.1 In `packages/core/src/protocol/client.ts`, add `Response.silent`, `ClientOptions.silentMs` (default 10000), `ClientOptions.onSilent` and `SendOptions.expectSilence`. A tagged command ends early after `silentMs` of total silence (design D1). Add the tests of design D7 to `protocol.test.ts`. Verify with `npm test` in `packages/core`, with the existing protocol and session tests still passing.
  - **Result, 2026-09-26.** `Response.silent` is true for a timeout with no byte heard since the command was written, or nothing for `silentMs`. The kick timer ends a tagged command after `silentMs` (10 s) of total silence. `onSilent` is called once per silent timeout unless `expectSilence` is set, or the client is closed. Five new tests pass: dead tagged board at 10 s and reported once; queued command ends at once after `close()`; talking board over 15 s not silent; `expectSilence`; untagged probe and command. 184 core tests pass.
    - **Corrected during implementation:** on ProffieOS 7, a command with no answer ends after its short quiet, as a write does, never at its timeout. So an OS 7 board going silent in a session is not detectable without cutting off healthy slow boards. It is caught only when connecting, by the probe. The spec and design D1/D2 now say so.

## 2. The renderer

- [x] 2.1 In `serial.ts`, call `onClose` once when the read loop ends with `done` and was not closed on purpose, and guard `onClose` to fire once. Add the muted flag (design D3, D6). Create `serial.test.ts` with a fake port. Verify with `npm test`.
  - **Result, 2026-09-26.**
    - `onClose` is guarded to fire once, and never after `close()`.
    - The read loop stops at `done` (the end of the stream) and reports "the serial read ended". Before, it would have asked a finished stream again.
    - `lost(reason)` lets the system's disconnect event report through the same path.
    - `WebSerialTransport.muted` reads but passes nothing on.

    Four tests in `serial.test.ts` pass: quiet end reported once; read error reported once; purposeful close not reported; muted passes nothing.
- [x] 2.2 Move `runNow` into `boardOps.ts` as `runOperation`, reporting "Not sent: the saber is not connected." with no client (design D5). Add the tests to `boardOps.test.ts`. Verify with `npm test`.
  - **Result, 2026-09-26.** `runOperation` in `boardOps.ts` holds `runNow`'s body verbatim, and `SaveState` moved with it (re-exported by `board.ts`). With no client it sets `{ kind: 'failed', error: 'Not sent: the saber is not connected.' }` and logs it. Three tests pass: not sent after an unplug; runs on the client and reports saved; an operation that throws is failed and clears busy.
- [x] 2.3 In `board.ts`:
  - `identify` stops at the first silent response, with no record and "not answering" (design D2).
  - `onSilent` lets go with "stopped answering" (design D2).
  - `RebootDFU` gets `expectSilence`.
  - The transport's `onClose` and the system's `disconnect` event call `lost()`, which returns to "Not connected" (design D3).
  - The public `send` goes through the queue, and the blade-off poll uses it (design D4).
  - `run` uses `runOperation`, and `hiltwrightMuteBoard` exists in development only (design D6).

  Verify with `npm run typecheck`, and in 3.1 and 3.2.
  - **Result, 2026-09-26.** Everything above is in place:
    - `identify` sends through `sendNow`. An `identifying` flag turns `onSilent` into a `NotAnswering` throw at the probe or the next command, before `connected` and before the record. `connectTo` shows "The saber is not answering. Unplug it and plug it back in."
    - Once connected, `onSilent` shows "The saber stopped answering. Unplug it and plug it back in."
    - `RebootDFU` sends with `expectSilence`.
    - The transport's `onClose`, and a `navigator.serial` `disconnect` event for our port, call `lost()`, which returns to "Not connected".
    - The public `send` is queued. The queue is created with the refs, and the blade-off poll uses `send`. No queued operation calls it, so nothing waits on itself.
    - `run` uses `runOperation`.
    - `hiltwrightMuteBoard` exists in development only.

    The type check is clean.

## 3. Checks

- [x] 3.1 Read-only `-Board` run on V2.2 hote2 (check which board is plugged in first), on a scratch folder (design D7). Verify that:
  - a muted saber's console `battery` gives the "stopped answering" error within about 12 s, and the port is released
  - after unmuting, a reconnect reads the saber again
  - connecting while muted ends "not answering" within 15 s, with the saber list unchanged
  - **Result, 2026-09-26.** PnP showed only hote2 (USB serial 209133815232, COM8) before the run. Scratch folder, `-Board`, read commands only. hote2 connected (v8.10 hiltwright ce12a06, 13 presets).
    - **Silent while connected:** muted, the Diagnostics `battery` got nothing back. The log says `silent: battery (10478 ms, nothing heard)`, and 10.5 s after the click the Armory showed "Something went wrong. The saber stopped answering. Unplug it and plug it back in."
    - **Unmuted:** Connect read the saber again in 1.8 s.
    - **Connecting while silent:** after Disconnect, mute and Connect, the log says `silent: hwt| version (6005 ms)` and `reading stopped: no answer to the tag probe`. The Armory said "The saber is not answering…" after 6.3 s.
    - **The saber list** was `["hote2"]` before and after.
    - **Left connected and unmuted:** reconnected in 1.6 s.
- [x] 3.2 Owner check on V2.2 hote2 and the V3.9 from a development build (design D7). Verify on each board that:
  - unplugging while idle reads "Not connected", and replugging reconnects
  - unplugging during a console `list_fonts` ends the command and reads "Not connected"
  - pulling the cable just as a preset edit (for example a font change) is saved leaves the save status saying what happened (saved, failed, or "Not sent: the saber is not connected."), never nothing. The exact case, an edit still waiting its turn at the unplug, is covered by `boardOps.test.ts`, because the page offers no edits once the saber is unplugged.
  - **First run, 2026-09-26 (owner).** Steps 1 and 2 passed. Step 3 failed:
    - While unplugged, the page read "Not connected" and noted the stored presets, but showed no failure.
    - Only after reconnecting did the save chip say "Font → Ben_Solo failed: The saber stopped answering. Unplug and replug it, then…".
    - The chip overflowed its container.

    Fixed (design D5, added):
    - An operation cut off by the connection going reports "Not saved: the saber was disconnected during the change." (new test in `boardOps.test.ts`).
    - The Presets header shows a failed save while offline.
    - A new connection clears the save status.
    - `.chip.err` wraps, on its own line in the Presets header, measured and screenshotted inside the panel.

    The spec gains the scenario "Unplugged while an edit is written". 184 core and 254 desktop tests pass, and the type check is clean. Awaiting the owner's re-run of step 3, and the V3.
  - **Result, 2026-09-26 (owner).** All passed:
    - **hote2:** step 3 passed on the re-run. The log shows `port lost` 0.3 s after `set_font BEN_SOLO`, then "Font → BEN_SOLO · disconnected during the change".
    - **V3.9 (stock `default_proffieboard_config.h`, untagged):** all three steps passed, over several unplugs and replugs.

    Two things from the owner's log (`hiltwright-20260926-160344.log`):
    - **With no SD card, a V3 preset edit fails with "The saber stopped answering…".** The board printed "Failed to mount SD card.". This is the preset editor's own behaviour with no card, not this change's, so it is filed as HW-2026-09-26d in `preset-editor-fixes`.
    - **An unplug while the V3 was being read** showed "Board did not answer: Error: Not connected" and kept that text. This is F1 here, so it is fixed (design D3, added). 184 core and 254 desktop tests pass, and the type check is clean. It was not re-run on a board, because the owner's development app held hote2's port.
- [x] 3.3 Correct the stale statements of design D8 in `protocol.test.ts`, `docs/09-board-protocol-notes.md` and `docs/00-plan.md`. Verify by reading each.
  - **Result, 2026-09-26.** Done, read back after editing:
    - The `protocol.test.ts` test is now "OS 8.10 rejects help, id, list_named_style (singular) and get_style, and tags written without a space after the pipe".
    - Doc 09 says a 10 s read-back ceiling (`READBACK_TIMEOUT`).
    - The plan names `list_named_styles`. Its 1200-baud line now says `RebootDFU` has done every V2.2 reboot, and that the Web Serial touch is a fallback never yet needed, still unexercised there, on macOS/Linux and on a V3. The design first called it confirmed; the logs show it never ran, so that was corrected.
- [x] 3.4 Run `npm test` and `npm run typecheck`; verify both pass.
  - **Result, 2026-09-26.** 184 core and 253 desktop tests pass (9 gated skipped), and the type check is clean in both workspaces.
- [ ] 3.5 After archive, tick roadmap task 3.12 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
