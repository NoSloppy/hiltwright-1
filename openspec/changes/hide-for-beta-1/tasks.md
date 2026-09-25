# Tasks

## 1. The switches

- [ ] 1.1 Add `apps/desktop/src/renderer/src/features.ts` with `FEATURES = { bladeId: false, xenopixelImport: false }` and a comment naming what turns each on (design D1). Add `apps/desktop/test/features.test.ts` asserting both are off (design D4). Verify with `npm test`.

## 2. Hiding

- [ ] 2.1 In `Wiring.tsx`, pass the `swap` prop to `HardwareEditor` only when `FEATURES.bladeId` is on (design D2). Verify in task 3.1: Wiring shows no "Do you swap blades on this saber?" and no Measure button for a pixel main blade.
- [ ] 2.2 In `Fonts.tsx`, render `<XenoImport>` only when `FEATURES.xenopixelImport` is on (design D2). Verify in task 3.1: Fonts & SD has no Xenopixel panel, and a screenshot shows the right-hand column laid out without a gap.

## 3. Checks

- [ ] 3.1 Development run with no board (harness default), on a scratch folder with a planned saber whose main blade is a pixel strip. Dump Wiring and Fonts & SD, and take a screenshot of Fonts & SD. Verify that neither feature appears and the layout holds.
- [ ] 3.2 Flip both switches on locally, without committing, and repeat task 3.1. Verify that "Do you swap blades on this saber?" and the Xenopixel panel are back as before, and that the `features.test.ts` guard fails. Then restore the switches and verify `git diff` shows no change to `features.ts`.
- [ ] 3.3 Packaged build check: build the installer. The owner installs it and opens Wiring and Fonts & SD. Verify that neither feature is shown.
- [ ] 3.4 Run `npm test` and `npm run typecheck`; verify both pass.
- [ ] 3.5 After archive, tick roadmap task 3.4 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
