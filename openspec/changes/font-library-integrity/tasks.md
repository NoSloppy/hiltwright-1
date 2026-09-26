# Tasks

## 1. Safe details and location

- [x] 1.1 Add `place` to `StoreOptions` and `StoreProblem` in `jsonStore.ts` (design D1). The saber library and preset sets pass `'data'`. Update `jsonStore.test.ts` to assert it. Verify with `npm test`.
  - **Result, 2026-09-25.** `StorePlace` (`'data' | 'fonts'`) is on `StoreOptions` and `StoreProblem`. The saber list, preset sets and library location pass `'data'`, and the font details pass `'fonts'`. `jsonStore.test.ts` asserts it (8 tests pass). A byte-order-mark fix was added along the way (design D1).
- [x] 1.2 Move the font details file onto `JsonStore` with `cleanIndex`, one store per root, remade on `moveTo` and `forget()` (design D1). Move `fontlibrary.json` onto a `JsonStore` too. Make `app:storeProblems` await the font details as well. In `fontLibrary.test.ts`, add a test that a damaged details file is set aside unchanged, the store starts from its backup, and a rename is then saved. Verify with `npm test`.
  - **Result, 2026-09-25.** `FontLibrary` holds one `JsonStore` per root (`makeStore()` on construction, `setRoot` and `forget`), and every write goes through `update`. `fontlibrary.json` is on a `JsonStore` ("font library location"). Font requests wait for it (`fontHandle`). `app:storeProblems` also lists the font details. New test "sets an unreadable details file aside, starts from its backup, and saves the next change" passes.
- [x] 1.3 The Armory note uses `place`: it says "in the font library folder" and opens it with `fontLibrary.open()`, or keeps the data-folder wording. The Font library page shows problems where `place === 'fonts'`. Verify in task 5.1.
  - **Result, 2026-09-25.** The Armory note names "the font library folder" and opens it with `fontLibrary.open()` for `place: 'fonts'`. The Font library page shows its own note with "Open the folder". Checked in task 5.1.

## 2. A missing library folder

- [x] 2.1 `list()` creates only the default root. `fontlib:status` reports `missing`. `importFrom` and `copyToCard` refuse while missing. `chooseRoot` skips `list()` when missing (design D2). Add a test: a missing chosen root gives `[]`, creates no folder, and status says missing. Verify with `npm test`.
  - **Result, 2026-09-25.** `missing()` is true only for a chosen, non-default root that is not a directory. `list()` returns `[]` without creating anything. `importFrom` and `copyToCard` throw "The font library folder cannot be found (…)". `fontlib:status` has `missing`, and `chooseRoot` skips `list()` when missing. Two new tests (reported and not recreated; the default simply made) pass.
- [x] 2.2 Show the missing panel on the Font library page, with Look again, Choose where it is, and Use the default folder. Verify in task 5.2.
  - **Result, 2026-09-25.** A red panel names the folder, with Look again, Choose where it is, and Use the default folder. "No fonts yet" is hidden while missing. Checked in task 5.2.

## 3. Moves

- [x] 3.1 Add `planMove(next)`, refusing self, child and parent destinations and listing clashes from disk and details (design D3). Change `moveTo` to move font by font, with details following each font, `keepBack`, logos never overwritten, same names only, and a stop-and-report on failure (design D4). Add tests for:
  - refusals
  - clashes
  - `keepBack` untouched, with the others moved with their details
  - an existing logo kept
  - a failure part-way keeping the root, with moved fonts' details at the destination

  Verify with `npm test`.
  - **Result, 2026-09-25.** `planMove` refuses self, inside and holding destinations, and lists clashes where anything (file or folder) has that name, or the destination's details name it. `moveTo` moves font by font with details following, `keepBack` untouched, same names only, existing logos kept (ours stays), and a stop-and-report on failure. Three new tests pass. Found along the way: on Windows, renaming a folder onto a plain file replaced the file, so a clash is now any existing entry (design D3).
- [x] 3.2 In `fontlib:chooseRoot`, a refusal becomes the thrown message, and moving with clashes shows the listing message box with "Keep the ones already there and move the rest" or "Cancel" (design D3). Verify with `npm run typecheck` and in task 5.3.
  - **Result, 2026-09-26.** `chooseRoot` throws the refusal before asking anything, and shows the clash message box (up to 12 names, "Keep the ones already there and move the rest" or Cancel) after "Move them". It skips the move question entirely when the folder is missing. The type check is clean. Checked by the owner in task 5.3.

## 4. Imports

- [x] 4.1 SF8: read the CRC in `listZip`, and verify the CRC and size in `extractZip`. Make the test zip builder write real CRCs (`zlib.crc32`). Add a test: a zip with a wrong CRC is refused and nothing is added. Verify with `npm test`, with the existing zip tests still passing.
  - **Result, 2026-09-25.** `ZipEntry.crc` is read from the central directory. `extractZip` checks the CRC-32 (`zlib.crc32`) and size, and checks every entry's path before filtering (design D5: an escaping entry was being skipped instead of refusing the package). The builder writes real CRCs, and `badCrc` corrupts one. New test "refuses a package whose contents do not match their checksum" passes, and so do the existing zip tests.
