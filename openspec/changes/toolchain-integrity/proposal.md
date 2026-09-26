# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-firmware` (archived as `openspec/changes/archive/2026-09-24-baseline-firmware/`, design.md Findings table).

## Why

Every tester will run the toolchain setup. It downloads and runs executables with no hash check. The board-support core is unpinned, so testers can end up with different compilers and flashers than the ones Hiltwright was checked with. The setup cannot be cancelled or timed out.

## What Changes

- **FW11:**
  - Pin and verify every download: arduino-cli and the ProffieOS source by SHA-256, and the board-support core by version.
  - Read back the installed versions instead of assuming them.
  - Give downloads a timeout.
  - Let the setup be cancelled.
  - Never let two setups run at once.
- **FW32:** Create the toolchain folder only when the owner starts the setup, and check that the machine-wide folder is not writable by other standard users.
- **FW36:** Flag a toolchain that is already installed at a path that is too long.
- **FW28:** Correct the docs (path limit, disk footprint, driver helper, toolchain location).
- **HW-2026-09-25a** (seen on hote2 during `library-integrity` 6.3): files in the machine-wide folder that were written by a Hiltwright run with administrator rights (here `C:\ProgramData\Hiltwrightuilds53c5735a826\`, from the 2026-09-24 install, owned by Administrators) cannot be overwritten by a normal run. The next build fails with `EPERM: operation not permitted, open '…\hiltwright_hote2.h'`. The build output must stay writable by the owner whatever rights an earlier run had. For example: a per-user build folder, or repairing or replacing a build folder the app cannot write. Related to FW32.

## Non-goals

- macOS and Linux (`firmware-side-later`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `toolchain`: requirements for verified downloads, pinned versions, cancellation, and one setup at a time.

## Impact

`apps/desktop/src/main/{toolchain,ipc}.ts`, `apps/desktop/src/renderer/src/Build.tsx`, `apps/desktop/test/toolchain.test.ts`, docs 00 and 02. Verified by a fresh setup on a clean Windows PC.
