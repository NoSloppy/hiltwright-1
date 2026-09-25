# Tasks

## 1. The rule, in core

- [x] 1.1 In `packages/core`, replace `SaberConfigModel.wiringConfirmedAt` with `wiringConfirmation?: { at: string; layout: string }`, and add `wiringFingerprint(board, blades)` (a key-order-independent content hash reusing `contentHash`) and `wiringConfirmed(model)` (design D1, D2, D4). Also add a helper that returns the model with a confirmation set or removed. Verify with a new `packages/core/test/wiring.test.ts` covering:
  - the same layout counts as confirmed
  - a changed data pin, pixel count or blade kind withdraws it
  - a changed board withdraws it
  - changing prop, buttons or presets keeps it
  - key order does not matter
  - a model with only the old `wiringConfirmedAt` is not confirmed
  - returning to the confirmed layout counts as confirmed again

  Run it with `npm run test:core`.
- [x] 1.2 Add `wiring: { board, blades }` to the firmware record that `generateConfig` returns, and to the `FirmwareManifest` type (design D3). Verify in `packages/core/test/generate.test.ts` that the manifest carries the model's board and blades, and that setting or removing a confirmation leaves the config text and hash unchanged.

## 2. Carry it through the app

- [x] 2.1 Make `draftModel` (`apps/desktop/src/renderer/src/saberModel.ts`) copy `wiringConfirmation` from the saved model (design D6). Verify with a new `apps/desktop/test/draftModel.test.ts`, which stubs `window.hiltwright` before importing, turning the FW1 reproduction into a test: a saved record with a confirmation gives a working model that is still confirmed.
- [x] 2.2 Keep `wiring` in the firmware record through the IPC validator (`apps/desktop/src/main/ipc.ts`, `library:update`): board V2 or V3, at most 16 blades, size-capped. Move the firmware cleaning into a function that can be tested. Verify with a unit test that a record with `wiring` keeps it, and that one with an oversized or malformed `wiring` is refused.

## 3. One rule on every page

- [x] 3.1 `Wiring.tsx`: decide "confirmed" with `wiringConfirmed`, and make the switch set or remove the confirmation (so it can be turned off on an installed saber). Show a one-line note when a saber confirmed or installed before this change needs confirming once (design D5). Verify in task 4.2.
- [x] 3.2 `Build.tsx`: gate Install and the "Confirm the wiring to unlock the install" block with `wiringConfirmed`. Its switch writes the new confirmation, and so does the build end-to-end development hook. Verify in task 4.2.
- [x] 3.3 `workspace.ts` (`flowStatus`, `nextStep`) and `App.tsx`'s step marks: use `wiringConfirmed`. Verify in task 4.2.
- [x] 3.4 Remove every other decision about wiring confirmation. Verify that `grep -rn "wiringConfirmedAt\|saber?.firmware &&\|!!saber?.firmware\|s?.firmware)" apps/desktop/src packages/core/src` finds no confirmation logic left outside `wiringConfirmed` (an explicit comment on the old field is allowed), and that `npm run typecheck` passes.

## 4. The real app, without a board

