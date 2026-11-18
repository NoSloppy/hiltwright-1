# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-sd-fonts` (archived as `openspec/changes/archive/2026-09-24-baseline-sd-fonts/`, design.md Findings table). This is Wave B task 3.7, and it reuses the safe store built by `library-integrity`.

## Why

The font library holds fonts the owner paid for, and what they wrote about them. Several paths can:
- lose that information
- hide fonts
- leave fonts or files out of an import without a word
- quietly change which font a preset plays

## What Changes

- **SF2:** the details file (`hiltwright-fonts.json` in the library folder) uses the shared safe store:
  - writes are queued, with a backup copy
  - an unreadable file is set aside and reported, never overwritten

  The remembered library location (`fontlibrary.json` in the app's data folder) uses the safe store too.
- **SF1:** when the library folder is missing (for example the drive is gone or its letter changed), the Font library page says so and offers to find it or use the default folder. It no longer creates an empty folder in its place.
- **SF3:** moving the library into itself, into one of its own folders, or into a folder that contains it is refused before anything moves.
- **SF4:** before a move, fonts whose folder name is already taken at the destination are listed. The owner chooses to keep the ones already there and move the rest (theirs stay untouched in the old folder), or to cancel. Nothing is renamed. The owner chose this on 2026-09-25.
- **Move robustness (part of SF3):**
  - Each font's details move with it.
  - A logo already at the destination is never overwritten.
  - If a move stops part-way, the owner is told which fonts moved, and the library still opens where it was.
- **SF5:** "keep only the Proffie variant" applies only when a package holds variants for several boards, judged by the folder names inside the package, never by a font's own name. Fonts left out are listed with the reason.
- **SF6:** tracks are taken only from inside the folder or package the owner picked.
- **SF7:** every file of a font comes in (licences, readmes, other audio), except system junk such as `__MACOSX`, dot-files, `Thumbs.db` and `desktop.ini`.
- **SF8:** zip entries are checked against their CRC and size, and a damaged package is refused.

## Non-goals

- Low-severity library polish (`sd-fonts-polish`).
- Building fonts (`font-construction`).
- Copying to the card, and the card itself (`card-safety`, `safe-staged-install`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `font-library`:
  - the details file is safe, and a missing folder is reported
  - moves are refused or checked for clashes, and details follow their fonts
  - imports bring every file and take tracks only from what was picked
  - variants are filtered by folder name
  - packages are verified by CRC

## Impact

- **Main:** in `apps/desktop/src/main/`:
  - `fontLibrary.ts` and `unzip.ts`
  - `ipc.ts`: the `fontlib:*` handlers, the library settings, and `app:storeProblems`
  - `jsonStore.ts`: problems gain the folder they are in
- **Renderer:** in `apps/desktop/src/renderer/src/`:
  - `FontLibrary.tsx`: the missing-folder panel, the move clash dialog, and import results
  - `App.tsx`: the Armory note's folder
- **Tests:** `apps/desktop/test/fontLibrary.test.ts`, whose zip builder must write real CRCs.
- **Hardware check:** none. The card and the board are not touched (see design D8).
