# Tasks

## 1. Tests

- [x] 1.1 In `packages/core/test/sim.test.ts` (design D2, D3):
  - 1.2: every blade style (roles including `main`) changes the frame by at least 0.15 under a clash, a blast and a lockup, compared with an identical simulator without the effect
  - 2.4: on Steady, the clash peak is past LED 50 of 132 when level, before LED 40 when raised and when lowered, and no further from the hilt lowered than raised, with a comment naming `ResponsiveClashL` and STC-1

  Verify with `npm test` in `packages/core`.
  - **Result, 2026-09-29.** Both pass, in a new "style audit" block of `packages/core/test/sim.test.ts` (16 tests in the file):
    - **1.2:** every one of the 32 blade styles (of 40 in the library) changes the frame by at least 0.15 under a clash, a blast and a lockup, against an identical simulator without the effect.
    - **2.4:** on Steady, the clash peaks past LED 50 when level, before LED 40 raised and lowered, and lowered no further from the hilt than raised. A comment names `ResponsiveClashL` and STC-1.
- [x] 1.2 Create `packages/core/test/lookSim.test.ts` (design D4). 2.13:
  - a pasted style and a built style register and light the blade
  - text that is not a style does not register
  - an edited style, replaced as the editor does, previews its new colour
  - registering an id again through `registerLookSim` keeps the current simulator

  Verify with `npm test` in `packages/core`.
  - **Result, 2026-09-29.** The new `packages/core/test/lookSim.test.ts` has four tests, all passing:
    - a pasted `StylePtr<Red>()` and a built style (`defaultStyle`) register, can be simulated, and light the blade (red at the middle for the pasted one)
    - text that is not a style does not register
    - after the editor-style replacement (`registerStyleSim` with `StylePtr<Blue>()`), the same id previews blue
    - `registerLookSim` again with new code keeps red (the early return, pinned)

    Each test unregisters its ids afterwards.
- [x] 1.3 Record 1.12 against the existing "6.14" tests in `apps/desktop/test/saberModel.test.ts` (design, Context): run them, and name them in this task's result. Verify with `npm test` in `apps/desktop`.
  - **Result, 2026-09-29.** 1.12 ("After choosing a new style": a style the firmware lacks shows as "Queued") is covered by tests already in `apps/desktop/test/saberModel.test.ts`, all passing on this run:
    - **"a new style on a live saber":**
      - "6.14 counts as queued when the firmware does not have it, once however many slots use it"
      - "6.14 is not queued when the installed firmware already has it"
      - "6.14 is queued, every chosen style, on firmware Hiltwright did not build"
    - **"a style edited since the install"** (the requirement's other scenario): four more tests.

    No test was added.

## 2. Checks

- [x] 2.1 Run `npm test` and `npm run typecheck`; verify both pass. Record any expected failures, with their owning change.
  - **Result, 2026-09-29.** From the repository root: `npm test` passes 210 core tests (six new) and 380 desktop tests (13 gated skipped), and `npm run typecheck` is clean in both workspaces. No expected failures. The one difference from the specs, the wording of 2.4, is a spec error, filed as STC-1 in `preview-honesty` (design D1).
- [ ] 2.2 After archive, tick roadmap task 3.20 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
