# Design

## Context

See proposal.md for why. The current state:

- **Connecting.** `useBoard().identify()` (`apps/desktop/src/renderer/src/board.ts`) sends, in order: the tag probe, `version`, `battery`, `get_volume`, `get_preset`, `list_presets`, `list_fonts`, `list_tracks` and `scanid`.
  - `battery` makes ProffieOS speak the voltage (`common/battery_monitor.h`).
  - `scanid` runs `FindBladeAgain()` (`props/prop_base.h`): every blade style is freed and rebuilt, the preset is resumed from the card, and the font is scanned again.
  - The library is matched after the reading, by USB serial (`api().usb.proffieSerials()`), else by config, install stamp and pixel counts (`main/library.ts`). So the pixel counts from `scanid` are part of a saber's identity.
- **Silence.** `BoardClient` (`packages/core/src/protocol/client.ts`) nudges a silent tagged board every 0.8 s. After 10 s with nothing heard, it ends the command as `silent` and calls `onSilent`.
  - While connected, `board.ts` answers that with `disconnect(STOPPED_ANSWERING)`.
  - `runOperation` (`boardOps.ts`) then sees the client gone and reports "disconnected during the change".
  - Every board command takes its turn in one `serialQueue`.
- **The stall seen on hote2** (proposal, 14:42:47). The board was not reset. After the owner pressed Connect, its first output was the rest of the stalled reply and the stalled command's end marker. The reopen is what released it.
- **New tags.** A new `BoardClient` numbers its tags from `h1` again, and the open discards only the first 250 ms of output. In the hote2 log the stale end marker arrived 265 ms after the open.

## Goals / Non-Goals

**Goals:**
- One reopen per stall, inside the stalled command's turn, so the queue keeps its order.
- Every operation that changes presets can be judged against what the saber reports after the reopen.
- The rules live in plain functions in `boardOps.ts` and `packages/core`, tested under node; `board.ts` only wires them.

**Non-Goals:**
- Recovering while the saber is first read. Stalls came after about 30 s idle, and a reading follows a connect, which has just opened the port.
- A new header state. The header stays "Connected" during the pause, and the save status says what is happening.
- Updating the battery from the saber's own 20-second battery lines.

## Decisions

### D1. The battery is read with `battery_voltage`
`identify` sends `battery_voltage` and waits for a line that is a bare number. A new `parseBatteryVoltage(lines)` in `packages/core/src/protocol/responses.ts` reads it.

If the saber rejects the command, it sends `battery` as now, and `battery_voltage` is taken out of `rejected`. The two steps sit in `readBattery(send)` in `boardOps.ts`, so the fallback can be tested with a fake `send`.

**Rejected:**
- *Building Hiltwright firmware with `DISABLE_TALKIE`.* It helps only Hiltwright builds, and it also silences the spoken error messages owners rely on when a card or font is missing.
- *Waiting for the saber's own "Battery voltage:" line.* It comes every 20 s, which would make connecting up to 20 s slower.

### D2. The blade layout is read once per firmware build
`identify` asks main for the USB serials before the blade step, not after. A pure `storedLayout(records, serial, version)` in `boardOps.ts` returns the stored `pixelBlades` and `bladeConfig`:
- **From the serial's record:** when it has the same config and install stamp, and a non-empty layout.
- **Without a usable serial:** only when exactly one record has that config and install stamp.
- **Otherwise:** null, and `identify` sends `scanid` as now.

"Read again" follows the same rule.

**Rejected:**
- *`get_max_blade_length <n>` for each blade.* A plain LED blade answers 1, so it cannot be told from a one-pixel accent. The counts would no longer match those stored from `scanid`, so a saber could stop matching its own record.
- *Never sending `scanid` for Hiltwright builds, using the manifest instead.* Firmware not built by Hiltwright still needs `scanid`. One rule for every board is simpler, and the scan happens once per build either way.
- *Always sending `scanid`.* That is the re-initialisation and card scan this change removes.

### D3. A stall reopens the port once, inside the stalled turn
A small recovery object, `createRecovery(deps)` in `boardOps.ts`, owns one recovery at a time. Its dependencies are `reopen()` and `reread()`, both supplied by `board.ts`.

**Starting it.** `onSilent` while connected, and not identifying, calls `recovery.start()` instead of `disconnect`. Starting again while one is under way joins it.

