# Tasks

## 1. Applying staged presets after the check

- [x] 1.1 In `board.ts`, add `restartSaber()` (sends `reset` with `expectSilence`, then closes the port) and `currentPresets()` (design D2). Add both to `InstallDeps.board`. Verify with `npm run typecheck`, and in 3.3.
  - **Result, 2026-09-27.** `board.ts`:
    - `restartSaber()` sends `reset` with `expectSilence`, then closes the port and sets the status to idle, as `rebootToBootloader` does.
    - `currentPresets()` returns the presets last read. `identify` now sets `infoRef` straight away, so a read-back after a reconnect is current.

    Both are in `InstallDeps.board`, and the pretend board has them too. The type check is clean. See 3.3.
- [x] 1.2 In `installFlow.ts` (design D1):
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
  - **Result, 2026-09-27.** `installFlow.ts`:
    - **Before the reboot:** `clearPresets` is gone, and nothing is removed.
    - **At the write:** the record keeps `presetsFrom`.
    - **At the end of `writeFromBootloader`:**
      - a matching check on this saber shows "Putting your staged presets on the saber: it restarts once more.", then runs `applyStagedPresets`
      - otherwise the note is "The install could not be checked, so the saber keeps its own presets for now. …"
    - **`applyStagedPresets(deps, saber, model, serial)`:** snapshot ("Before install with staged presets"), `del presets.ini`, `del presets.tmp`, `restartSaber`, a wait, the hold on other boards, the runtime wait, reconnect, then `samePresets` (names and fonts in order). Only a match settles the model, with the note "Your staged presets are on the saber now; its previous presets are kept as a snapshot."; anything else stays staged, with an amber note naming what happened.

    Verified by eight new tests in `apps/desktop/test/installFlow.test.ts` (61 in the file, all passing):
    - from running mode, with no `del` before the write and the steps in order
    - the record staged at the write, then settled
    - from the bootloader
    - untouched after a refused board, a failed backup, or a failed write
    - untouched after a mismatch, no reading, or another saber
    - still its own presets
    - the restart failing
    - applied later with no install
    - `samePresets`

## 2. The page

- [x] 2.1 Add `firmwareHasStaged(model, firmware)`, and `waitingColours(model, firmware)` extracted from `usePendingLookColours` (design D3, D4). The hook uses `waitingColours`, which returns nothing while staged. Verify in a new `apps/desktop/test/staged.test.ts`:
  - `firmwareHasStaged`: the same names in order is true; other names, a missing firmware record, or nothing staged is false
  - `waitingColours` gives none while staged, and the same as before once settled
  - **Result, 2026-09-27.**
    - **`waitingColours(model, firmware)`** was extracted into `pendingColours.ts`, and gives none while `presetsFrom` is set. The hook uses it.
    - **`firmwareHasStaged(model, firmware)`** is in `saberModel.ts`: the same preset names in the same order.
    - **Type checking:** the new `apps/desktop/test/staged.test.ts` is checked with the renderer config, like `draftModel.test.ts`, because it reaches browser modules.

    Verified by four tests: true for the same names; false for another order, fewer, no firmware, or nothing staged; no colours while staged; colours once settled.
- [x] 2.2 In `Build.tsx`:
  - the note before an install says the staged presets replace the saber's once the new firmware is on and checked
  - "Use the staged presets" shows when `firmwareHasStaged` and connected, and runs `applyStagedPresets`
  - `hiltwrightPretendInstall` handles a staged model, including a pretend saber that reports other presets

  Verify with `npm run typecheck`, and in 3.2.
  - **Result, 2026-09-27.** `Build.tsx`:
    - **Before an install,** the staged note reads "The staged presets replace the N on the saber once the new firmware is on and checked; a snapshot is kept first."
    - **When the firmware carries the staged presets,** the note reads "This saber's firmware has your staged presets, but the saber still uses its own…", with "Use the staged presets" when connected. The button runs `applyStagedPresets` and shows its note.
    - **`hiltwrightPretendInstall`:** its pretend board restarts, and after that reports the staged presets, or the saber's own with `'own'`.

    The type check is clean. See 3.2.

## 3. Checks

- [x] 3.1 Run `npm test` and `npm run typecheck`; verify both pass.
  - **Result, 2026-09-27.** From the repository root: `npm test` passes 204 core tests and 369 desktop tests (13 gated skipped), and `npm run typecheck` is clean in both workspaces.
- [x] 3.2 Development run with no board, on a scratch folder whose saber has a staged list. Verify that:
  - the Build note reads as in 2.2
  - `hiltwrightPretendInstall()` ends with "Your staged presets are on the saber now…"
  - with the pretend saber reporting other presets, the list stays staged with the amber note and the "Use the staged presets" button
  - **Result, 2026-09-27.** Scratch folder with hote2 staged (Set A: Mara Jade, Valkyrie), no board, `fake:build`:
    - **Before:** "The staged presets replace the 13 on the saber once the new firmware is on and checked; a snapshot is kept first."
    - **`hiltwrightPretendInstall()`:** the notes end with "Your staged presets are on the saber now; its previous presets are kept as a snapshot."
    - **`hiltwrightPretendInstall('own')`:** the notes end with "The saber still reports its own presets after its restart. Your staged presets are still waiting; press "Use the staged presets" on Build & Install to try again."
    - **With the firmware record carrying Mara Jade and Valkyrie:** "This saber's firmware has your staged presets, but the saber still uses its own. Putting them on restarts the saber once; a snapshot of its own is kept first.", with the "Use the staged presets" button enabled.
- [x] 3.3 Hardware check by the owner, from a development build:
  - **V2.2 hote2:** stage a set (or edit presets while unplugged), build, and install from running mode. The saber comes back with the staged presets, and Presets shows them as live. A "Before install with staged presets" snapshot is listed.
  - **V2.2 hote2 again,** with a staged list, installed from a board already in its bootloader (hold BOOT, tap RESET, release BOOT, then Install). Same result.
  - **V3.9, plugged in alone, on a fresh data folder:** stage a list, choose V2, confirm, build and install. The install is refused and the V3 comes back. Its presets (`list_presets`, or Presets after reconnecting) are unchanged, and the list is still staged.
  - **Result, 2026-09-28 (owner).** All three passed:
    - **hote2's staged install from running mode:** it came back with the staged presets, shown as live, with a "Before install with staged presets" snapshot.
    - **The same from hote2's bootloader:** the same result.
    - **The V3 alone, on a fresh data folder:** the V2 build was refused and the V3 came back on its own, with its presets unchanged and the list still staged.
- [x] 3.4 After archive, tick roadmap task 3.18 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
  - **Result, 2026-09-28.** Archived to `openspec/changes/archive/2026-09-28-safe-staged-install`, with the specs synced (1 requirement in `preset-editing` replaced). Roadmap task 3.18 is ticked, and Wave C is complete.
