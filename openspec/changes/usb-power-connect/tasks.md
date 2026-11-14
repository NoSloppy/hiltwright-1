# Tasks

## 1. The protocol

- [x] 1.1 In `packages/core/src/protocol/client.ts`, add `firstSeq` and `firstKick` to `ClientOptions`, and expose the client's `seq` and `kicks` (design D4). Verify in `packages/core/test/tagged.test.ts`:
  - a client started with `firstSeq: 12` sends `h12| …` first
  - a late `Whut? :h11x|` arriving while `h12` waits is shown as an event and does not end `h12`

  Then `npm test`.
  - **Result, 2026-10-25.** `ClientOptions.firstSeq` and `firstKick`, with getters `lastSeq` and `lastKick`. A new test in `packages/core/test/tagged.test.ts` passes: a client started at 12 sends `h12| get_preset`, and the end marker `Whut? :h11x|` arriving meanwhile is shown as a late line and does not end it.

- [x] 1.2 In `packages/core/src/protocol/responses.ts`, add `parseBatteryVoltage(lines)` for the bare number `battery_voltage` prints, tagged (`1,4,h2|0.03`) or not (design D1). Verify in `packages/core/test/protocol.test.ts`:
  - `0.03`
  - `3.92`
  - a status line before the number
  - no number gives null
  - **Result, 2026-10-25.** `parseBatteryVoltage(lines)` in `responses.ts`, exported. `protocol.test.ts` covers `0.03`, `3.92`, a status line first and no number. `tagged.test.ts` adds a tagged `battery_voltage` answer (`1,4,h1|0.03`). 46 tests pass in the two files.

- [x] 1.3 In `packages/core/src/protocol/session.ts`, add `patchShown(preset, patch)`: true when every field the patch sets matches the preset, styles by blade (design D5). Verify in `packages/core/test/session.test.ts`:
  - font
  - name
  - one blade's style among three
  - an empty patch
  - a mismatch on one field of two
  - **Result, 2026-10-25.** `editCurrentPreset`'s private read-back rule `matches` is now the exported `patchShown`, so the write and the stall use one rule. Two tests in `session.test.ts` cover font, name, one blade of three, an empty patch, and a mismatch beside a match (10 in the file).

## 2. A quiet, light connect

- [x] 2.1 In `boardOps.ts`, add `readBattery(send)`: `battery_voltage`, falling back to `battery` when it is rejected, with `battery_voltage` then left out of the rejected list. Use it in `identify` (design D1). Verify in `apps/desktop/test/boardOps.test.ts` with a fake `send`:
  - a firmware that answers `battery_voltage`: one command sent, the number read
  - a firmware that rejects it: `battery` sent next, the voltage read, nothing listed as rejected
  - **Result, 2026-10-25.** `readBattery(send)` in `boardOps.ts` sends `battery_voltage`, and `battery` only when that is rejected. `rejected` lists `battery` only when neither works. `identify` uses it, with its own timing wrapper not counting the quiet command as rejected. Three tests in `boardOps.test.ts`: quiet answer, fallback, neither.

- [x] 2.2 In `boardOps.ts`, add `storedLayout(records, serial, version)`. In `identify`, ask for the USB serials before the blade step, and send `scanid` only when `storedLayout` returns null (design D2). Verify in `apps/desktop/test/boardOps.test.ts`:
  - the serial's record with the same config and install stamp gives its layout
  - a new install stamp gives null
  - no serial with one matching record gives its layout
  - no serial with two matching records gives null
  - a stored empty layout gives null

  Then `npm test` and `npm run typecheck`.
  - **Result, 2026-10-25.** `storedLayout(records, serial, version)` in `boardOps.ts`. `identify` now looks up the USB serial and the library before the blade step, and sends `scanid` only when the result is null. It logs `blade layout [...]: stored for this build` otherwise. Six tests in `boardOps.test.ts`: same build by serial, new stamp, unknown serial with another board on the same build, one and two candidates without a serial, empty layout and no stamp. `npm run typecheck` passes; `npm test` 615 passed (gated skipped).

## 3. Recovering from a stall

