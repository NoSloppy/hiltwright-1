# Tasks

## 1. Seams (no change in behaviour)

- [ ] 1.1 Move the install and restore sequences from `Build.tsx` into `apps/desktop/src/renderer/src/installFlow.ts` (design D2): `writeFromBootloader`, `installSequence`, `restoreSequence` and `STOPPED_HINT`. `Build.tsx` becomes thin wrappers. Verify with `npm run typecheck`, and in 3.1 and 4.1.
- [ ] 1.2 Move the blade-count rule from `Hardware.tsx` into `hardwareModel.ts` as `withBladeCount(blades, n, board)`, and call it from `setCount` (design D5). Verify with `npm run typecheck`, and in 2.1.
- [ ] 1.3 Add `toolchainBlockers(status)` (design D4), use it in `installToolchain` and in the Build page's toolchain panel, and give `installToolchain` its optional `sys` (design D3). The texts on screen do not change. Verify with `npm run typecheck`, and in 2.2.
- [ ] 1.4 Give `installBootloaderDriver` its optional `sys`, with `launchElevated` holding today's PowerShell call (design D3). Verify with `npm run typecheck`, and in 3.2.

## 2. Tests: wiring, toolchain and config

- [ ] 2.1 In `hardware.test.ts`, add 1.3 (adding a crystal through `withBladeCount`) and 1.10 (free pins in `pinTable`). In `draftModel.test.ts`, add 1.4 (the first guess from 140, 2 and 1 pixels). Verify with `npm test`.
- [ ] 2.2 Create `toolchainSetup.test.ts`:
  - 2.3: the path is too long. The installer refuses with the length before any download. The panel's words are an expected failure (FST-2).
  - 2.4: low space refuses before any download.
  - 2.6: a failed ProffieOS download is retried alone and ends ready, and a further call downloads nothing.
  - `download` never leaves a partial file under the real name.

  Verify with `npm test`.
- [ ] 2.3 In `packages/core/test/generate.test.ts`, add 3.3: a V3 config includes `proffieboard_v3_config.h` and not the V2 file. Verify with `npm test`.

## 3. Tests: install and backups

- [ ] 3.1 Create `installFlow.test.ts`, with fake flash and board calls:
  - 5.5 (the backup fails and nothing is written)
  - 5.11 (the saber does not come back)
  - 5.13 (an unexpected error, with `STOPPED_HINT`)
  - a normal install

  Verify with `npm test`.
- [ ] 3.2 Create `driver.test.ts` for 5.9. A wrong size, or a right size with the wrong SHA-256, is deleted and never launched; a matching file is launched once. Verify with `npm test`.
- [ ] 3.3 In `backups.test.ts`, add 5.15:
  - An erased 256 KB image is listed as not valid, and `restoreBackup` refuses it.
  - A 100 KB image that starts like firmware is refused on restore.
  - The same 100 KB image is listed as not valid: an expected failure (FST-1).

  Verify with `npm test`.

## 4. Compile tests and checks

- [ ] 4.1 In `build.test.ts`, add the two FW20 compiles of design D5, gated on `HILTWRIGHT_TOOLCHAIN_DIR`. Run them against `C:\ProgramData\Hiltwright`, and verify that both compile and produce a `.dfu`. If one fails, split it to find the part, then file the finding (design D6).
- [ ] 4.2 File FST-1 in `install-safety-nets` and FST-2 in `toolchain-integrity`, plus any further findings, each naming its test (design D6). Verify by reading each proposal.
- [ ] 4.3 Run `npm test` and `npm run typecheck`; verify both pass.
- [ ] 4.4 Hardware check on V2.2 hote2, by the owner, from a development build on their own data (design D7). Verify that:
  - Build & Install finishes "Installed" with the backup's location
  - the Backups tab lists that backup as usable
- [ ] 4.5 After archive, tick roadmap task 3.11 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
