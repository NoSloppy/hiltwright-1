# Tasks

## 1. The style store

- [x] 1.1 Move the `look()` coercer from `ipc.ts` into `looksStore.ts` as `cleanLook` (null instead of throw), with `ipc.ts` throwing "Expected a style" on null. Put `LooksStore` on `JsonStore` with `cleanLooks` and in-place replace, and add the styles to `app:storeProblems` (design D1). Add `apps/desktop/test/looksStore.test.ts`:
  - a damaged `looks.json` is set aside, and a new style is saved
  - a style of the wrong shape is dropped, and the original is kept aside
  - a replace keeps the style's place
  - `cleanLook` keeps the fields it keeps today

  Verify with `npm test`.
  - **Result, 2026-09-26.** `cleanLook` is in `looksStore.ts` (null instead of throw; over-long fields refuse the style), and `ipc.ts` uses it. `LooksStore` is on `JsonStore` ("styles", `place: 'data'`), with an in-place replace. `app:storeProblems` includes the styles. `looksStore.test.ts`: 4 tests pass (damaged file kept and new style saved; bad styles dropped and original kept; replace in place; fields kept and dropped).

## 2. The editor

- [x] 2.1 Add `renderer/src/styleSave.ts` with `saveTarget` (design D2), and add `apps/desktop/test/styleSave.test.ts` covering:
  - showing changed
  - only the other changed
  - neither changed (writes the original mode)
  - both changed (`dropsOther`)
  - a new style is dirty

  Verify with `npm test`.
  - **Result, 2026-09-26.** `styleSave.ts` exports `saveTarget`. `styleSave.test.ts`: 5 tests pass.
- [x] 2.2 In `StyleEditor.tsx`, Save writes `saveTarget().write`, the status and leave guard use `dirty`, and the `dropsOther` note shows. The new-style id is made once, Save has a busy state, one save runs at a time, errors show, and `by` is kept from the loaded style (design D2, D3). Verify with `npm run typecheck` and in task 5.1.
  - **Result, 2026-09-26.** Save writes `target.write` (the tree or doc, with `registerStyleSim` for that half). `dirty` and the leave guard come from `saveTarget`. The `dropsOther` note is amber. The new id is made once (`newId` ref). "Saving…" disables the button, and a second call returns. A failure shows a red note and is rethrown for the leave dialog. `by` comes from the loaded style when editing. The type check is clean. Checked in task 5.1 (a) and (d).
- [x] 2.3 Add `EditorLoader` in `App.tsx`, which loads the stored copy by id and handles a removed style. `onSaved` sets `editingLook` and refreshes the library (design D4). Verify in task 5.1.
  - **Result, 2026-09-26.** `EditorLoader` (keyed by `editorOpen`, bumped only when Styles opens the editor) fetches the stored copy each time the editor page mounts, and handles a removed style with a note. `onSaved` sets `editingLook` and refreshes the library, without remounting the editor. Checked in task 5.1 (c).

## 3. Plans and fingerprints

- [x] 3.1 Add `Library.replaceLook(look)`. `looks:update` calls it and returns `{ looks, sabersUpdated }`: update `shared/api.ts`, the preload, and both callers. The editor shows the count (design D5). Add `library.test.ts` cases: every record holding the id gets the new copy (planned or not), others are untouched, and the count is right. Verify with `npm test` and `npm run typecheck`.
  - **Result, 2026-09-26.** `Library.replaceLook` (through the safe store) is added. `looks:update` returns `{ looks, sabersUpdated }` and logs the count. `shared/api.ts` and both callers are updated. The editor shows "1 saber's plan now has this version; it needs a build to reach the saber". `library.test.ts`: 2 new tests pass (records holding the id get it, planned or not, others untouched, count right; none counts 0). The type check is clean.
- [x] 3.2 Add `lookFingerprint` and `FirmwareManifest.looks[].hash` in core, filled by `generateConfig`, and keep `hash` in `cleanFirmware` (design D6). Add tests:
  - the manifest has a hash per used look, and the config text is identical with and without the change (compare against a fixed expected hash or snapshot)
  - `cleanFirmware` keeps a hex `hash` and drops a bad one

  Verify with `npm test`.
  - **Result, 2026-09-26.** `lookFingerprint` (code and define) is in core, and the manifest gets `hash` per used look. `cleanFirmware` keeps a hex `hash` and drops a bad one. To prove the config is unchanged, a probe run against the committed code (with the edits stashed) gave config hash `589fe34025a7` and length 3587, and the new code gives the same. The test pins both. `looks.test.ts` (16) and `firmwareRecord.test.ts` (4) pass.
