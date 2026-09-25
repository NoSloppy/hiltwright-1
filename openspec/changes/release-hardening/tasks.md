# Tasks

## 1. No switches in packaged builds

- [x] 1.1 Add `apps/desktop/src/main/devEnv.ts` with `scrubDevEnv(env, packaged)`, which removes every `HILTWRIGHT_*` key when `packaged` is true and nothing otherwise (design D1). Call it as the first statement of `main/index.ts` with `app.isPackaged`, before the existing `HILTWRIGHT_USER_DATA` line, which then needs no guard of its own. Verify with `apps/desktop/test/devEnv.test.ts`: a packaged scrub removes `HILTWRIGHT_E2E`, `HILTWRIGHT_PACKS`, `HILTWRIGHT_SD_ROOT` and `HILTWRIGHT_TOOLCHAIN_DIR` and keeps unrelated variables; an unpackaged scrub changes nothing.
- [x] 1.2 Install the development hooks `hiltwrightGoto`, `hiltwrightE2E`, `hiltwrightBuildE2E` and `hiltwrightPreviewTick` only under `import.meta.env.DEV`, leaving `hiltwrightAutoConnect` as it is (design D2). Verify in task 3.1 that none of the four names appear in the built renderer bundle and `hiltwrightAutoConnect` does.

## 2. Version, CSP, folders, error screen

- [ ] 2.1 Take the preload's `appVersion` from a build-time constant defined from `apps/desktop/package.json` (design D3). Verify in task 3.1 that the built preload contains the package version, and that `npm run dev` still shows it in the sidebar.
- [x] 2.2 Add a renderer build plugin that removes `ws: wss:` from the CSP in production builds only (design D4). Verify in task 3.1 that the built `out/renderer/index.html` has no `ws:`, and that `npm run dev` still live-reloads.
- [x] 2.3 Add `insideFolder(root, target)` in `apps/desktop/src/main/paths.ts` and use it in `app:openPath` (design D5). Verify with `apps/desktop/test/paths.test.ts` covering: a folder inside (allowed), the data folder itself (allowed), a sibling with a longer name (refused), `..` climbing out (refused), and another drive (refused).
- [x] 2.4 Change the page error screen's text to claim nothing about the saber (design D6). Verify by reading `ErrorBoundary.tsx` and seeing the screen in `npm run dev` with a page made to throw (for example via the developer tools).
  - **Result, 2026-09-25.** In `npm run dev` on a scratch folder, date formatting was made to throw and the Armory reopened. The error screen showed "This page stopped working. You can try again, or reload the window.", and the old claim about the saber was absent. The fault also reached the shell, so the app-wide guard showed it; that guard uses the same component and wording.

## 3. Verify on a packaged build

- [x] 3.1 Run `npm run build` in `apps/desktop`, then `npx electron-builder --win --dir`. Verify by inspecting `out/`:
  - the four development hook names are absent from the renderer bundle, and `hiltwrightAutoConnect` is present
  - `out/renderer/index.html`'s CSP has no `ws:`
  - the preload bundle carries the package version
  - **Result, 2026-09-25.** `npm run build` then `npx electron-builder --win --dir --publish never` built `release/win-unpacked/Hiltwright.exe`. In the bundles:
    - `hiltwrightGoto`, `hiltwrightE2E`, `hiltwrightBuildE2E`, `hiltwrightPreviewTick` and `hiltwrightPretendBuilt` appear in 0 renderer files; `hiltwrightAutoConnect` appears in 1
    - the built CSP reads `connect-src 'self' blob:`
    - the preload has `appVersion: "0.1.0"`, and no `__APP_VERSION__` is left
    - development live reload still connects (`[vite] connected` in the dev runs after the plugin)
- [ ] 3.2 Start `release/win-unpacked/Hiltwright.exe` with `HILTWRIGHT_DUMP=<file>` and `HILTWRIGHT_USER_DATA=<scratch folder>` set, wait 30 s, and close it. Verify that no dump file is written and that nothing is created in the scratch folder.
- [ ] 3.3 Owner check: install from `npm run dist`'s installer and see the version in the sidebar footer. Verify by the owner's report.

## 4. Close

- [ ] 4.1 Run `npm test` and `npm run typecheck`; verify both pass.
- [ ] 4.2 After archive, tick roadmap task 3.2 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
