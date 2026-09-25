# Design

## Context

See proposal.md for why. The code at 3d18c08:

- **Environment switches.** Fifteen `HILTWRIGHT_*` variables are read in four places:
  - `main/index.ts`: offscreen, window size, dump, screenshot, page, the two end-to-end hooks, and the scratch data folder. Only the scratch data folder is already development-only.
  - `main/ipc.ts`: font library and toolchain folder.
  - `main/packs.ts`: packs folder.
  - `main/sd.ts`: SD root.

  Every read happens inside a function, at the time of use, never when a module first loads.
- **Page hooks.** The page installs development hooks on `window`:
  - `hiltwrightGoto` (`App.tsx`)
  - `hiltwrightE2E` (`board.ts`), which writes to the saber
  - `hiltwrightBuildE2E` (`Build.tsx`), which confirms the wiring and builds
  - `hiltwrightPreviewTick` (`bladeRender.ts`)
  - `hiltwrightPretendBuilt` and `hiltwrightPretendWriting` (`Build.tsx`), which are already development-only

  `hiltwrightAutoConnect` (`board.ts`) is not a development aid: main calls it at start-up to connect, so it stays.
- **Version.** The preload script hard-codes `appVersion: '0.1.0'`. It runs sandboxed and cannot ask Electron for the version.
- **CSP.** `renderer/index.html` has one content security policy for development and production, including `ws: wss:`, which only the development server's live reload needs.
- **Folder opening.** `app:openPath` (`ipc.ts:311-315`) accepts any path that begins with the data folder's path as text.
- **Error screen.** `ErrorBoundary.tsx` tells the owner that nothing was written to the saber and that it is still connected, which it cannot know.

## Goals / Non-Goals

**Goals:**
- A packaged build that no environment variable can steer, and whose page offers no development hook.
- A version that cannot drift from the package, a production CSP without live-reload, and a folder check that cannot be fooled by a similar name.

**Non-Goals:**
- Disabling developer tools in packaged builds (SR18, `pack-integrity`).
- Signing, notices and the install guide (their own changes).

## Decisions

### D1. Scrub the environment once, at start-up
The main process's first statement removes every `HILTWRIGHT_*` variable from `process.env` when the app is packaged. That runs before any module reads one, because every read happens at use time (see Context). The scrub is a small pure function (`scrubDevEnv(env, packaged)`) in its own module, so it can be tested without Electron, and future switches are covered automatically.
- *Rejected:* gating each read (`if (!app.isPackaged)` at 15 sites). A new switch would be one forgotten check away from shipping, and `sd.ts`, which tests import, would have to import Electron.
- *Rejected:* an allow-list of switches. The whole prefix is development-only by definition.

### D2. Page hooks are compiled out of production builds
Each development hook is installed only under `import.meta.env.DEV`, which the production build replaces with `false`, so the hook's code is not in the packaged bundle. `hiltwrightAutoConnect` is left alone.
- *Rejected:* relying on D1 alone. Main would never call the hooks, but a page with developer tools open could.

### D3. The version comes from the package at build time
The build defines a constant from `apps/desktop/package.json`'s version (Vite `define`, in the preload section of `electron.vite.config.ts`), and the preload exposes that constant.
- *Rejected:* asking main for the version over IPC. It would make `appVersion` asynchronous for every caller (the sidebar, `draftModel`'s generator stamp), for a value known at build time.

### D4. Production drops live-reload from the CSP
A small renderer build plugin removes `ws: wss:` from the CSP when building for production. Development keeps them.
- *Rejected:* setting the CSP from main with response headers. The packaged page loads from `file://`, where there are no response headers to set.

### D5. Folders are checked by their resolved path
`app:openPath` resolves the target and requires its path relative to the data folder not to climb out (no `..`, not absolute). The check is a small pure function (`insideFolder(root, target)`), unit-tested with a sibling-name case.
- *Rejected:* string prefix with a trailing separator. It still breaks on case and `..` segments.

### D6. The error screen claims nothing it cannot check
The message says the page stopped working and offers Try again and Reload. It drops the statements about the saber. No spec change is needed: `app-shell` already specifies "a plain message".

### D7. Verified on an unpacked packaged build
`electron-builder --dir` produces the same app the installer would install, with `app.isPackaged` true, without building the installer. The checks:
- the built renderer has no development hooks, and its CSP has no `ws:`
- the built preload carries the package version
- the packaged app started with `HILTWRIGHT_DUMP` and `HILTWRIGHT_USER_DATA` set writes no dump and does not use the scratch folder

The owner confirms the version on screen from the installer.

The hardware-verification rule does not apply. This change only disables a development hook that talks to the board; no behaviour of the board link, build, install or card changes.

## Risks / Trade-offs

- [A future switch read at module load would slip past the scrub] → D1's test documents the rule, and the module doc says reads must happen at use time.
- [`npm run dev` testers of Beta 1 builds keep the aids] → Intended. Testers get the installer, which is packaged.
