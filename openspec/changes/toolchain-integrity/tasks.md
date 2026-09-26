# Tasks

## 1. Pins, read-back, stalls and cancelling

- [x] 1.1 Check the two hashes of design D1 against arduino-cli's published `1.3.1-checksums.txt` and a fresh download of the ProffieOS v8.10 archive. Then add `CLI_SHA256`, `PROFFIEOS_SHA256` and `CORE_VERSION` to `toolchain.ts`. Verify by recording both comparisons in the result.
  - **Result, 2026-09-26.** Both match:
    - arduino-cli's published `1.3.1-checksums.txt` lists `cfece6f356fdc9ca003cc3f0a488470030719c8e0e7bfce5e42ac9410d87441f  arduino-cli_1.3.1_Windows_64bit.zip`, the owner's file.
    - A fresh download of `ProffieOS/archive/refs/tags/v8.10.zip` hashed `454f2374960ab517b087cb63b438688bc4b5f4b4f2458335afca398d34938dae` at 4,760,062 bytes, the owner's file.

    `CLI_SHA256` (keyed by asset; macOS and Linux unpinned, a non-goal), `PROFFIEOS_SHA256` and `CORE_VERSION = '4.6'` are in `toolchain.ts`.
- [x] 1.2 Add `verifiedDownload`, the pinned `core install …@4.6`, the ProffieOS stamp, and `versions` in `toolchainStatus`, with `ready` requiring the pins (design D1, D2). Update `ToolchainStatus` in `shared/api.ts`. Verify with the unit tests of design D8 in `toolchainSetup.test.ts` and `npm test`.
  - **Result, 2026-09-26.**
    - `verifiedDownload` hashes after downloading, and deletes and throws "The <part> download is not the file Hiltwright expects, so it was not used." on a mismatch.
    - The core installs as `proffieboard:stm32l4@4.6`, and `findDfuUtil` looks only in the pinned version.
    - A verified unpack writes `.hiltwright-source.json`.
    - `toolchainStatus` reports `versions`. `ready` requires the pinned cli, core and stamp, and a path that is not too long.
    - `ToolchainSys.expected` lets tests name their fake files (design D1, added).

    Tests pass: a mismatch is deleted, not unpacked, and names the part; the stamp and a 4.5 core drive `ready`, `dfuUtil` and `versions`.
- [x] 1.3 Add the stall timeout and the abort signal to `download` and `run`, pass the signal through `installToolchain`, and add `setupOnce` (design D3). Verify with the unit tests of design D8.
  - **Result, 2026-09-26.**
    - `download` takes `{ signal, stallMs = 60000 }`. The stall timer resets on each chunk, and on a stall or cancel the `.part` file is removed, so nothing stays under the real name.
    - `run` takes `signal` and kills the child.
    - `installToolchain` checks the signal between steps and passes it on.
    - `setupOnce` and `cancelSetup` keep one running setup.

    Tests pass: a stall after 150 ms; a cancel at 50 ms; joining and cancelling.

## 2. The folder and the builds

- [x] 2.1 Replace `defaultToolchainRoot` with `plannedToolchainRoot` (creates nothing) and `ensureToolchainRoot` (at setup), and add `lockFolder` and `folderOpenToOthers` (design D4). Report `open` in `toolchainStatus`. Verify with the unit test that planning creates nothing, and the Windows-only lock tests.
  - **Result, 2026-09-26.**
    - **Choosing and creating the folder:** `plannedToolchainRoot` creates nothing. `ensureToolchainRoot` creates the folder at setup and locks a newly created one.
    - **`lockFolder`:** icacls by SID (SYSTEM, Administrators, this account full; Users read and run; inheritance removed). With `elevate` it retries through `Start-Process -Verb RunAs`.
    - **`folderOpenToOthers`:** `Get-Acl` translated to SIDs, flagging Users, Authenticated Users or Everyone with any write, create, delete or permission right.
    - **`toolchainStatus`** reports `open`.

    Tests pass: planning creates nothing. On Windows, a real temp folder granted `Users:(OI)(CI)M` reads open, and `lockFolder(dir, false)` makes it closed, still writable by this account, with nothing inherited.
