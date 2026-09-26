# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-firmware` (archived as `openspec/changes/archive/2026-09-24-baseline-firmware/`, design.md Findings table). This is Wave C task 3.13: a pinned, verified toolchain before builds are relied on.

## Why

Every tester will run the toolchain setup, and it has four problems:
- It downloads and runs executables with no hash check.
- The board-support core is unpinned, so testers can end up with different compilers and flashers than the ones Hiltwright was checked with.
- The setup cannot be cancelled, and a stalled download waits forever.
- Any standard Windows user on the computer can add files to the shared toolchain folder, where the compiler and `dfu-util` run from.

On the owner's PC, `C:\ProgramData\Hiltwright` inherits `BUILTIN\Users:(CI)(WD,AD,WEA,WA)` from ProgramData. Builds are written inside that shared folder too, which is why files left by a run with administrator rights blocked the next normal build (HW-2026-09-25a).

## What Changes

- **FW11:**
  - **Pinned and checked downloads:**
    - arduino-cli 1.3.1 and the ProffieOS v8.10 source are pinned by SHA-256.
    - The board-support core is pinned by version (`proffieboard:stm32l4@4.6`, the version on the owner's working install).
    - A download that does not match is deleted, never used, and the setup stops saying so.
  - **Versions read back:** the installed versions (arduino-cli, the core, and the ProffieOS source, recorded when it is unpacked) are read back and shown, not assumed. A toolchain whose versions differ from the pins is not "ready", and the setup puts the pinned versions in place.
  - **Stalls and cancelling:** a download that stalls times out, and the setup can be cancelled.
  - **One setup at a time:** a second start joins the one already running.
- **FW32:**
  - The toolchain folder is created only when the owner starts the setup, not when the app starts.
  - When the setup creates it, the folder is locked: administrators and the user running the setup can change it, and other users can only read and run it.
  - An existing folder that other users can change is flagged, with a **Repair** that locks it. This takes one Windows approval when the folder belongs to administrators, as it does on the owner's PC.
- **HW-2026-09-25a:** builds move out of the shared folder into a short folder of the Windows user's own (`%LOCALAPPDATA%\Hiltwright\b\<saber>`), so another run's rights can never block a build. The toolchain itself stays shared.
- **FW36:** a toolchain already installed at a path that is too long is flagged on the panel, not left to fail the build.
- **FST-2** (from `firmware-side-test-coverage`): the too-long notice gives the path's length and the reason, and no longer mentions a development switch. Its expected-failure test becomes a normal test.
- **FW28:** correct the docs on:
  - the path limit
  - the disk footprint
  - the driver helper
  - the toolchain location
  - the conflated 83% and 70% figures

## Non-goals

- macOS and Linux (`firmware-side-later`).
- Removing the old builds left in the shared folder. They are harmless, and the owner can delete them.
- Checking files already in the toolchain folder for tampering. The lock stops new changes; it does not audit old ones.
- Choosing a different toolchain folder from the app.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `toolchain`:
  - "One click installs the whole toolchain": pinned, checked and read-back versions.
  - "The toolchain lives in a short, shared folder":
    - created on setup
    - locked
    - flagged with Repair when open to other users
    - a too-long path flagged even when installed, with the length and no development switch
  - "A failed setup can be retried without starting over": stalled downloads time out, the setup can be cancelled, and only one setup runs at a time.
- `firmware-build`: "Firmware is built against the pinned ProffieOS for the saber's board", with builds in a folder of the Windows user's own.

## Impact

- **Main:**
  - `apps/desktop/src/main/toolchain.ts`: pins, verification, read-back, cancel, stall timeout, one setup at a time, creation on setup, the lock and Repair.
  - `build.ts`: the per-user build root.
  - `ipc.ts`: `toolchain:cancel` and `toolchain:repair`.
- **Shared:** `apps/desktop/src/shared/toolchainChecks.ts` and `api.ts`.
- **Renderer:** the Build page's toolchain panel in `Build.tsx`.
- **Tests:** `toolchainSetup.test.ts` and `toolchain.test.ts` (gated).
- **Docs:** 00 and 02.
- **Checks:**
  - A gated fresh setup from nothing into a temporary folder, which checks the pins against the real downloads.
  - An owner check of Repair on their PC.
  - A build and install on V2.2 hote2 from the per-user build folder.
