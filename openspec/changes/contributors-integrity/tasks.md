# Tasks

## 1. The store

- [ ] 1.1 Move `ContributorStore` onto `JsonStore` with `cleanContributors`, which drops bad logos and links and counts them (design D1). Add the list to `app:storeProblems`. In `contributors.test.ts`, add:
  - a damaged file is set aside and a new link is saved
  - a hand-edited `file:` or `javascript:` link is dropped on load and the original is kept aside
  - two changes at once are both kept

  Verify with `npm test`, with the existing tests still passing.
- [ ] 1.2 Make `setLogo` and `clearLogo` save first, then delete the old picture, and remove a new copy when the save fails (design D2). Add a test: when the update fails, the old logo is still named and its file is still there. Verify with `npm test`.
- [ ] 1.3 Add `copyTo(from, to)` (design D4). Add tests: it copies the logo and link to a new file for `to`, refuses a `to` that has an entry, and leaves `from` unchanged. Verify with `npm test`.

## 2. IPC and pages

- [ ] 2.1 In `ipc.ts`, every `contributors:*` handler awaits `contributorsReady` (design D3). `contributors:open` re-checks with `cleanUrl` (design D5). Add `contributors:copy` (preload and `shared/api.ts`), and add `copyTo` to the hook. Verify with `npm run typecheck`.
- [ ] 2.2 In `Looks.tsx`, after a successful author rename, offer the copy when the old name has a logo or link and the new name has neither (design D4). Verify in task 3.1.

## 3. Checks

- [ ] 3.1 Development run with no board, on a scratch folder holding a pasted style by "Fet263" and a contributors entry giving "Fet263" a link. Rename the author to "Fett263". Verify that the offer appears, and that after "Give them" the style shows the link under "Fett263" while "Fet263" keeps its own. In a second run with a damaged `contributors.json`, verify that the Armory note names the kept file.
- [ ] 3.2 Run `npm test` and `npm run typecheck`; verify both pass.
- [ ] 3.3 After archive, tick roadmap task 3.9 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
