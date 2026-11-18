# Tasks

## 1. The model

- [x] 1.1 In `slotModel.ts`, add `withSlotChoice(model, preset, blade, look | null, args | null)`, with `withLookInSlot` calling it (design D1). Verify in `apps/desktop/test/saberModel.test.ts`:
  - a look, and null
  - args kept when queued and absent when written live
  - a live choice of an installed style replacing a queued one leaves `queuedLookIds` empty

  Then `npm test`.
  - **Result, 2026-09-29.** `withSlotChoice(model, preset, blade, look | null, args | null)` is in `slotModel.ts`:
    - a look, or null for no style
    - args kept only with a look
    - an empty row dropped
    - a non-starter look added once

    `withLookInSlot` now calls it. Three new tests in `apps/desktop/test/saberModel.test.ts` pass (13 in the file):
    - queued with colours, then live with none, then no style
    - F37: fire queued, then heartbeat chosen live, leaves nothing queued and compiles heartbeat
    - the owner's own style added once

    The older `withLookInSlot` tests still pass.
- [x] 1.2 In `saberModel.ts`, add `matchPresets(saved, current)` and `withPresetRenamed(model, index, name)`, and use `matchPresets` in `draftModel` (design D2). Verify in `apps/desktop/test/draftModel.test.ts`:
  - the two BST-2 expected failures become normal tests
  - repeated names match in order
  - a renamed preset keeps its looks through `withPresetRenamed`

  Then `npm test`.
  - **Result, 2026-09-29.**
    - `matchPresets(saved, current)` in `saberModel.ts` matches by name, with repeated names (blank included) in order, and nothing for an unknown name. `draftModel` uses it, with no fall-back by position.
    - `withPresetRenamed(model, index, name)` renames one preset.
    - Both BST-2 tests in `apps/desktop/test/draftModel.test.ts` are normal tests and pass.
    - Two new tests pass: repeated and blank names in order with a new name unmatched, and an app rename keeping its looks.
    - 29 tests pass across `draftModel` and `saberModel`, the 6.16 reorder test among them.
- [x] 1.3 Move `splitFont` and `joinFont` to `renderer/src/presetFields.ts`, keeping every folder (design D3). Verify in a new `apps/desktop/test/presetFields.test.ts`: `Mara;Extra;common` with the folder changed to `Grey` gives `Grey;Extra;common`, and the switch toggles only `common`.
  - **Result, 2026-09-29.** `apps/desktop/src/renderer/src/presetFields.ts` holds `splitFont(font)` (the first folder, the others in order, and the common flag) and `joinFont(parts)`. `Presets.tsx` switches to them in 3.1. The new `apps/desktop/test/presetFields.test.ts` has three tests, all passing:
    - `Mara;Extra;common` with the folder changed to `Grey` gives `Grey;Extra;common`
    - the switch toggles only `common`
    - a single folder, `common` alone, and an empty font

## 2. The board link

- [x] 2.1 No card (design D6):
  - `sdFailureIn(lines)` in `boardOps.ts`, and `sdMissing` in `BoardInfo`, set during `identify` and by later events
  - `NO_SD_CARD` from `editCurrentPreset` in core
  - `runOperation` keeps it when the port went away

  Verify:
  - `apps/desktop/test/boardOps.test.ts`: `sdFailureIn`, and the kept error
  - `packages/core/test/protocol.test.ts`: `editCurrentPreset` against a fake saber printing "Failed to mount SD card."

  Then `npm test`.
  - **Result, 2026-09-29.**
    - `sdFailureIn(lines)` and `NO_SD_CARD` live in core beside `editCurrentPreset` (`packages/core/src/protocol/session.ts`), and `boardOps.ts` re-exports both, so the rule is written once.
    - `editCurrentPreset` keeps every line its commands hear. A card failure there, or in the dead-link probe, returns `NO_SD_CARD` with no read-backs.
    - `BoardInfo.sdMissing`: `identify` clears the flag and reads it at the end. Any line heard with the failure sets it, and while connected also updates the page at once.
    - `runOperation` keeps `NO_SD_CARD` when the port went away (the saber may reset for want of a card).
    - The fake saber test sits in `packages/core/test/session.test.ts`, where the other `editCurrentPreset` tests are, not in `protocol.test.ts`. It passes: `set_font` is answered "Failed to mount SD card.", the result is `NO_SD_CARD` with no read-back sent. 8 tests in the file.
    - `apps/desktop/test/boardOps.test.ts` has two new tests, both passing (11 in the file): `sdFailureIn` on its own, and the kept error.
- [x] 2.2 The remembered presets (design D5):
  - `SaberPatch.presets`, stored by `Library.update` and checked in IPC
  - `runOperation` returns whether it was confirmed
  - `board.ts` updates the record after each confirmed preset operation

  Verify in `apps/desktop/test/library.test.ts` (presets stored) and `boardOps.test.ts` (the returned result). Then `npm run typecheck`.
  - **Result, 2026-09-29.**
    - `SaberPatch.presets` is in `shared/api.ts`. `Library.update` stores it, and `library:update` in IPC puts it through the same preset-list check `library:upsert` uses.
    - `runOperation` returns whether the saber confirmed the operation, and `run` in `board.ts` passes that on. `setPresetStyles` now uses it instead of its own flag.
    - After a confirmed edit, style write, move, duplicate or delete (a snapshot restore goes through the edit), `board.ts` stores the presets as just read on the saber's record and refreshes the library. A failure to store is logged and does not fail the operation.
    - `apps/desktop/test/library.test.ts` has a new test, passing: presets stored survive a new `Library` on the same file, with the model and identity kept. `boardOps.test.ts` checks the returned result in four tests. 33 tests pass across the two files.
    - `npm run typecheck` passes.

