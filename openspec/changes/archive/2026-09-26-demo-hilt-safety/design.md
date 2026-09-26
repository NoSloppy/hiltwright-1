# Design

## Context

- **Where hilts live today.** `renderer/src/hiltStore.ts` keeps `StoredHilt` records in the page's IndexedDB database `hiltwright-demo`, keyed by `name`, with the model's bytes inline. The scene settings (`hiltwright.demo.scene`) and the chosen hilt (`hiltwright.demo.hilt`) are in `localStorage`.
  - Both kinds of page storage are per origin. The owner's data folder has `IndexedDB/file__0…` for the installed build and `IndexedDB/http_localhost_5173…` for development: SR4.
  - Development and installed builds share the data folder itself (`%APPDATA%\@hiltwright\desktop`, from the package name), so storage kept there is shared.
- **Keys.** A pack hilt's adjusted fit is stored as a `StoredHilt` with `packId` under the pack's display name, in the same key space as the owner's hilts (SR1):
  - `loadHiltFiles` writes by file name.
  - `forgetHilt` deletes by name for both kinds.
- **Failures.** Every `saveHilt` and `removeHilt` call ends in `.catch(() => undefined)` (SR3). `forgetHilt` removes without asking (SR2).
- **Scene settings.** `loadScene` spreads stored JSON over `DEFAULT_SCENE` unchecked (SR5).
- **Contributors.** `Contributors.tsx` reads `listHilts()` to count hilts the owner credited.
- **Tools already available.**
  - `JsonStore` (queue, backup, damaged file set aside, undo on failure, Armory note).
  - `unzip.ts` (`listZip` and `extractZip` with escape and CRC checks).
  - `node:zlib`'s `crc32` and `deflateRawSync`.

## Goals / Non-Goals

**Goals:**
- One store for hilts, shared by every build, with the same guarantees as the other stores.
- No path by which a hilt or a fit is replaced or removed without the owner choosing it.
- Every failed save visible.

**Non-Goals:**
- Deleting the old page storage.
- Moving the panel's own conveniences.
- Model size limits.
- Exporting scene settings.

## Decisions

### D1. The hilt store in the main process
`main/hilts.ts` holds a `HiltStore` over:
- **`userData/hilts.json`:** `new JsonStore(file, { name: 'demo room hilts', place: 'data', … })`, holding:
  ```ts
  { version: 1,
    hilts: HiltRecord[],                 // the owner's own
    packFits: Record<packId, HiltFit>,   // adjustments to pack hilts
    room: { scene?: SceneSettings, chosen?: string } }
  HiltRecord = { id, name, format: 'glb'|'obj'|'stl', fit, creator?, model: string, side: { name, file }[], sha256 }
  ```
- **`userData/hilts/<id>/`:** the model file and its side files (the `.mtl` and textures), under their own names.

`id` is 12 random hex characters. `chosen` is a hilt id, `pack:<packId>`, or absent for the built-in hilt.

`cleanHilts(raw)` returns null unless `hilts` is an array. It drops an entry, counting it, when any of these fail:
- its `id` is not 12 hex characters
- its `format` is not one of the three
- its `model` or a side file is not a bare file name

`fit` and `room.scene` go through `cleanFit` and `cleanScene` (D6), which repair and never drop.

IPC:
| Call | Does |
|---|---|
| `hilts:list` | metadata only |
| `hilts:model(id)` | the bytes and side files |
| `hilts:add(input, mode)` | adds a hilt (D2) |
| `hilts:setFit` | saves a hilt's fit |
| `hilts:setCreator` | saves a hilt's credit |
| `hilts:remove` | removes a hilt |
| `hilts:packFit` | saves a pack's fit adjustment |
| `hilts:resetPackFit` | drops a pack's fit adjustment |
| `hilts:room` / `hilts:setRoom` | reads and saves the scene and the chosen hilt |
| `hilts:adopt` | the move from page storage (D5) |
| `hilts:export` / `hilts:import` | D7 |

`app:storeProblems` awaits the hilt store too.

**Rejected:**
- *Keeping IndexedDB and adding only export and import.* Development and installed builds would still see different hilts, and the owner would have to shuttle files between them.
- *Model bytes inside the JSON.* Every fit nudge would rewrite megabytes.
- *One store per hilt.* No single place to set aside and report when damaged.

### D2. Identity, and loading a name already taken (SR1)
- The owner's hilts are keyed by `id` and pack adjustments by pack id, in separate fields, so they cannot collide.
- The Hilt panel lists pack hilts under the pack's name as now. Because the owner's own "YS" and a pack's "YS" can now both be listed, the hilt dropdown groups them under "Your hilts" and "From packs" (added during implementation).
- "Reset fit" deletes only `packFits[packId]`.

