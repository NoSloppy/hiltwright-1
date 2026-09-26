# Tasks

## 1. Safe details and location

- [ ] 1.1 Add `place` to `StoreOptions` and `StoreProblem` in `jsonStore.ts` (design D1). The saber library and preset sets pass `'data'`. Update `jsonStore.test.ts` to assert it. Verify with `npm test`.
- [ ] 1.2 Move the font details file onto `JsonStore` with `cleanIndex`, one store per root, remade on `moveTo` and `forget()` (design D1). Move `fontlibrary.json` onto a `JsonStore` too. Make `app:storeProblems` await the font details as well. In `fontLibrary.test.ts`, add a test that a damaged details file is set aside unchanged, the store starts from its backup, and a rename is then saved. Verify with `npm test`.
- [ ] 1.3 The Armory note uses `place`: it says "in the font library folder" and opens it with `fontLibrary.open()`, or keeps the data-folder wording. The Font library page shows problems where `place === 'fonts'`. Verify in task 5.1.

## 2. A missing library folder

- [ ] 2.1 `list()` creates only the default root. `fontlib:status` reports `missing`. `importFrom` and `copyToCard` refuse while missing. `chooseRoot` skips `list()` when missing (design D2). Add a test: a missing chosen root gives `[]`, creates no folder, and status says missing. Verify with `npm test`.
- [ ] 2.2 Show the missing panel on the Font library page, with Look again, Choose where it is, and Use the default folder. Verify in task 5.2.

## 3. Moves

- [ ] 3.1 Add `planMove(next)`, refusing self, child and parent destinations and listing clashes from disk and details (design D3). Change `moveTo` to move font by font, with details following each font, `keepBack`, logos never overwritten, same names only, and a stop-and-report on failure (design D4). Add tests for:
  - refusals
  - clashes
  - `keepBack` untouched, with the others moved with their details
  - an existing logo kept
  - a failure part-way keeping the root, with moved fonts' details at the destination

  Verify with `npm test`.
- [ ] 3.2 In `fontlib:chooseRoot`, a refusal becomes the thrown message, and moving with clashes shows the listing message box with "Keep the ones already there and move the rest" or "Cancel" (design D3). Verify with `npm run typecheck` and in task 5.3.

## 4. Imports

- [ ] 4.1 SF8: read the CRC in `listZip`, and verify the CRC and size in `extractZip`. Make the test zip builder write real CRCs (`zlib.crc32`). Add a test: a zip with a wrong CRC is refused and nothing is added. Verify with `npm test`, with the existing zip tests still passing.
- [ ] 4.2 SF7: one junk rule for the zip and folder paths (design D5). Add a test: `.rtf`, `.docx`, `.mp3` and a folder named `v1.2` come in, while `__MACOSX`, `Thumbs.db`, `desktop.ini` and dot-files do not. Verify with `npm test`.
- [ ] 4.3 SF5: filter variants by the parent folder names inside the pick, and report left-out fonts in `skipped` (design D5). Add tests: a folder of three fonts with one named "ProffieOS Default" imports all three, and CFX plus Proffie variants keep Proffie and report CFX. Update the existing variant test if its expectations change. Verify with `npm test`.
- [ ] 4.4 SF6: take tracks only from inside the pick (design D5). Add a test: a single font folder with an unrelated sibling `tracks` gets no tracks, and a package with top-level `tracks` beside its one font still gets them. Verify with `npm test`.

## 5. Checks

- [ ] 5.1 Development run with no board. Set `HILTWRIGHT_FONT_LIBRARY` to a scratch library holding one font and a damaged `hiltwright-fonts.json`. Verify:
  - the Font library page and the Armory both name `hiltwright-fonts.damaged-….json` "in the font library folder"
  - the damaged file is unchanged
  - the font is still listed
- [ ] 5.2 Development run with no board and no `HILTWRIGHT_FONT_LIBRARY`, with a scratch data folder whose `fontlibrary.json` points at a folder that does not exist. Verify that the Font library page shows the missing panel with its three choices, and that the folder was not created.
- [ ] 5.3 The owner's check on the installed build, without moving the real library:
  - "Change…" to a folder inside the library is refused with the explanation
  - "Change…" to a test folder holding a font folder named like one of theirs lists it before anything moves, and Cancel leaves everything as it was
- [ ] 5.4 Run `npm test` and `npm run typecheck`; verify both pass.
- [ ] 5.5 After archive, tick roadmap task 3.7 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
