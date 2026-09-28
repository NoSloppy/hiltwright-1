# Tasks

## 1. Applying staged presets after the check

- [ ] 1.1 In `board.ts`, add `restartSaber()` (sends `reset` with `expectSilence`, then closes the port) and `currentPresets()` (design D2). Add both to `InstallDeps.board`. Verify with `npm run typecheck`, and in 3.3.
- [ ] 1.2 In `installFlow.ts` (design D1):
  - remove `clearPresets` before the reboot
  - keep `presetsFrom` in the record written at the write
  - add `applyStagedPresets`, called at the end of `writeFromBootloader` only after a matching check on this saber

  Verify in `apps/desktop/test/installFlow.test.ts`:
  - a staged install from running mode: no `del` before the reboot, then snapshot ("Before install with staged presets"), both `del`s, `restartSaber`, reconnect, read-back, and the model settled
  - the same from a board already in its bootloader
  - nothing touched when the install stops (a refused board, a failed backup, a failed write), when the check mismatches or reads nothing, or when another saber answers
  - still other presets after the restart: stays staged, with the note
  - the restart failing: stays staged
  - the record at the write keeps `presetsFrom`

## 2. The page

- [ ] 2.1 Add `firmwareHasStaged(model, firmware)`, and `waitingColours(model, firmware)` extracted from `usePendingLookColours` (design D3, D4). The hook uses `waitingColours`, which returns nothing while staged. Verify in a new `apps/desktop/test/staged.test.ts`:
  - `firmwareHasStaged`: the same names in order is true; other names, a missing firmware record, or nothing staged is false
  - `waitingColours` gives none while staged, and the same as before once settled
- [ ] 2.2 In `Build.tsx`:
  - the note before an install says the staged presets replace the saber's once the new firmware is on and checked
  - "Use the staged presets" shows when `firmwareHasStaged` and connected, and runs `applyStagedPresets`
  - `hiltwrightPretendInstall` handles a staged model, including a pretend saber that reports other presets

  Verify with `npm run typecheck`, and in 3.2.

## 3. Checks

- [ ] 3.1 Run `npm test` and `npm run typecheck`; verify both pass.
- [ ] 3.2 Development run with no board, on a scratch folder whose saber has a staged list. Verify that:
  - the Build note reads as in 2.2
  - `hiltwrightPretendInstall()` ends with "Your staged presets are on the saber now…"
  - with the pretend saber reporting other presets, the list stays staged with the amber note and the "Use the staged presets" button
- [ ] 3.3 Hardware check by the owner, from a development build:
  - **V2.2 hote2:** stage a set (or edit presets while unplugged), build, and install from running mode. The saber comes back with the staged presets, and Presets shows them as live. A "Before install with staged presets" snapshot is listed.
  - **V2.2 hote2 again,** with a staged list, installed from a board already in its bootloader (hold BOOT, tap RESET, release BOOT, then Install). Same result.
  - **V3.9, plugged in alone, on a fresh data folder:** stage a list, choose V2, confirm, build and install. The install is refused and the V3 comes back. Its presets (`list_presets`, or Presets after reconnecting) are unchanged, and the list is still staged.
- [ ] 3.4 After archive, tick roadmap task 3.18 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
