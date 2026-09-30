# Tasks

## 1. The model

- [ ] 1.1 In `slotModel.ts`, add `withSlotChoice(model, preset, blade, look | null, args | null)`, with `withLookInSlot` calling it (design D1). Verify in `apps/desktop/test/saberModel.test.ts`:
  - a look, and null
  - args kept when queued and absent when written live
  - a live choice of an installed style replacing a queued one leaves `queuedLookIds` empty

  Then `npm test`.
- [ ] 1.2 In `saberModel.ts`, add `matchPresets(saved, current)` and `withPresetRenamed(model, index, name)`, and use `matchPresets` in `draftModel` (design D2). Verify in `apps/desktop/test/draftModel.test.ts`:
  - the two BST-2 expected failures become normal tests
  - repeated names match in order
  - a renamed preset keeps its looks through `withPresetRenamed`

  Then `npm test`.
- [ ] 1.3 Move `splitFont` and `joinFont` to `renderer/src/presetFields.ts`, keeping every folder (design D3). Verify in a new `apps/desktop/test/presetFields.test.ts`: `Mara;Extra;common` with the folder changed to `Grey` gives `Grey;Extra;common`, and the switch toggles only `common`.

## 2. The board link

- [ ] 2.1 No card (design D6):
  - `sdFailureIn(lines)` in `boardOps.ts`, and `sdMissing` in `BoardInfo`, set during `identify` and by later events
  - `NO_SD_CARD` from `editCurrentPreset` in core
  - `runOperation` keeps it when the port went away

  Verify:
  - `apps/desktop/test/boardOps.test.ts`: `sdFailureIn`, and the kept error
  - `packages/core/test/protocol.test.ts`: `editCurrentPreset` against a fake saber printing "Failed to mount SD card."

  Then `npm test`.
- [ ] 2.2 The remembered presets (design D5):
  - `SaberPatch.presets`, stored by `Library.update` and checked in IPC
  - `runOperation` returns whether it was confirmed
  - `board.ts` updates the record after each confirmed preset operation

  Verify in `apps/desktop/test/library.test.ts` (presets stored) and `boardOps.test.ts` (the returned result). Then `npm run typecheck`.

## 3. The Presets page

- [ ] 3.1 In `Presets.tsx`:
  - **F37:** after a confirmed live style write, save `withSlotChoice` of the snapshot
  - **F36:** "Saber's default" only while staged, with the note only for real looks
  - **F43:** the chip
  - **F44:** `CommitField` with `sync`
  - **F45:** colours written 500 ms after the last change, or on blur
  - **F41:** fonts through `presetFields`, with "Also uses" shown
  - renames saved with `withPresetRenamed`
  - read-only with the note when live without a card

  Verify with `npm run typecheck`, and in 4.2.

## 4. Checks

- [ ] 4.1 Run `npm test` and `npm run typecheck`; verify both pass.
- [ ] 4.2 Development run with no board, on a scratch folder with a saber that has presets. Verify that:
  - unplugged with nothing staged, the chip reads "Not plugged in"
  - after a staged edit, it reads "Staged for install", and the picker offers "Saber's default (uses …)"
  - a font of `A;B;common` shows "Also uses: B", and changing the folder keeps `B` (staged)
- [ ] 4.3 Hardware check by the owner on the V2.2 hote2, from a development build:
  - **F37:** queue a style the firmware lacks for preset 1 blade 1, then choose a style the firmware has for the same blade. The queued chip goes. Build & Install shows no new style for it, and after installing, the saber has the chosen style there.
  - **F41:** give a preset the font `<font>;<other font>;common` (in the saber's own console, or staged and installed). Change the folder on the page. The saber reports `<new>;<other font>;common`.
  - **F38:** rename a preset live, unplug, and see the new name in the presets as last read.
  - **F45:** pick a colour and leave the picker open. It is written within a second.
  - **No card:** take the card out, connect. The Presets page is read-only with the no-card note, and clicking a preset sends nothing (the log shows no `set_preset`). Put the card back and reconnect: live again.
- [ ] 4.4 After archive, tick roadmap task 3.21 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
