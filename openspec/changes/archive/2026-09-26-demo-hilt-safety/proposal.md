# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-showroom` (archived as `openspec/changes/archive/2026-09-24-baseline-showroom/`, design.md Findings table). This is Wave B task 3.10, the last Wave B change.

## Why

Owners put real effort into fitting their hilts in the demo room, and it can be lost silently:
- A same-named file overwrites a hilt and its hand-set fit.
- Pack hilts and the owner's hilts can overwrite each other.
- A removal cannot be undone.
- A failed save looks like a success.
- Hilts loaded in development never reach an installed build.

The owner's data folder shows the last one directly: it holds two separate page databases, one for the installed build (`file://`) and one for development (`localhost:5173`).

## What Changes

- **SR1:**
  - Hilts the owner loads get their own identities, and a pack's fit adjustment is kept apart from them, so the two never collide.
  - Loading a file with the same name as a stored hilt asks first:
    - **Replace** swaps in the new model and keeps the fit and credit.
    - **Keep both** adds it as "YS 2" with a fresh fit.
    - **Cancel** changes nothing.
  - "Reset fit" only ever touches the pack's adjustment.
- **SR2:** removing a hilt asks first, and so does resetting a pack hilt's fit.
- **SR3:** when a hilt, its fit or its credit cannot be saved (for example, when the disk is full), the Hilt panel says so. A hilt that failed to save is not shown as loaded.
- **SR4:**
  - Hilts, pack fit adjustments and the room's scene settings move out of the page's own storage into Hiltwright's data folder, on the shared safe store. Development and installed builds share that folder, so both see the same hilts.
  - On first open, whatever the page's old storage holds is brought over. Nothing is replaced, and the old storage is left as it was.
  - "Export hilts…" saves every hilt the owner loaded, with its fit and credit, and every pack fit adjustment, to one `.zip`. "Import hilts…" adds them back, never replacing a hilt already here.
- **SR5:**
  - Stored scene settings and hilt fits are checked when read. A value that is missing, the wrong kind or out of range falls back to its default, and the rest are kept.
  - A damaged store is set aside and named on the Armory, as the other stores are.

## Non-goals

- New hilt formats, and the other demo-room polish (`showroom-polish`).
- Deleting the old page storage once it has been brought over. It stays as a backup.
- Moving the panel's own conveniences (open tab, volume, control mode, folded sections). They stay in page storage.
- A size limit on hilt models.
- Exporting scene settings.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `demo-room`:
  - "The blade's size and strip match the saber": scene settings are checked when read.
  - "The owner's own hilt models can be loaded and fitted": they are kept in Hiltwright's data.
  - New requirements:
    - "A hilt is never replaced without asking"
    - "Removing a hilt or resetting a fit asks first"
    - "A hilt that cannot be saved says so"
    - "Hilts are kept with the app's data and can be exported"

## Impact

- **Main:** in `apps/desktop/src/main/`:
  - a new `hilts.ts`, the hilt store on `JsonStore`, with model files under `userData/hilts/`
  - a new `zip.ts`, a small zip writer for export
  - `ipc.ts` gets the `hilts:*` handlers, and `app:storeProblems` includes the hilt store
- **Shared:** `apps/desktop/src/shared/`:
  - `api.ts` and the preload get `hilts`
  - a new `demoSettings.ts` holds the scene and fit defaults and the checks, so main and the renderer use the same ranges
- **Renderer:** in `apps/desktop/src/renderer/src/`:
  - `hiltStore.ts` becomes the IPC client plus the one-time move from page storage
  - `Demo.tsx` gets the same-name question, the confirmations, the save-failure notes, and export and import
  - `Contributors.tsx` lists hilts through the new store
- **Tests:** a new `apps/desktop/test/hilts.test.ts`, plus `zip` round-trip tests.
- **Hardware check:** none. No board, build or card is involved. The owner checks an installed build: a hilt loaded in development appears there, and export then import works.
