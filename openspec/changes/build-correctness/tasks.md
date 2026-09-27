# Tasks

## 1. The config

- [ ] 1.1 In `generate.ts`, add `commentSafe` and use it at the three comment sites (design D2). Add the FW15 test to `generate.test.ts`. Verify with `npm test` in `packages/core`.
- [ ] 1.2 Return `slotLines` from `generateConfig` (design D3), with a test that each entry points at its slot's style code. Verify with `npm test`.

## 2. The build

- [ ] 2.1 In `build.ts`:
  - `FLASH_BYTES.V3 = 507904`
  - the capacity from arduino-cli's `max_size`, stored with the cached result (design D1)
  - model errors returned before any write, and every write path checked to be under `saberDir` (design D5)

  Add the tests of design D7. Verify with `npm test`.
- [ ] 2.2 Extend `translateErrors` to take the config file, `slotLines` and preset names, and to name the preset, blade and style (design D3). Test every pattern. Verify with `npm test`.
- [ ] 2.3 Add `propRuleProblems` and run it before compiling, reading the installed prop file (design D4). Add its tests. Verify with `npm test`, and with the real prop text when the toolchain is present.
- [ ] 2.4 In `Build.tsx`, a thrown build ends as failed with the reason and Save diagnostics (design D6). Verify with `npm run typecheck`, and in 3.2.

## 3. Checks

- [ ] 3.1 Gated compiles against `C:\ProgramData\Hiltwright` (design D7), run by Claude. Verify that:
  - the V2 model with the FW15 names compiles
  - the V3 build reports 507,904 and the matching percentage
  - a deliberately broken pasted style fails, naming its preset, blade and style
- [ ] 3.2 Development run with no board, on a scratch folder, with the build root made unwritable. Verify that Build ends "Stopped" with the reason and Save diagnostics, and the timer stops.
- [ ] 3.3 Hardware check on V2.2 hote2, by the owner, from a development build. Verify that Build & Install finishes "Installed" and the saber reports `v8.10 hiltwright <sha>`.
- [ ] 3.4 Run `npm test` and `npm run typecheck`; verify both pass.
- [ ] 3.5 After archive, tick roadmap task 3.14 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
