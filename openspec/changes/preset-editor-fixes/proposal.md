# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-board` (archived as `openspec/changes/archive/2026-09-24-baseline-board/`, design.md Findings table).

## Why

Several small defects make the Presets page say one thing while the saber or the next build does another. The worst: once a blade has a queued style, choosing a style the firmware already has is written to the saber but not to the model, so the next build compiles the queued style anyway.

## What Changes

- **F37:** A live style choice replaces any queued style for that blade in the build model.
- **F36:** "Saber's default" while live does what it says, or is not offered, and never shows the "not on the saber yet" note.
- **F41:** Editing a font keeps every folder in the font list, not only the first and `common`.
- **F38:** The remembered preset list is updated after live edits, so "as last read" is true after unplugging.
- **F43:** The mode chip says "Staged for install" only when something is staged.
- **F44:** After a failed write, the field shows what the saber reports.
- **F45:** Colours are written when the picker settles, not only when the swatch loses focus.
- **BST-2** (from `board-side-test-coverage`): chosen styles follow presets by name, so two presets with the same or a blank name both take the last one's styles. A preset renamed and moved on the saber takes the styles of whatever used to sit at its new position. Both are pinned by expected-failure tests in `apps/desktop/test/draftModel.test.ts`. Make them normal tests when fixed.
- **HW-2026-09-26d** (seen on the V3.9 during `connection-robustness` 3.2, 2026-09-26, with no SD card; run log `hiltwright-20260926-160344.log`):
  - **What happened:** a preset edit (`set_font BEN_SOLO`) fails with "The saber stopped answering. Unplug and replug it, then press Connect." The board printed "Failed to mount SD card." after the write and before almost every command. The three read-backs got no preset block, so `editCurrentPreset`'s dead-link probe blamed the connection.
  - **Why it matters:** reconnecting cannot help, because preset changes are saved on the card.
  - **The fix:** recognise the SD failure, both at connect (the board reports it during reading) and on an edit. Say there is no readable SD card in the saber, so preset changes cannot be saved until one is in, and do not offer live edits in that state.
  - **Seen again on the V2.2 hote2, 2026-09-29** (during `sd-fonts-test-coverage` 3.2, with its card in a card reader; run log `%TEMP%\hiltwright-fresh3\logs\hiltwright-20260929-175152.log`):
    - The board printed "Failed to mount SD card." about once a second from the moment it was read.
    - `set_font Darth;common` went silent for 8 s, and the app let the saber go. A second try ended with the saber resetting ("port lost"), and the owner saw it go dark and reboot. A third went silent again.
    - Each time the page said "Font → Darth failed: Not saved: the saber was disconnected during the change."
    - It also reported a battery of 1.04 V, then 0.13 V (4.04 V the day before), so it was running on USB power alone.
    - **So without a card, an edit can do more than fail: it can reset the saber.** Live edits must be withheld, not just explained.

## Non-goals

- Editing variation (F46, `board-side-later`).
- Sets (see `sets-safety`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `preset-editing`: requirements on styles queued versus live, the mode indicator, and field fidelity for fonts, names and failures.

## Impact

`apps/desktop/src/renderer/src/{Presets.tsx,saberModel.ts,slotModel.ts,board.ts}`. Hardware check on V2.2: queued then live style, then build.
