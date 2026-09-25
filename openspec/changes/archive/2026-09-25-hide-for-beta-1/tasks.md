# Tasks

## 1. The switches

- [x] 1.1 Add `apps/desktop/src/renderer/src/features.ts` with `FEATURES = { bladeId: false, xenopixelImport: false }` and a comment naming what turns each on (design D1). Add `apps/desktop/test/features.test.ts` asserting both are off (design D4). Verify with `npm test`.
  - **Result, 2026-09-25.** `features.ts` is added with both switches off. `features.test.ts` passes, and it fails while a switch is on (see task 3.2).

## 2. Hiding

- [x] 2.1 In `Wiring.tsx`, pass the `swap` prop to `HardwareEditor` only when `FEATURES.bladeId` is on (design D2). Verify in task 3.1: Wiring shows no "Do you swap blades on this saber?" and no Measure button for a pixel main blade.
  - **Result, 2026-09-25.** `Wiring.tsx` passes `swap` only when `FEATURES.bladeId` is on. `Hardware.tsx` is unchanged. Checked in tasks 3.1 and 3.2.
- [x] 2.2 In `Fonts.tsx`, render `<XenoImport>` only when `FEATURES.xenopixelImport` is on (design D2). Verify in task 3.1: Fonts & SD has no Xenopixel panel, and a screenshot shows the right-hand column laid out without a gap.
  - **Result, 2026-09-25.** `Fonts.tsx` renders `<XenoImport>` only when `FEATURES.xenopixelImport` is on. The screenshot with the switch off shows Add a font and then Tracks, with no gap.

## 3. Checks

- [x] 3.1 Development run with no board (harness default), on a scratch folder with a planned saber whose main blade is a pixel strip. Dump Wiring and Fonts & SD, and take a screenshot of Fonts & SD. Verify that neither feature appears and the layout holds.
  - **Result, 2026-09-25.** Scratch folder with a planned saber ("Hide test", one 132-pixel main blade), no board. The check opens the main blade's card on Wiring, since the swap question lives inside it. The first version of the check missed that, so it proved nothing until it was fixed. Result: no swap question and no Measure button. Fonts & SD shows no Xenopixel panel, and the font detail panel is present. The screenshot `fonts-off.png` shows the right-hand column holding Add a font and Tracks, laid out normally.
- [x] 3.2 Flip both switches on locally, without committing, and repeat task 3.1. Verify that "Do you swap blades on this saber?" and the Xenopixel panel are back as before, and that the `features.test.ts` guard fails. Then restore the switches and verify `git diff` shows no change to `features.ts`.
  - **Result, 2026-09-25.** With both switches set on locally, the card shows "Do you swap blades on this saber?" and Fonts & SD shows "From a Xenopixel saber" between Add a font and Tracks (screenshot `fonts-on.png`). Measure appears only once swapping is turned on, as before Beta 1. `features.test.ts` failed while the switches were on. After restoring them, `features.ts` reads `{ bladeId: false, xenopixelImport: false }`. It was new and uncommitted, so it was compared with the written version rather than with `git diff`, and it is committed off. A re-run of the check with the switches off gives the task 3.1 result again.
- [x] 3.3 Packaged build check: build the installer. The owner installs it and opens Wiring and Fonts & SD. Verify that neither feature is shown.
  - **Result, 2026-09-25, owner's installed build.** The installer was built after the switch commit, and its bundle has `xenopixelImport: false`, with Blade ID compiled out. The owner installed it. On Wiring, with the main blade's card open, there is no swap question. On Fonts & SD there is no Xenopixel panel.
- [x] 3.4 Run `npm test` and `npm run typecheck`; verify both pass.
  - **Result, 2026-09-25.** 176 core and 141 desktop tests pass (7 gated skipped), and the type check is clean.
- [x] 3.5 After archive, tick roadmap task 3.4 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
  - **Result, 2026-09-25.** Archived as `2026-09-25-hide-for-beta-1`. blade-id and xenopixel-import were synced, and roadmap 3.4 is ticked.
