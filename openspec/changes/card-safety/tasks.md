# Tasks

## 1. Copies onto the card (main)

- [ ] 1.1 Rewrite `copyFont(src, root, { replace, onProgress, freeBytes })` in `apps/desktop/src/main/sd.ts` (design D5), and pass the options through `fontLibrary.copyToCard`. Verify in a new `apps/desktop/test/cardCopy.test.ts`, against a temporary folder standing in for a card:
  - a new font lands whole, and the source is unchanged
  - an existing font is refused without `replace`
  - a replace leaves only the new files, and `Vader` beside it untouched
  - `Kylo;old` and `Kylo,old` are refused
  - not enough space is refused with both sizes, and nothing is written
  - a copy failing part way, from an injected failing file, leaves no `Kylo` and no listed leftover, and a second copy works
  - an interrupted replace (`.hiltwright-old-Kylo` with no `Kylo`) is put back by the next copy
  - progress counts reach the total

  Then `npm test`.
- [ ] 1.2 Send `sd:copy:progress { name, done, total }` from the `sd:copyFont` and `fontlib:copyToCard` handlers, and expose it in the preload as `sd.onCopyProgress`. Verify with `npm run typecheck`, and with an IPC test beside the existing ones in `apps/desktop/test/ipcLog.test.ts` if the handlers can be reached there; otherwise check it in 4.1's hardware run.

## 2. Which card (main and renderer)

- [ ] 2.1 Add `saberSerial` to `CardInfo`, found by the PnP walk in `locateCards()`'s PowerShell call. Parse it with a pure `parseVolumeOwners(json)` (design D3). Verify:
  - `apps/desktop/test/sdLayout.test.ts`: `parseVolumeOwners` on captured JSON, with one drive on a Proffieboard, one on a card reader, and a malformed entry
  - `npm run typecheck`
- [ ] 2.2 Add `renderer/src/cardChoice.ts` with `chooseCard(cards, { sharedRoot, saberSerial, chosen })` (design D3), and use it in `Fonts.tsx`:
  - a "Card" picker when there is more than one ProffieOS card
  - the saber's own card marked "<saber>'s own card"
  - nothing copied while the page is asking

  Verify in `apps/desktop/test/cardChoice.test.ts`:
  - the shared card by serial, and by root
  - the owner's choice kept while present, and dropped when gone
  - the only card
  - two cards and no saber → ask

## 3. The shared card on every page (renderer)

- [ ] 3.1 In `boardOps.ts`, add `parseSdAccess(lines)`, and `refuse` in `OpDeps`, checked first by `runOperation` (design D1, D2). Verify in `apps/desktop/test/boardOps.test.ts`:
  - `parseSdAccess` on `SD Access ON`, `SD Access OFF`, `Whut? :sd` and nothing
  - a refused operation is not run, fails with the reason, and sends nothing
- [ ] 3.2 In `board.ts`, add `card`, `cardShared(root)` and `cardGivenBack()`, and the bare `sd` in `identify` (not counted as rejected). Pass `refuse` to `runOperation`. When the connection goes while shared, eject the known root (design D1, D2, D4). Verify with `npm run typecheck`, and in 4.1.
- [ ] 3.3 Move `Fonts.tsx`'s sharing onto the board's `card` state:
  - share → `cardShared(root)`
  - give back → `cardGivenBack()` only on `SD Access OFF`, otherwise the not-confirmed note
  - the lost-connection note
  - Replace's two clicks (D6)
  - the copy progress line (1.2)

  Verify with `npm run typecheck`, and in 4.1.
- [ ] 3.4 While `card.shared`:
  - `Presets.tsx` is read-only with the shared-card note and a button to Fonts & SD
  - `Controls.tsx` is disabled with the note
  - `Build.tsx` disables Install and Restore with the note, and skips the voice pack check

  Verify with `npm run typecheck`. Then make one offscreen screenshot of each page with `card.shared` forced in a development run, using `HILTWRIGHT_NO_BOARD=1` and the `fake:` connection, if the fake can set it; otherwise check in 4.1.

## 4. Checks

- [ ] 4.1 Hardware check on the V2.2 hote2, from a development build, with a card reader beside it:
  - **Share:** share hote2's card. Presets is read-only, Diagnostics and Install are off, each with the note, and the console still answers. Give it back: the log shows `SD Access OFF`, and Presets is live again without reconnecting.
  - **Already shared at connect:** share, quit the app without giving back, and start it again. The card shows as shared everywhere, and give-back works.
  - **Two cards:** with another card in the reader, Fonts & SD shows hote2's card marked as its own while shared. Switching to the reader's card works. With hote2 not sharing, the page asks which card.
  - **Replace:** replace a font in the reader with a different version. Two clicks are needed, and the card's folder then has only the new files.
  - **Interrupted copy:** pull the reader's card during a copy, put it back, and copy again. The font is listed once, whole.
  - **Speed (SF22):** time one font copied over USB and the same font from the reader.

  Record each result here.
- [ ] 4.2 Strike through measurement 5 in `docs/00-plan.md` section 8, with the measured share, give-back and copy speeds from 4.1. Verify the plan states them.
- [ ] 4.3 After archive, tick roadmap task 3.24 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
