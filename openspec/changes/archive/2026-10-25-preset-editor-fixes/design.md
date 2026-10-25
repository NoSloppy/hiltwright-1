# Design

## Context

See proposal.md for why. What the code does now (`apps/desktop/src/renderer/src`):

- **`Presets.tsx` `setLook`:**
  - **Live, with a style the firmware has:** it writes `builtin P B args` to the saber (`board.setPresetStyles`) and returns. The build model's slot keeps whatever it held, so a queued style stays and is compiled at the next build (F37).
  - **Otherwise:** it writes the look (or null) and its args into the model. While live it then always shows "…is not on the saber yet…", including for "Saber's default" (F36).
- **Fonts:** `splitFont` keeps only `parts[0]` and a `common` flag, and `joinFont(folder, common)` rebuilds from those, so `A;B;common` loses `B` on any edit (F41).
- **The mode chip:** outside live it always shows "Staged for install" (F43).
- **Fields and colours:**
  - `CommitField` keeps its typed text until `value` changes, so after a failed write it shows what was typed (F44).
  - Colour swatches write in `onBlur` only (F45).
- **`draftModel` (`saberModel.ts`):** it carries chosen looks from the saved model by preset name (`byName`), falling back to the saved preset at the same position. Equal names collapse, and an unknown name takes its position's looks (BST-2).
- **The remembered presets:** `board.ts` updates the saber record's presets only in `identify`, through `library.upsert` at connect. Live edits change `info.presets`, not the record (F38).
- **Edits:** `editCurrentPreset` (`packages/core/src/protocol/session.ts`) reports "The saber stopped answering…" when read-backs return no preset block. `runOperation` (`boardOps.ts`) turns any failure after the port went away into `DISCONNECTED_DURING`.
- **What ProffieOS does without a card** (run logs of 2026-09-26 and 2026-09-29):
  - It prints "Failed to mount SD card." during reading and on each command.
  - `set_font` and `set_preset` save to the card. Without one they time out, or reset the board.
- **The reusable helper:** `withLookInSlot(model, look, preset, blade, args)` in `slotModel.ts` already builds the model for a queued choice.

## Goals / Non-Goals

**Goals:**
- One place that says what the model holds for a slot, used by the Presets page now and by "Use it in" in `style-to-saber-fixes`.
- Every field and chip shows the truth after any outcome.
- No preset write reaches a saber without a card.

**Non-Goals:**
- A new Presets layout.
- Other pages' writes without a card.

## Decisions

### D1. The slot rule: `withSlotChoice` in `slotModel.ts`
`withSlotChoice(model, preset, blade, look | null, args | null)` returns a model whose slot holds the owner's latest choice:
- the look's id, or null for none
- the args, when they still need writing: queued, not yet on the saber

A non-starter look is added to `model.looks`. `withLookInSlot` becomes a call to it.

**How the Presets page uses it:**
- **Live, and the firmware has the style:** it writes to the saber as today. After a confirmed write it saves `withSlotChoice(snapshot, …, look, null)`. The colours are on the saber, so nothing is left to write.
- **Queued, or staged:** it saves `withSlotChoice(snapshot, …, look, args)`, as today.

`snapshot` is the model as it was when the owner acted, so a draft rebuilt meanwhile from the saber's read-back cannot lose anything.

`style-to-saber-fixes` calls the same function for "Use it in" (ST4).

**Rejected:**
- *Clearing the queued look only.* The model would then fall back to the starter for the role, not the chosen style.
- *Reading the saber's style back into the model after every write.* The model names looks, and the saber reports `builtin P B`. The page already knows which look it wrote.

### D2. Presets matched by name, in order (BST-2)
`matchPresets(saved, current)` in `saberModel.ts` returns, for each current preset, the saved preset it continues, or null:
- The k-th current preset with a given name, blank included, matches the k-th saved preset with that name.
- There is no fall-back by position.

`draftModel` takes looks and args from the match.

**Renames made in the app:** after a confirmed live rename, the page saves the snapshot model with that preset's name changed (`withPresetRenamed`), so the next draft finds its looks under the new name.

**Rejected:**
- *Keeping the positional fall-back for unknown names.* That is exactly how a preset takes another's styles.

