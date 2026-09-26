# Design

## Context

- **The style store (ST8).** `LooksStore` (`main/looksStore.ts`) keeps `{ version: 1, looks: LookDef[] }` in `userData/looks.json`:
  - Every load error reads as empty.
  - Writes share one temp name, with no queue and no backup.
  - A replacement moves the style to the end of the list.
  - The only shape check is the `look()` coercer in `ipc.ts`, applied on add and update.
- **The editor.** `StyleEditor.tsx` keeps both halves, Simple (`doc`) and Full (`tree`), in one undo history:
  - **Save** writes the half that is showing (ST29).
  - **Dirty** compares both halves by reference, ignoring which mode Save would write (ST31).
  - **Guards:** Save has no busy state and no error handling. A new style's id is made at click time and kept only after the IPC call, so a double click makes two (ST31).
  - **Author:** `treeToLook` and `styleToLook` hard-code `by: 'you'`, so a re-save drops an author set on Styles.
- **Reopening (ST30).** App keeps `editingLook` from the moment Styles opened it. `onSaved` is a no-op, so the sidebar route remounts the editor with that stale copy.
- **Plans (ST1, ST2).**
  - A saber's plan holds full copies of chosen styles in `model.looks`. `withLookInSlot` adds a copy only if the id is absent, and nothing refreshes it. Builds compile those copies.
  - `queuedLookIds` and the Styles page's `stateOf` compare ids only.
  - `FirmwareManifest.looks` records `{ id, name, args, defaults? }`, with no per-style fingerprint.
- **Looks.tsx (ST9, ST10).** Remove has no confirmation. Paste-save has no catch. The author rename is fired and forgotten inside `CreditCard.submit`, so its errors never reach `onError`.

## Goals / Non-Goals

**Goals:**
- Nothing a style builder saved is overwritten by something they did not change.
- A saved style is what every saber's next build compiles.
- The app says a style is on the saber only when the installed firmware has that version.

**Non-Goals:**
- Broadcasting style changes live to pages that are already open. They reload the list when opened.
- Rewriting presets on a saber when a style is removed. Sabers keep their copies.

## Decisions

### D1. The style store on `JsonStore`, one shape check
- `looksStore.ts` gains `cleanLook(v): LookDef | null`, which is the current `ipc.ts` `look()` coercer moved here, returning null instead of throwing. `ipc.ts` calls it and throws "Expected a style" on null.
- `cleanLooks(raw)` returns null unless `{ looks: [] }`, and otherwise keeps the looks `cleanLook` accepts and counts the rest as dropped.
- `LooksStore` holds `new JsonStore(file, { name: 'styles', place: 'data', empty, clean: cleanLooks })`.
- `add` replaces a look in place (as `BanksStore` does) or appends it.
- `app:storeProblems` also awaits `looksStore.list()`.

**Rejected:**
- *A separate `isLook` predicate beside the coercer.* Two shape rules drift apart. One function serves both saving and loading.

### D2. What Save writes, in one pure function (ST29, ST31)
`renderer/src/styleSave.ts` exports `saveTarget({ showing, docChanged, treeChanged, originalMode, isNew })`, which returns `{ write: 'simple' | 'tree'; dirty: boolean; dropsOther: boolean }`:
1. If the showing half changed, write it, and `dropsOther` is true when the other half also changed.
2. Otherwise, if the other half changed, write that half.
3. Otherwise, write `originalMode`, which is the stored style's kind, or Simple for a new style.

`dirty` is `isNew || <the written half changed>`.

`docChanged` and `treeChanged` compare each half with the saved snapshot, or with the start snapshot when nothing has been saved yet, by reference, as today. The editor uses:
- `write` in Save
- `dirty` for the status and the leave guard
- `dropsOther` for a one-line amber note beside Save: "Saves the Full version; changes in Simple are not kept", or the reverse

**Rejected:**
- *Asking which mode to save.* It is one more decision in the common case, which is having edited one mode.
- *Saving both halves.* A style is one or the other when it is built.

### D3. Save's busy state, id and author (ST31, ST30)
- **The id.** A new style's id is made once, when the editor mounts (a `useRef`), not on each click.
- **Busy.** While a save runs, the button is disabled and reads "Saving…", and a second call returns at once.
- **Errors.** A rejected save shows a red note in the editor, and the status stays unsaved.
- **The author.** Before storing, `by` is taken from the style as it was loaded (D4) when there is one, so an author set on Styles survives. Otherwise it is "you".

### D4. The editor always loads the stored copy (ST30)
- **`EditorLoader` in `App.tsx`.** It wraps `StyleEditor`. On mount, when `editingLook` is set, it fetches `looks.list()` and renders the editor with the stored copy of that id. A "Loading…" line shows until then.
  - If the style is gone, it opens a new style and says the old one was removed.