## 3. The Presets page

- [x] 3.1 In `Presets.tsx`:
  - **F37:** after a confirmed live style write, save `withSlotChoice` of the snapshot
  - **F36:** "Saber's default" only while staged, with the note only for real looks
  - **F43:** the chip
  - **F44:** `CommitField` with `sync`
  - **F45:** colours written 500 ms after the last change, or on blur
  - **F41:** fonts through `presetFields`, with "Also uses" shown
  - renames saved with `withPresetRenamed`
  - read-only with the note when live without a card

  Verify with `npm run typecheck`, and in 4.2.
  - **Result, 2026-09-29.** Done in `apps/desktop/src/renderer/src/Presets.tsx`:
    - **F37:** a live style write the saber confirms saves `withSlotChoice(snapshot, …, look, null)`. A queued or staged choice saves `withSlotChoice(snapshot, …, look, args)`. The page's own copy of the slot rule is gone.
    - **F36:** "Saber's default (uses <first style for the role>)" is offered only when not live. Live, a blade with no style shows a disabled "No style chosen". The "not on the saber yet" note needs a real look.
    - **F43:** outside live, the chip reads "Staged for install" only while something is staged, and "Not plugged in" otherwise.
    - **F44:** `CommitField` takes `sync = board.save` for the name, font and track.
    - **F45:** a colour is written 500 ms after the picker last moved, or at once when it is left. Either clears the timer. The swatch keeps the picked colour until the write is done.
    - **F41:** the font goes through `splitFont` and `joinFont`, and "Also uses: …" shows the other folders.
    - A live rename the saber confirms saves `withPresetRenamed(snapshot, …)`.
    - **No card:** plugged in with `info.sdMissing`, every control is off, clicking a preset or a field sends nothing, the red note gives the design's wording, and the chip reads "No SD card". Nothing is staged instead.
    - `npm run typecheck` passes. The page was checked in 4.2.

## 4. Checks

- [x] 4.1 Run `npm test` and `npm run typecheck`; verify both pass.
  - **Result, 2026-09-29.** `npm run typecheck` passes. `npm test` passes: core 211 tests in 17 files; desktop 391 passed and 13 skipped in 47 files (44 run, 3 skipped).
- [x] 4.2 Development run with no board, on a scratch folder with a saber that has presets. Verify that:
  - unplugged with nothing staged, the chip reads "Not plugged in"
  - after a staged edit, it reads "Staged for install", and the picker offers "Saber's default (uses …)"
  - a font of `A;B;common` shows "Also uses: B", and changing the folder keeps `B` (staged)
  - **Result, 2026-09-29.** Run with `HILTWRIGHT_NO_BOARD` (hote2 was plugged in and left alone) on a scratch folder with one remembered saber: two presets, the first with the font `Mara;Extra;common`. All three checks pass:
    - Unplugged with nothing staged, the chip reads "Not plugged in".
    - After renaming preset 1, it reads "Staged for install". The blade's picker shows "Saber's default (uses Steady)".
    - Preset 1 shows "Also uses: Extra". With the folder changed to `Grey`, the staged font is `Grey;Extra;common` and the note still reads "Also uses: Extra".
    - The saved model has `presetsFrom` set, and the names `Mara Jade Skywalker` and `Valkyrie`.
- [x] 4.3 Hardware check by the owner on the V2.2 hote2, from a development build:
  - **F37:** queue a style the firmware lacks for preset 1 blade 1, then choose a style the firmware has for the same blade. The queued chip goes. Build & Install shows no new style for it, and after installing, the saber has the chosen style there.
  - **F41:** give a preset the font `<font>;<other font>;common` (in the saber's own console, or staged and installed). Change the folder on the page. The saber reports `<new>;<other font>;common`.
  - **F38:** rename a preset live, unplug, and see the new name in the presets as last read.
  - **F45:** pick a colour and leave the picker open. It is written within a second.
  - **No card:** take the card out, connect. The Presets page is read-only with the no-card note, and clicking a preset sends nothing (the log shows no `set_preset`). Put the card back and reconnect: live again.
  - **First attempt, 2026-10-25 (not valid, rerun):** hote2 held another hilt's card, and its own card was in a card reader (confirmed by the owner). The saber reported 0 fonts, and every folder was "Font directory not found". Choosing Cortosis Clash V2 for Preset 12 sent `set_style1 builtin 0 1`. The saber's reply stalled, and the app reported the saber stopped answering after 8 s. Log `hiltwright-20261025-135632.log`. The stall is the no-battery link stall filed as `usb-power-connect`. At first it was put down to a card shared over USB; that was wrong. Rerun F37 with hote2's own card in it.
  - **Second attempt, 2026-10-25, card given back:** F37 passed (the chip went, and the saber has the chosen style). F45 passed (written within a second). No card passed (read-only). F38: a rename is written when the field is left or Enter is pressed (`CommitField`, by design: one card write per edit). The saber reported `Preset: 11 test` after replugging, Unplugged, the remembered presets in `library.json` hold `Preset: 11 test`, so F38 passed. A rename made while unplugged stages ("Staged for install"), as F43 intends. F41 passed in its two-folder form: at 14:42:36 Preset 11's folder went from `KRossguardv3` to `Ahch-To`, and on reconnect the saber reported `Ahch-To;common` (later put back from History). The owner found the three-folder wording unclear; that case is covered by the core tests only.
  - **Result:** all five checks passed on hote2, 2026-10-25. The link stalls seen during the run (a preset selection about half the time, with no battery) are not this change; they are filed as `usb-power-connect` (roadmap 3.24a).
- [x] 4.4 After archive, tick roadmap task 3.21 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