- [x] 4.2 SF7: one junk rule for the zip and folder paths (design D5). Add a test: `.rtf`, `.docx`, `.mp3` and a folder named `v1.2` come in, while `__MACOSX`, `Thumbs.db`, `desktop.ini` and dot-files do not. Verify with `npm test`.
  - **Result, 2026-09-25.** `isJunk` covers dot segments, `__MACOSX`, `Thumbs.db` and `desktop.ini`, used for zips, folders and tracks. New test: `License.rtf`, `Readme.docx`, `preview.mp3` and `v1.2/extra.wav` come in; `Thumbs.db`, `desktop.ini`, `.hidden` and `__MACOSX` do not.
- [x] 4.3 SF5: filter variants by the parent folder names inside the pick, and report left-out fonts in `skipped` (design D5). Add tests: a folder of three fonts with one named "ProffieOS Default" imports all three, and CFX plus Proffie variants keep Proffie and report CFX. Update the existing variant test if its expectations change. Verify with `npm test`.
  - **Result, 2026-09-25.** `chooseVariants` is added. Corrected during implementation (spec and design updated): a folder counts as a variant when its whole name is a board's name, including the font's own folder (`Kyber Ember/CFX`), never a font whose name merely contains one. New tests: "ProffieOS Default" among three fonts imports all three, and Proffie, CFX and Xenopixel keep Proffie and report CFX and Xenopixel as "for another board, not Proffie". The existing variant test is unchanged and passes.
- [x] 4.4 SF6: take tracks only from inside the pick (design D5). Add a test: a single font folder with an unrelated sibling `tracks` gets no tracks, and a package with top-level `tracks` beside its one font still gets them. Verify with `npm test`.
  - **Result, 2026-09-25.** Candidates are `dirname(d)/tracks` (only inside the pick) and `top/tracks`, the first that exists. New test: a single font from "Downloads" with an unrelated sibling `tracks` gets none, and a package with top-level `tracks` beside its one font gets them.

## 5. Checks

- [x] 5.1 Development run with no board. Set `HILTWRIGHT_FONT_LIBRARY` to a scratch library holding one font and a damaged `hiltwright-fonts.json`. Verify:
  - the Font library page and the Armory both name `hiltwright-fonts.damaged-….json` "in the font library folder"
  - the damaged file is unchanged
  - the font is still listed
  - **Result, 2026-09-25.** Scratch library with font "Kylo" and `hiltwright-fonts.json` = `{ "fonts": { broken`, no board. The Font library page said "The font details … could not be read. The file was kept as hiltwright-fonts.damaged-20260925-181108.json in the library folder, and Hiltwright started with none". The Armory said "Your font details could not be read. It was kept as … in the font library folder …" with Open folder. The damaged file is unchanged, and Kylo is listed.
- [x] 5.2 Development run with no board and no `HILTWRIGHT_FONT_LIBRARY`, with a scratch data folder whose `fontlibrary.json` points at a folder that does not exist. Verify that the Font library page shows the missing panel with its three choices, and that the folder was not created.
  - **Result, 2026-09-25.** Scratch data folder whose `fontlibrary.json` (written by PowerShell, with a byte-order mark) points at `…\no-such-drive\Fonts`, and no `HILTWRIGHT_FONT_LIBRARY`. The Font library page showed "The font library folder cannot be found: … Nothing was created in its place" with Look again, Choose where it is, and Use the default folder. Neither `no-such-drive` nor `Fonts` was created, and the settings file was not set aside. The first run set it aside, which is how the byte-order-mark problem was found.
- [x] 5.3 The owner's check on the installed build, without moving the real library:
  - "Change…" to a folder inside the library is refused with the explanation
  - "Change…" to a test folder holding a font folder named like one of theirs lists it before anything moves, and Cancel leaves everything as it was
  - **Result, 2026-09-26, the owner's installed build.** The owner reported that all steps behaved as described:
    - "Change…" to the `Crait` font folder inside the library was refused with the red note, and nothing moved.
    - "Change…" to `C:\Temp\clash-test` (holding an empty `Crait` folder), then Move them, listed Crait with "Keep the ones already there and move the rest" or Cancel, and Cancel changed nothing.
    - Afterwards, read through `\localhost\C$`: `fontlibrary.json` still has no `root` (the library is at the default folder), the library still has 38 font folders including Crait, `clash-test` holds only the empty `Crait`, and no damaged files appeared.
- [x] 5.4 Run `npm test` and `npm run typecheck`; verify both pass.
  - **Result, 2026-09-25.** 177 core and 192 desktop tests pass (7 gated skipped), and the type check is clean.
- [ ] 5.5 After archive, tick roadmap task 3.7 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