`hilts:add(input, mode)`:
- **`mode: 'new'`:** adds under the file's base name. When that name is taken (ignoring case), it adds nothing and returns `{ taken: { id, name } }`. The panel then asks, in an `alertdialog`: "You already have a hilt called YS." with Replace, Keep both and Cancel.
- **`mode: { replace: id }`:** keeps the record's `id`, `fit`, `creator` and `name`. Swaps the model, side files, `format` and `sha256`. The old files are deleted only after the store is saved.
- **`mode: 'keepBoth'`:** adds under `<name> 2`, `<name> 3`, …, the first free one.

Every add writes the files first, into a fresh `hilts/<id>` folder, or for a replace into new file names in the same folder. It then updates the store, and removes the new files if the update fails. This follows contributors-integrity D2.

**Rejected:**
- *Replace with a fresh fit.* The owner chose to keep the fit, because a second file of the same name is usually a revised export.
- *Always keep both.* It asks nothing, but it litters the list.

### D3. Asking before removing or resetting (SR2)
- **Remove** opens an inline `alertdialog`: "Remove YS from Hiltwright? Its fit and credit go with it. Your original file is not touched." with Remove and Keep.
- **Reset fit** on a pack hilt: "Reset the fit of YS to the pack's own? Your adjustments will be lost." with Reset and Keep.

This is the same pattern as removing a style. Removal updates the store, then deletes the hilt's folder.

**Rejected:**
- *Undo instead of asking.* Undoing a removal would mean holding the files back, and the Styles page already asks.

### D4. Failures are shown (SR3)
Every `hilts:*` call rejects on failure. `Demo.tsx` drops the `.catch(() => undefined)`s and shows each failure in `hiltNote` (red):
- "Could not keep this hilt: <reason>." The hilt is not added to the list or chosen.
- "Could not save the fit: <reason>. Your changes are shown but will be lost when you leave the room." It clears on the next successful fit save.
- "Could not save the credit: <reason>."
- "Could not remove YS: <reason>." The hilt stays listed.

Fit saves are debounced (300 ms after the last change) and flushed when the hilt changes or the room closes. The panel keeps its own copy of the fit while dragging, and each save sends the whole fit, so a failed save is caught up by the next one.

### D5. Bringing the old page storage over (SR4)
`renderer/src/hiltStore.ts` becomes the IPC client. Its first `listHilts()` in a page runs `adoptOnce()`:
1. If `localStorage['hiltwright.demo.movedToData']` is not set, read the IndexedDB records, if the database exists, and the `scene` and `hilt` keys.
2. Send them to `hilts:adopt({ hilts, scene, chosenName })`:
   - An owner hilt with the same name and the same `sha256` as one already here is skipped.
   - A different model under a taken name is added as "<name> 2" and so on.
   - A pack record becomes `packFits[packId]` unless one exists.
   - `scene` and `chosen` are taken only if the store has none.
3. On success, set the flag. The IndexedDB database and the `localStorage` keys are left untouched, as a backup.

**The app records each adopted origin (added during implementation).** The development run showed that the page's `localStorage` flag is lost when the app is killed before it writes to disk. The next start then adopted again. Nothing was replaced, but an old version of a hilt came back under a numbered name, and a hilt the owner had removed would have come back too. Now:
- `hilts.json` keeps `adopted: string[]`, the page origins already brought over, written by the same store update that adds the hilts.
- `adoptOnce` asks `hilts:room` first and skips an origin that is recorded.
- `adopt` refuses a recorded origin even if asked.

The page flag is now only a shortcut that saves reading the old database.

The remembered hilt name goes to the owner's own hilt when one has it, and otherwise to a pack hilt of that name, because the old room listed the owner's hilts first. The repository's own `ys.hwpack` shares the name "YS" with the development run's hilt, which is how this showed up.

A failure leaves the flag unset, so the next open tries again, and the panel says "Could not bring over your earlier hilts: <reason>."

Each build adopts its own origin's storage the first time it opens the room, so both the owner's development and installed hilts end up in the one store.

**Rejected:**
- *Reading the other origin's LevelDB files from main.* A private format. Each origin's page can read its own safely.
- *Deleting the old storage after moving.* It is the only copy if the move is wrong. Leaving it costs a few KB to MB.

### D6. Checking stored values (SR5)
A new `shared/demoSettings.ts`, with no three.js, so main can import it, holds:
- `SceneSettings`, `DEFAULT_SCENE`, `HiltFit` and `DEFAULT_FIT`, moved from `demoScene.ts` and `hiltModel.ts`, which re-export them
- `cleanScene(raw)` and `cleanFit(raw)`

