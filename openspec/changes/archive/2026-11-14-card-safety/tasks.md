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
- [x] 2.4 Any card can be chosen (added at the owner's request, 2026-11-14):
  - `CardInfo.empty` from `locateCards()`
  - `chooseCard` offers every drive with media, and picks only ProffieOS cards by itself
  - the Card list and heading mark empty and non-saber cards, with their notes
  - the closed Card field shows the chosen card

  Verify:
  - `cardChoice.test.ts`: an empty card is offered and asked for, not picked; with one ProffieOS card beside an empty one, the ProffieOS card is picked
  - `sdLayout.test.ts`: `locateCards` would be platform-bound, so `empty` comes from a pure `isEmptyCard(names)`, tested there
  - `npm run typecheck`, and the owner's look in 4.1
  - **Result, 2026-11-14.**
    - `CardInfo.empty` comes from a pure `isEmptyCard(names)`, which ignores System Volume Information, `$RECYCLE.BIN` and dot entries.
    - `chooseCard` offers every drive with media, but picks only a ProffieOS card by itself, and asks otherwise. `cardKind(c)` gives `saber`, `empty` or `other`.
    - Fonts & SD names each drive with "(empty)", "(not a saber card)" or "(<saber>'s own)". Its heading reads "Empty card at…" or "Not a saber card at…". It adds a note for an empty card (copy fonts to start one; `common` and the voice pack are not put on yet) and for a non-saber drive (copying adds folders beside its files, nothing else changes).
    - The closed Card field shows the chosen drive's name, and the list also appears when it is asking about a single drive.
    - Tests: `cardChoice.test.ts` (11) and `sdLayout.test.ts` (9) pass. `npm run typecheck` passes.
    - Offscreen screenshot with an empty scratch card: "No ProffieOS card found. Choose a card to use", with the list open on the card.
- [x] 2.5 The font library (owner, 2026-11-14):
  - **Replace on card:** when the selected font's folder is on the chosen card, the button reads "Replace on card", with the two-click confirmation. The check uses a new `sd:hasFolder(root, name)`.
  - **Looking again:** the library looks for cards again when a card is shared or given back, and shows "Looking for a card…" meanwhile.
  - **Logged failures:** main logs a drive list that fails or times out (raised from 8 s to 15 s), instead of returning nothing silently.

  Verify:
  - `npm run typecheck`
  - an offscreen screenshot with a scratch card holding the selected font's folder, showing "Replace on card"
  - the owner's look in 4.1
  - **Result, 2026-11-14.**
    - **Main:** `hasFolder(root, name)` with IPC `sd:hasFolder`, which accepts only the roots `sd.locate` found. The drive list's PowerShell call has 15 s, and a failure is logged (`[sd] the drive list failed: …`).
    - **Font library:**
      - It looks for cards again whenever `board.card.shared` or `board.card.root` changes, and shows "Looking for a card…" meanwhile.
      - When the selected font's folder is on the chosen card, its button reads "Replace on card <root>", then "Really replace <folder>?", and a second click replaces it. Its note then says "Replaced on…".
      - A library font whose folder name differs from the card's, such as `Ben-2` against `Ben`, is still a plain copy.
    - `npm run typecheck` passes; `npm test` 659 passed (gated skipped). Offscreen screenshot with board access off, a scratch library holding `Kylo` and a scratch card already holding `Kylo`: the button reads "Replace on card …".

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

- [x] 4.1 Hardware check on the V2.2 hote2, from a development build, with a card reader beside it:
  - **Share:** share hote2's card. Presets is read-only, Diagnostics and Install are off, each with the note, and the console still answers. Give it back: the log shows `SD Access OFF`, and Presets is live again without reconnecting.
  - **Already shared at connect:** share, quit the app without giving back, and start it again. The card shows as shared everywhere, and give-back works.
  - **Two cards:** with another card in the reader, Fonts & SD shows hote2's card marked as its own while shared. Switching to the reader's card works. With hote2 not sharing, the page asks which card.
  - **Replace:** replace a font in the reader with a different version. Two clicks are needed, and the card's folder then has only the new files.
  - **Interrupted copy:** pull the reader's card during a copy, put it back, and copy again. The font is listed once, whole.
  - **Speed (SF22):** time one font copied over USB and the same font from the reader.
  - **Run 1, 2026-11-14:** share worked (`h9| sd 1` → `SD Access ON` at 14:20:16, `I:` marked "hotetest's own card"). But reading the card's fonts over USB was still running two minutes later, and that greyed out "Give the card back" (owner). Fixed: the scan is tracked apart from `busy` and goes stale on give-back, and Give back is off only during a copy. While reading, the line says "reading the fonts…" instead of "0 fonts · 0 tracks".
  - **Run 1, continued:** with the button back, "Give the card back" failed twice with "Windows did not release the drive" (owner, with Explorer closed). The reading of the card's fonts was still running in main, 4 minutes on, with files open on `I:`. The renderer's stale flag had not stopped it. Fixed:
    - `listFonts` and `listTracks` can be stopped between files (`stopReading(root)`), and `ejectVolume` stops them and waits up to 10 s for their files to close before it ejects.
    - The eject now waits up to 8 s for Windows to drop the drive, where it used to wait 1.5 s.
    - The page logs each eject and the saber's answer to `sd 0`.
    - New test in `cardCopy.test.ts`: a listing stopped mid-way rejects, and a new one works.
  - **Run 2, 2026-11-14 14:31** (log `hiltwright-20261114-143124.log`):
    - On reconnect the saber said `SD Access OFF`, so its card was no longer shared. The "already shared at connect" check is not done yet.
    - Shared again at 14:31:46.
    - The first give-back stopped the reading (`sd:listFonts failed: Stopped…` at 14:32:17), but Windows had not let go after 8 s. The owner's second click at 14:32:31 ejected at once, `sd 0` answered `SD Access OFF`, and Presets was live again.
    - Fixed: the eject now tries up to three times by itself before reporting.
  - **Run 3, 2026-11-14 14:36** (log `hiltwright-20261114-143634.log`), with a second card in the reader (`H:`, 4 fonts):
    - The first cycle still reported "not released" at 14:37:41, apparently before the retry was loaded, and ejected on the next click.
    - The second cycle was one click: share at 14:38:00 (`SD Access ON`), give back at 14:38:30, the reading stopped, then `ejected (try 2)`, `SD Access OFF`, and back to `H:`. The owner confirmed one click.
    - In neither cycle did reading the shared card's fonts finish in about 30 s.
  - **Run 4, 2026-11-14:**
    - **Already shared at connect** passed: shared, the app closed without giving back, and started again. Every page treated the card as shared, and give-back worked (owner).
    - **Pages locked while shared** passed (owner).
    - **Found:** the "Card" list on Fonts & SD was a blank box. It used the browser's `<select>`, which the app's field styling hides. It now uses the app's own `Select`. It was also off while fonts were being read, which on a shared card hardly ever ends, so it now waits only for a copy.
  - **Run 5, 2026-11-14:** with hote2 sharing and a card in the reader, two cards worked and switching worked (owner). But the list's shown choice changed only once the drive list and the new card's reading came back, which made the list seem not to work. Fixed: a switch shows the chosen card at once and clears the old card's lists, and its fonts load after.
  - **Run 6, 2026-11-14:**
    - **Replace from Fonts & SD** passed (owner).
    - **The font library offered no replace,** and its Copy copied without asking. That copy was correct: the library's `Ben-2` beside the card's `Ben` is a different folder. Replace is now offered when the folder names match (2.5).
    - **The font library showed "No card"** while Fonts & SD had `H:`. Most likely its single drive lookup came back empty, timed out while the shared card was being read. Fixed in 2.5: it looks again on share and give-back, says when it is looking, and the lookup is logged with 15 s to answer.
  - **Run 7, 2026-11-14** (log `hiltwright-20261114-151125.log`):
    - **Library replace** passed (owner).
    - **Interrupted copy** passed (owner). At 15:13:29 the font library's copy of `Crait` failed into `H:\.hiltwright-copy-Crait` when the card was pulled. Put back and copied again, it worked, with `Crait` listed once.
    - **Found:** the page showed Windows' raw error ("UNKNOWN: unknown error, copyfile …"). A failed copy now reads "The copy of <font> stopped part way: the card could not be written to (<code>). Nothing was left on the card under <font>. Check the card is in, then copy it again." The full error goes to the log, and `cardCopy.test.ts` checks the wording (commit c063985).
    - **Still to do:** the speed check.
  - **Speed (SF22), 2026-11-14 (owner):** the same font took about 4 s to a card in a USB 3 reader and about 120 s to hote2's card shared over USB, some 30 times slower. Reading the shared card's 19 fonts took 9 s once and over 30 s twice.
  - **Result, 2026-11-14: passed on hote2.** Every listed check passed, after the fixes found on the way, each recorded above:
    - give-back no longer waits for a font reading
    - give-back stops the app's own reading of the card, and the eject retries
    - the Card list uses the app's own dropdown, and a switch shows the new card at once
    - any card can be chosen (2.4)
    - the font library replaces and looks again (2.5)
    - a failed copy is said in plain words

  Record each result here.
- [x] 4.2 Strike through measurement 5 in `docs/00-plan.md` section 8, with the measured share, give-back and copy speeds from 4.1. Verify the plan states them.
  - **Result, 2026-11-14.** Measurement 5 in `docs/00-plan.md` section 8 is struck through, with the share and give-back behaviour and the 4 s against 120 s copy.

- [x] 4.3 After archive, tick roadmap task 3.24 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
