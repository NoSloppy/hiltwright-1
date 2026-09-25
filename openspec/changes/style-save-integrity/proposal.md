# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-styles` (archived as `openspec/changes/archive/2026-09-24-baseline-styles/`, design.md Findings table).

## Why

"Build custom styles" is in the Beta 1 promise, and the style builders testing it will lose work today:
- Saving writes whichever editor mode is showing, even one never touched.
- Reopening the editor brings back a stale copy.
- A damaged style store deletes everything.
- An edited style never reaches the sabers that already use it, while every preview shows the edit.

## What Changes

- **ST29:** Save writes the mode the style was edited in. Switching modes never replaces a saved style with an untouched default.
- **ST30:** The editor always opens the stored, current version of a style.
- **ST31:** Save shows that it is working, reports failure, cannot create a duplicate on a double click, and the saved/unsaved status reflects what Save will write.
- **ST8:** The style store is written safely. A damaged store is set aside and reported, never overwritten.
- **ST9:** Removing a style asks first, and warns when it is queued or on a saber.
- **ST10:** Errors when saving a paste or renaming its author are shown.
- **ST1, ST2:** When a built or pasted style changes, every saber whose plan uses it is updated (or the owner is asked). Its state becomes "needs a build" until rebuilt, and "Use it in" is withheld until then.

## Non-goals

- Credit and attribution (`style-attribution`).
- Which preset "Use it in" targets (`style-to-saber-fixes`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `style-editor`: saving and reopening requirements.
- `style-library`: a safe store, confirmed removal, and edited styles flowing to saber plans.

## Impact

`apps/desktop/src/renderer/src/{StyleEditor.tsx,App.tsx,Looks.tsx,slotModel.ts}`, `apps/desktop/src/main/looksStore.ts`, `packages/core/src/lookSim.ts`.
