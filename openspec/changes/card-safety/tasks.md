# Tasks

## 1. Copies onto the card (main)

- [x] 1.1 Rewrite `copyFont(src, root, { replace, onProgress, freeBytes })` in `apps/desktop/src/main/sd.ts` (design D5), and pass the options through `fontLibrary.copyToCard`. Verify in a new `apps/desktop/test/cardCopy.test.ts`, against a temporary folder standing in for a card:
  - a new font lands whole, and the source is unchanged
  - an existing font is refused without `replace`
  - a replace leaves only the new files, and `Vader` beside it untouched
  - `Kylo;old` and `Kylo,old` are refused
  - not enough space is refused with both sizes, and nothing is written
  - a copy failing part way, from an injected failing file, leaves no `Kylo` and no listed leftover, and a second copy works
  - an interrupted replace (`.hiltwright-old-Kylo` with no `Kylo`) is put back by the next copy
  - progress counts reach the total

  Then `npm test`.
  - **Result, 2026-11-14.** `copyFont(src, root, options)` in `main/sd.ts`, with the boolean `replace` still accepted:
    - it refuses a name with `;` or `,`, and clears leftovers
    - it checks the space with `fs.statfs`, or `freeBytes` in tests
    - it copies file by file into `.hiltwright-copy-<name>` with progress, then renames into place
    - a replace swaps the old folder through `.hiltwright-old-<name>`, and puts it back if the swap fails

    `fontLibrary.copyToCard` passes the options through. `apps/desktop/test/cardCopy.test.ts` has the 9 listed cases, all passing. The 6 existing `sdLayout.test.ts` tests still pass.

- [x] 1.2 Send `sd:copy:progress { name, done, total }` from the `sd:copyFont` and `fontlib:copyToCard` handlers, and expose it in the preload as `sd.onCopyProgress`. Verify with `npm run typecheck`, and with an IPC test beside the existing ones in `apps/desktop/test/ipcLog.test.ts` if the handlers can be reached there; otherwise check it in 4.1's hardware run.
  - **Result, 2026-11-14.** `sd:copyFont` and `fontlib:copyToCard` pass `onProgress`, which sends `sd:copy:progress { name, done, total }`. The preload exposes `sd.onCopyProgress(cb)`, which returns its unsubscribe. `npm run typecheck` passes. The handlers need Electron, and `ipcLog.test.ts` tests only the logging wrapper, so the events are checked on screen in 4.1. The progress counts are unit-tested in 1.1.

## 2. Which card (main and renderer)

- [x] 2.1 Add `saberSerial` to `CardInfo`, found by the PnP walk in `locateCards()`'s PowerShell call. Parse it with a pure `parseVolumeOwners(json)` (design D3). Verify:
  - `apps/desktop/test/sdLayout.test.ts`: `parseVolumeOwners` on captured JSON, with one drive on a Proffieboard, one on a card reader, and a malformed entry
  - `npm run typecheck`
  - **Result, 2026-11-14.** `CardInfo.saberSerial`, in main and `shared/api.ts`. `locateCards()`'s PowerShell call now follows each removable drive through its partition and disk drive, then up to four PnP parents, looking for `USB\VID_1209&PID_6668\<serial>`. The parser is `parseRemovableDrives(stdout)`, one function for the whole drive list rather than a separate `parseVolumeOwners`. It accepts a serial only if it is alphanumeric.
    - **Run on this PC:** both directly and through `execFile` as main calls it, in about 0.5 s. The four empty Multi-Reader slots gave no owner.
    - **Tests:** two in `sdLayout.test.ts`, covering a constructed hote2 drive, reader slots, a malformed entry, a single object and empty or bad output (8 in the file). `npm run typecheck` passes.
    - **Still to see:** a real shared drive carrying hote2's serial, in 4.1.

- [x] 2.2 Add `renderer/src/cardChoice.ts` with `chooseCard(cards, { sharedRoot, saberSerial, chosen })` (design D3), and use it in `Fonts.tsx`:
  - a "Card" picker when there is more than one ProffieOS card
  - the saber's own card marked "<saber>'s own card"
  - nothing copied while the page is asking

  Verify in `apps/desktop/test/cardChoice.test.ts`:
  - the shared card by serial, and by root
  - the owner's choice kept while present, and dropped when gone
  - the only card
  - two cards and no saber → ask
  - **Result, 2026-11-14.** `renderer/src/cardChoice.ts` has `chooseCard`. Its order: the owner's pick while that card is present, then the saber's own (by serial or by the shared root, counted even with no fonts on it), then the only ProffieOS card, otherwise ask. `apps/desktop/test/cardChoice.test.ts` passes (7 tests).
    - `Fonts.tsx` scans with it.
    - The heading marks "<saber>'s own card", or asks "N ProffieOS cards found. Which one is this saber's?".
    - A "Card" list appears when there is more than one choice.
    - Starting a share clears the owner's pick.
    - While asking there is no card, so copying is off.

    `npm run typecheck` passes; `npm test` 650 passed (gated skipped). On screen with two cards: 4.1.
