# Tasks

## 1. The safe store

- [ ] 1.1 Add `apps/desktop/src/main/jsonStore.ts` with `JsonStore<T>` and `storeProblems()` (design D1). Add `apps/desktop/test/jsonStore.test.ts`, covering:
  - a good file is read
  - unparseable JSON is renamed aside unchanged and the store starts from the backup copy, or empty when there is none
  - a partly bad file is copied aside and the readable records are used
  - the backup holds the version before the last write
  - ten updates started at once all land in the file with no error, and no `.tmp` files are left
  - `storeProblems()` names each file kept aside

  Verify with `npm test`.

## 2. The library and preset sets on it

- [ ] 2.1 Move `Library` onto `JsonStore` with `cleanLibrary` (design D2), keeping its methods and file format. In `library.test.ts`, turn the BST-1 `it.fails` into `it`, extend the 1.2 test so that the damaged file is kept under its new name, and add "two changes at the same moment both land" (an `update` and an `upsert` started together). Verify with `npm test`.
- [ ] 2.2 Move `BanksStore` onto `JsonStore` with `isBank`. Add a banks case to `jsonStore.test.ts` or a small `banksStore.test.ts`: a damaged file is kept, and a new set is saved. Verify with `npm test`.

## 3. Reflash and the firmware record (F15)

- [ ] 3.1 Add `expect` to `Library.upsert` and `library:upsert`, resolved in the order of design D4. Add `library.test.ts` cases:
  - with no serial and the expectation, a board reporting the expected config after a reflash (new install stamp) matches the expected record
  - with a different config it does not
  - a plan is never matched through an expectation
  - a serial match still wins

  Verify with `npm test`.
- [ ] 3.2 Add `expectAfterInstall(saberId, configName)` to `board.ts`, passed on the next `identify` and then cleared, with a 5-minute expiry. Call it from `Build.tsx` before rebooting to the bootloader (install and restore). Pass `saber.id` to `updateSaber` for the firmware record. Verify with `npm run typecheck` and in task 6.3.

## 4. Telling the owner

- [ ] 4.1 Add the `app:storeProblems` IPC call (main, preload, `shared/api.ts`). Add the Armory notes with Open folder and Dismiss (design D3), and log each problem. Verify in task 6.1.

## 5. Adoption and New saber

- [ ] 5.1 Adoption confirms first (design D5). The confirmation says the next install replaces the compiled styles and the card's presets become the plan's. It adds the model warning when the saber has a model. Not now changes nothing, and Adopt calls `library.adopt`. Verify in task 6.2.
- [ ] 5.2 New saber while a saber is plugged in creates and lists the plan, stays on the Armory, and shows the note (design D6). With nothing plugged in, the flow is unchanged. Verify in task 6.2, and in task 6.1 for the unplugged flow.

## 6. Checks

- [ ] 6.1 Development run, no board, scratch folder, with `library.json` written as broken JSON beforehand. Verify:
  - the Armory shows the note naming `library.damaged-….json`
  - that file exists unchanged
  - "New saber" with nothing plugged in still opens Wiring on the plan
  - the new plan is saved in a fresh `library.json`
- [ ] 6.2 Read-only run on V2.2 hote2 (`-Board`, scratch folder). Verify:
  - with hote2 connected, "New saber" creates the plan, keeps hote2 as the working saber, and shows the note
  - the adoption offer then appears for hote2, which has no firmware record in the scratch folder
  - "It is …" shows the confirmation with the compiled-styles text, and Not now leaves both records unchanged
  - after Wiring gives hote2 a model, the confirmation also shows the model warning
  - Adopt moves the plan's model and removes the plan

  Only read commands are sent to the board.
- [ ] 6.3 Two-board check with the owner, V2.2 hote2 and V3 plugged in together, on the owner's installed build of this change:
  1. Record the owner's `library.json` (hote2 record count and firmware time) through `\\localhost\C$`.
  2. The owner connects, confirms the header shows hote2 (unplugging the V3 to connect first if needed, then plugging it back in), and installs on hote2.
  3. Verify afterwards that there is still one hote2 record, carrying the new firmware time, and that the log shows the expectation matched.
- [ ] 6.4 Run `npm test` and `npm run typecheck`; verify both pass.
- [ ] 6.5 After archive, tick roadmap task 3.6 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
