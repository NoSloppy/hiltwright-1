# Tasks

## 1. The style store

- [ ] 1.1 Move the `look()` coercer from `ipc.ts` into `looksStore.ts` as `cleanLook` (null instead of throw), with `ipc.ts` throwing "Expected a style" on null. Put `LooksStore` on `JsonStore` with `cleanLooks` and in-place replace, and add the styles to `app:storeProblems` (design D1). Add `apps/desktop/test/looksStore.test.ts`:
  - a damaged `looks.json` is set aside, and a new style is saved
  - a style of the wrong shape is dropped, and the original is kept aside
  - a replace keeps the style's place
  - `cleanLook` keeps the fields it keeps today

  Verify with `npm test`.

## 2. The editor

- [ ] 2.1 Add `renderer/src/styleSave.ts` with `saveTarget` (design D2), and add `apps/desktop/test/styleSave.test.ts` covering:
  - showing changed
  - only the other changed
  - neither changed (writes the original mode)
  - both changed (`dropsOther`)
  - a new style is dirty

  Verify with `npm test`.
- [ ] 2.2 In `StyleEditor.tsx`, Save writes `saveTarget().write`, the status and leave guard use `dirty`, and the `dropsOther` note shows. The new-style id is made once, Save has a busy state, one save runs at a time, errors show, and `by` is kept from the loaded style (design D2, D3). Verify with `npm run typecheck` and in task 5.1.
- [ ] 2.3 Add `EditorLoader` in `App.tsx`, which loads the stored copy by id and handles a removed style. `onSaved` sets `editingLook` and refreshes the library (design D4). Verify in task 5.1.

## 3. Plans and fingerprints

- [ ] 3.1 Add `Library.replaceLook(look)`. `looks:update` calls it and returns `{ looks, sabersUpdated }`: update `shared/api.ts`, the preload, and both callers. The editor shows the count (design D5). Add `library.test.ts` cases: every record holding the id gets the new copy (planned or not), others are untouched, and the count is right. Verify with `npm test` and `npm run typecheck`.
- [ ] 3.2 Add `lookFingerprint` and `FirmwareManifest.looks[].hash` in core, filled by `generateConfig`, and keep `hash` in `cleanFirmware` (design D6). Add tests:
  - the manifest has a hash per used look, and the config text is identical with and without the change (compare against a fixed expected hash or snapshot)
  - `cleanFirmware` keeps a hex `hash` and drops a bad one

  Verify with `npm test`.
- [ ] 3.3 `queuedLookIds` queues an id whose firmware `hash` differs from the plan copy's fingerprint, and the Styles page's "On the saber" requires the same hash (or none) (design D6). Add `saberModel.test.ts` cases: an edited plan copy is queued, the same copy is not, and firmware without hashes counts as having it. Verify with `npm test`.

## 4. Styles page

- [ ] 4.1 Remove asks first in place, naming sabers with the style queued or installed (design D7). Verify in task 5.1.
- [ ] 4.2 Paste-save gets a busy state and shows errors with the dialog kept open. `CreditCard` awaits `onRename` and routes failures to `onError` with the form kept open (design D8). Verify with `npm run typecheck` and by reading the code paths. A forced failure is not practical offscreen, so the task result states what was checked.

## 5. Checks

- [ ] 5.1 Development run with no board, on a scratch folder holding a built style and a planned saber whose preset 1 uses it. Drive the editor and Styles. Verify:
  - (a) opening the style, clicking the other mode's tab and saving leaves `looks.json` unchanged and the status "Saved"
  - (b) changing a colour and saving updates the planned saber's `model.looks` copy, and the editor says one saber was updated
  - (c) visiting another page and coming back to the Style editor from the sidebar shows the saved version
  - (d) a double click on Save for a new style stores one style
  - (e) Remove on the style shows a confirmation naming the saber as queued, and Cancel keeps it

  Then, in a second run with a damaged `looks.json`, verify the Armory note names the file it was kept as.
- [ ] 5.2 Hardware check on V2.2 hote2, run by the owner on the installed build:
  1. One of their built styles is used in a preset, and they build and install. Verify that Styles then shows it "On the saber".
  2. They edit that style (a colour) and save. Verify that Styles shows it "Queued", that "Use it in" is not offered, and that Build & Install counts one new style.
  3. Read the owner's `library.json` through `\\localhost\C$` to confirm the firmware record has a `hash` for each style.
- [ ] 5.3 Run `npm test` and `npm run typecheck`; verify both pass.
- [ ] 5.4 After archive, tick roadmap task 3.8 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
