# Tasks

## 1. One set of rules

- [ ] 1.1 Create `packages/core/src/config/pinRules.ts` with `BOARD_PINS`, `bladeKind` and `wiringProblems`, covering rules 1–11 (design D1). Export them from core. Add one test per rule. Verify with `npm test` in `packages/core`.
- [ ] 1.2 Make `validateModel` use `wiringProblems` in place of its own wiring checks, and add `slotChecks` errors (design D3). `generateConfig` adds the slot warnings. Test the missing-slot warning, the motor refusal, and the mismatch warning. Verify with `npm test`.
- [ ] 1.3 In `hardwareModel.ts`:
  - re-export the pin sets and `kindOf` from core
  - `pinTable` takes its problems from `wiringProblems`
  - `withKind` gives a star LED pins of its own (design D2)

  Turn the FST-3 test into a normal test, and add a `pinTable` test showing the same problems as `validateModel`. Verify with `npm test`.

## 2. The page

- [ ] 2.1 In `Hardware.tsx`, the "(Free)" label uses the V3 list (design D5), and star switches pass the other blades' pins to `withKind`. Verify with `npm run typecheck`, and in 3.2.
- [ ] 2.2 In `Wiring.tsx`, save a pending draft when the page closes, and take an outside model change (design D4). Verify with `npm run typecheck`, and in 3.2.

## 3. Checks

- [ ] 3.1 Run every saber model in the owner's `library.json` through `validateModel`, read-only (design D6). Verify that none is newly refused. Report any that are, with the reason, rather than suppressing them.
- [ ] 3.2 Development run with no board, on a scratch folder with a saber that has a model. Verify that:
  - a pixel-count change followed by an immediate page switch is kept
  - on V3, only `blade5Pin`–`blade7Pin` are labelled "(Free)"
  - switching a blade on `blade6Pin` to a V2 board shows the "pin the V2 does not have" problem
- [ ] 3.3 Hardware check by the owner, from a development build. Verify that:
  - Build & Install to V2.2 hote2 with its real wiring finishes "Installed"
  - on the V3.9, the Wiring page labels only `blade5Pin`–`blade7Pin` as "(Free)"
- [ ] 3.4 Run `npm test` and `npm run typecheck`; verify both pass.
- [ ] 3.5 After archive, tick roadmap task 3.15 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
