# Tasks

## 1. One set of rules

- [x] 1.1 Create `packages/core/src/config/pinRules.ts` with `BOARD_PINS`, `bladeKind` and `wiringProblems`, covering rules 1–11 (design D1). Export them from core. Add one test per rule. Verify with `npm test` in `packages/core`.
  - **Result, 2026-09-26.** `packages/core/src/config/pinRules.ts` holds:
    - `BOARD_PINS` (data pins, power options, the V3's free data pins)
    - `bladeKind`
    - `wiringProblems`, which returns `{ message, pins, blades }` for rules 1–11, keeping the page's existing words for the old rules

    All are exported from core. The tests in `wiring.test.ts` pass: a valid saber has none, one test per rule 1–11 (including V3 pins on a V2, PWM on a motor and a star, data-and-PWM on `blade5Pin`, LED 4 three times), and the board pins and kinds.
- [x] 1.2 Make `validateModel` use `wiringProblems` in place of its own wiring checks, and add `slotChecks` errors (design D3). `generateConfig` adds the slot warnings. Test the missing-slot warning, the motor refusal, and the mismatch warning. Verify with `npm test`.
  - **Result, 2026-09-26.**
    - `validateModel` pushes `wiringProblems` messages in place of its four wiring checks and its main-blade check.
    - `slotChecks(m)` gives errors for a non-motor style on a motor, and warnings for other mismatches and for unchosen slots.
    - **Changed from design D3 (added):** unchosen slots are grouped per blade, for example "3 presets (Mara Jade Skywalker, Valkyrie, Battery Level), crystal (blade 2): no style chosen, using "Follow the blade"." Presets read from a saber often choose nothing for the crystal or accent, and one line per slot would flood the build page (26 lines for hote2).
    - `generateConfig` adds the warnings.

    Two old expectations now read the shared words ("Blade 1 needs at least one power pin.", "bladePin has 2 separate strips on it"). New tests pass: grouped fill warnings, a motor refusal naming the preset, and a main style on a crystal with a warning. 202 core tests pass.
- [x] 1.3 In `hardwareModel.ts`:
  - re-export the pin sets and `kindOf` from core
  - `pinTable` takes its problems from `wiringProblems`
  - `withKind` gives a star LED pins of its own (design D2)

  Turn the FST-3 test into a normal test, and add a `pinTable` test showing the same problems as `validateModel`. Verify with `npm test`.
  - **Result, 2026-09-26.**
    - `hardwareModel.ts` takes `dataPins`, `powerOptions`, `kindOf` and the new `freeDataPins` from core.
    - `pinTable` builds its rows as before, takes `problems` from `wiringProblems`, and marks each problem's pins as conflicts.
    - `withKind(b, kind, board, taken)` fills a star's extra channels with FETs not in `taken` and not already used.

    FST-3 is a normal test and passes. A new test shows every `pinTable` problem also in `validateModel`, with a PWM motor's pin marked. The FW20 compile models still pass the stricter rules.

## 2. The page

- [x] 2.1 In `Hardware.tsx`, the "(Free)" label uses the V3 list (design D5), and star switches pass the other blades' pins to `withKind`. Verify with `npm run typecheck`, and in 3.2.
  - **Result, 2026-09-26.** The data-pin list labels with `freeDataPins(board).includes(p)`. The kind switch passes `othersPower(b.id)`, the power pins of every other blade, to `withKind`. The type check is clean. See 3.2.
- [x] 2.2 In `Wiring.tsx`, save a pending draft when the page closes, and take an outside model change (design D4). Verify with `npm run typecheck`, and in 3.2.
  - **Result, 2026-09-26.**
    - **Saving on close:** a pending change is saved when the page closes.
    - **Outside changes:** `known` holds this page's wiring fields (board, buttons, prop, blades, Blade ID), as last loaded or saved. A model whose wiring fields differ was changed elsewhere, so the page takes it and cancels any pending save, with the note "This saber's wiring was changed elsewhere; your last change was not applied." Only the wiring fields are compared, because the page's model is derived from the record, and its other fields may differ after the page's own save.

    The type check is clean. See 3.2.

## 3. Checks

- [x] 3.1 Run every saber model in the owner's `library.json` through `validateModel`, read-only (design D6). Verify that none is newly refused. Report any that are, with the reason, rather than suppressing them.
  - **Result, 2026-09-26.** The owner's `library.json` was read through `\\localhost\C$…`; the temporary test file was deleted afterwards. None is newly refused:
    - **hotetest (hote2, V2, 3 blades):** no errors, no warnings.
    - **Darksaber (V2, 2 blades):** no errors. Two real warnings: preset "Darksword" has no style chosen for its main blade or its accent.
    - **Two "Saber saber" records:** no saved model.
- [x] 3.2 Development run with no board, on a scratch folder with a saber that has a model. Verify that:
  - a pixel-count change followed by an immediate page switch is kept
  - on V3, only `blade5Pin`–`blade7Pin` are labelled "(Free)"
  - switching a blade on `blade6Pin` to a V2 board shows the "pin the V2 does not have" problem
  - **Result, 2026-09-26.** Scratch folder with the remembered hote2, `fake:wiring`, no board. All three held:
    - **The quick switch:** blade 1's pixel count changed from 132 to 117, then the page switched within 50 ms. On return it read 117.
    - **The V3 labels:** the data-pin list read `bladePin`, `blade2Pin`, `blade3Pin`, `blade4Pin`, `blade5Pin (Free)`, `blade6Pin (Free)`, `blade7Pin (Free)`.
    - **Back to V2:** with a blade moved to `blade6Pin`, switching to V2 showed "Blade 3 uses blade6Pin, which the Proffieboard V2 does not have."

    The scratch values were put back afterwards.
- [x] 3.3 Hardware check by the owner, from a development build. Verify that:
  - Build & Install to V2.2 hote2 with its real wiring finishes "Installed"
  - on the V3.9, the Wiring page labels only `blade5Pin`–`blade7Pin` as "(Free)"
  - **Result, 2026-09-27 (owner).** Passed:
    - Build & Install to V2.2 hote2 with its real wiring finished "Installed".
    - On the V3.9, the Wiring page's data-pin list labels only `blade5Pin`–`blade7Pin` as "(Free)".
- [x] 3.4 Run `npm test` and `npm run typecheck`; verify both pass.
  - **Result, 2026-09-26.** 202 core and 268 desktop tests pass (13 gated skipped), and the type check is clean in both workspaces.
- [x] 3.5 After archive, tick roadmap task 3.15 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
  - **Result, 2026-09-27.** Archived to `openspec/changes/archive/2026-09-27-wiring-validation`, with the specs synced (4 requirements in `hardware-wiring` and 2 in `config-generation` replaced). Roadmap task 3.15 is ticked.