- [x] 2.3 The font library's "Copy to card" uses the same card (added at the owner's request, 2026-11-14):
  - `cardChoice.ts` keeps the card chosen on Fonts & SD (`rememberCardChoice`, `rememberedCardChoice`)
  - `FontLibrary.tsx` gets `board` and chooses with `chooseCard`
  - while asking, the button is off and says "Choose the card on Fonts & SD"

  Verify:
  - `cardChoice.test.ts`: the remembered choice is used, and is dropped when its card is gone
  - `npm run typecheck`
  - an offscreen screenshot of the font library with a card from `HILTWRIGHT_SD_ROOT`, showing "Copy to card <root>"
  - **Result, 2026-11-14.** `cardChoice.ts` keeps the pick made on Fonts & SD for the run (`rememberCardChoice` and `rememberedCardChoice`; drive letters change, so it is not saved), and Fonts & SD starts from it. `FontLibrary.tsx` now gets `board`, and chooses its card with `chooseCard` from the shared drive, the saber's serial and the remembered pick. While asking, its button reads "Choose the card on Fonts & SD" and is off, with a tooltip.
    - Tests: a new test in `cardChoice.test.ts` covers the remembered pick between two cards, and dropping it when its card is gone (8 tests).
    - `npm run typecheck` passes.
    - Offscreen screenshot with board access off, a scratch `HILTWRIGHT_SD_ROOT` card and a scratch `HILTWRIGHT_FONT_LIBRARY`: the font's panel shows "Copy to card <root>".

## 3. The shared card on every page (renderer)

- [x] 3.1 In `boardOps.ts`, add `parseSdAccess(lines)`, and `refuse` in `OpDeps`, checked first by `runOperation` (design D1, D2). Verify in `apps/desktop/test/boardOps.test.ts`:
  - `parseSdAccess` on `SD Access ON`, `SD Access OFF`, `Whut? :sd` and nothing
  - a refused operation is not run, fails with the reason, and sends nothing
  - **Result, 2026-11-14.** `parseSdAccess(lines)` in `boardOps.ts`. `OpDeps.refuse` is checked first by `runOperation`: when it gives a reason, there is no snapshot, nothing is sent, and the save fails with that reason. Three tests in `boardOps.test.ts` (36 in the file).

- [x] 3.2 In `board.ts`, add `card`, `cardShared(root)` and `cardGivenBack()`, and the bare `sd` in `identify` (not counted as rejected). Pass `refuse` to `runOperation`. When the connection goes while shared, eject the known root (design D1, D2, D4). Verify with `npm run typecheck`, and in 4.1.
  - **Result, 2026-11-14.** `board.ts` has `card { shared, root }`, `cardShared(root)`, `cardGivenBack()` and `cardLostWhileShared`. `identify` sends a bare `sd` after `list_tracks`, not counted as rejected. It sets `shared` from the answer, then looks up the drive by `saberSerial`. `run()` passes `refuse` with the reason. `disconnect` ejects a known shared drive, and sets `cardLostWhileShared`. `npm run typecheck` passes. On hardware: 4.1.

- [x] 3.3 Move `Fonts.tsx`'s sharing onto the board's `card` state:
  - share → `cardShared(root)`
  - give back → `cardGivenBack()` only on `SD Access OFF`, otherwise the not-confirmed note
  - the lost-connection note
  - Replace's two clicks (D6)
  - the copy progress line (1.2)

  Verify with `npm run typecheck`, and in 4.1.
  - **Result, 2026-11-14.** `Fonts.tsx` reads `board.card`, and its local state now covers only a share or give-back under way:
    - share calls `cardShared(root)`; a share whose drive never appeared still counts as shared until `sd 0` answers OFF
    - give back ejects the known drive, or the one found by serial, or asks the owner to use Safely Remove when no drive can be named; it calls `cardGivenBack()` only on `SD Access OFF`, and otherwise shows the not-confirmed note
    - the lost-connection note
    - the "Copying <name>: n of m files" line
    - Replace takes two clicks ("Really replace <name>?"), and picking another font or Cancel clears it

    `npm run typecheck` passes. On hardware: 4.1.

- [x] 3.4 While `card.shared`:
  - `Presets.tsx` is read-only with the shared-card note and a button to Fonts & SD
  - `Controls.tsx` is disabled with the note
  - `Build.tsx` disables Install and Restore with the note, and skips the voice pack check

  Verify with `npm run typecheck`. Then make one offscreen screenshot of each page with `card.shared` forced in a development run, using `HILTWRIGHT_NO_BOARD=1` and the `fake:` connection, if the fake can set it; otherwise check in 4.1.
  - **Result, 2026-11-14.** While `board.card.shared`:
    - **Presets:** `locked` (no card, or the card shared) stops selections and edits, and disables every control through `busy`. An amber note says the card is shared and must be given back first, with "Go to Fonts & SD", and the chip reads "Card shared".
    - **Diagnostics (`Controls.tsx`):** the sliders and effect buttons are disabled, with the note.
    - **Build:** `canInstall` is false, so Install and "Put back" are off, with the note. The voice pack check is not sent.

    A new development-only mode, `hiltwrightGoto('fake-shared:<page>')`, shows the fake connection with its card shared. Offscreen screenshots of Presets, Diagnostics and Build & Install (`HILTWRIGHT_NO_BOARD=1`, scratch data) show each note and the controls off. `npm run typecheck` passes; `npm test` 653 passed (gated skipped).

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
