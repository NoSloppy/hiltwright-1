# Proposal

## Why

Hiltwright has grown feature by feature without a line to ship against. Refinement kept winning over delivery, and the list of things built but never run on a saber kept growing: live preset editing since the flow rewrite, planned-saber adoption, staged presets, pending colours, installing a pasted style, SD eject, and 37 of 40 styles never seen on a blade. This change adopts spec-driven development and sets the line: what Beta 1 promises, who it is for, which milestones lead to it, and what waits until after it.

## What Changes

- **Process.** From now on work goes through OpenSpec. Every change names its milestone and lists non-goals. A refinement found while building a change becomes a new change, not a wider one. A change that touches a saber is archived only after its hardware scenarios have been run on a real board. These rules go into `openspec/config.yaml` together with the project context.
- **Baseline first.** Existing, delivered behaviour is written up as specs before new work starts. There are five domain changes containing only ADDED requirements, each archived into `openspec/specs/`. Specs are written in three depths: full, thin, or stub. Each baseline sorts every scenario into one of three: covered by a test, covered by a hardware check, or covered by neither. Every scenario covered by neither on a full-depth capability becomes a Beta 1 blocker candidate.
- **Beta 1 is defined.**
  - *Audience:* a closed beta for experts (installers, style builders) who own a Proffie V2.2 or V3, on Windows only.
  - *Promise:* "Plan your saber, choose styles and fonts, build custom styles, demo any premade or created style and font in the demo room, then build and install it, with live preset editing, all without touching Arduino or any code."
  - *Distribution:* the installer is unsigned and comes with an install guide covering every Windows barrier to unsigned software.
  - *Source:* GPL-3.0. The repository is public, and each build links to its tagged source.
- **Hidden in Beta 1, behind one switch:** Blade ID and the Xenopixel import. The code stays.
- **Milestones:**
  - M0 Checkpoint
  - M1 Baseline
  - M2 Beta 1 blockers
  - M3 Beta 1 ship
  - M4 Beta 2: SignPath signing, Blade ID verified and shown again
  - M5+ Later: font construction, CFX and Xenopixel import, updater and ProffieOS release tracking, macOS and Linux, style editor depth
- `docs/00-plan.md` stays as the history and technical record. The roadmap from here on lives in OpenSpec.

## Non-goals

- New features before Beta 1 that are not in the promise, including anything in M5+.
- Building fonts from sounds (tracked separately as `font-construction`, post-Beta 1).
- Signing Beta 1, a public beta, or platforms other than Windows.
- Rewriting working code to fit the specs. The baseline describes what the app does. Where that turns out to be wrong, the fix is its own change.
- Full specs for shelved or post-beta capabilities. They get stubs.

## Capabilities

### New Capabilities

None. This change sets up process and a roadmap. It adds no behaviour. The capabilities come in through the baseline changes it schedules (see design.md, Baseline map), so this change sets `skip_specs: true`.

### Modified Capabilities

None.

## Impact

- `openspec/config.yaml`: project context and artifact rules.
- `openspec/changes/`: five `baseline-*` changes, then the Beta 1 blocker changes (`hide-for-beta-1`, `license-and-notices`, `unsigned-install-guide`, `hardware-verification-v2`, `v3-verification`, plus whatever the baseline triage adds).
- `docs/00-plan.md`: a pointer saying the roadmap moved to OpenSpec.
- Git: the uncommitted working tree is committed as the baseline state before any spec is written.
- Release: a `v0.x.y-beta.1` tag and GitHub release, with the installer, the install guide and release notes.