- [x] 2.2 Add `buildRoot` to `buildFirmware`, defaulting to `%LOCALAPPDATA%\Hiltwright\b`, with the fallback of design D5 once the depth is measured in 3.1. Verify with `npm test`, and in 3.1 and 3.3.
  - **Result, 2026-09-26.**
    - `buildFirmware` takes `buildRoot`, defaulting to `userBuildRoot()` = `%LOCALAPPDATA%\Hiltwright\b`.
    - If that path is longer than `BUILD_ROOT_MAX` = 150 (set from 3.1's 58-character depth), it falls back to `%SystemDrive%\HiltwrightB\<8 hex of the user name's SHA-256>`, created and locked by `ensureBuildRoot`.
    - `ToolchainPaths.buildRoot` is gone.
    - The install guard in `ipc.ts` (`flash:write`) now accepts only firmware under `userBuildRoot()`.
- [x] 2.3 In `ipc.ts`, add `toolchain:install` through `setupOnce`, `toolchain:cancel` and `toolchain:repair`. In `Build.tsx`, the panel shows:
  - the versions
  - Cancel while installing
  - the open-folder notice with Repair
  - the too-long notice when ready too (design D6)

  Update the FST-2 test to a normal test. Verify with `npm run typecheck`, and in 3.2.
  - **Result, 2026-09-26.**
    - **`ipc.ts`:** `toolchain:install` runs through `setupOnce`, creating the folder with `ensureToolchainRoot` first; `toolchain:cancel` and `toolchain:repair` (`lockFolder(root, true)`, returning the fresh status) are new.
    - **The panel:**
      - the three versions when ready
      - the open-folder notice with Repair, shown ready or not
      - Cancel while installing
      - "about 1.9 GB" on disk: measured in 3.1 (the constant `INSTALL_DISK_BYTES` too)
    - **FST-2:** the too-long sentence gives the length and the reason, and its test is now a normal `it`.

    The type check is clean. A no-board development run of Build on the owner's real folder showed:
    - `versions` 1.3.1 / 4.6 / "unknown (not from a checked download)" and `open: true`
    - the notice "Other Windows users on this computer could change the compiler Hiltwright uses, in C:\ProgramData\Hiltwright…" with Repair
    - the setup offered, because the source is unstamped

    **Noticed, not changed:** for a toolchain that only needs the source re-checked, the panel still says "Download about 360 MB", though only 4.7 MB is needed.

## 3. Checks

- [x] 3.1 Gated fresh setup (`HILTWRIGHT_INSTALL_TEST`, a temp folder), run by Claude. Verify that:
  - every download matches its pin, and the versions read back are 1.3.1, 4.6 and v8.10
  - a compile into a temp build root succeeds

  Record the deepest build path relative to the saber folder, and set the design D5 fallback threshold from it.
  - **Result, 2026-09-26.** It ran into `C:\hwt-fresh`, because the temp folder's path is too long for the compiler; the owner is asked to remove it, since the agent's tools may not delete under `C:\`.
    - **The downloads:** `arduino-cli sha256 cfece6f3…` and `ProffieOS source sha256 454f2374…`, both matching; "toolchain ready" after 33 s.
    - **The versions** read back `{ cli: '1.3.1', core: '4.6', proffieOS: 'v8.10' }`.
    - **The build:** a V2 build into a temp build root compiled in 18.2 s at 70% of flash. 53 s in total.
    - **The deepest build path** below the saber folder is 58 characters (`build\sketch\config\proffieboard_v2_verification_config2.h`), so the fallback threshold is 150.
    - **The footprint** is 1.88 GB, including 362 MB of archives kept. The "1.7 GB" in the panel and the space check became 1.9 GB.
- [ ] 3.2 Owner check on their PC, from a development build. Verify that:
  - the panel flags `C:\ProgramData\Hiltwright` as changeable by other users
  - Repair asks for Windows approval, then the notice clears
  - `icacls C:\ProgramData\Hiltwright` shows `BUILTIN\Users:(OI)(CI)(RX)` with no write entry
  - the toolchain shows the three versions and "ProffieOS v8.10 ready", after the setup re-fetches the unstamped ProffieOS source
- [ ] 3.3 Hardware check on V2.2 hote2, by the owner, from a development build. Verify that Build & Install finishes "Installed", and that the build is under `%LOCALAPPDATA%\Hiltwright\b\<saber id>`.
- [x] 3.4 Correct docs 00 and 02 (design D7). Verify by reading each changed line against the code.
  - **Result, 2026-09-26.** Each changed line was read back.
    - **Doc 00:**
      - The 2026-09-13 note's toolchain folder is repaired: an earlier escape had turned `\toolchain` into a TAB. It is now marked superseded, with the 40-character limit, `%ProgramData%\Hiltwright` and its fallbacks, the lock, and per-user builds.
      - The footprint is re-measured (1.9 GB), and the "1.6 GB toolchain cache" becomes "about 1.9 GB".
      - 83% and 70% are stated as two builds (starter looks on Fett263, and SA22C at the first flash).
      - The libwdi driver decision is marked superseded by ProffieOS's `proffie-dfu-setup.exe`, checked and launched elevated.
    - **Doc 02:** the same TAB is repaired, the 120 limit is marked superseded, and the footprint is re-measured.

    Line 42's "1.6 GB" is the compiler package's own size and stays.
- [x] 3.5 Run `npm test` and `npm run typecheck`; verify both pass.
  - **Result, 2026-09-26.** 184 core and 261 desktop tests pass (9 gated skipped), and the type check is clean in both workspaces.
- [ ] 3.6 After archive, tick roadmap task 3.13 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
