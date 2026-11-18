# Design

## Context

There are no feature switches in the app today.
- **Blade ID** reaches the owner in one place. `Wiring.tsx` passes a `swap` prop to `HardwareEditor`, and `Hardware.tsx` draws "Do you swap blades on this saber?", the variant list and Measure only when that prop is given. The build reads `model.bladeId` wherever it is set, and `draftModel` carries it through.
- **The Xenopixel import** reaches the owner in one place too. `Fonts.tsx` always renders `<XenoImport>` in the right-hand column, between "Add a font" and the font detail panel. Its IPC handlers (`import:pickXeno`, `import:xenoFont`) can only be reached from that panel.

None of the owner's sabers has Blade ID variants saved. I checked the owner's `library.json` on 2026-09-25.

## Goals / Non-Goals

**Goals:**
- Hide both features for Beta 1, and bring them back by changing one line each in one file.

**Non-Goals:**
- Removing or changing the features' code, tests, IPC handlers, or how a saved model with variants is built.

## Decisions

### D1. A constant in one renderer file
`apps/desktop/src/renderer/src/features.ts` exports:

```ts
export const FEATURES = { bladeId: false, xenopixelImport: false } as const;
```

The file carries a comment naming the Beta 2 changes that turn each switch on: `blade-id-verification`, and the import's references. Only the renderer reads it, because both features only reach the owner through a page.

**Rejected:**
- *An environment variable or build flag.* It needs two builds, a packaged build scrubs `HILTWRIGHT_*` anyway, and a wrong build could ship the feature by accident.
- *A setting in the app.* Testers would find it, and a feature testers can switch on is not hidden.
- *Putting it in `shared/` for main to read too.* Nothing in main needs it (D3).

### D2. Hide at the one point where each feature enters a page
- **Blade ID.** `Wiring.tsx` passes `swap={FEATURES.bladeId ? {...} : undefined}`. `HardwareEditor` already draws nothing for swapping without the prop, so `Hardware.tsx` is unchanged.
- **The import.** `Fonts.tsx` renders `{FEATURES.xenopixelImport && <XenoImport … />}`. The column is a stack of panels, so the font detail panel simply takes the space.

**Rejected:**
- *Gating inside `HardwareEditor` and `XenoImport`.* That spreads the switch across more files, and the components stay reusable for Beta 2 as they are.

### D3. Leave the model, the build and main alone
A saved `bladeId` still reaches the build through `draftModel`, as the proposal says, and nobody has one today. The `import:*` handlers stay registered. With no panel, no page calls them. Blocking them in main as well would be a second switch to remember in Beta 2, for no gain in a closed beta.

### D4. A test that fails if a switch ships on
`apps/desktop/test/features.test.ts` asserts that both switches are off. Beta 2 flips the switch and this test together, deliberately. It is the guard against turning a switch on while testing locally and committing it.

**Rejected:**
- *No test, relying on the packaged check alone.* The packaged check runs once per release, and the test runs on every `npm test`.

### D5. Checks
- **Development runs,** no board, offscreen, with the dump aid:
  - with the switches off: Wiring and Fonts & SD show neither feature
  - with both switches flipped on locally (not committed): both are back
- **Screenshots of Fonts & SD** in both states show the layout holds.
- **The owner's packaged check** on the installed build.

No board check is needed. This change does not alter what is sent to the board, what is generated, built or installed, or what is written to the card. It only removes two panels from view. The rule's hardware task is replaced by the packaged check, and that reasoning is recorded here.

## Risks / Trade-offs

- [A tester's saber somehow has variants saved, and they build silently] → Nobody has any today, and testers start from a clean install. The build still handles them exactly as before.
- [Someone flips a switch locally to work on Blade ID and commits it] → The D4 test fails.
