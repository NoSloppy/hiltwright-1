# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-sd-fonts` (archived as `openspec/changes/archive/2026-09-24-baseline-sd-fonts/`, design.md Findings table).

## Why

The SD card is where a saber's fonts and presets live. Copying to it can leave broken folders. "Replace" silently makes mixed fonts. While the card is shared over USB, the saber can still be asked to write to it. Giving it back is not confirmed. With two cards around, the page can copy to the wrong one.

## What Changes

- **SF24:** While the saber's card is shared with the computer, every operation that would make the saber write to its card (preset edits, adding presets) is blocked, with a note to give the card back first.
- **SF25:** Giving the card back checks the saber's answer. A disconnect while shared is handled: the drive is ejected if still mounted, and the owner is told.
- **SF26:** "Replace on card" really replaces, clearing the old font folder first, and asks for confirmation.
- **SF27:** Copies go through a temporary folder and are renamed into place only when complete. A failed copy leaves nothing behind. Free space is checked first. Long copies show progress.
- **SF28:** The folder-copy path refuses `;` and `,` in font folder names, like the library does.
- **SF23:** After sharing, the page uses the saber's own card. With several cards present, the owner chooses.
- **SF22:** Run giving the card back on hote2, measure USB copy speed against a card reader, and correct the plan's "untested" statement.

## Non-goals

- Deleting fonts from the card.
- Card detection on insert and other polish (`sd-fonts-polish`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `sd-card`: requirements for exclusive access while shared, confirmed give-back, true replace, atomic copies with a space check, safe names, and the right card.
- `preset-editing`: live edits are refused while the saber's card is shared.

## Impact

`apps/desktop/src/main/{sd,fontLibrary,ipc}.ts`, `apps/desktop/src/renderer/src/{Fonts,Presets,board}.tsx|ts`. Hardware check on V2.2 and V3: share, edit refused, give back; and an interrupted copy.
