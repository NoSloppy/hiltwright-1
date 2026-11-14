# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-sd-fonts` (archived as `openspec/changes/archive/2026-09-24-baseline-sd-fonts/`, design.md Findings table).

## Why

The SD card is where a saber's fonts and presets live. Copying to it can leave broken folders. "Replace" silently makes mixed fonts. While the card is shared over USB, the saber can still be asked to write to it. Giving it back is not confirmed. With two cards around, the page can copy to the wrong one.

## What Changes

- **SF24:** While the saber's card is shared with the computer, the app asks the saber nothing that uses its card, with a note to give the card back first. That covers preset changes and selections, Diagnostics settings and effects, and Build & Install (install, restore and the voice pack check). The console still works. The app knows the card is shared on every page, not only on Fonts & SD.
  - Seen on hote2, 2026-10-25 (corrected the same day): hote2's own card was in a card reader, and another hilt's card was in hote2. With hote2 connected, the Fonts page showed the reader's card (SF23). The saber stalled that day, but that was the no-battery link stall (`usb-power-connect`), not a write to a shared card. A card can still be shared without the app knowing: from the saber's own menu (the Fett263 edit menu has an SD access item), or in an earlier run while the board stayed powered. So the app asks at connect. A bare `sd` answers `SD Access ON|OFF` on builds with `MOUNT_SD_SETTING`, which every Fett263 build has.
- **SF25:** Giving the card back checks the saber's answer (`SD Access OFF`). A disconnect while shared is handled: the drive is ejected if still mounted, and the owner is told.
- **SF26:** "Replace on card" really replaces, clearing the old font folder first, and asks for confirmation.
- **SF27:** Copies go through a temporary folder and are renamed into place only when complete. A failed copy leaves nothing behind. Free space is checked first. Long copies show progress.
- **SF28:** The folder-copy path refuses `;` and `,` in font folder names, like the library does.
- **SF23:** After sharing, the page uses the saber's own card, recognised on Windows by the drive's USB parent being that Proffieboard. With several cards present and none of them the saber's, the owner chooses; the page never picks one silently. Seen on 2026-10-25: with hote2 connected, the page showed the card in a reader.
- **SF22:** Run giving the card back on hote2, measure USB copy speed against a card reader, and correct the plan's "untested" statement.

## Non-goals

- Deleting fonts from the card.
- Card detection on insert and other polish (`sd-fonts-polish`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `sd-card`: requirements for exclusive access while shared (known at connect too), confirmed give-back, true replace, all-or-nothing copies with a space check and progress, safe names, and the right card. "Never deletes from the card" gains its two exceptions: a confirmed replace, and the app's own unfinished copies.
- `preset-editing`: live edits are refused while the saber's card is shared.

## Impact

`apps/desktop/src/main/{sd,fontLibrary,ipc}.ts`, `apps/desktop/src/renderer/src/{Fonts,Presets,Controls,Build,board,boardOps}.tsx|ts`. Hardware check on V2.2 hote2: share, edits refused, give back, a card already shared at connect, two cards present, a replace and an interrupted copy, and USB copy speed against a card reader (SF22). The V3's share and give-back are already in `v3-verification` (2.11, 2.13); the owner's V3 has no card yet.
