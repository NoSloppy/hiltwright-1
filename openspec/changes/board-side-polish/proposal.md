# Proposal

**Milestone:** M4 (Beta 2). Triaged on 2026-09-24 from the findings of `baseline-board` (archived as `openspec/changes/archive/2026-09-24-baseline-board/`, design.md Findings table).

## Why

Low-severity findings from the board-side baseline. None blocks Beta 1, but each is visible to a careful tester.

## What Changes

- **F4:** Let the owner choose among several connected boards.
  - Seen again in `install-target-safety` 5.3 (2026-09-27, V2.2 hote2 and V3.9 plugged in together): the app opened hote2, and the owner could not switch to the V3 without unplugging hote2. Installs and the reconnect after them already target a board by USB serial (`install-target-safety` D6). Only choosing which board to work with is missing.
- **F19:** The Armory rail marks Fonts & SD done when the presets' fonts are on the card, and says so when everything is installed.
- **F20:** After unplugging, the working saber stays the one just unplugged.
- **F21:** The demo room uses the working saber.
- **F23:** Shortcut tooltips advertise only working shortcuts, and shortcuts do not fire inside text fields.
- **F24:** Settle the minimum window size and make the page-level scroll rule hold.
- **F40:** Remember an apply-after-retraction for each preset, not just the last one.
- **F42:** Two-line preset names can be edited without losing the line break.

## Non-goals

- Anything that blocks Beta 1.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-shell`, `saber-library`, `board-connection`, `preset-editing`: small requirement additions per item.

## Impact

Renderer pages and `workspace.ts`. Reviewed again after Beta 1 feedback.
