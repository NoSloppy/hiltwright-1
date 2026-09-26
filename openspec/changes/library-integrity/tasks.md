# Tasks

## 1. The safe store

- [x] 1.1 Add `apps/desktop/src/main/jsonStore.ts` with `JsonStore<T>` and `storeProblems()` (design D1). Add `apps/desktop/test/jsonStore.test.ts`, covering:
  - a good file is read
  - unparseable JSON is renamed aside unchanged and the store starts from the backup copy, or empty when there is none
  - a partly bad file is copied aside and the readable records are used
  - the backup holds the version before the last write
  - ten updates started at once all land in the file with no error, and no `.tmp` files are left
  - `storeProblems()` names each file kept aside

  Verify with `npm test`.
  - **Result, 2026-09-25.** `jsonStore.ts` is added. `jsonStore.test.ts` has 7 tests, all passing: a good file; unparseable JSON renamed aside, starting from the backup; a wrong shape starting from nothing; a partly bad file copied aside with its readable records kept (the damaged file never becomes the backup); the backup holds the previous version; ten simultaneous updates land in order with no `.tmp` left; and a failed update does not stop the next.

## 2. The library and preset sets on it

- [x] 2.1 Move `Library` onto `JsonStore` with `cleanLibrary` (design D2), keeping its methods and file format. In `library.test.ts`, turn the BST-1 `it.fails` into `it`, extend the 1.2 test so that the damaged file is kept under its new name, and add "two changes at the same moment both land" (an `update` and an `upsert` started together). Verify with `npm test`.
  - **Result, 2026-09-25.** `Library` runs on `JsonStore` with `cleanLibrary`, and its file format is unchanged. In `library.test.ts` (15 tests pass), BST-1 is a normal test that also checks the original is kept. The 1.2 tests cover the damaged file kept, never overwritten, and starting from the backup. The "two changes at the same moment" test (firmware, model and rename together) passes with no `.tmp` left.
- [x] 2.2 Move `BanksStore` onto `JsonStore` with `isBank`. Add a banks case to `jsonStore.test.ts` or a small `banksStore.test.ts`: a damaged file is kept, and a new set is saved. Verify with `npm test`.
  - **Result, 2026-09-25.** `BanksStore` runs on `JsonStore` with `cleanBanks` (`isBank`). `banksStore.test.ts` has 2 tests, both passing: a damaged file is kept and a new set saved, and a partly bad file keeps its readable sets.

## 3. Reflash and the firmware record (F15)

- [x] 3.1 Add `expect` to `Library.upsert` and `library:upsert`, resolved in the order of design D4. Add `library.test.ts` cases:
  - with no serial and the expectation, a board reporting the expected config after a reflash (new install stamp) matches the expected record
  - with a different config it does not
  - a plan is never matched through an expectation
  - a serial match still wins

  Verify with `npm test`.
  - **Result, 2026-09-25.** `Library.upsert(input, expect)` resolves in this order: serial, then expectation (no serial, same config, not a plan), then the three-part match, then a new record. `library:upsert` validates `expect`. 4 new tests pass: a match after a reflash that keeps the serial; no match for another config; never a plan; and a serial match wins.
- [ ] 3.2 Add `expectAfterInstall(saberId, configName)` to `board.ts`, passed on the next `identify` and then cleared, with a 5-minute expiry. Call it from `Build.tsx` before rebooting to the bootloader (install and restore). Pass `saber.id` to `updateSaber` for the firmware record. Verify with `npm run typecheck` and in task 6.3.

- [ ] 3.3 Restores are expected back too (design D4, restores). `flash:backup` takes the reported config and writes `<file>.json` beside the image. `listBackups` returns `configName`, or null when there is no sidecar. The restore flow calls `expectAfterInstall` when it is known. Add tests in a new `apps/desktop/test/backups.test.ts`: a sidecar is read into `configName`, and a backup with no sidecar gives null. Verify with `npm test`, `npm run typecheck`, and in task 6.3.

## 4. Telling the owner

- [x] 4.1 Add the `app:storeProblems` IPC call (main, preload, `shared/api.ts`). Add the Armory notes with Open folder and Dismiss (design D3), and log each problem. Verify in task 6.1.
  - **Result, 2026-09-25.** `app:storeProblems` is added (main, preload and api), and it loads the library and sets first. The Armory shows one amber note per problem, with Open folder and Dismiss. Each problem is logged as `[store] …`, at warning level. Checked in task 6.1.

