# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-styles` (archived as `openspec/changes/archive/2026-09-24-baseline-styles/`, design.md Findings table). This is Wave B task 3.8, and it reuses the safe store built by `library-integrity`.

## Why

"Build custom styles" is in the Beta 1 promise, and the style builders testing it will lose work today:
- Saving writes whichever editor mode is showing, even one never touched.
- Reopening the editor brings back a stale copy.
- A damaged style store deletes everything.
- An edited style never reaches the sabers that already use it, while every preview shows the edit.

## What Changes

- **ST29:** Save writes the half of the editor the owner changed:
  - Only looking at the other mode's tab never replaces a saved style with an untouched default.
  - When both halves were changed, Save writes the mode showing and says the other mode's changes are not kept.
- **ST30:**
  - The editor always opens the stored, current version of a style, from the Styles page or the sidebar.
  - Saving keeps the author name set on the Styles page, instead of resetting it to "you".
- **ST31:**
  - Save shows that it is working, reports a failure, and cannot make two styles from a double click.
  - The saved/unsaved status reflects what Save would write.
- **ST8:** the style store uses the shared safe store:
  - writes are queued, with a backup copy
  - a damaged file is set aside and reported, never overwritten
  - each style is checked for shape on load, with the same rules as when it is saved
- **ST9:** removing a style asks first, and names the sabers that have it queued or installed. Those sabers keep their own copy for their next build.
- **ST10:** errors when saving a pasted style or renaming its author are shown, and the form stays open.
- **ST1:** when a built or pasted style is saved again, every saber whose plan holds a copy of it gets the new version. The page says how many were updated.
- **ST2:** the firmware record keeps a fingerprint of each style's code. A style whose code changed since the install shows as not on the saber ("Queued" when a preset uses it) until it is rebuilt, and "Use it in", which writes to the saber at once, is not offered for it.

## Non-goals

- Credit and attribution beyond keeping the author on re-save (`style-attribution`).
- Which preset "Use it in" targets (`style-to-saber-fixes`).
- A live refresh of the style list across pages. Pages already reload it when opened.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `style-editor`:
  - "The editor has a simple and a full mode": which mode Save writes, and the honest status.
  - "A saved style works everywhere": save feedback, the current version on reopening, the author kept, and saber plans updated.
- `style-library`:
  - "The owner's styles are kept on this computer": the safe store and confirmed removal.
  - "A style shows who made it": rename errors are shown.
  - "A library style can be pasted in with its credits": paste errors are shown.
  - "A style's state on the working saber is shown": an edited style is not "On the saber".
  - "A style can be put on the working saber from Styles": "Use it in" only for the installed version.

## Impact

- **Main, in `apps/desktop/src/main/`:**
  - `looksStore.ts`: JsonStore, plus `cleanLook` shared with the IPC check
  - `library.ts`: `replaceLook` across saber plans
  - `ipc.ts`: `looks:*` and `app:storeProblems`
- **Renderer, in `apps/desktop/src/renderer/src/`:**
  - `StyleEditor.tsx`, and a new pure `styleSave.ts` holding the save-target logic
  - `App.tsx`: the editor always loads the stored copy
  - `Looks.tsx`: remove confirmation, errors, state
  - `credits.tsx`: rename errors
  - `slotModel.ts`: queued by fingerprint
- **Core, in `packages/core/src/`:** `looks.ts` and `config/generate.ts` gain a per-style fingerprint in the manifest. The config text is unchanged.
- **Tests:** in `apps/desktop/test/` and `packages/core/test/`.
- **Hardware check:** an install on V2.2 hote2 by the owner, with one of their built styles.
