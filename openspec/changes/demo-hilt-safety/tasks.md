# Tasks

## 1. Shared settings and checks

- [ ] 1.1 Create `apps/desktop/src/shared/demoSettings.ts` (design D6):
  - Move in `SceneSettings`, `DEFAULT_SCENE`, `BLADE_DIAMETERS`, `STRIP_DENSITIES`, `HiltFit` and `DEFAULT_FIT`. `demoScene.ts` and `hiltModel.ts` re-export them.
  - Add `cleanScene` and `cleanFit`, which repair a value that is missing, not finite, the wrong type or out of range, and keep the rest.

  Tests in `hilts.test.ts`: `cleanScene({ bladeInches: 500, glow: 2, bladeDiameter: 'x' })` gives 36, 2 and '1'; `cleanFit` repairs `seatMm: 'deep'`, `rollDeg: 999` and `axis: 'z'`, and keeps valid values. Verify with `npm test` and `npm run typecheck`.

## 2. The store (main)

- [ ] 2.1 Add `apps/desktop/src/main/zip.ts` `writeZip(file, entries)`: deflated entries with CRC-32, written to a temp file and then renamed into place (design D7). Test: a written zip reads back through `listZip` and `extractZip` with the same bytes. Verify with `npm test`.
- [ ] 2.2 Add `apps/desktop/src/main/hilts.ts` `HiltStore` on `JsonStore` ("demo room hilts", `place: 'data'`), with `cleanHilts`, model files under `userData/hilts/<id>/` and the operations of design D1 and D2:
  - `list`, `model`, `add(input, mode)`, `setFit`, `setCreator`, `remove`, `packFit`, `resetPackFit`, `room` and `setRoom`
  - files are written first, and removed if the store update fails
  - old files are deleted only after a replace or remove is saved

  Tests in `hilts.test.ts`:
  - a pack fit and an owner hilt of the same name are independent, and resetting the pack fit leaves the owner hilt
  - `new` on a taken name, ignoring case, returns `taken` and adds nothing
  - `keepBoth` adds "YS 2"
  - `replace` keeps the id, fit and credit, swaps the files and removes the old ones
  - a failing add (the store file turned into a folder) rejects, lists nothing and leaves no new folder
  - a failing remove keeps the hilt and its files
  - a damaged `hilts.json` is set aside and reported

  Verify with `npm test`.
- [ ] 2.3 Add `adopt` and `import`/`export` to `HiltStore` (design D5, D7):
  - An identical name and hash is skipped, and a clash is numbered.
  - Pack fits and room settings are taken only where none exist.
  - Import extracts to a temp folder under `userData`, removes it afterwards, and refuses a zip without a readable `hilts.json`.

  Tests in `hilts.test.ts`:
  - adoption skips an identical hilt, numbers a clash, keeps an existing pack fit and room, and adds nothing on a second run
  - export then import into a fresh folder gives the same hilts, fits and credits
  - a second import adds nothing
  - a zip of something else is refused

  Verify with `npm test`.
- [ ] 2.4 In `ipc.ts`, add the `hilts:*` handlers (design D1), with the save and open dialogs for export and import. Add `hilts` to `shared/api.ts` and the preload, and add the hilt store to `app:storeProblems`. Verify with `npm run typecheck`.

## 3. The room (renderer)

- [ ] 3.1 Rewrite `renderer/src/hiltStore.ts` as the IPC client with `adoptOnce()` (design D5): it reads the page's IndexedDB records and the `scene` and `hilt` keys, sends them to `hilts:adopt`, and sets `hiltwright.demo.movedToData` only on success, leaving the old storage untouched. Switch `Contributors.tsx` to it. Verify with `npm run typecheck`, and in task 4.1.
- [ ] 3.2 In `Demo.tsx`, use the new store (design D1 to D4, D6):
  - Loading a model fetches its bytes by id.
  - The scene and chosen hilt come from `hilts:room` and are saved through `hilts:setRoom`.
  - Pack hilts use `packFits`.
  - A taken name asks Replace, Keep both or Cancel.
  - Remove and Reset fit each ask first.
  - Fit saves are debounced 300 ms and flushed on hilt change and when the room closes.
  - Every failure shows its red note, and a hilt that failed to save is not listed.

  Verify with `npm run typecheck`, and in task 4.1.
- [ ] 3.3 Add "Export hilts…" and "Import hilts…" to the Hilt panel, with the result note of design D7. Verify in task 4.1.

## 4. Checks

- [ ] 4.1 Development run with no board, on a scratch folder, whose page IndexedDB is first seeded, through the development JS hook, with a record "YS" (an STL, seat 12 mm, credited) in the shape the current build stores. Then, on the changed build, verify each of these:
  1. "YS" is listed with a seat of 12 mm, and `hilts.json` holds it.
  2. Loading another `YS.obj` asks. Keep both adds "YS 2" with a fresh fit. Replace keeps the 12 mm seat and the credit.
  3. Remove then Keep leaves "YS". Remove then Remove deletes it and its folder.
  4. Export writes a zip. Importing it into a second scratch folder lists the same hilts, fits and credits, and importing again adds nothing.
  5. A `hilts.json` with `bladeInches: 500` in `room.scene` opens with a 36-inch blade.
  6. A damaged `hilts.json` is named on the Armory.
- [ ] 4.2 Run `npm test` and `npm run typecheck`; verify both pass.
- [ ] 4.3 Owner check on an installed build (`npm run dist` in `apps/desktop`, then install). Verify that:
  - a hilt the owner loads in a development run on their own data appears in the installed app with its fit
  - Export hilts, removing that hilt, then Import hilts brings it back with its fit and credit
- [ ] 4.4 After archive, tick roadmap task 3.10 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
