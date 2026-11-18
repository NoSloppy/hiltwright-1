# Proposal

**Milestone:** M4 (Beta 2). Triaged on 2026-09-24 from the findings of `baseline-showroom` (archived as `openspec/changes/archive/2026-09-24-baseline-showroom/`, design.md Findings table).

## Why

Low-severity findings from the showroom baseline. None blocks Beta 1.

## What Changes

- **SR7:** The "Point the blade" sliders no longer change the saved control mode.
- **SR8:** Double-clicking to retract does not fire blaster bolts.
- **SR14:** Support `.gltf` with its separate files, and Draco or meshopt compression, or explain their absence. (A real GLB check is in `hardware-verification-v2`.)
- **SR15:** Correct the staff tooltip, the hilt-size comment and the plan's wording.
- **SR16:** Twist turns freely; clicking the staff blade lands a blast; the Scene reset is scoped to what it says.
- **SR20:** Keep pack item names and font configs out of the readable header where they are not needed.
- **SR23:** Offer "copy to card" for pack fonts that allow it, or drop the flag.
- **SR25:** Find a preset's font only among packs that allow playback.
- **SR27:** Cap memory for pack fonts as for other fonts.
- **SR28:** Show the owner where to put packs.
- **SR29:** Read only pack headers to list them, and notice changed packs.
- **SR30:** The built-in hilt cannot be replaced by a pack with the same identity.
- **SR31:** Fix the packing tool's help, write safely, and validate `--finish` and `--fit`.
- **SR37:** Show one spelling of a contributor's name everywhere.
- **SR38:** Validate names and links before trimming them.
- **SR40:** Check logo files' contents as well as their extension.

## Non-goals

- Anything that blocks Beta 1.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `demo-room`, `hwpack`, `contributors`: small requirement additions per item.

## Impact

Demo room, pack loader and tool, and contributors store, plus docs.
