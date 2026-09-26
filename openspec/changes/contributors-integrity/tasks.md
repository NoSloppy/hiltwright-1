# Tasks

## 1. The store

- [x] 1.1 Move `ContributorStore` onto `JsonStore` with `cleanContributors`, which drops bad logos and links and counts them (design D1). Add the list to `app:storeProblems`. In `contributors.test.ts`, add:
  - a damaged file is set aside and a new link is saved
  - a hand-edited `file:` or `javascript:` link is dropped on load and the original is kept aside
  - two changes at once are both kept

  Verify with `npm test`, with the existing tests still passing.
  - **Result, 2026-09-26.** `ContributorStore` is on `JsonStore` ("contributors", `place: 'data'`). `cleanContributors` keeps picture-file logos and web-address links, and counts an entry with a failing field as dropped. `app:storeProblems` includes the list. New tests (a damaged file is set aside and a new link saved; hand-edited `file:` and `javascript:` links are dropped and the original kept aside; three changes at once are all kept) pass, and so do the two existing tests.
- [x] 1.2 Make `setLogo` and `clearLogo` save first, then delete the old picture, and remove a new copy when the save fails (design D2). Add a test: when the update fails, the old logo is still named and its file is still there. Verify with `npm test`.
  - **Result, 2026-09-26.** `setLogo` copies the new picture, updates the list, and only then removes the old picture. If the update fails, it removes the new copy. `clearLogo` updates first, then removes. New test: with the store's file turned into a folder so the save fails, the list still names the old logo, its file is on disk, and the new copy is gone. This needed `JsonStore` to undo a failed change in memory (design, added during implementation), with a `jsonStore.test.ts` case.
- [x] 1.3 Add `copyTo(from, to)` (design D4). Add tests: it copies the logo and link to a new file for `to`, refuses a `to` that has an entry, and leaves `from` unchanged. Verify with `npm test`.
  - **Result, 2026-09-26.** `copyTo(from, to)` copies the logo picture to a new file for `to`, along with the link. It refuses a `to` that has an entry, returns false when `from` has none, and leaves `from` unchanged. The test passes.

## 2. IPC and pages

- [x] 2.1 In `ipc.ts`, every `contributors:*` handler awaits `contributorsReady` (design D3). `contributors:open` re-checks with `cleanUrl` (design D5). Add `contributors:copy` (preload and `shared/api.ts`), and add `copyTo` to the hook. Verify with `npm run typecheck`.
  - **Result, 2026-09-26.** Every `contributors:*` handler awaits `contributorsReady` (`setLogo` after the dialog). `contributors:open` re-runs `cleanUrl`, opens only http(s), and otherwise logs and does nothing. `contributors:copy` is added (preload, `shared/api.ts`, and the hook's `copyTo`, which refreshes). The type check is clean.
- [x] 2.2 In `Looks.tsx`, after a successful author rename, offer the copy when the old name has a logo or link and the new name has neither (design D4). Verify in task 3.1.
  - **Result, 2026-09-26.** After a successful rename, `Looks.setAuthor` sets `carry` when the old name has its own logo or link, the new name has neither, and the new name is a real person. The detail shows "Give <to> the logo and link of <from>? <from> keeps its own…" with Give them and No thanks. Checked in task 3.1.

## 3. Checks

- [x] 3.1 Development run with no board, on a scratch folder holding a pasted style by "Fet263" and a contributors entry giving "Fet263" a link. Rename the author to "Fett263". Verify that the offer appears, and that after "Give them" the style shows the link under "Fett263" while "Fet263" keeps its own. In a second run with a damaged `contributors.json`, verify that the Armory note names the kept file.
  - **Result, 2026-09-26.** Scratch folder with the pasted style "Misspelt credit" by "Fet263", and `contributors.json` giving Fet263 `https://fett263.com/`. No board. The credit showed "Style by Fet263 … fett263.com". Edit, then "Fett263", then Save showed "Give Fett263 the logo and link of Fet263? Fet263 keeps its own…". Give them made the list hold both `Fet263:https://fett263.com/` and `Fett263:https://fett263.com/`, with the credit showing "Fett263 … fett263.com" and the note "Fett263 now has the same logo and link as Fet263." Damaged-file run: the Armory said "Your contributors could not be read. It was kept as contributors.damaged-20260926-124710.json in Hiltwright's data folder …", and that file exists.
- [x] 3.2 Run `npm test` and `npm run typecheck`; verify both pass.
  - **Result, 2026-09-26.** 178 core and 214 desktop tests pass (7 gated skipped), and the type check is clean.
- [ ] 3.3 After archive, tick roadmap task 3.9 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