- [x] 3.1 In `boardOps.ts`, add `createRecovery({ reopen, reread, log })`: one recovery at a time, `start()` joining one under way, `wait()` resolving to `recovered`, `lost` or null when none happened (design D3). Verify in `apps/desktop/test/boardOps.test.ts`:
  - reopen and reread succeed → `recovered`
  - reopen throws → `lost`
  - reread silent → `lost`
  - two starts → one reopen
  - `wait()` with no stall → null
  - **Result, 2026-10-25.** `createRecovery({ reopen, reread, log })` in `boardOps.ts`, with `count`, `active`, `start(why)` and `since(n)` (null when no stall began after `n`, which replaces the planned `wait()`). Five tests in `boardOps.test.ts`: recovered, reopen fails, silent again, two starts one reopen, `since`.

- [x] 3.2 In `boardOps.ts`, add the list checks `duplicateShown`, `deleteShown` and `moveShown`. Give `runOperation` the recovery and an optional `confirm`, and judge a stalled operation by it (design D5). Verify in `apps/desktop/test/boardOps.test.ts`:
  - a stalled selection whose preset is now current is saved, labelled "after a pause"
  - a stalled edit the saber does not show fails as "Not made…", and the operation runs once
  - a stall ending `lost` reports "disconnected during the change"
  - an operation queued behind the stall runs after `wait()` resolves, on the new client
  - the three list checks, each true and false
  - **Result, 2026-10-25.** `NOT_MADE_AFTER_PAUSE`, `duplicateShown`, `deleteShown` and `moveShown` in `boardOps.ts`. `runOperation` takes `recovery` in its deps and an optional `confirm`, and judges a turn that met a stall. Eight tests: saved after a pause, not made and run once, lost, queued op on the new client, no stall unchanged, and the three list checks. 33 in the file.

- [x] 3.3 In `board.ts`, wire it up (design D3, D4, D7):
  - `onSilent` while connected starts the recovery
  - `reopen` closes and reopens the same port, making a new client that carries on the old one's `seq` and `kicks`
  - `reread` runs the probe, `get_preset` and `list_presets`, then applies and remembers the presets
  - `sendNow` waits for the recovery after a silent response
  - `run()` gives each preset operation its `confirm`
  - the log lines are written, and `pauses` goes into the connection snapshot

  Add a development aid `hiltwrightStallBoard()` that mutes the board until the next open. Verify:
  - `npm run typecheck` and `npm test`
  - one development run on hote2 using that aid, confirmed first to be hote2 by its PnP serial and with the owner's go-ahead: a preset selection made while stalled is reconnected and reported saved, and the run log shows the paused and reconnected lines
  - **Result, 2026-10-25.** Code in place, not yet verified on hardware. `board.ts` has `makeClient`, `reopenRef` (closes the old client and transport at once, reopens the same port, carries on `seq` and `kicks`) and `rereadRef` (probe, `get_preset`, `list_presets`, then apply and remember). `onSilent` starts the recovery; `sendNow` waits for it; every preset operation passes its `confirm`. `pauses` is in the connection snapshot and the diagnostics file (`supportBundle.test.ts` checks the line). `hiltwrightStallBoard()` is in development builds. `npm run typecheck` passes; `npm test` 628 passed (gated skipped). Hardware run, 2026-11-14, with the owner's go-ahead: PnP showed only hote2 (209133815232, COM8). The run used `HILTWRIGHT_E2E=stall` (a new development-only mode of `hiltwrightE2E`), `HILTWRIGHT_OFFSCREEN=1`, and a scratch `HILTWRIGHT_USER_DATA`. The run log:
    - `set_preset 0` met the stall: `silent: set_preset 0 (10499 ms, nothing heard)`, then `paused: set_preset 0, reconnecting`.
    - The port opened again, and the probe, `h10| get_preset` and `h11| list_presets` followed, carrying on the tag numbers. Then `reconnected after 1602 ms`.
    - `ok after a pause: Select preset 1`, in 12.1 s in all, with the saber on preset 1 and no error state.
    - The next selection went to the new client as `h12| set_preset 6`, was saved in 567 ms, and put hote2 back on preset 7 where it started.
    - The first connect on the empty scratch library sent `scanid` and `battery_voltage`, as it should.

## 4. The no-battery notice

- [x] 4.1 Add `apps/desktop/src/renderer/src/battery.ts` with `NO_BATTERY_BELOW_V` and `batteryLabel(v)`. Use it for the header chip, and show the USB-power note in the Armory's connection panel under 2 V (design D6). Verify:
  - `apps/desktop/test/battery.test.ts`: 0.03, 1.48, 2.0, 3.9, null
  - `npm run typecheck`
  - the wording of the note matches the spec
  - **Result, 2026-10-26.** `battery.ts` has `NO_BATTERY_BELOW_V = 2`, `noBattery(v)` and `batteryLabel(v)`. The header chip shows the label, with a tooltip under 2 V. The Armory's connection panel shows the amber note under 2 V: "No battery detected: <saber> is running on USB power alone. It may pause for a moment when it plays sound or reads its card. If it does, Hiltwright reconnects to it on its own." `apps/desktop/test/battery.test.ts` passes (3 tests: 0.03, 1.48, 2.0, 3.9, null). `npm run typecheck` passes. On screen it is seen in 5.2.