- [x] 3.3 `queuedLookIds` queues an id whose firmware `hash` differs from the plan copy's fingerprint, and the Styles page's "On the saber" requires the same hash (or none) (design D6). Add `saberModel.test.ts` cases: an edited plan copy is queued, the same copy is not, and firmware without hashes counts as having it. Verify with `npm test`.
  - **Result, 2026-09-26.** `installedVersion` and `installedLookIds` are added. `queuedLookIds` queues an id whose firmware `hash` differs from the plan copy's (or the starter's) fingerprint. The Styles page's "On the saber" is `installedLookIds` against the gallery's current version. `saberModel.test.ts`: 4 new tests pass (edited copy queued, same copy not, no hashes counts as installed, on the saber only for the installed version).

## 4. Styles page

- [x] 4.1 Remove asks first in place, naming sabers with the style queued or installed (design D7). Verify in task 5.1.
  - **Result, 2026-09-26.** "Remove from library" opens an in-place confirmation (`role=alertdialog`) naming the sabers with the style queued and/or installed (from the library) and saying they keep their copy. Remove and Cancel work, and a failed remove shows a red note. Checked in task 5.1 (e).
- [x] 4.2 Paste-save gets a busy state and shows errors with the dialog kept open. `CreditCard` awaits `onRename` and routes failures to `onError` with the form kept open (design D8). Verify with `npm run typecheck` and by reading the code paths. A forced failure is not practical offscreen, so the task result states what was checked.
  - **Result, 2026-09-26.** Paste-save has a busy state (`pasteState.saving` disables Save style) and a try/catch that keeps the dialog open with "Could not save the style: …". `CreditCard.onRename` may return a promise, and `submit` awaits it: a rejection goes to `onError` (the red note) and the form stays open, because `setEditing(null)` only runs on success. `Looks.setAuthor` returns its promise. Checked by the type check and by reading these paths. A forced IPC failure was not practical offscreen.

## 5. Checks

- [x] 5.1 Development run with no board, on a scratch folder holding a built style and a planned saber whose preset 1 uses it. Drive the editor and Styles. Verify:
  - (a) opening the style, clicking the other mode's tab and saving leaves `looks.json` unchanged and the status "Saved"
  - (b) changing a colour and saving updates the planned saber's `model.looks` copy, and the editor says one saber was updated
  - (c) visiting another page and coming back to the Style editor from the sidebar shows the saved version
  - (d) a double click on Save for a new style stores one style
  - (e) Remove on the style shows a confirmation naming the saber as queued, and Cancel keeps it

  Then, in a second run with a damaged `looks.json`, verify the Armory note names the file it was kept as.
  - **Result, 2026-09-26.** Scratch folder, no board. Setup run: "Build a style", then Save double-clicked, stored **1** built style, with status "Saved". A planned saber "Style test" was made with preset 1 using it.
    - (a) "Edit the layers", then the Full tab: the status stayed "Saved". Save changes left `looks.json` byte-for-byte unchanged, and the status stayed "Saved".
    - (b) Simple, change a colour: status "Unsaved changes". Save changes said "1 saber's plan now has this version; it needs a build to reach the saber". The plan's copy then equals the stored style exactly. A second run confirmed the colour edit changed the style's `define` (so its fingerprint) and its defaults. The style's `code` is only an alias reference, so the first run's code comparison was not the right check.
    - (c) To the Armory and back to the Style editor from the sidebar: status "Saved", showing the saved colour `#ff0000`.
    - (d) See the setup run: one style from a double click.
    - (e) Remove showed "Remove \"My style\" from your Styles? Style test has it queued. That saber keeps its own copy for the next build." Cancel kept the style.
    - The damaged `looks.json` run: the Armory said "Your styles could not be read. It was kept as looks.damaged-20260926-113957.json in Hiltwright's data folder …", and that file exists.
- [ ] 5.2 Hardware check on V2.2 hote2, run by the owner on the installed build:
  1. One of their built styles is used in a preset, and they build and install. Verify that Styles then shows it "On the saber".
  2. They edit that style (a colour) and save. Verify that Styles shows it "Queued", that "Use it in" is not offered, and that Build & Install counts one new style.
  3. Read the owner's `library.json` through `\\localhost\C$` to confirm the firmware record has a `hash` for each style.
- [x] 5.3 Run `npm test` and `npm run typecheck`; verify both pass.
  - **Result, 2026-09-26.** 178 core and 208 desktop tests pass (7 gated skipped), and the type check is clean.
- [ ] 5.4 After archive, tick roadmap task 3.8 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
