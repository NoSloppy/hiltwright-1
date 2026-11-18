# Proposal

**Milestone:** M1 (Baseline), fourth of the five baseline changes scheduled by `beta-1-roadmap`.

## Why

"Build custom styles" and "demo any premade or created style" are the parts of the Beta 1 promise that style builders, a large share of the testers, will push hardest. Behind them sit:
- the style library: Hiltwright's own styles, plus the owner's pasted and built ones
- the simulator that previews a style the way the firmware draws it
- the style editor
- the blade preview

This area has grown fastest and has been seen on a real blade least. None of it has a written contract. This change writes the existing behaviour down as specs and audits the evidence for every scenario, so the Beta 1 blockers in this area come from facts.

## What Changes

- New specs describing behaviour that already exists, with no code change. The method is the one used by the earlier baselines: code wins over the plan, and clear defects are logged as findings rather than specified.
- An evidence audit in tasks.md. Each scenario is sorted by what covers it:
  - a test
  - a real-toolchain compile
  - an owner's check by eye in the app
  - a comparison against a real blade
  - partial coverage
  - nothing

## Non-goals

- Changing any behaviour, even where the audit finds a bug. Fixes become their own changes after triage.
- How a chosen style reaches a preset (`preset-editing`) or is compiled into a config (`config-generation`), both already specified. This change covers the style itself, choosing it on the Styles page, and its preview.
- The demo room's 3D scene, sound and hilts (`baseline-showroom`). The simulator it drives is specified here.
- Credits and logos (`contributors`, `baseline-showroom`), beyond noting that styles show their author.

## Capabilities

### New Capabilities

- `style-library`: the Styles page and what a style is:
  - Hiltwright's original styles by role
  - pasting a library style, with its arguments and default colours found and its header kept
  - styles the owner built
  - live colours that travel with a style onto a preset
  - what is compiled, queued or needing a build
  - filters by motion and by creator

  Full depth.
- `style-simulator`: previewing any style the way ProffieOS would draw it:
  - the firmware's own per-LED maths
  - every effect and motion input
  - the prop's reactions to effects a style raises
  - an honest report of anything it does not model

  Full depth.
- `style-editor`: building a style without code, either as a stack of plain-language blocks or as a tree covering any ProffieOS style. The output compiles and previews everywhere; undo, a guard for unsaved work, and code shown on request. Full depth.
- `blade-preview`: drawing the simulated LEDs so they look like a lit blade, wherever styles are shown, with motion controls. Thin.

### Modified Capabilities

None.

## Impact

- `openspec/specs/`: four new capability specs once this change is archived.
- No code, API, dependency or data changes.
- Feeds the fourth triage batch in roadmap task 2.6.
