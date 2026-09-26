# Tasks

## 1. Shared settings and checks

- [x] 1.1 Create `apps/desktop/src/shared/demoSettings.ts` (design D6):
  - Move in `SceneSettings`, `DEFAULT_SCENE`, `BLADE_DIAMETERS`, `STRIP_DENSITIES`, `HiltFit` and `DEFAULT_FIT`. `demoScene.ts` and `hiltModel.ts` re-export them.
  - Add `cleanScene` and `cleanFit`, which repair a value that is missing, not finite, the wrong type or out of range, and keep the rest.

  Tests in `hilts.test.ts`: `cleanScene({ bladeInches: 500, glow: 2, bladeDiameter: 'x' })` gives 36, 2 and '1'; `cleanFit` repairs `seatMm: 'deep'`, `rollDeg: 999` and `axis: 'z'`, and keeps valid values. Verify with `npm test` and `npm run typecheck`.
  - **Result, 2026-09-26.** `shared/demoSettings.ts` holds the scene and fit shapes, defaults, `BLADE_DIAMETERS` and `STRIP_DENSITIES`. `demoScene.ts` and `hiltModel.ts` re-export them, so existing imports are unchanged. `cleanScene` and `cleanFit` check each value against its control's range. Two tests in `hilts.test.ts` pass, `hiltModel.test.ts` still passes, and the type check is clean.

## 2. The store (main)

- [x] 2.1 Add `apps/desktop/src/main/zip.ts` `writeZip(file, entries)`: deflated entries with CRC-32, written to a temp file and then renamed into place (design D7). Test: a written zip reads back through `listZip` and `extractZip` with the same bytes. Verify with `npm test`.
  - **Result, 2026-09-26.** `main/zip.ts` `writeZip` writes deflated entries with CRC-32 and UTF-8 names, one entry in memory at a time, through a temp file renamed into place. The round-trip test in `hilts.test.ts` passes, and a written zip also opens with Windows' own `Expand-Archive`, including a non-ASCII name. **Found and fixed on the way:** `extractZip` returned 0 when called without a progress callback, because `onFile?.(e.name, ++done, …)` skipped the increment too. Its one existing caller passes a callback, so nothing visible was affected.
- [x] 2.2 Add `apps/desktop/src/main/hilts.ts` `HiltStore` on `JsonStore` ("demo room hilts", `place: 'data'`), with `cleanHilts`, model files under `userData/hilts/<id>/` and the operations of design D1 and D2:
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
  - **Result, 2026-09-26.** `main/hilts.ts` `HiltStore` is on `JsonStore<HiltsFile>` ("demo room hilts", `place: 'data'`), with models under `hilts/<id>/` under generated names (`<8 hex>.<ext>`; side files keep their original names in the record). `cleanHilts` drops entries naming a file it could not own and repairs fits and scene. Adds write files first and remove them if the list cannot be saved; replace and remove delete old files only after the list is saved. All seven listed tests pass.
- [x] 2.3 Add `adopt` and `import`/`export` to `HiltStore` (design D5, D7):
  - An identical name and hash is skipped, and a clash is numbered.
  - Pack fits and room settings are taken only where none exist.
  - Import extracts to a temp folder under `userData`, removes it afterwards, and refuses a zip without a readable `hilts.json`.

  Tests in `hilts.test.ts`:
  - adoption skips an identical hilt, numbers a clash, keeps an existing pack fit and room, and adds nothing on a second run
  - export then import into a fresh folder gives the same hilts, fits and credits
  - a second import adds nothing
  - a zip of something else is refused

  Verify with `npm test`.
  - **Result, 2026-09-26.** `adopt`, `exportTo` and `importFrom` share one merge: files are written first, then one store update adds them; if it fails, they are removed. Import unpacks into `hilts-import-<hex>` under the data folder and always removes it. **Found and fixed while testing:** a second adoption re-added a hilt that had been numbered the first time ("ys" stored as "ys 2"). The same model under a numbered form of its name now counts as the same hilt. All four listed tests pass (12 in the file), and the type check is clean.
- [x] 2.4 In `ipc.ts`, add the `hilts:*` handlers (design D1), with the save and open dialogs for export and import. Add `hilts` to `shared/api.ts` and the preload, and add the hilt store to `app:storeProblems`. Verify with `npm run typecheck`.
  - **Result, 2026-09-26.** The `hilts:*` handlers are in `ipc.ts`. The hilt types (`HiltInfo`, `HiltInput`, `HiltAddMode`, `HiltAddResult`, `LegacyHilts`, `HiltMergeResult`) live in `shared/api.ts`, and `main/hilts.ts` uses them. The preload exposes `hilts`, and `app:storeProblems` reads the hilt store too. Export offers `Hiltwright hilts YYYY-MM-DD.zip` in Documents. A development switch, `HILTWRIGHT_DIALOG_FILE`, answers both dialogs for offscreen runs (design D7). The type check is clean.

## 3. The room (renderer)

- [x] 3.1 Rewrite `renderer/src/hiltStore.ts` as the IPC client with `adoptOnce()` (design D5): it reads the page's IndexedDB records and the `scene` and `hilt` keys, sends them to `hilts:adopt`, and sets `hiltwright.demo.movedToData` only on success, leaving the old storage untouched. Switch `Contributors.tsx` to it. Verify with `npm run typecheck`, and in task 4.1.
  - **Result, 2026-09-26.** `hiltStore.ts` is the IPC client. `adoptOnce(packs)` reads the old database without creating it when it was never made, sends the page's hilts, scene and chosen hilt with `location.origin`, and leaves the old storage untouched. **Changed during the check (design D5):**
    - The app records each adopted origin in `hilts.json`, and that record is what counts. The page's own flag was lost when the app was killed, and the next start adopted again.
    - A remembered name the owner's hilt and a pack share goes to the owner's hilt.

    `Contributors.tsx` lists hilts through it. The type check is clean; see 4.1.