### D3. Fonts keep every folder (F41)
`splitFont` and `joinFont` move to a pure `presetFields.ts`:
- `splitFont(font)` returns `{ folder, extra: string[], common }`.
- `joinFont({ folder, extra, common })` rebuilds `folder;extra…;common`.

The Sound font field edits `folder`, and the common switch edits `common`. `extra` is kept, and shown under the field ("Also uses: B").

### D4. Fields, colours and the chip (F36, F43, F44, F45)
- **F44:** `CommitField` gets `sync`, which is `board.save`. Each time the save state changes, the field shows `value` again. After a failed write, `value` is what the saber reports.
- **F45:** the colour input writes 500 ms after its last `onChange`, and at once on blur. The timer is cleared by either.
- **F36:**
  - **While live,** "Saber's default" is not an option. A blade with no style shows a disabled placeholder, "No style chosen".
  - **While staged,** the option reads "Saber's default (uses <first style for the role>)".
  - The "not on the saber yet" note shows only for a real look.
- **F43:** outside live, the chip reads "Staged for install" only while `model.presetsFrom` is set, and otherwise "Not plugged in".

### D5. The remembered presets follow live edits (F38)
`SaberPatch` gains `presets?: PresetRecord[]`. `Library.update` stores it, and IPC checks it is a list of preset records.

After a successful preset operation (edit, styles, duplicate, delete, move, snapshot restore), `board.ts` calls `library.update(id, { presets: infoRef.current.presets })`, then refreshes the library.

`runOperation` returns whether the operation was confirmed, so the page and `board.ts` can act on success.

### D6. No card, no preset writes (HW-2026-09-26d)
**Detecting it:**
- `sdFailureIn(lines)`, a pure function in `boardOps.ts`, matches `/Failed to mount SD card/i`.
- `identify` resets a flag, and sets it for any such line in its replies or in events while it reads. `BoardInfo` gains `sdMissing`.
- A later event with the line, for a card pulled while connected, sets `sdMissing` too.
- Only a new reading clears it.

**The Presets page:** when live and `info.sdMissing`, the page is read-only:
- every control is disabled, and clicking a preset sends nothing
- the note reads "<saber> has no readable SD card. Preset changes, and the preset in use, are saved on the card, so nothing can be changed here until it is back in. Put the card back, then reconnect."
- the chip reads "No SD card"

**An edit that meets it anyway:**
- `editCurrentPreset` returns `NO_SD_CARD` ("Not saved: the saber has no readable SD card, and preset changes are saved on the card.") when a read-back or reply contains the line.
- `runOperation` keeps that error even when the port then went away, instead of `DISCONNECTED_DURING`.

**Rejected:**
- *Staging edits while the card is out.* Staged presets go on at the next install. An owner who pulled the card only for a moment would find their edits replacing the saber's list later.
- *Retrying once the card is back.* The saber must be reconnected anyway, to read the card's presets.

### D7. Checks
**Unit tests:**
- **`apps/desktop/test/saberModel.test.ts`:** `withSlotChoice`
  - a look, and null
  - args kept for queued, dropped for live
  - a live choice replacing a queued one leaves `queuedLookIds` empty
- **`apps/desktop/test/draftModel.test.ts`:**
  - BST-2 flipped to normal tests
  - repeated names in order
  - an app rename keeping looks, through `withPresetRenamed`
- **A new `apps/desktop/test/presetFields.test.ts`:** fonts with several folders.
- **`boardOps.test.ts`:** `sdFailureIn`, `runOperation` keeping `NO_SD_CARD` when gone, and returning success.
- **`packages/core/test/protocol.test.ts`:** `editCurrentPreset` with a fake saber that prints the card failure.
- **`library.test.ts`:** presets stored through `update`.

**Development run:** no board, `fake:presets`. Unplugged with nothing staged, the chip reads "Not plugged in". Staged, the picker offers "Saber's default (uses …)".

**Hardware:** on hote2, by the owner.

## Risks / Trade-offs

- **[A preset renamed on the saber itself loses its chosen styles]** → The spec now says so: an unknown name takes none. The owner re-chooses, and the page shows the saber's own style meanwhile. Renames in the app keep them (D2).
- **[A saber that prints the card failure once at boot, then mounts]** → `sdMissing` clears at the next reading. The note says to reconnect.
- **[Updating the record after every live edit writes `library.json` often]** → The store's writes are queued and atomic (`jsonStore`). A few writes a minute is small.
