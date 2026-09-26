# Tasks

## 1. Pins, read-back, stalls and cancelling

- [ ] 1.1 Check the two hashes of design D1 against arduino-cli's published `1.3.1-checksums.txt` and a fresh download of the ProffieOS v8.10 archive. Then add `CLI_SHA256`, `PROFFIEOS_SHA256` and `CORE_VERSION` to `toolchain.ts`. Verify by recording both comparisons in the result.
- [ ] 1.2 Add `verifiedDownload`, the pinned `core install …@4.6`, the ProffieOS stamp, and `versions` in `toolchainStatus`, with `ready` requiring the pins (design D1, D2). Update `ToolchainStatus` in `shared/api.ts`. Verify with the unit tests of design D8 in `toolchainSetup.test.ts` and `npm test`.
- [ ] 1.3 Add the stall timeout and the abort signal to `download` and `run`, pass the signal through `installToolchain`, and add `setupOnce` (design D3). Verify with the unit tests of design D8.

## 2. The folder and the builds

- [ ] 2.1 Replace `defaultToolchainRoot` with `plannedToolchainRoot` (creates nothing) and `ensureToolchainRoot` (at setup), and add `lockFolder` and `folderOpenToOthers` (design D4). Report `open` in `toolchainStatus`. Verify with the unit test that planning creates nothing, and the Windows-only lock tests.
- [ ] 2.2 Add `buildRoot` to `buildFirmware`, defaulting to `%LOCALAPPDATA%\Hiltwright\b`, with the fallback of design D5 once the depth is measured in 3.1. Verify with `npm test`, and in 3.1 and 3.3.
- [ ] 2.3 In `ipc.ts`, add `toolchain:install` through `setupOnce`, `toolchain:cancel` and `toolchain:repair`. In `Build.tsx`, the panel shows:
  - the versions
  - Cancel while installing
  - the open-folder notice with Repair
  - the too-long notice when ready too (design D6)

  Update the FST-2 test to a normal test. Verify with `npm run typecheck`, and in 3.2.

## 3. Checks

- [ ] 3.1 Gated fresh setup (`HILTWRIGHT_INSTALL_TEST`, a temp folder), run by Claude. Verify that:
  - every download matches its pin, and the versions read back are 1.3.1, 4.6 and v8.10
  - a compile into a temp build root succeeds

  Record the deepest build path relative to the saber folder, and set the design D5 fallback threshold from it.
- [ ] 3.2 Owner check on their PC, from a development build. Verify that:
  - the panel flags `C:\ProgramData\Hiltwright` as changeable by other users
  - Repair asks for Windows approval, then the notice clears
  - `icacls C:\ProgramData\Hiltwright` shows `BUILTIN\Users:(OI)(CI)(RX)` with no write entry
  - the toolchain shows the three versions and "ProffieOS v8.10 ready", after the setup re-fetches the unstamped ProffieOS source
- [ ] 3.3 Hardware check on V2.2 hote2, by the owner, from a development build. Verify that Build & Install finishes "Installed", and that the build is under `%LOCALAPPDATA%\Hiltwright\b\<saber id>`.
- [ ] 3.4 Correct docs 00 and 02 (design D7). Verify by reading each changed line against the code.
- [ ] 3.5 Run `npm test` and `npm run typecheck`; verify both pass.
- [ ] 3.6 After archive, tick roadmap task 3.13 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