## 5. Adoption and New saber

- [x] 5.1 Adoption confirms first (design D5). The confirmation says the next install replaces the compiled styles and the card's presets become the plan's. It adds the model warning when the saber has a model. Not now changes nothing, and Adopt calls `library.adopt`. Verify in task 6.2.
  - **Result, 2026-09-25.** Clicking "It is …" shows a confirmation (`role=alertdialog`) with the compiled-styles text, plus the model warning when the saber has a model. Not now closes it, and Adopt calls `adoptPlan`. Checked in task 6.2.
- [x] 5.2 New saber while a saber is plugged in creates and lists the plan, stays on the Armory, and shows the note (design D6). With nothing plugged in, the flow is unchanged. Verify in task 6.2, and in task 6.1 for the unplugged flow.
  - **Result, 2026-09-25.** While live, `plan()` stays on the Armory and shows the note in Your sabers, with OK. With nothing plugged in the flow is unchanged (task 6.1). Checked in task 6.2.

## 6. Checks

- [x] 6.1 Development run, no board, scratch folder, with `library.json` written as broken JSON beforehand. Verify:
  - the Armory shows the note naming `library.damaged-….json`
  - that file exists unchanged
  - "New saber" with nothing plugged in still opens Wiring on the plan
  - the new plan is saved in a fresh `library.json`
  - **Result, 2026-09-25.** Scratch folder with `library.json` set to `{ "version": 1, "sabers": [ broken`, no board. The Armory said "Your saber list could not be read. It was kept as library.damaged-20260925-172842.json in Hiltwright's data folder, and Hiltwright started with an empty one", with Open folder and Dismiss. The damaged file is there, byte for byte. The log has the `[store]` warning. "New saber" ("Kylo build") with nothing plugged in opened Wiring. The fresh `library.json` holds the plan.
- [x] 6.2 Read-only run on V2.2 hote2 (`-Board`, scratch folder). Verify:
  - with hote2 connected, "New saber" creates the plan, keeps hote2 as the working saber, and shows the note
  - the adoption offer then appears for hote2, which has no firmware record in the scratch folder
  - "It is …" shows the confirmation with the compiled-styles text, and Not now leaves both records unchanged
  - after Wiring gives hote2 a model, the confirmation also shows the model warning
  - Adopt moves the plan's model and removes the plan

  Only read commands are sent to the board.
  - **Result, 2026-09-25. The owner's Proffieboard V3.9 ("Saber saber", USB serial 207A349A5430, COM3), not hote2.** I had checked only that a Proffieboard was present. The owner confirmed the board and accepted the result on 2026-09-25, since none of this depends on the board. Board: stock `config/default_proffieboard_config.h`, ProffieOS git-ce12a06, one 97-pixel blade. Run with `-Board` on a scratch folder. Results:
    - With the V3 connected, "New saber" ("Kylo build") stayed on the Armory with the V3 still working, and showed "Kylo build is set up. Saber saber is plugged in, so it stays the saber you are working on. Unplug it to work on Kylo build."
    - The adoption offer appeared. "It is \"Kylo build\"" showed the confirmation with the compiled-styles text, and Not now left the library byte-for-byte unchanged.
    - After confirming the V3's wiring on Wiring, the confirmation also showed "Saber saber already has wiring and presets set up in Hiltwright. They will be replaced by the plan's."
    - Adopt left one record, "Kylo build" (renamed from the default name), with the plan's model and the saber's config name kept, and the plan was gone.
    - Only reads were sent: version, battery, get_volume, get_preset, list_presets, list_fonts, list_tracks, scanid, and the hw_end sentinels.
- [ ] 6.3 Two-board check with the owner, V2.2 hote2 and V3 plugged in together, on the owner's installed build of this change:
  1. Record the owner's `library.json` (hote2 record count and firmware time) through `\\localhost\C$`.
  2. The owner connects, confirms the header shows hote2 (unplugging the V3 to connect first if needed, then plugging it back in), and installs on hote2.
  3. Verify afterwards that there is still one hote2 record, carrying the new firmware time, and that the log shows the expectation matched.
  4. With both boards still plugged in, the owner puts back the backup that install just took. Verify there is still one hote2 record, its firmware record is cleared, and the log shows the expectation matched.
- [ ] 6.4 Run `npm test` and `npm run typecheck`; verify both pass.
- [ ] 6.5 After archive, tick roadmap task 3.6 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
