# Design

## Context

See proposal.md for why. The current state:

- **Sharing lives on the Fonts page only.** `Fonts.tsx` keeps it in local state (`usb`, `usbRoot`):
  - "Share" sends `sd 1` and waits for `SD Access ON`, then polls `sd.locate` for a drive that was not there before.
  - "Give back" ejects through main (`sd.ejectVolume`), then sends `sd 0` without reading the answer.
  - Leaving the page, or the connection dropping, resets the state. No other page knows the card is shared.
- **Which card.** `scan()` takes the first ProffieOS card that `locateCards()` (`main/sd.ts`) returns, whatever is shared. On 2026-10-25, with hote2 connected and its own card in a reader, it showed that reader card.
- **Copying.** Both copy paths end in `copyFont(src, root, replace)` (`main/sd.ts`), which is `fs.cp` straight into `<root>/<name>`:
  - the folder copy (`sd:copyFont`)
  - the library copy (`fontLibrary.copyToCard`)

  `replace` is `cp(force: true)`, which overwrites matching names and leaves the old folder's other files in place. The name check allows `;` and `,`.
- **Board operations.** Every preset operation goes through `run()` → `runOperation` (`board.ts`, `boardOps.ts`). Diagnostics (`Controls.tsx`) and the Build page's voice pack check (`cat`/`dir` in `Build.tsx`) call `board.send` directly.
- **Firmware.** On builds with `MOUNT_SD_SETTING`, a bare `sd` prints `SD Access ON` or `SD Access OFF`, and `sd 0`/`sd 1` print the new state (`props/prop_base.h`). Every Fett263 build has it. Other firmware answers `Whut?`.

## Goals / Non-Goals

**Goals:**
- One record of "the card is shared", owned by the board session and read by every page.
- Copy rules in main, tested against a temporary folder standing in for a card. They cover both copy paths, since both call `copyFont`.

**Non-Goals:**
- Noticing a card put in or taken out without a "Look again" (`sd-fonts-polish`).
- Telling a card's owner apart beyond "this connected saber's own card". A card in a reader is never matched to a saber record.

## Decisions

### D1. The board session owns the shared state
`useBoard()` gains `card: { shared: boolean; root: string | null }` and two setters:
- `cardShared(root)` — the card is shared, at this drive if known
- `cardGivenBack()`

**Asking at connect.** `identify` sends a bare `sd` after `list_tracks`. A pure `parseSdAccess(lines)` in `boardOps.ts` reads `SD Access ON|OFF`, and is null for `Whut?` or anything else:
- `ON` sets `shared`, with no root yet; D3 finds the drive.
- `OFF` or null clears it.
- `sd` is not listed as rejected: firmware that cannot share simply has no shared card.

**Lifetime.** The state is cleared by a new reading that says `OFF`, and by give-back (D4). A disconnect keeps nothing: the next connect asks again.

**Rejected:**
- *Remembering only the app's own `sd 1`.* It misses a card shared from the saber's own menu, or by an earlier session while the board stayed powered.

### D2. One refusal for preset operations; pages switch the rest off
`OpDeps` gains `refuse?: () => string | null`. `runOperation` calls it first. A non-null reason fails the operation with `setSave` and sends nothing, as the not-connected case does now.

`board.ts` passes a reason while `card.shared`: "Not sent: <saber>'s card is shared with this computer. Give it back on Fonts & SD first." That covers every preset operation, whichever page asks: Presets, Looks "Use it in…", the Xenopixel import, colours after an install.

The pages:
- **Presets:** read-only while shared, in the way it already is with no card (preset-editor-fixes D6). It has its own note and a button to Fonts & SD.
- **Controls (Diagnostics):** disabled with the note.
- **Build:** Install and Restore disabled with the note, and the voice pack check skipped.

**Rejected:**
- *Blocking in `BoardClient` or `send`.* The console must still work, and `sd 0` itself goes through `send`.

### D3. The saber's own drive is recognised by its USB parent
`locateCards()` gains `saberSerial: string | null` on each card. In the same PowerShell call it already makes, it follows each removable logical disk:
1. `Win32_LogicalDiskToPartition` and `Win32_DiskDriveToDiskPartition` lead to the disk drive.
2. The drive's PnP parent (`DEVPKEY_Device_Parent`) is the interface `USB\VID_1209&PID_6668&MI_03\…`.
3. That interface's parent is `USB\VID_1209&PID_6668\<serial>`.

A pure `parseVolumeOwners(json)` in `main/sd.ts` maps drive letters to serials, tested with captured output. Anything not on a Proffieboard gets null. Other platforms get null.