- [x] 4.1 Add a development-only `HILTWRIGHT_USER_DATA` override in `apps/desktop/src/main/index.ts` that sets the app's data folder before start-up and is ignored when the app is packaged (design D7). Verify by starting `npm run dev` with it pointing at an empty scratch folder: the Armory shows no sabers. Also verify by reading the code that `app.isPackaged` gates it.
- [x] 4.2 In that isolated app, with the installed toolchain:
  1. Plan a saber, describe two blades, and confirm the wiring.
  2. Restart the app: Wiring, the Armory rail and Build & Install all show it confirmed.
  3. Build it: Build & Install asks for nothing more about wiring.
  4. Change a blade's data pin: all three show it not confirmed. Change it back: all three show it confirmed again.
  5. Change the prop: it stays confirmed.
  6. Turn the switch off: all three show it not confirmed.

  Verify by recording the result of each step here, with screenshots or page dumps from the app.
  - **Result, 2026-09-24.** The real app ran offscreen on a scratch data folder (`HILTWRIGHT_USER_DATA`) with the spike toolchain. The pages were driven by script, reading the Wiring switch, the Armory rail and Build & Install's wiring note:

    | Step | Wiring switch | Armory rail | Build asks to confirm |
    |---|---|---|---|
    | Planned saber, before confirming | off | "2 blades, not confirmed yet", continue with Wiring | yes |
    | After clicking "I checked the wiring" | on | "2 blades, confirmed", continue with Presets | no |
    | After restarting the app | on | confirmed | no |
    | Crystal's data pin changed | off | not confirmed, continue with Wiring | yes |
    | Pin changed back | on | confirmed | no |
    | Prop changed to SA22C | on | confirmed | no |
    | Switch turned off | off | not confirmed | yes |
    | Only an old-style timestamp | off, "check it once more" note shown | not confirmed | yes |
    | One preset staged, confirmed, then built | on | confirmed, continue with Build & Install | no |

    - **The build.** The build ran for real: it compiled at 70% of V2. Afterwards, Build & Install showed no wiring block, and its only remaining hint was "Plug the saber in to install."
    - **Staging the preset.** A planned saber has no presets until a set is loaded, so one preset was staged the way Sets does.
    - **Your data.** The owner's real library was not written (`library.json` last written 2026-09-22).

## 5. Hardware check on the V2.2 (hote2)

- [x] 5.1 With hote2 connected (installed before this change): Wiring says it needs confirming once. Confirm it, build and install. Verify that the install succeeds and that the saber's firmware record now holds its board and blade layout.
  - **Result, 2026-09-24, owner, V2.2 hote2:** as expected. Wiring asked to confirm once, then the build and install succeeded.
- [x] 5.2 On hote2, change one blade's data pin in Wiring. Install is locked, and the Armory shows the wiring as not confirmed. Change it back. Verify that Install unlocks again without a new confirmation, then leave hote2's wiring as it was.
  - **Result, 2026-09-24, owner, V2.2 hote2:** as expected. Changing a data pin locked Install and the Armory showed "not confirmed"; changing it back unlocked Install. The owner noticed that Build stays available without a confirmation. That is by design: `firmware-build` says a build needs no confirmation, because building cannot touch the saber. Kept as is (design, Risks). Also seen: rebooting into the bootloader varies from an instant to 30 s or more, filed to `install-safety-nets`.
- [x] 5.3 The FW1 path on hardware:
  1. Put back hote2's pre-Hiltwright backup, so the board runs vendor firmware with no Hiltwright record.
  2. Plan a saber with hote2's wiring and adopt hote2 when it connects.
  3. Confirm, build and install.

  Verify that Install unlocks after the confirmation and the install succeeds. Record the evidence, and note that this also runs `baseline-board`'s adoption scenario (1.19).

  - **Result, 2026-09-24, owner, V2.2 hote2:**
    - Adoption onto a plan worked, and the install completed.
    - The real library (read through `\localhost\C$`, because the Claude app's package view redirects `AppData`) holds "hotetest" with its firmware record at 01:50:44 UTC, with `wiring` V2 and 3 blades, its confirmation, and staged presets cleared.
    - A concurrent second write to the library failed with ENOENT, filed to `library-integrity`.
    - The page showed that failure as "Stopped", with clipped text, filed to `install-safety-nets`.
    - Loading a set that named a deleted style threw, filed to `sets-safety`.
    - This also ran `baseline-board`'s adopt-on-connect scenario (1.19) on hardware.
## 6. Close

- [x] 6.1 Run `npm test` and `npm run typecheck`; verify both pass.
- [ ] 6.2 In `openspec/changes/beta-1-roadmap/tasks.md`, tick task 3.1 once this change is archived; verify the tick.
