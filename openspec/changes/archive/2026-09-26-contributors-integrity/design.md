# Design

## Context

- **The store.** `ContributorStore` (`main/contributors.ts`) keeps `{ version: 1, people: Record<name, { logo?, url? }> }` in `userData/contributors.json`, and logo pictures in `userData/contributors/`.
  - `load` treats every failure as empty (SR33).
  - `save` shares one temp name, with no queue (SR34).
- **Handlers.** In `ipc.ts`, only `contributors:list` awaits `contributorsReady`, which is the start-up copy of the font library's old logos. The set, clear and open handlers do not (SR34).
- **Logos.** `setLogo` deletes the old picture before saving the list (SR35).
- **Renames.** `Looks.setAuthor` renames a style's author, and nothing touches contributors (SR36).
- **Opening.** `contributors:open` passes `urlOf` straight to `shell.openExternal` (SR39).
- **Renderer.** The `useContributors` hook in `credits.tsx` holds a shared list with listeners and a `refresh()`.

## Goals / Non-Goals

**Goals:**
- The same guarantees as the other stores, with no special cases.
- No change leaves the list pointing at a picture that is gone.

**Non-Goals:**
- Cleaning up logo pictures that no entry names any more. They stay, harmless, as they do today after a crash.

## Decisions

### D1. The list on `JsonStore`
`ContributorStore` holds `new JsonStore(file, { name: 'contributors', place: 'data', empty, clean: cleanContributors })`.

`cleanContributors(raw)` returns null unless `people` is an object. For each entry it keeps:
- a `logo` that is a bare file name with a known picture extension
- a `url` that `cleanUrl` accepts

It counts an entry as dropped when it had a field that failed, so the original is copied aside. An entry left with neither field is dropped. Every mutating method goes through `update`, which queues it. `app:storeProblems` also awaits the contributors list.

**Rejected:**
- *Keeping a bad link and only refusing it on open.* The link would still show on the page as if it were real.

### D2. Save first, then delete the old picture (SR35)
`setLogo` and `clearLogo`:
1. Copy the new picture in, for `setLogo`.
2. `update` the entry, remembering the old file name.
3. After the update resolves, remove the old file.

If the update throws, the new copy is removed, and the entry and old picture are as they were.

**The safe store undoes a failed change (added during implementation).** `JsonStore.update` changed the in-memory value before writing, so a write that failed left memory ahead of the disk, in every store. It now snapshots the value before the change and puts it back if the change function or the write fails. A test in `jsonStore.test.ts` covers it. D2 relies on this: after a failed logo save the list still names the old picture.

### D3. Waiting for the handover (SR34)
Every `contributors:*` handler awaits `contributorsReady` before touching the store, in `ipc.ts`. The handover itself uses the store directly, so it does not wait on itself.

### D4. Carrying credit over on rename (SR36)
- **`copyTo(from, to)`** refuses when `to` already has an entry, and does nothing when `from` has none. Otherwise it copies `from`'s logo picture to a new file for `to` and sets `to`'s `logo` and `url`. The IPC call is `contributors:copy`, and the hook gets `copyTo`, which refreshes.
- **The offer.** In `Looks.tsx`, after `setAuthor` succeeds, when the old name has a logo or link (`people.logoFor` from the list, not the built-in Hiltwright icon, or `people.urlFor`) and the new name has neither, a note offers "Give <new> the logo and link of <old>?" with Give them and No thanks.

**Rejected:**
- *Moving instead of copying.* Other fonts or styles may still credit the old name. The owner can remove the old name's logo on Contributors if it is truly gone.
- *Doing it automatically.* A rename can also be a different person.

### D5. Opening re-checks (SR39)
`contributors:open` runs the stored link through `cleanUrl` again, and opens only when it returns an http(s) address. Otherwise it logs and does nothing.

### D6. Checks
- **Unit tests** in `contributors.test.ts`:
  - a damaged file is set aside and a new link is saved
  - a hand-edited `file:` or `javascript:` link is dropped on load and the original is kept aside
  - two changes at once are both kept
  - a failing save (simulated by making the store's update reject) leaves the old logo named and its file present
  - `copyTo` copies the logo and link, refuses a target that has an entry, and leaves the source
- **A development run** with no board, on a scratch folder:
  - A damaged `contributors.json` gives the Armory note.
  - Renaming a pasted style's author, whose old name has a link, offers the copy, and accepting shows the link under the new name.

No hardware check: no board, build or card is involved.

## Risks / Trade-offs

- [Copying the logo on rename duplicates a picture file] → A few KB. The owner removes the old one on Contributors if they like.
- [An entry whose link is dropped on load loses that link silently] → It is set aside with the file, and the Armory says so.
