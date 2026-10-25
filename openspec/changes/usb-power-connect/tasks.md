# Tasks

## 1. The protocol

- [ ] 1.1 In `packages/core/src/protocol/client.ts`, add `firstSeq` and `firstKick` to `ClientOptions`, and expose the client's `seq` and `kicks` (design D4). Verify in `packages/core/test/tagged.test.ts`:
  - a client started with `firstSeq: 12` sends `h12| …` first
  - a late `Whut? :h11x|` arriving while `h12` waits is shown as an event and does not end `h12`

  Then `npm test`.
- [ ] 1.2 In `packages/core/src/protocol/responses.ts`, add `parseBatteryVoltage(lines)` for the bare number `battery_voltage` prints, tagged (`1,4,h2|0.03`) or not (design D1). Verify in `packages/core/test/protocol.test.ts`:
  - `0.03`
  - `3.92`
  - a status line before the number
  - no number gives null
- [ ] 1.3 In `packages/core/src/protocol/session.ts`, add `patchShown(preset, patch)`: true when every field the patch sets matches the preset, styles by blade (design D5). Verify in `packages/core/test/session.test.ts`:
  - font
  - name
  - one blade's style among three
  - an empty patch
  - a mismatch on one field of two

## 2. A quiet, light connect

- [ ] 2.1 In `boardOps.ts`, add `readBattery(send)`: `battery_voltage`, falling back to `battery` when it is rejected, with `battery_voltage` then left out of the rejected list. Use it in `identify` (design D1). Verify in `apps/desktop/test/boardOps.test.ts` with a fake `send`:
  - a firmware that answers `battery_voltage`: one command sent, the number read
  - a firmware that rejects it: `battery` sent next, the voltage read, nothing listed as rejected
- [ ] 2.2 In `boardOps.ts`, add `storedLayout(records, serial, version)`. In `identify`, ask for the USB serials before the blade step, and send `scanid` only when `storedLayout` returns null (design D2). Verify in `apps/desktop/test/boardOps.test.ts`:
  - the serial's record with the same config and install stamp gives its layout
  - a new install stamp gives null
  - no serial with one matching record gives its layout
  - no serial with two matching records gives null
  - a stored empty layout gives null

  Then `npm test` and `npm run typecheck`.

## 3. Recovering from a stall

- [ ] 3.1 In `boardOps.ts`, add `createRecovery({ reopen, reread, log })`: one recovery at a time, `start()` joining one under way, `wait()` resolving to `recovered`, `lost` or null when none happened (design D3). Verify in `apps/desktop/test/boardOps.test.ts`:
  - reopen and reread succeed → `recovered`
  - reopen throws → `lost`
  - reread silent → `lost`
  - two starts → one reopen
  - `wait()` with no stall → null
- [ ] 3.2 In `boardOps.ts`, add the list checks `duplicateShown`, `deleteShown` and `moveShown`. Give `runOperation` the recovery and an optional `confirm`, and judge a stalled operation by it (design D5). Verify in `apps/desktop/test/boardOps.test.ts`:
  - a stalled selection whose preset is now current is saved, labelled "after a pause"
  - a stalled edit the saber does not show fails as "Not made…", and the operation runs once
  - a stall ending `lost` reports "disconnected during the change"
  - an operation queued behind the stall runs after `wait()` resolves, on the new client
  - the three list checks, each true and false
- [ ] 3.3 In `board.ts`, wire it up (design D3, D4, D7):
  - `onSilent` while connected starts the recovery
  - `reopen` closes and reopens the same port, making a new client that carries on the old one's `seq` and `kicks`
  - `reread` runs the probe, `get_preset` and `list_presets`, then applies and remembers the presets
  - `sendNow` waits for the recovery after a silent response
  - `run()` gives each preset operation its `confirm`
  - the log lines are written, and `pauses` goes into the connection snapshot

  Add a development aid `hiltwrightStallBoard()` that mutes the board until the next open. Verify:
  - `npm run typecheck` and `npm test`
  - one development run on hote2 using that aid, confirmed first to be hote2 by its PnP serial and with the owner's go-ahead: a preset selection made while stalled is reconnected and reported saved, and the run log shows the paused and reconnected lines

## 4. The no-battery notice

- [ ] 4.1 Add `apps/desktop/src/renderer/src/battery.ts` with `NO_BATTERY_BELOW_V` and `batteryLabel(v)`. Use it for the header chip, and show the USB-power note in the Armory's connection panel under 2 V (design D6). Verify:
  - `apps/desktop/test/battery.test.ts`: 0.03, 1.48, 2.0, 3.9, null
  - `npm run typecheck`
  - the wording of the note matches the spec

## 5. Checks

- [ ] 5.1 Record `battery_voltage` on hote2 as `packages/core/test/transcripts/os8/36-battery_voltage.txt` with `tools/record-transcripts.ps1`. Check PnP first that the board is hote2 (serial 209133815232), and get the owner's go-ahead. Add it to the recorded-transcripts tests in `protocol.test.ts`. Verify that `npm test` passes and the transcript parses to the voltage the board printed.
- [ ] 5.2 Hardware check by the owner on the V2.2 hote2 with no battery, from a development build:
  - **Quiet:** connect, then press Read again. The saber does not speak its voltage. The header shows "No battery", and the Armory shows the USB-power note.
  - **No re-detection:** unplug and plug in again. The run log shows no `scanid`. After a Build & Install, the first connect shows one `scanid`, and the next shows none.
  - **Stalls:** wait 30 s, then select a preset; repeat ten times. Any stall ends with the saber on the chosen preset and the selection shown as saved, with no error. Record how many of the ten stalled, from the `paused` lines.
  - **Still identified:** the Armory shows hote2 as the same saber as before, not a new one.
- [ ] 5.3 Hardware check by the owner on the V3, with and without a battery if one is to hand: the quiet and no-re-detection checks of 5.2, and the ten idle selections. Record whether the V3 stalls at all.
- [ ] 5.4 After archive, tick roadmap task 3.24a in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