Each field is checked against the control's range:

| Setting | Allowed |
|---|---|
| glow | 0–3 |
| glowSpread | 0–1 |
| bladeBrightness | 0.7–2.5 |
| bladeLight | 0–3 |
| roomLight | 0–2.5 |
| haze | 0–0.3 |
| bladeInches | 20–40 |
| bladeDiameter | a key of `BLADE_DIAMETERS` |
| ledsPerMetre | one of `STRIP_DENSITIES` |
| grid, staff, bladeWhenOff | booleans |
| lengthCm | null or 15–45 |
| rollDeg | −180–180 |
| offsetXmm, offsetZmm | −30–30 |
| seatMm, staffSeatMm | −40–120 |
| tiltXDeg, tiltZDeg | −45–45 |
| axis | auto, origin or box |
| flip | boolean |

A value that is missing, not finite, the wrong type or out of range takes its default. The rest are kept. A repaired value does not count as dropped, so it does not set the file aside: the fix is harmless and visible on the panel. The renderer's `loadScene` goes away; the scene comes from `hilts:room`.

`BLADE_DIAMETERS` and `STRIP_DENSITIES` move with them if they are renderer-only today.

### D7. Export and import (SR4)
- **Export.** "Export hilts…", under the Hilt panel, opens a save dialog defaulting to `Hiltwright hilts YYYY-MM-DD.zip`. A new `main/zip.ts` `writeZip(file, entries)` writes deflated entries with CRC-32, via a temp file then a rename. The zip holds:
  - `hilts.json`: the owner's hilts and `packFits`; no room settings
  - `<id>/<file>` for each model and side file
- **Import.** "Import hilts…" opens a `.zip`:
  1. `listZip`, then `extractZip` into a temp folder under `userData`.
  2. Read its `hilts.json` through `cleanHilts`.
  3. Add each hilt by the adoption rule (D5): identical skipped, a taken name numbered. Each gets a new `id` and copies its files in. Pack fits are added only where none exist.
  4. Delete the temp folder.

  The note says "Imported 2 hilts and 1 pack fit; 2 were already here." A file that is not a Hiltwright hilt export says so. `HiltMergeResult` counts hilts (`added`) and pack fits (`fits`) apart for this.

  **Development switch (added during implementation).** `HILTWRIGHT_DIALOG_FILE` answers the export and import dialogs with a path, so an offscreen development run can exercise both. Like every `HILTWRIGHT_*` switch, a packaged build removes it.

**Rejected:**
- *A folder instead of a zip.* Awkward to send or keep as one file.
- *Base64 inside one JSON.* Large, and the models cannot be opened on their own.

### D8. Checks
- **Unit tests** in `apps/desktop/test/hilts.test.ts`, on a scratch folder:
  - SR1: an owner hilt named like a pack's fit does not touch it, and resetting the pack fit leaves the owner hilt.
  - SR1: `new` on a taken name returns `taken`, `keepBoth` adds "YS 2", and `replace` keeps the id, fit and credit while swapping the model files and removing the old ones.
  - SR3: a failing save (the store file turned into a folder) rejects, leaves no new folder, and does not list the hilt.
  - SR3: a failing remove keeps the hilt and its files.
  - SR4: adoption skips an identical hilt, numbers a clash, keeps existing pack fits and room, and running it twice adds nothing.
  - SR4: export then import into a fresh folder gives the same hilts, fits and credits, and importing again adds nothing.
  - SR5: a damaged `hilts.json` is set aside and reported.
  - SR5: `cleanScene` and `cleanFit` repair out-of-range, wrong-type and missing values and keep the rest.
- **Zip:** `writeZip` output reads back through `listZip` and `extractZip`.
- **A development run** with no board, on a scratch folder, whose page storage holds a legacy hilt:
  - The hilt appears after adoption.
  - Same-name load: Keep both and Replace.
  - The Remove confirmation, with Keep leaving the hilt.
  - Export, then import into a second scratch folder.
- **Owner, installed build:**
  - A hilt loaded in a development run on the owner's own data appears in the installed app with its fit.
  - Export, remove, import brings it back.

No hardware check: no board, build or card is involved.

## Risks / Trade-offs

- [A legacy record could be adopted twice by two builds] → The name-and-hash rule skips the second copy.
- [A large model travels over IPC] → Structured clone copies ArrayBuffers well at hilt sizes, and it is read only when chosen.
- [The debounced fit save loses the last 300 ms if the app is killed] → Accepted. A normal close flushes it.
- [Moving `DEFAULT_SCENE` and `DEFAULT_FIT` touches the renderer's imports] → Re-exports keep the existing import paths working.
