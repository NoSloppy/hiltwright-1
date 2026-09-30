# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-board` (archived as `openspec/changes/archive/2026-09-24-baseline-board/`, design.md Findings table).

## Why

Several small defects make the Presets page say one thing while the saber or the next build does another. The worst: once a blade has a queued style, choosing a style the firmware already has is written to the saber but not to the model, so the next build compiles the queued style anyway. And with no SD card in the saber, a preset edit can reset it.

## What Changes

- **One rule for queued and live styles** (owner's decision, 2026-09-29: two changes sharing one rule):
  - The saber's build model always holds the owner's latest choice for each preset and blade, whether that choice was written to the saber live or queued for the next build.
  - The rule lives in `slotModel.ts`, and `style-to-saber-fixes` (roadmap 3.23) reuses it for "Use it in" (ST4).
- **F37:** a live style choice replaces any queued style for that blade in the build model, so the next build compiles what the saber shows.
- **F36:** "Saber's default" is offered only where it can do what it says: while staged, where it means no style chosen, so the build uses the first style for the blade's kind. While live it is not offered, and the "not on the saber yet" note never shows for it.
- **F41:** editing a font keeps every folder in the font list, not only the first and `common`. The field edits the first folder; the others are shown and kept.
- **F38:** the remembered preset list is updated after every confirmed live edit, so "as last read" is true after unplugging.
- **F43:** the mode chip says "Staged for install" only when something is staged. Unplugged with nothing staged, it says the saber is not plugged in.
- **F44:** after a failed write, the field shows what the saber reports, not the text that was typed.
- **F45:** colours are written once the picker settles, not only when the swatch loses focus.
- **BST-2** (from `board-side-test-coverage`): chosen styles follow presets by name. Two cases go wrong today:
  - **The same name, or no name:** two presets with the same name, or no name, both take the last one's styles.
  - **Renamed and moved:** a preset renamed and moved on the saber takes the styles of whatever used to sit at its new position.

  **The fix:**
  - Presets with the same name, or with no name, match in order.
  - An unknown name takes no styles, rather than its position's.
  - A rename made in the app carries its choices to the new name, so the owner's own renames lose nothing.

  Both are pinned by expected-failure tests in `apps/desktop/test/draftModel.test.ts`, which become normal tests.
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
  - **Decided here:** while a connected saber has no readable card, the Presets page is read-only, and says why. That covers selecting a preset, which also saves to the card.

## Non-goals

- Editing variation (F46, `board-side-later`).
- Sets (see `sets-safety`).
- "Use it in" on the Styles page (`style-to-saber-fixes`, which reuses this change's rule).
- Other pages' writes without a card (volume, the saber controls). Only preset editing is withheld here.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `preset-editing`:
  - which mode the page is in, and a read-only state without a card
  - field fidelity for fonts, failed writes and colours
  - queued and live styles in one model rule
  - presets matched by name
  - the stored list after live edits
  - the failure that names a missing card

## Impact

- **Code:**
  - `apps/desktop/src/renderer/src/{Presets.tsx,saberModel.ts,slotModel.ts,board.ts}`
  - `packages/core/src/protocol/session.ts`, for the card failure on an edit
  - `apps/desktop/src/{shared/api.ts,main/library.ts}`, for the presets in `SaberPatch`
- **Hardware check on the V2.2 hote2:**
  - a queued then live style, then a build
  - a font with two folders
  - no card: the page is read-only, and says why
