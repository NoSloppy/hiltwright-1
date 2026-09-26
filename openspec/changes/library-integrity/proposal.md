# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-board` (archived as `openspec/changes/archive/2026-09-24-baseline-board/`, design.md Findings table). This is Wave B task 3.6. It builds the shared safe store (roadmap design D8) that 3.7–3.9 reuse.

## Why

The saber library is the owner's record of every saber: its build model, its firmware record, and the key to its snapshots and backups. Several paths can lose or misfile that record:
- a file that fails to read is later overwritten
- two writes at once collide
- a reflash with two boards plugged in makes a duplicate, and the install's record can land on it
- adoption silently replaces a model the owner already made

Installers, who are Beta 1 testers, are the most likely to have several boards plugged in.

## What Changes

- **Shared safe store** (roadmap design D8). One way to keep a JSON file, used by the saber library and the preset sets now, and by the font library, styles and contributors in 3.7–3.9:
  - Writes are queued, each through its own temporary file.
  - The previous good file is kept as a backup.
  - A file that cannot be read, or holds records of the wrong shape, is set aside under a new name and never overwritten. The app starts from the last good copy if there is one, otherwise from the records it could read.
  - The owner is told on the Armory, with the name the damaged file was kept under.
- **F14:** the saber library uses the safe store. An unreadable library is never overwritten.
- **HW-2026-09-24a:** two library writes at the same moment both land. This fixes the `library.json.<pid>.tmp` rename error seen on hote2.
- **BST-1:** records of the wrong shape no longer make the library throw. Its expected-failure test becomes a normal test.
- **The preset-sets store** uses the safe store too. It has the same flaw and was never flagged.
- **F15:** a reflash no longer duplicates a saber when two boards are plugged in (no USB serial). The saber being installed is expected back: a board reconnecting after that install, reporting the config it wrote, is matched to it. The install's firmware record is written to the saber that was installed, not to whichever record the reconnecting board matched.
- **F16 and FW26:** adoption asks the owner to confirm before it replaces anything. It warns when the connected saber already has a build model in Hiltwright, which adopting would replace. It also says that the next install replaces the styles compiled into the saber's current firmware, and that the presets on its card will be the plan's.
- **F17:** "New saber" while a saber is plugged in creates the plan, lists it, and says that the plugged-in saber stays the one being worked on until it is unplugged. The owner decided this on 2026-09-25, rather than switching to the plan.

## Non-goals

- Choosing among several connected boards (F4, `board-side-polish`), and knowing the board or refusing the wrong one (FW3/FW31, `install-target-safety`).
- Pruning snapshots and backups, or removing real sabers (F22, `board-side-later`).
- Which saber the demo room shows (F21, `board-side-polish`).
- Moving the font library, styles and contributors onto the safe store (3.7–3.9).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `saber-library`:
  - the store keeps a damaged file and tells the owner
  - a board reconnecting after an install is matched to the saber installed
  - the firmware record goes to the saber installed
  - "New saber" while plugged in explains itself
  - adoption confirms before replacing a model or compiled styles
- `preset-editing`: saved preset sets survive a damaged file.

## Impact

- **Main:** `apps/desktop/src/main/` gains a new `jsonStore.ts`. `library.ts`, `banksStore.ts` and `ipc.ts` change.
- **Renderer:** `apps/desktop/src/renderer/src/`: `board.ts`, `Build.tsx` and `App.tsx` change.
- **Tests:** `jsonStore.test.ts` is new, and `library.test.ts` gains more cases.
- **Hardware check:** V2.2 hote2 and V3 plugged in together, with an install on hote2 run by the owner.
