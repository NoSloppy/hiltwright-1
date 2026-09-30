# Tasks

## 1. Tests

- [ ] 1.1 In `packages/core/test/sim.test.ts` (design D2, D3):
  - 1.2: every blade style (roles including `main`) changes the frame by at least 0.15 under a clash, a blast and a lockup, compared with an identical simulator without the effect
  - 2.4: on Steady, the clash peak is past LED 50 of 132 when level, before LED 40 when raised and when lowered, and no further from the hilt lowered than raised, with a comment naming `ResponsiveClashL` and STC-1

  Verify with `npm test` in `packages/core`.
- [ ] 1.2 Create `packages/core/test/lookSim.test.ts` (design D4). 2.13:
  - a pasted style and a built style register and light the blade
  - text that is not a style does not register
  - an edited style, replaced as the editor does, previews its new colour
  - registering an id again through `registerLookSim` keeps the current simulator

  Verify with `npm test` in `packages/core`.
- [ ] 1.3 Record 1.12 against the existing "6.14" tests in `apps/desktop/test/saberModel.test.ts` (design, Context): run them, and name them in this task's result. Verify with `npm test` in `apps/desktop`.

## 2. Checks

- [ ] 2.1 Run `npm test` and `npm run typecheck`; verify both pass. Record any expected failures, with their owning change.
- [ ] 2.2 After archive, tick roadmap task 3.20 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
