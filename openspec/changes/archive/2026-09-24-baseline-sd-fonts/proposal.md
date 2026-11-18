# Proposal

**Milestone:** M1 (Baseline), third of the five baseline changes scheduled by `beta-1-roadmap`.

## Why

Fonts are half of the Beta 1 promise: "choose styles and fonts". The owner's fonts live in two places Hiltwright manages: the font library on the computer, and the SD card in the saber, reached through a card reader or over USB. Both hold files the owner may have paid for and cannot easily get back. Neither has a written contract. This change writes the existing behaviour down as specs and audits the evidence for every scenario, so the Beta 1 blockers here come from facts. It also gives `font-construction` (M5+) the `font-library` spec it will modify.

## What Changes

- New specs describing behaviour that already exists, with no code change. The method is the one used by `baseline-board` and `baseline-firmware`: code wins over the plan, and clear defects are logged as findings rather than specified.
- An evidence audit in tasks.md: one line per scenario, sorted as covered by a test, covered by a real-use check (owner, card or saber, with the date), partial, or neither.

## Non-goals

- Changing any behaviour, even where the audit finds a bug. Each fix becomes its own change after triage.
- How Presets suggests fonts and warns about fonts missing from the card, which is specified in `preset-editing`. The same goes for the voice pack check read through the saber, specified in `diagnostics`.
- Font sound in the demo room (`baseline-showroom`) and credits and logos for makers (`contributors`, `baseline-showroom`). The font library spec only refers to them.
- Building new fonts from sounds (`font-construction`, M5+).

## Capabilities

### New Capabilities

- `sd-card`: Fonts & SD, which covers:
  - finding the saber's card, in a card reader or shared by the saber over USB
  - what is on the card, and font and naming checks
  - copying fonts onto the card
  - the fonts the presets use and whether each is on the card
  - giving the card back safely

  Full depth.
- `font-library`: the owner's own collection of fonts on the computer, which covers:
  - where it lives and moving it
  - adding fonts from downloaded packages or folders
  - what is read from each font
  - names, makers and bundles, and grouping
  - listening to sounds
  - removing fonts
  - supplying fonts to the rest of the app

  Full depth.
- `xenopixel-import`: bringing fonts and colours over from a Xenopixel card. Stub: hidden in Beta 1, waiting on real references.

### Modified Capabilities

None.

## Impact

- `openspec/specs/`: three new capability specs once this change is archived.
- No code, API, dependency or data changes.
- Feeds the third triage batch in roadmap task 2.6.