**What `board.ts` does:**
1. `reopen` closes the `BoardClient` and the `WebSerialTransport`, keeping the `SerialPort` object. It then opens a new transport on the same port and makes a new client (D4).
2. `reread` runs the tag probe, `get_preset` and `list_presets`. The results go into `info` through `applyList`, and the presets are remembered (`rememberPresets`).

**The outcome** is `recovered` or `lost`:
- `lost` comes from a failed open, a silent probe or a silent read. It calls `disconnect(STOPPED_ANSWERING)` as today.
- An unplug during recovery goes through `lost()` as now.

**Holding the queue.** `sendNow` awaits `recovery.wait()` when its response was silent. `runOperation` awaits it before judging (D5). So the next queued command runs only after the recovery, on the new client.

**Rejected:**
- *Toggling DTR without reopening.* It has not been seen to release the board, and the reopen has.
- *Sending the stalled command again.* A duplicate or a move would happen twice.
- *A shorter silence limit.* `list_fonts` on a failing card was silent for 9 s and then finished, so 10 s stays.

### D4. Tags carry on across the reopen
`ClientOptions` gains `firstSeq` and `firstKick`, and `BoardClient` exposes `seq` and `kicks`. The new client starts after the old one's numbers. A stale `Whut? :h11x|` cannot then match a new command. Like any late tagged line, it is shown as an event. The 250 ms discard on open stays as it is.

### D5. A stalled operation is judged by what the saber reports
`run()` in `board.ts` takes an optional `confirm(info)` per operation. If a recovery happened during the operation, `runOperation` waits for it. Then:
- **`recovered` and `confirm` true:** saved, labelled "`<label>` · after a pause".
- **`recovered` and `confirm` false, or no `confirm`:** failed, with "Not made: the saber paused and did not take this change. The page shows what it has now."
- **`lost`:** "disconnected during the change", as today.

The checks:
- **Selection, and Apply colours:** `currentPreset === index`.
- **Edit, Restore, set styles:** `patchShown(preset, patch)`, a new pure function in `packages/core/src/protocol/session.ts` beside `editCurrentPreset`. It is true when every field in the patch matches the preset.
- **Duplicate:** one more preset, and the one at `pos` has the source's name and font.
- **Delete:** one fewer preset.
- **Move:** the preset at `to` has the moved preset's name and font.

The last three are pure functions in `boardOps.ts`.

**Rejected:**
- *Re-reading only the current preset.* Duplicate, delete and move change the whole list, and `list_presets` is fast.

### D6. No battery under 2 V
`NO_BATTERY_BELOW_V = 2` and `batteryLabel(v)` go in a small renderer module, `battery.ts`, tested under node:
- under 2 V → "No battery"
- 2 V or more → "3.90 V"
- null → "—"

The header chip uses the label. The Armory's connection panel shows the USB-power note under the saber when the reading is under 2 V.

**Rejected:**
- *A percentage.* ProffieOS's own curve starts at 2.85 V, so it says nothing below it.
- *Flagging under 3 V.* A flat but present battery reads about 3 V, and it is not missing.

### D7. Pauses are logged and counted
The run log gets:
- `[board] paused: <command>, reconnecting`
- `[board] reconnected after <ms> ms`, or `[board] reconnect failed: <why>`

The connection snapshot gains `pauses`, the count for this connection, so a diagnostics file shows how often a saber stalled.

## Risks / Trade-offs

- **[A dead saber is given up on about 3 s later than now]** → The reopen and re-read are bounded by the same 10 s silence limit. Then the error is the same as before.
- **[An edit is judged saved because the saber already had that value]** → A change that changes nothing sends nothing (existing rule), so a stalled change always had a different value to reach.
- **[The reopen does not release a stalled board on another board or Windows version]** → Then the result is the error the owner sees today. The V3 check records whether the V3 stalls at all.
- **[Recovery hides how often a saber stalls]** → D7 logs and counts each pause.
- **[A saber whose blades were swapped without a reflash keeps its stored layout]** → Blade ID is off in Beta 1, and the layout is compiled into the firmware. Read again after an install re-reads it, because the install stamp changes.

## Migration Plan

Nothing stored changes shape. Records from earlier runs already hold `pixelBlades` and `bladeConfig` with their install stamp, so their first connect after this change reuses them. Rollback is a revert.
