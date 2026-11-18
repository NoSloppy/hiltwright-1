# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-firmware` (archived as `openspec/changes/archive/2026-09-24-baseline-firmware/`, design.md Findings table).

## Why

Nothing checks that the firmware being written matches the board it lands on. These gaps can each put the wrong firmware, or the wrong pin map, on a saber:
- The board type is never detected, so everything defaults to V2.
- With nothing connected, Install writes to whatever board is in its bootloader.
- A build stays installable after the model changes.
- With two boards plugged in, the first one wins.

## What Changes

- **FW3: Know the board.**
  - The board is known from the saber's bootloader (its flash size: 256 KB is a V2, 512 KB a V3) or from the firmware Hiltwright installed on it. Otherwise the owner is asked.
  - **Owner's decision, 2026-09-27:** when the board is not known, the Wiring page selects neither board, and building is refused until the owner chooses. Running firmware never reports its board (`version` has no board line, and the USB product name is "Proffieboard" on both), so there is nothing better to go on.
  - **Owner's decision, 2026-09-27 (during 5.3):** the Wiring page also offers "Check the board" for a connected saber whose board is not known. Hiltwright reboots the saber into its bootloader, reads the flash size, and returns it to its firmware, in about 5 seconds, with nothing written. The step was proven in 1.1. The owner can still choose instead.
  - An image is never written to a bootloader whose flash size does not match the build's board, or whose flash size is not one Hiltwright knows.
  - Putting a backup back is checked in the same way.
- **FW4: Know the saber.**
  - Install writes to a board already in its bootloader only in two cases:
    - Hiltwright recognises it as this saber by its USB serial number.
    - The owner says explicitly which saber it is.
  - A board recognised as a different saber is refused.
  - **Measured 2026-09-27 (task 1.1):** hote2 and the V3.9 each use the same serial in the bootloader as in their firmware.
  - The spike's V2 bootloader (`206033865232`) never had its running serial recorded. So Hiltwright also remembers the bootloader serial it sees when it reboots a saber itself.
- **FW5: A build goes stale when the setup changes.**
  - As soon as the setup a build was made from changes, Install offers only a fresh build.
  - The record stored after an install is the model that was actually built.
- **FW31: More than one board plugged in.**
  - **Owner's decision, 2026-09-27:** boards are told apart by USB serial number. Backup, write and restore go to this saber's bootloader only.
  - When Hiltwright cannot tell which board is this saber, it stops and says so rather than guessing.
- **BST-3** (from `board-side-test-coverage`, joins FW3): a new saber's first draft is always for V2, because `draftModel` guesses the board from the ProffieOS version string, which never names the board. A V3 owner's first build would target V2 unless they changed it. Pinned by the expected-failure test "a new saber whose config names a V3 board is drafted for V3" in `apps/desktop/test/draftModel.test.ts`.
- **HW-2026-09-25c** (seen during `library-integrity` 6.3, with the V2.2 hote2 and the V3.9 plugged in together):
  - **What happened:** after installing hote2, the app reconnected to the V3. The V3 was the first granted port, and the Web Serial connect event fired while hote2 was still coming back.
  - **Fix:** after an install, the reconnect asks for the installed saber's port by its USB serial. When it cannot, the page says which saber it reached.

## Non-goals

- Choosing among several connected boards for editing (F4, `board-side-polish`).
- Main refusing firmware that is not the current build (FW10), reading the version back after a write (FW12), and getting a board out of its bootloader after a failed backup (FW29). All three belong to `install-safety-nets`.
- Staged presets during an install (`safe-staged-install`).
- Boards other than the Proffieboard V2 and V3.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `firmware-install`: The target is checked in two ways: against the build's board (by flash size), and against the saber's identity (by USB serial). A stale build cannot be installed. With several boards plugged in, only this saber's board is written, and the reconnect reaches it.
- `firmware-build`: A build stays tied to the setup it was made from, and goes stale when that setup changes.
- `hardware-wiring`: The board is known from the saber, or asked for, never defaulted.

## Impact

- **Code:**
  - `apps/desktop/src/main/{flash,ipc,index,library}.ts`
  - `apps/desktop/src/shared/api.ts`
  - `apps/desktop/src/renderer/src/{Build.tsx,Wiring.tsx,installFlow.ts,saberModel.ts,board.ts}`
  - `packages/core/src/config/generate.ts`, where the model gains how its board is known
- **Hardware check on V2.2 hote2 and the V3.9:**
  - a V2 image refused on the V3 with nothing written
  - a stale build refused
  - a board in its bootloader recognised
  - with both plugged in, an install of hote2 writing hote2 and reconnecting to it
- **Unblocks** the deferred two-boards step in `v3-verification`.