The page chooses with a pure `chooseCard(cards, { sharedRoot, saberSerial, chosen })` in a new `renderer/src/cardChoice.ts`:
1. The card the connected saber shares: the one whose `saberSerial` is that saber's, or `sharedRoot`.
2. The owner's choice, while that card is present.
3. The only ProffieOS card.
4. Otherwise `{ ask: true }`.

When the connect-time `sd` says `ON`, the root is the card whose `saberSerial` matches, if any.

The font library's "Copy to card" uses the same rule. The owner's pick on Fonts & SD is kept in `cardChoice.ts` (`rememberCardChoice`), so both pages copy to the same card. While Fonts & SD would ask, the library's button is off and says to choose there. (Added at the owner's request during apply, 2026-11-14.)

**Rejected:**
- *Only "the drive that appeared after `sd 1`".* It cannot find a card that was already shared when the app started, which is the case D1 adds.

### D4. Give-back is confirmed; a lost connection ejects
`ejectUsb` ejects as now, then sends `sd 0`, and calls `cardGivenBack()` only when `parseSdAccess` reads `OFF`. Otherwise the card stays shared with the note "The saber did not confirm it took its card back. Try again, or unplug it and plug it back in."

When the connection goes while `card.shared` and its root is known:
- the board session asks main to eject that drive, if it is still mounted
- Fonts & SD shows "The saber may still be holding its card. Reconnect it to give the card back."

The next connect asks again (D1).

**Rejected:**
- *Ejecting with no confirmation, as now.* The page then says "idle" while the saber still holds its card.

### D5. Copies go through a temporary folder on the card
`copyFont(src, root, { replace, onProgress, freeBytes })` in `main/sd.ts`:

1. **Name.** Refuse a name that is not valid on the card, or has `;` or `,` (SF28).
2. **Leftovers.** On that card, remove any `.hiltwright-copy-*`. For `.hiltwright-old-<name>`: put it back if `<name>` is missing (an interrupted replace), and remove it otherwise.
3. **Existing font.** Refuse when `<name>` exists, unless `replace`.
4. **Space.** Sum the source's file sizes. Refuse when `size + max(1 MB, 2%)` is more than the card's free space. Free space is read with `fs.statfs` on the root at copy time; `freeBytes` overrides it in tests.
5. **Copy.** Copy file by file into `<root>/.hiltwright-copy-<name>`, calling `onProgress(done, total)`. On any error, remove the temporary folder and rethrow.
6. **Put in place.**
   - Without `replace`: rename the temporary folder to `<name>`.
   - With `replace`: rename `<name>` to `.hiltwright-old-<name>`, rename the temporary folder to `<name>`, then remove the old one. If the second rename fails, the old name is restored.

`listFonts` already skips names starting with `.`, so leftovers are never listed.

IPC: `sd:copyFont` and `fontlib:copyToCard` send `sd:copy:progress` events `{ name, done, total }`. Fonts & SD shows "Copying <name>: <done> of <total> files".

**Rejected:**
- *`fs.cp` and cleaning up afterwards.* A card pulled out cannot be cleaned up, and the half-copied folder then blocks a retry as "already on the card".
- *Merging a replace into the old folder, as now.* That makes mixed fonts (SF26).

### D6. Replace takes two clicks
"Replace on card" becomes "Really replace <name>?" on the first click, as Delete does on Presets. Choosing another font, or Cancel, clears it.

### D7. SF22 is measured, and the plan corrected
The hardware check:
- shares hote2's card and gives it back
- times one font copied over USB against the same font from a card reader

The plan's measurement 5 (`docs/00-plan.md`, section 8) is then struck through, with the result.

## Risks / Trade-offs

- **[The PnP walk is slow, or fails on some machine]** → It runs in the PowerShell call `locateCards` already makes, under the same 8 s limit. A failure leaves `saberSerial` null. The page then falls back to the drive that appeared after `sd 1`, or asks the owner.
- **[A rename on a FAT card is interrupted]** → Step 2 of D5 repairs both cases on the next copy. A failed second rename puts the old name back at once.
- **[`statfs` on a removable drive reports less than Windows does]** → Being refused when space is tight is the safe way to be wrong. The message gives both numbers.
- **[Firmware that can share but has no `MOUNT_SD_SETTING`]** → Only ProffieOS's USB-mass-storage fallback can do that, and Hiltwright builds always set it. The app then never knows the card is shared, as now.

## Migration Plan

Nothing stored changes. Rollback is a revert.