- **`onSaved(look)`.** It sets `editingLook` to the saved look, so reopening from the sidebar opens it, including a style that was new, and it calls `board.refreshLibrary()` (D5).

**Rejected:**
- *Refreshing `editingLook` only in `onSaved`.* A rename on Styles would still leave the editor stale.

### D5. A saved style reaches every saber's plan (ST1)
- **The library.** `Library.replaceLook(look)` goes through the safe store. It replaces the copy in `model.looks` of every record, planned or not, that has that id, and returns how many records changed.
- **The update call.** `looks:update` stores the style, then calls `replaceLook`. It returns `{ looks, sabersUpdated }`, where it returned a list before (`shared/api.ts` changes, and so do both callers).
- **What the owner sees.** The editor says "Saved. 1 saber's plan now has this version; it needs a build to reach the saber", and nothing extra when the count is 0. The author rename on Styles updates copies too (harmless; `by` is not compiled).

**Rejected:**
- *Having plans point at the store instead of holding copies.* A build must compile exactly what the plan was checked with, so copies stay. They are just refreshed.
- *Asking per saber.* An edit that should not reach a saber belongs in a new style ("save as"), which is out of scope.

### D6. A fingerprint per style in the firmware record (ST2)
- **Core.**
  - `lookFingerprint(look)` returns `contentHash(code + '\n' + (define ?? ''))`, which is what reaches the compiler.
  - `FirmwareManifest.looks[]` gains `hash?: string`, filled by `generateConfig` for every used look.
  - The config text is unchanged, and a test compares it before and after.
- **Keeping it.** `firmwareRecord.cleanFirmware` keeps `hash` as a short hex string.
- **Comparing.** `slotModel.queuedLookIds` treats a wanted id as queued when the firmware lacks it, or when the firmware's `hash` exists and differs from the fingerprint of the plan's copy (or of the starter for a starter id).
- **The Styles page.** A style is "On the saber" only when the firmware has the id and either no `hash` (older firmware) or the `hash` of the gallery's current version. "Use it in" is already limited to that state, so an edited style is queued instead.

**Rejected:**
- *Comparing whole `LookDef`s.* Name, author and preview changes do not need a rebuild.
- *Marking every older firmware as changed.* The owner's installed sabers would all turn "Queued" at once.

### D7. Removing asks first (ST9)
Remove in the Styles detail becomes a confirmation in place. It names the sabers:
- **Queued:** a preset in their plan uses the id.
- **Installed:** their firmware record lists it.

It says "They keep their own copy for their next build", with Remove and Cancel. Only Remove calls `looks.remove`.

### D8. Paste and rename errors are shown (ST10)
- **Paste.** `savePasted` gets a busy state and a try/catch. An error shows in the dialog, and the dialog stays open.
- **Rename.** `CreditCard`'s `onRename` may return a promise. `submit` awaits it, sends a failure to `onError`, and keeps the form open. `Looks.setAuthor` returns its promise.

### D9. Checks
- **Unit tests:**
  - the store's damaged file and in-place replace, and `cleanLook` (`looksStore.test.ts`)
  - `saveTarget` in all its cases (`styleSave.test.ts`)
  - `replaceLook` (`library.test.ts`)
  - the fingerprint in the manifest, with unchanged config text (`generate.test.ts` or `looks.test.ts`)
  - `queuedLookIds` by fingerprint (`saberModel.test.ts`)
  - `cleanFirmware` keeping `hash` (`firmwareRecord.test.ts`)
- **A no-board development run** on a scratch folder, with a planned saber whose preset uses a built style:
  - Open the style, click the other tab, and save: the stored style is unchanged and the status stays Saved.
  - Edit and save: the plan's copy is updated, and the editor says one saber.
  - Go away and back through the sidebar: the saved version is shown.
  - Remove: a confirmation naming the saber; Cancel keeps the style.
  - A damaged `looks.json`: the Armory note.
- **The hardware check on V2.2 hote2,** an install by the owner:
  - A preset uses one of their built styles, and after install Styles shows it "On the saber".
  - After editing that style, it shows "Queued", "Use it in" is not offered, and Build & Install counts one new style.

## Risks / Trade-offs

- [Older firmware records have no hashes, so an edit made before this change and not rebuilt still shows "On the saber"] → Accepted (D6). The next install records hashes.
- [Updating plans silently changes what a saber builds] → The editor states it with a count. That is what the owner expects from editing a style they use.
- [`EditorLoader` adds a brief load before the editor shows] → A local IPC call to a small file.
