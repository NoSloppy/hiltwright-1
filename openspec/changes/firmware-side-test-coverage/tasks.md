# Tasks

## 1. Seams (no change in behaviour)

- [x] 1.1 Move the install and restore sequences from `Build.tsx` into `apps/desktop/src/renderer/src/installFlow.ts` (design D2): `writeFromBootloader`, `installSequence`, `restoreSequence` and `STOPPED_HINT`. `Build.tsx` becomes thin wrappers. Verify with `npm run typecheck`, and in 3.1 and 4.1.
  - **Result, 2026-09-26.** `installFlow.ts` holds `writeFromBootloader`, `installSequence`, `restoreSequence` and `STOPPED_HINT`, with each body moved verbatim apart from the substitutions in design D2. `Build.tsx` keeps thin `useCallback` wrappers: `flowDeps()` builds the real calls and applies each report to the page's state, and the stopped hint renders `STOPPED_HINT`. `deps.board` is described in `installFlow.ts` itself (design D2, added). The type check is clean. The Build page renders in a no-board development run. The install itself is checked by 3.1 and the owner's 4.4.
- [x] 1.2 Move the blade-count rule from `Hardware.tsx` into `hardwareModel.ts` as `withBladeCount(blades, n, board)`, and call it from `setCount` (design D5). Verify with `npm run typecheck`, and in 2.1.
  - **Result, 2026-09-26.** `withBladeCount(blades, n, board)` in `hardwareModel.ts` returns the new list, or null when `n` is out of range. `setCount` in `Hardware.tsx` calls it and opens the new card only when the count grew, as before. The type check is clean. The Wiring page renders.
- [x] 1.3 Add `toolchainBlockers(status)` (design D4), use it in `installToolchain` and in the Build page's toolchain panel, and give `installToolchain` its optional `sys` (design D3). The texts on screen do not change. Verify with `npm run typecheck`, and in 2.2.
  - **Result, 2026-09-26.** `toolchainBlockers(status)` returns `{ error, panel }` for each blocker, with today's texts. It lives in `shared/toolchainChecks.ts` with `MAX_ROOT_LENGTH` and `INSTALL_DISK_*`, which `toolchain.ts` re-exports. `installToolchain` throws `.error`. The Build panel shows `.panel` and disables its button when either is set, which replaces its duplicate `2.5 * 1073741824`. `installToolchain(root, onLine, sys?)` takes `{ run, download, extract, status }`, defaulting to the real calls. The type check is clean.
- [x] 1.4 Give `installBootloaderDriver` its optional `sys`, with `launchElevated` holding today's PowerShell call (design D3). Verify with `npm run typecheck`, and in 3.2.
  - **Result, 2026-09-26.** `installBootloaderDriver(dir, onLine, sys?)` takes `{ platform, usbState, download, launchElevated, waitFor, expected? }`. `launchElevated` holds the PowerShell `Start-Process -Verb RunAs` call unchanged. `expected` defaults to the published size and pinned SHA-256 (design D3, added). `ipc.ts` passes nothing. The type check is clean.

## 2. Tests: wiring, toolchain and config

- [x] 2.1 In `hardware.test.ts`, add 1.3 (adding a crystal through `withBladeCount`) and 1.10 (free pins in `pinTable`). In `draftModel.test.ts`, add 1.4 (the first guess from 140, 2 and 1 pixels). Verify with `npm test`.
  - **Result, 2026-09-26.** All pass:
    - 1.3: 1 to 2 adds `b2`, a crystal on `blade2Pin` and `bladePowerPin1`. 3 adds an accent, 1 drops back, and 0 or 9 give null.
    - 1.10: every V2 data pin but `bladePin` has no users, and `bladePowerPin1` and `bladePowerPin4` are unused.
    - 1.4: a connected saber reporting 140, 2 and 1 drafts three pixel blades of those lengths, as main, crystal and accent on three data pins.
- [x] 2.2 Create `toolchainSetup.test.ts`:
  - 2.3: the path is too long. The installer refuses with the length before any download. The panel's words are an expected failure (FST-2).
  - 2.4: low space refuses before any download.
  - 2.6: a failed ProffieOS download is retried alone and ends ready, and a further call downloads nothing.
  - `download` never leaves a partial file under the real name.

  Verify with `npm test`.
  - **Result, 2026-09-26.** Five tests pass, the FST-2 expected failure among them:
    - 2.3 refuses with "(60 characters, at most 40)" and no download.
    - 2.4 refuses with "Not enough free space: 1.0 GB free" and no download. A finished toolchain is not blocked.
    - 2.6 fails on the first ProffieOS download, leaves no `ProffieOS` folder, and the retry downloads ProffieOS alone and ends ready without running arduino-cli. A third call downloads nothing.
    - `download`, with the stream failing after 500 of 1000 bytes, leaves no file under the real name. A later full download leaves only that file.
