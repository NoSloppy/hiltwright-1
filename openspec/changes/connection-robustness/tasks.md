# Tasks

## 1. The protocol client

- [ ] 1.1 In `packages/core/src/protocol/client.ts`, add `Response.silent`, `ClientOptions.silentMs` (default 10000), `ClientOptions.onSilent` and `SendOptions.expectSilence`. A tagged command ends early after `silentMs` of total silence (design D1). Add the tests of design D7 to `protocol.test.ts`. Verify with `npm test` in `packages/core`, with the existing protocol and session tests still passing.

## 2. The renderer

- [ ] 2.1 In `serial.ts`, call `onClose` once when the read loop ends with `done` and was not closed on purpose, and guard `onClose` to fire once. Add the muted flag (design D3, D6). Create `serial.test.ts` with a fake port. Verify with `npm test`.
- [ ] 2.2 Move `runNow` into `boardOps.ts` as `runOperation`, reporting "Not sent: the saber is not connected." with no client (design D5). Add the tests to `boardOps.test.ts`. Verify with `npm test`.
- [ ] 2.3 In `board.ts`:
  - `identify` stops at the first silent response, with no record and "not answering" (design D2).
  - `onSilent` lets go with "stopped answering" (design D2).
  - `RebootDFU` gets `expectSilence`.
  - The transport's `onClose` and the system's `disconnect` event call `lost()`, which returns to "Not connected" (design D3).
  - The public `send` goes through the queue, and the blade-off poll uses it (design D4).
  - `run` uses `runOperation`, and `hiltwrightMuteBoard` exists in development only (design D6).

  Verify with `npm run typecheck`, and in 3.1 and 3.2.

## 3. Checks

- [ ] 3.1 Read-only `-Board` run on V2.2 hote2 (check which board is plugged in first), on a scratch folder (design D7). Verify that:
  - a muted saber's console `battery` gives the "stopped answering" error within about 12 s, and the port is released
  - after unmuting, a reconnect reads the saber again
  - connecting while muted ends "not answering" within 15 s, with the saber list unchanged
- [ ] 3.2 Owner check on V2.2 hote2 and the V3.9 from a development build (design D7). Verify on each board that:
  - unplugging while idle reads "Not connected", and replugging reconnects
  - unplugging during a console `list_fonts` ends the command and reads "Not connected"
  - an edit made while unplugged shows "Not sent: the saber is not connected."
- [ ] 3.3 Correct the stale statements of design D8 in `protocol.test.ts`, `docs/09-board-protocol-notes.md` and `docs/00-plan.md`. Verify by reading each.
- [ ] 3.4 Run `npm test` and `npm run typecheck`; verify both pass.
- [ ] 3.5 After archive, tick roadmap task 3.12 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
