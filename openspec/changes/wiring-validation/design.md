# Design

## Context

- **Two rule sets.**
  - `pinTable` in `apps/desktop/src/renderer/src/hardwareModel.ts` knows: data-pin conflicts, a missing power pin, a pixel count below 1, broken chains, a PWM pin driving a star or motor, and no main blade.
  - `validateModel` in `packages/core/src/config/generate.ts` knows only: data-pin conflicts, a pixel strip with no power pin, a pixel count below 1, and a power blade with no pin.

  The board pin sets (`dataPins`, `powerOptions`) and `kindOf` live in the renderer, so core cannot use them.
- **What FW6 found building anyway:**
  - a PWM pin on a motor or star
  - a chain whose parent is missing or not an own-line strip (an empty blade expression)
  - a chain before its parent (overlapping ranges)
  - V3-only pins after switching to V2
  - one V3 pin used as data and as PWM
  - a star with one pin for all three colours
- **FST-3.** `withKind(b, 'star')` pads with the first FET, and pins it as an expected failure in `hardware.test.ts`.
- **FW27.** `lookForSlot` fills a missing slot with `starterLookFor(role)` silently, and never checks a chosen look's `roles` against the blade. The Presets page only offers looks whose `roles` include the blade's role, so mismatches arrive through role changes, sets and read-back presets. Starter looks declare roles: `hw_motor` has `['motor']`, and the crystal and accent looks have `['crystal', 'accent']`.
- **FW22.** `Wiring.tsx` saves the draft 300 ms after the last change through `saveTimer`. The unmount effect clears the timer without saving. The draft is set from `model` only on a saber change, or when it is empty.
- **FW23.** `Hardware.tsx` labels a V3 data pin "(Free)" with `p >= 'blade5Pin'`, a string comparison that also matches `bladePin`.

## Goals / Non-Goals

**Goals:**
- One place that decides what wiring is invalid, used by the page and the build, with the same words.
- No lost or overwritten wiring edits.

**Non-Goals:**
- A new editor layout.
- New kinds or boards.
- Deeper style analysis.

## Decisions

### D1. `pinRules.ts` in core
`packages/core/src/config/pinRules.ts` exports three things:
- **`BOARD_PINS`:** per board, the data pins and the power options `{ pin, label, kind: 'fet' | 'pwm' }`, moved from `hardwareModel.ts`, which re-exports `dataPins`, `powerOptions` and `pinLabel` from it.
- **`bladeKind(b)`:** `kindOf` moved from `hardwareModel.ts`, re-exported as `kindOf`.
- **`wiringProblems(blades, board)`:** returns `{ message, pins: string[], blades: string[] }[]`, in owner words that name blades as "Blade N".

The rules, in order:
1. no main blade
2. a pixel count below 1
3. a strip on its own line with no power pin
4. a power-wired blade with no pin
5. two own-line strips on one data pin (message as today)
6. a chain with a missing parent, or a parent that is not an own-line pixel strip
7. a chain whose parent comes after it in blade order
8. a pin not on the board (data or power)
9. a PWM pin driving a motor or star
10. one pin used as a data line by one blade and as PWM power by another
11. the same pin twice within one blade

**Where it is used:**
- `pinTable` keeps building its rows and shared notes, but takes `problems` from `wiringProblems`, and marks the rows of each problem's `pins` as conflicts.
- `validateModel` pushes each `message`, replacing its own four wiring checks.

**Rejected:**
- *Keeping two lists and adding the rules to both.* That is how they drifted.

### D2. A star gets pins of its own (FST-3)
`withKind(b, 'star', board, taken?)` fills the channels after the blade's own first pin with FETs not in `taken` (every other blade's power pins, passed by `Hardware.tsx`), then with any FET not already used by this blade. It falls back to repeating only when all six are taken, which rule 11 then reports. The FST-3 test becomes a normal test.

### D3. Styles against blades (FW27)
In `generate.ts`, `slotChecks(m)` returns `{ errors, warnings }`:
- **A missing slot** (no id, or null): a warning, "Preset <name>, <role label>: no style chosen, using <starter name>".
- **A chosen look on a motor** whose `roles` lacks `'motor'`: an error, "Preset <name>: the motor needs a motor style, not <look>".
- **Any other chosen look** whose `roles` lacks the blade's role: a warning, "Preset <name>, <role label>: <look> is not made for this blade".

`validateModel` adds the errors. `generateConfig` adds the warnings to its `warnings`, which the Build page already shows.

**Changed during implementation:** unchosen slots are grouped into one warning per blade, naming up to four presets and a count. For example: "3 presets (Mara Jade Skywalker, Valkyrie, Battery Level), crystal (blade 2): no style chosen, using "Follow the blade"." Presets read back from a saber often choose nothing for the crystal or accent, and one warning per slot would give hote2 26 lines. Mismatch warnings and motor errors stay per slot.

**Rejected:**
- *Refusing a missing slot.* The owner chose to fill it and say so. The spec's crystal scenario keeps the fill.
- *Refusing every mismatch.* The owner chose to refuse only on a motor, where it is a hardware risk.

### D4. The Wiring page never loses or overwrites (FW22)
- **Leaving.** The unmount effect saves a pending draft immediately, instead of discarding the timer.
- **An outside change.** A `lastSaved` ref holds the JSON of the last model this page saved or loaded. When `model` changes and its JSON is neither the draft's nor `lastSaved`, the model changed elsewhere. If no save is pending, the draft becomes the new model. If an edit is pending, the pending save is cancelled, the draft becomes the new model, and a note says "This saber's wiring was changed elsewhere; your last change was not applied."

**Rejected:**
- *Merging the two.* Wiring edits are few and small. The model from elsewhere (an adoption, a restore) is the owner's more deliberate act.

### D5. The free label (FW23)
The "(Free)" label uses `BOARD_PINS.V3.freeData = ['blade5Pin', 'blade6Pin', 'blade7Pin']`, not a string comparison.

### D6. Checks
- **Core,** in `packages/core/test/wiring.test.ts` or `generate.test.ts`:
  - one test per rule 1–11
  - `validateModel` returns the same messages
  - the slot checks: a missing slot warns, a blade style on a motor is refused, a main style on a crystal warns
- **Desktop,** in `hardware.test.ts`:
  - `pinTable` shows the same problems
  - FST-3 passes as a normal test
  - the V3 free label list
- **The owner's library, read-only:** every saber model in `library.json` (read through `\\localhost\C$…`) passes `validateModel` with no new errors, or any that appear are real and reported to the owner, not suppressed.
- **Development run:** on the Wiring page, change a pixel count and switch pages at once; the change is there on return. The V3 data-pin list labels only Free 1–3.
- **Owner:** Build & Install to V2.2 hote2 with its real wiring finishes "Installed". On the V3 (no install needed), the Wiring page's data-pin list labels only `blade5Pin`–`blade7Pin`.

## Risks / Trade-offs

- [A stricter rule refuses a saber that works today] → The library check runs every real model through the rules before release. Any refusal it finds is shown to the owner rather than suppressed.
- [Moving `kindOf` and the pin sets breaks renderer imports] → `hardwareModel.ts` re-exports them under their old names.
