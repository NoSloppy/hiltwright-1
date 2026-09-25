# Proposal

**Milestone:** M1 (Baseline), the last of the five baseline changes scheduled by `beta-1-roadmap`.

## Why

The Beta 1 promise ends with "demo any premade or created style and font in the demo room". The demo room is where a style builder swings a saber with the mouse, hears its font and sees it lit in a hilt. Two supporting pieces sit behind it:
- **`.hwpack`**, the format creators' hilts and fonts ship in
- **contributors**, which credits the community whose work is in the app

The demo room was built mostly in one day, with dozens of commits, and none of these three has a written contract. This change writes the existing behaviour down as specs and audits the evidence for every scenario, which completes the M1 baseline.

## What Changes

- New specs describing behaviour that already exists, with no code change. The method is the one used by the earlier baselines: code wins over the plan, and clear defects are logged as findings rather than specified.
- An evidence audit in tasks.md. Each scenario is sorted by what covers it:
  - a test
  - the owner using it by hand
  - a person listening
  - offscreen screenshots only
  - partial coverage
  - nothing

## Non-goals

- Changing any behaviour, even where the audit finds a bug. Fixes become their own changes after triage.
- The blade simulator and the 2D preview, already specified in `style-simulator` and `blade-preview`. The demo room drives the simulator; this change covers the room around it.
- The font library (`font-library`), which the demo room only reads from.
- Deciding the open question about the `.hwpack` key in the public source. The spec records what the format protects against today, and the question stays with triage and the Shadowfoil conversation.

## Capabilities

### New Capabilities

- `demo-room`: wielding a saber in a 3D room with the mouse (two control modes), with:
  - the working saber's styles and fonts, including the owner's own
  - the sound engine with SmoothSwing and the font's own ignition sequence
  - every effect and special ability the chosen prop has
  - the owner's own hilt models, fitted and remembered, and pack hilts
  - a second blade for staffs
  - scene settings

  Full depth.
- `hwpack`: the pack format for creators' hilts and fonts. That covers:
  - its readable manifest and credits
  - what the app may do with the contents
  - how contents are kept in memory
  - where packs are found, including the built-in hilt
  - the packing tool

  Thin.
- `contributors`: one shared list of the people whose fonts, styles and hilts are in the app, with logos and links, and a page gathering what of theirs is here. Thin.

### Modified Capabilities

None.

## Impact

- `openspec/specs/`: three new capability specs once this change is archived.
- No code, API, dependency or data changes.
- Feeds the fifth and last triage batch in roadmap task 2.6. After it, M2 can be ordered.