- [x] 2.3 In `packages/core/test/generate.test.ts`, add 3.3: a V3 config includes `proffieboard_v3_config.h` and not the V2 file. Verify with `npm test`.
  - **Result, 2026-09-26.** The test passes (179 core tests).

## 3. Tests: install and backups

- [x] 3.1 Create `installFlow.test.ts`, with fake flash and board calls:
  - 5.5 (the backup fails and nothing is written)
  - 5.11 (the saber does not come back)
  - 5.13 (an unexpected error, with `STOPPED_HINT`)
  - a normal install

  Verify with `npm test`.
  - **Result, 2026-09-26.** Four tests pass:
    - **A normal install** calls usb, reboot, waitForBootloader, backup, write, waitForRuntime, connect and updateSaber, in that order, and ends at "Installed. Backup of the previous firmware: …", expecting `config/hiltwright_hote2.h`.
    - **5.5** stops with "Backup failed, so nothing was written." and never writes.
    - **5.11** ends with the amber "written but … not reappeared yet. Unplug and replug it, then press Connect." It neither reconnects nor updates the record (FW9 changes the latter).
    - **5.13** ends at `failed` with "Error: dfu-util crashed", and `STOPPED_HINT` names BOOT/RESET and the Backups tab.
- [x] 3.2 Create `driver.test.ts` for 5.9. A wrong size, or a right size with the wrong SHA-256, is deleted and never launched; a matching file is launched once. Verify with `npm test`.
  - **Result, 2026-09-26.** Three tests pass:
    - A 1000-byte download is deleted and never launched.
    - A right-size file of zeros already on disk is not downloaded again, fails the SHA-256 check, and is deleted and never launched. Both give "not the file Hiltwright expects".
    - With `expected` naming that file, it is launched once and the result is "Driver installed. The bootloader is ready."
- [x] 3.3 In `backups.test.ts`, add 5.15:
  - An erased 256 KB image is listed as not valid, and `restoreBackup` refuses it.
  - A 100 KB image that starts like firmware is refused on restore.
  - The same 100 KB image is listed as not valid: an expected failure (FST-1).

  Verify with `npm test`.
  - **Result, 2026-09-26.** Four tests pass in the file, the FST-1 expected failure among them. An all-`0xFF` 256 KB image is listed as not valid, and restoring it is refused with "does not look like firmware". A 100 KB image that starts like firmware is refused with "not a full flash backup".

## 4. Compile tests and checks

- [x] 4.1 In `build.test.ts`, add the two FW20 compiles of design D5, gated on `HILTWRIGHT_TOOLCHAIN_DIR`. Run them against `C:\ProgramData\Hiltwright`, and verify that both compile and produce a `.dfu`. If one fails, split it to find the part, then file the finding (design D6).
  - **Result, 2026-09-26.** Both compile and produce a `.dfu`:
    - `hiltwright_fw20_v2` (GRBW main blade, chained crystal, single LED, star LED on LED 4 to 6, 3 buttons, `FETT263_TWIST_OFF` and `FETT263_TWIST_ON`): 21.7 s, 87% of 262144.
    - `hiltwright_fw20_v3` (sa22c, RGBW main blade, chained sub-blade, motor): 15.9 s, 36% of 524288.

    This confirms that `Color8::GRBW` and `Color8::RGBW` compile. An ungated test also checks that both models pass `validateModel` and that no simple blade shares a pin. **Found while writing the model:** FST-3 (design D5, added).
- [x] 4.2 File FST-1 in `install-safety-nets` and FST-2 in `toolchain-integrity`, plus any further findings, each naming its test (design D6). Verify by reading each proposal.
  - **Result, 2026-09-26.** Filed, each naming its expected-failure test, before Non-goals:
    - FST-1 in `install-safety-nets` (beside FW7)
    - FST-2 in `toolchain-integrity` (beside FW36)
    - FST-3 in `wiring-validation` (beside FW6)
- [x] 4.3 Run `npm test` and `npm run typecheck`; verify both pass.
  - **Result, 2026-09-26.** 179 core and 246 desktop tests pass, including the 3 expected failures (FST-1 to FST-3). 9 gated tests are skipped, 2 of them the new FW20 compiles run in 4.1, and the type check is clean in both workspaces. The first type check failed because `installFlow.ts` imported the `Board` type; fixed as design D2 records.
- [ ] 4.4 Hardware check on V2.2 hote2, by the owner, from a development build on their own data (design D7). Verify that:
  - Build & Install finishes "Installed" with the backup's location
  - the Backups tab lists that backup as usable
- [ ] 4.5 After archive, tick roadmap task 3.11 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