- [x] 3.2 In `Demo.tsx`, use the new store (design D1 to D4, D6):
  - Loading a model fetches its bytes by id.
  - The scene and chosen hilt come from `hilts:room` and are saved through `hilts:setRoom`.
  - Pack hilts use `packFits`.
  - A taken name asks Replace, Keep both or Cancel.
  - Remove and Reset fit each ask first.
  - Fit saves are debounced 300 ms and flushed on hilt change and when the room closes.
  - Every failure shows its red note, and a hilt that failed to save is not listed.

  Verify with `npm run typecheck`, and in task 4.1.
  - **Result, 2026-09-26.** `Demo.tsx` keys each hilt by id, or `pack:<id>` for pack hilts, and does all of the above. The scene and the chosen hilt are saved only after they have been read, so defaults never overwrite them. The hilt dropdown groups "Your hilts" and "From packs", since both can now hold a "YS" (design D2). The type check is clean; see 4.1.
    - **Not exercised in a run:** the failure notes, because an offscreen run cannot make the data folder fail mid-run. The store's rejection on a failed save and a failed remove is covered by `hilts.test.ts`.
- [x] 3.3 Add "Export hilts…" and "Import hilts…" to the Hilt panel, with the result note of design D7. Verify in task 4.1.
  - **Result, 2026-09-26.** "Export hilts…" and "Import hilts…" sit under the Hilt panel. Their notes read, for example, "Exported 1 hilt to …" and "Imported 1 hilt." / "Imported nothing new; 1 was already here." Checked in 4.1.

## 4. Checks

- [x] 4.1 Development run with no board, on a scratch folder, whose page IndexedDB is first seeded, through the development JS hook, with a record "YS" (an STL, seat 12 mm, credited) in the shape the current build stores. Then, on the changed build, verify each of these:
  1. "YS" is listed with a seat of 12 mm, and `hilts.json` holds it.
  2. Loading another `YS.obj` asks. Keep both adds "YS 2" with a fresh fit. Replace keeps the 12 mm seat and the credit.
  3. Remove then Keep leaves "YS". Remove then Remove deletes it and its folder.
  4. Export writes a zip. Importing it into a second scratch folder lists the same hilts, fits and credits, and importing again adds nothing.
  5. A `hilts.json` with `bladeInches: 500` in `room.scene` opens with a 36-inch blade.
  6. A damaged `hilts.json` is named on the Armory.
  - **Result, 2026-09-26.** Development runs with no board, on scratch folders. The repository's `ys.hwpack` pack is also called "YS", so the runs also exercised SR1's clash with a pack.
    - **Run A.** The seeded record is an STL "YS", seat 12 mm, credited to Shadowfoil Props, with a stored scene of 24 inches and glow 2, and "YS" remembered. It was brought over with "Brought over 1 hilt from an earlier version of Hiltwright.": YS chosen, seat 12, "YS by Shadowfoil Props", a 24-inch blade. `hilts.json` held it.
    - **Keep both.** Loading another `YS.stl` asked "You already have a hilt called YS. Replace its model, keeping its fit and credit, or keep both?". Keep both added and chose "YS 2" with seat 0 and no credit.
    - **Replace.** Choosing YS, loading again and choosing Replace kept seat 12 and the credit.
    - **Remove.** On YS 2, Remove asked "Remove YS 2 from Hiltwright? Its fit and credit go with it. Your original file is not touched.". Keep left it listed. Remove then deleted it, and the room went back to Built-in. Only YS's folder was left under `hilts/`.
    - **Export.** It wrote the zip: "Exported 1 hilt to …\export.zip."
    - The pack "YS" stayed listed throughout, with its own fit.
    - **Run A2, the same folder restarted.** The recorded origin stopped a second adoption. Only the owner's YS was listed, under "Your hilts", and the old IndexedDB record was still there (`YS:747:12`). This was after the fix: the first A2 found the double adoption described in 3.1.
    - **Run B, a fresh folder.** `room.scene` said `bladeInches: 500`, and the room opened with a 36-inch blade. Import said "Imported 1 hilt." and YS came back with seat 12 and "YS by Shadowfoil Props". Importing again said "Imported nothing new; 1 was already here." Rerun on the final code, with the same result.
    - **Run C.** A damaged `hilts.json` gave "Your demo room hilts could not be read. It was kept as hilts.damaged-20260926-132341.json in Hiltwright's data folder, and Hiltwright started with an empty one." That file exists.
- [x] 4.2 Run `npm test` and `npm run typecheck`; verify both pass.
  - **Result, 2026-09-26.** 178 core and 226 desktop tests pass (7 gated skipped), and the type check is clean in both workspaces.
- [ ] 4.3 Owner check on an installed build (`npm run dist` in `apps/desktop`, then install). Verify that:
  - a hilt the owner loads in a development run on their own data appears in the installed app with its fit
  - Export hilts, removing that hilt, then Import hilts brings it back with its fit and credit
- [ ] 4.4 After archive, tick roadmap task 3.10 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
