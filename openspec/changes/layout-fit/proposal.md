# Proposal

**Milestone:** M2 (Beta 1 blocker), set by the owner on 2026-11-14 during `card-safety`'s hardware check. Roadmap 3.24c.

## Why

At the default window size (1480×980, `apps/desktop/src/main/index.ts`), and more so at the 1180×700 minimum, some regions are hard to use. The owner's screenshots of 2026-11-14 show two:

- **Fonts & SD:** the right column stacks three panels ("Fonts the presets use", "Add a font", and the selected font's detail). The detail panel is left a sliver with its own scroll bar at the bottom of the window.
- **Font library:** the font table is wider than its panel, so it scrolls sideways and cuts off the Status column. The selected font's detail column keeps its action buttons pinned at the bottom, with little room above them.

The pages were laid out as fixed-height workspaces (`work`, `fill`, `scroll`, 2026-09-20) and judged on one window size. Beta 1 testers will use whatever size their screen gives them.

## What Changes

- **Every page** SHALL be usable at the default size and at the minimum. Nothing an owner needs SHALL be cut off, need a sideways scroll, or be left a sliver with a scroll bar of its own.
- **Fonts & SD:** the right column gives the selected font's detail room, by collapsing, tabbing or moving the other panels. The design decides which.
- **Font library:** the table fits its panel (columns narrowed, combined or dropped as the width allows), and the detail column's actions stay reachable.
- **The other pages** (Armory, Wiring, Presets, Build & Install, Styles, Style editor, Contributors, Demo room, Diagnostics) are checked at both sizes, and fixed where the same problems show.
- **A check that stays:** a script takes an offscreen screenshot of every page at both sizes (the existing `HILTWRIGHT_OFFSCREEN`, `HILTWRIGHT_W`, `HILTWRIGHT_H`, `HILTWRIGHT_SHOT` and `fake:` aids), so later changes can be checked the same way.

## Non-goals

- A new visual design, theme or font sizes.
- Windows smaller than the 1180×700 minimum.
- High-DPI and Windows display scaling beyond what the screenshots show at 100%. That gets one check at 150% by the owner, and its own change if it needs one.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-shell`: every page is usable at the default and minimum window sizes, and each size is checked by screenshots.

## Impact

`apps/desktop/src/renderer/src/styles.css` and the page components, mainly `Fonts.tsx` and `FontLibrary.tsx`. A screenshot script under `apps/desktop/scripts/`. No board needed: it uses the `fake:` connection with board access off. The owner checks the result on their own screen.