## 5. Checks

- [x] 5.1 Record `battery_voltage` on hote2 as `packages/core/test/transcripts/os8/36-battery_voltage.txt` with `tools/record-transcripts.ps1`. Check PnP first that the board is hote2 (serial 209133815232), and get the owner's go-ahead. Add it to the recorded-transcripts tests in `protocol.test.ts`. Verify that `npm test` passes and the transcript parses to the voltage the board printed.
  - **Result, 2026-11-14.** PnP showed one Proffieboard: hote2, serial 209133815232, on COM8. The owner gave the go-ahead. Recorded `battery_voltage` plain (`36-battery_voltage.txt`, `3.50` CRLF) and tagged (`37-tagged_battery_voltage.txt`, `1,4,b1|3.50`), and added both to `index.json`. The saber did not speak. A test in `protocol.test.ts` reads 3.5 from each (36 tests pass). hote2 read 3.50 V because a battery was connected this time (owner, 2026-11-14). On 2026-10-25, with none, it read 0.03-1.48 V.

- [x] 5.2 Hardware check by the owner on the V2.2 hote2 with no battery, from a development build:
  - **Quiet:** connect, then press Read again. The saber does not speak its voltage. The header shows "No battery", and the Armory shows the USB-power note.
  - **No re-detection:** unplug and plug in again. The run log shows no `scanid`. After a Build & Install, the first connect shows one `scanid`, and the next shows none.
  - **Stalls:** wait 30 s, then select a preset; repeat ten times. Any stall ends with the saber on the chosen preset and the selection shown as saved, with no error. Record how many of the ten stalled, from the `paused` lines.
  - **Still identified:** the Armory shows hote2 as the same saber as before, not a new one.
  - **Run with a battery, 2026-11-14** (owner; run log `hiltwright-20261114-124721.log`; not the no-battery check itself):
    - Two connects, both sending `battery_voltage`. Both said `blade layout [132,1,2]: stored for this build`, so no `scanid` was sent. Both matched hote2's own record (b53c5735a826).
    - The first connect read 1.41 V, the second 3.5 V: the battery went on between them.
    - Eleven selections, with 34 s to 4 min between them. Ten were saved in 216-619 ms.
    - One stalled, the selection of preset 2 at 12:52:08, 95 s after the last command, with the battery reading 3.5 V. The log shows `paused`, then `reconnected after 1863 ms`, then `ok after a pause: Select preset 2`.
    - After the reopen, the saber printed the rest of that selection's reply (font scan, SmoothSwing). It went to the log as late lines.
    - So the stall happens with a battery too, less often (1 in 11, against about half without). Power alone does not explain it.
  - **Run with no battery, 2026-11-14** (owner; same run log, from 13:08):
    - One connect, with `battery_voltage` reading 0.51 V, which is under 2 V, so "No battery". It said `blade layout [132,1,2]: stored for this build`, so no `scanid` was sent, and it matched hote2's own record.
    - Ten selections, 41 s to 1.5 min apart. Nine were saved in 223-331 ms.
    - One stalled, preset 7 at 13:12:36. The log shows `paused`, then `reconnected after 1642 ms`, then `ok after a pause: Select preset 7`, with no error.
    - So today: 1 stall in 10 without a battery, and 1 in 11 with one. On 2026-10-25 it was about half, without a battery.
    - The owner confirmed: no voltage was spoken on connect or Read again, and the header showed "No battery" with the Armory note.
    - The owner accepted the unit test for "one `scanid` after a Build & Install". That is the new-install-stamp case of `storedLayout` in `boardOps.test.ts`. It was not run on hardware.
  - **Result, 2026-11-14:** passed on hote2.
- [ ] 5.3 Hardware check by the owner on the V3, with and without a battery if one is to hand: the quiet and no-re-detection checks of 5.2, and the ten idle selections. Record whether the V3 stalls at all.
- [ ] 5.4 After archive, tick roadmap task 3.24a in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
