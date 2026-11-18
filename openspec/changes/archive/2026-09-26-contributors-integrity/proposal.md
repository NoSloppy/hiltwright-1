# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-showroom` (archived as `openspec/changes/archive/2026-09-24-baseline-showroom/`, design.md Findings table). This is Wave B task 3.9, the last store to move onto the safe store built by `library-integrity`.

## Why

The contributors list is the owner's record of who made what, with logos and links they collected by hand. Today:
- A damaged file wipes it.
- Saves can collide.
- A failed save can leave a reference to a logo that was already deleted.
- A renamed author loses their credit.
- A hand-edited link can open something other than a web page.

## What Changes

- **SR33:** the list uses the shared safe store:
  - writes are queued, with a backup copy
  - a damaged file is set aside and reported on the Armory, never overwritten
  - each entry is checked on load, and a link that is not a web address is dropped
- **SR34:**
  - Saves go one at a time through the store's queue.
  - Logo and link changes, and opening a link, wait for the start-up handover of the font library's old logos, as listing already does.
- **SR35:** changing or removing a logo deletes the old picture only after the list has been saved, so a failed save never points at a missing file.
- **SR36:**
  - After the owner renames a style's author, and the old name has a logo or link while the new name has neither, Styles offers to give the new name the same logo and link.
  - It copies them, and the old name keeps its own, because other fonts or styles may still credit it.
- **SR39:** opening a link checks again that it is a web address before handing it to the system browser.

## Non-goals

- Minor display issues (`showroom-polish`).
- Renaming a font's maker in the Font library, which the finding does not cover.
- Merging two people's entries.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `contributors`:
  - "One shared list of people, matched by name": the safe store, queued saves, and waiting for the handover.
  - "Logos are pictures the owner chooses": the old logo kept until the list is saved.
  - "Links are web addresses and open only as stored": re-checked on load and on opening.
  - New: "A renamed author keeps their credit".

## Impact

- **Main:** in `apps/desktop/src/main/`, `contributors.ts` moves onto `JsonStore` (with `cleanContributors`, a logo order that saves first, and `copyTo`), and `ipc.ts` changes (the handlers wait for the handover, the open re-checks, and there is a new `contributors:copy`).
- **Renderer:** in `apps/desktop/src/renderer/src/`, `credits.tsx` gains the copy action and `Looks.tsx` gains the offer after a rename.
- **Tests:** `apps/desktop/test/contributors.test.ts`.
- **Hardware check:** none. No board, build or card is involved.
