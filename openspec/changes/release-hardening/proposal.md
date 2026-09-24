# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-board` (archived as `openspec/changes/archive/2026-09-24-baseline-board/`, design.md Findings table).

## Why

Beta 1 ships a packaged installer to testers. Several development conveniences are live in packaged builds, including one that writes to a real board when an environment variable is set.

## What Changes

- **F25:** `HILTWRIGHT_*` development aids (offscreen, screenshots, dumps, end-to-end board hooks) work only in development builds.
- **F26:** The version shown in the app comes from the package, not a literal.
- **F27:** The production content security policy drops `ws:` and `wss:`.
- **F28:** Opening a folder checks the real path is inside the app's data folder, not a string prefix.
- **F29:** The page error screen says only what it knows.

## Non-goals

- Signing (Beta 2), licence notices (`license-and-notices`), the install guide (`unsigned-install-guide`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-shell`: requirements that development aids are absent from packaged builds, and on the isolation of the page (CSP, folder opening).

## Impact

`apps/desktop/src/main/{index,ipc}.ts`, `preload/index.ts`, `renderer/index.html`, `ErrorBoundary.tsx`. Verified on the packaged installer.
