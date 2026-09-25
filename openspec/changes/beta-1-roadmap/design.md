# Design

## Context

OpenSpec is set up with the `spec-driven` schema. It has no specs and no changes yet, and `config.yaml` is still the template. The delivered behaviour is described in prose in `docs/00-plan.md` (Phase 0 status notes) and exercised by the tests in `packages/core/test` and `apps/desktop/test`. Hardware checks so far have run on one Proffieboard V2.2 (hote2). No V3 has been compiled for, flashed, or run. At the time of writing, 37 modified and 33 untracked files are uncommitted. See proposal.md for the motivation.

## Goals / Non-Goals

**Goals:**
- Specs that describe what Hiltwright does today, at a depth matched to the risk.
- A blocker list that comes from comparing those specs with the evidence, not from memory.
- Process rules that stop the refinement loop, written where every future artifact is checked against them.
- A release sequence up to Beta 1, with Beta 2 and later scoped but not planned in detail.

**Non-Goals:**
- Changing app behaviour as part of the baseline.
- Writing specs for capabilities hidden in or deferred past Beta 1 beyond a stub.

## Decisions

### D1. Baseline by domain changes with ADDED-only deltas

Existing behaviour enters `openspec/specs/` by archiving five changes that contain only ADDED requirements, grouped by domain so each one can be reviewed in a sitting.

*Alternatives considered:*
- Writing `openspec/specs/` by hand. This skips validation and review.
- One change for everything. It would be too large to review.
- One change per capability. That's 22 changes of ceremony.

### D2. Baseline map and spec depth

Depths:
- **F (full):** every observable requirement, with scenarios. Used where the capability ships in Beta 1 and can harm a saber, lose data, or break the promise.
- **T (thin):** purpose plus the key requirements.
- **S (stub):** purpose, what exists, and a note on when it ships.

| Change | Capability | Depth | Notes |
|---|---|---|---|
| baseline-board | board-connection | F | serial link, OS 7/8 framing, identity |
| | saber-library | F | records by USB serial, plans, adopting a planned saber, the working saber |
| | preset-editing | F | live vs staged, snapshot before write, read-back |
| | presets-ini | F | codec round-trip |
| | diagnostics | T | sliders, effect triggers |
| | app-shell | T | the flow, navigation, pages fit the window |
| baseline-firmware | hardware-wiring | F | count-first blades, roles, pins, confirmation |
| | config-generation | F | config.h, hash header, manifest, prop defines |
| | toolchain | F | first-run install, paths, integrity |
| | firmware-build | F | error translation, cache, flash budget (V2 and V3 scales) |
| | firmware-install | F | backup, DFU, driver, write, reconnect, restore, presets.ini clear |
| | blade-id | S | hidden in Beta 1; Beta 2 |
| baseline-sd-fonts | sd-card | F | card reader and USB share, WAV/name checks, copy, voice pack |
| | font-library | F | import, detecting what a font supports, grouping, playback, feeds Presets/Demo/SD |
| | xenopixel-import | S | hidden in Beta 1; waits on references |
| baseline-styles | style-library | F | built-in, pasted, built; arguments; pending colours |
| | style-simulator | F | the firmware's maths, effect bus, prop behaviour, honest unsupported/approximate report |
| | style-editor | F | simple and full; the output compiles; code visible but never required |
| | blade-preview | T | |
| baseline-showroom | demo-room | F | in the promise: any style and font, wielding, hilts, staff |
| | hwpack | T | format, credits, what the protection does and does not stop |
| | contributors | T | |

### D3. Baseline tasks are an evidence audit

A baseline change's `tasks.md` has one line per scenario, sorting it into one of three:
- **test:** a named test file covers it.
- **hardware:** it was run on a named board, with a date.
- **neither.**

Archiving a baseline requires every scenario to be sorted. The scenarios marked neither on F capabilities are the input to M2 triage. This is how "then blockers" in the spec order is produced rather than guessed.

### D4. Process rules in config.yaml

The `rules` block in `config.yaml` will say:
- **proposal:** name a milestone (M1 to M5+); include a Non-goals section; a refinement discovered during apply is a new change in the backlog.
- **tasks:** a change touching the board link, build, install or the SD card includes a hardware-verification task naming the board (V2.2, V3). Archive waits for it.
- **specs:** say "style" in user-facing wording, never "look" (code identifiers keep "look").
- **Beta 1 freeze:** after M1, a change not tied to the promise or to a blocker goes to M4 or later by default.

The `context` block gets the project background: stack, audience, GPL-3.0, the ProffieOS version pinned at 8.10, the Windows-first constraints.

### D5. One switch for Beta 1 hiding

Blade ID ("Do you swap blades?") and the Xenopixel import are hidden by a single feature switch, not by edits spread across pages, so Beta 2 turns them back on in one place. The code and its tests stay.

### D6. Beta 1 decisions log

| Decision | Choice | Reason |
|---|---|---|
| Audience | Closed, experts, V2.2 and V3 owners | Only V2.2 has been run on hardware; experts tolerate rough edges and bring hard cases (pasted library styles, customer configs) |
| Platform | Windows only | Only Windows has been proven for toolchain, DFU and the driver |
| Signing | Unsigned, with an install guide | SignPath needs time; the owner is taking it on for Beta 2 |
| V3 | In Beta 1 | The owner has a board; `v3-verification` is a blocker |
| Blade ID | Hidden; Beta 2 | Rarely used; needs dedicated hardware checks |
| Demo room | Main feature | Named in the promise |
| Font construction | Post-Beta 1 | Owner's call; see `font-construction` |
| Source offer | Link to the tagged release in the public repo | Repo is public and stays so |
| Hilts shipped | PunkSaber only (built in) | Shadowfoil hilts need their permission |

### D7. M2 is delivered in six waves (added 2026-09-24, after M1)
The five baselines produced 37 M2 changes: 33 from triage, `support-bundle` (owner's decision), and the three the roadmap named from the start. They are delivered in waves, each unblocking the next. The full list is in tasks.md section 3.

| Wave | Theme | Changes | Why this position |
|---|---|---|---|
| A | Unblock and equip | 4 | FW1 blocks every first install. Development aids must be off before packaged builds are tested. The log helps every later check. |
| B | Nothing the owner made is lost | 6 | Data loss is the least forgivable failure. One shared fix (D8) covers four of its High findings. |
| C | The right firmware on the right board | 8 | The riskiest area for hardware. Each step depends on the one before: connection, then toolchain, build, wiring, target, safety nets, presets. |
| D | The saber does what the app shows | 13 | Presets, styles, card, preview and demo room. These are mostly independent of each other once A-C are in. |
| E | Credit and licence | 3 | The notices need the attribution and pack decisions first. Can run beside C and D. |
| F | Prove it | 3 changes and the dry run | The hardware passes verify the fixes, so they come after them. The unsigned-install spike can start any time. |

- **Test coverage opens each area.** Each area's test-coverage change (characterisation tests) comes at the start of its wave, before the fixes that touch the same code.
- **Candidates for M4:** `diagnostics-feedback` and `sets-safety` hold only Med findings. They are last in wave D and are the first to move if Beta 1 must shrink. That move is the owner's call.
- *Rejected:* ordering by capability (all board-side changes, then all firmware-side). Themes put what hurts testers most first, and let data safety share one fix.
- *Rejected:* running the hardware passes first. They would fail on known defects and need re-running.

### D8. Shared roots fixed once
- **Safe stores.** The saber library, font details, styles, contributors and preset sets each read their JSON file the same way: a parse error reads as empty, and the next save overwrites the file (F14, SF2, ST8, SR33; the preset-sets store was never flagged but has the same code). `library-integrity` builds one safe store (write via a temporary file, keep the last good copy, set a damaged file aside and report it), and 3.7-3.9 reuse it.
- **The firmware record.** `wiring-confirmation-gate` adds the installed board and blade layout to the firmware record. `install-target-safety` reuses them to check the target board.
- **Queued versus live styles.** `preset-editor-fixes` (F37) and `style-to-saber-fixes` (ST3-ST5) both change how a queued style and a live choice meet in the saber's model, so they are done together.
- **Development-only switches.** `release-hardening` gates every `HILTWRIGHT_*` aid (F25, FW33, SR22). `pack-integrity` also disables developer tools in packaged builds (SR18).

## Risks / Trade-offs

- [The baseline becomes its own refinement loop] → Depth caps from D2; a baseline describes, it never fixes; each domain change is reviewed once and archived.
- [Smart App Control blocks unsigned code outright, possibly including the downloaded toolchain (GCC, dfu-util), not just the installer] → A spike inside `unsigned-install-guide` runs install, toolchain, build and flash on a PC with SAC on before the guide is written. The first-run check reports blocked tools in plain words.
- [V3 differs in pins, flash scale and possibly bootloader behaviour] → `v3-verification` covers compile, flash budget, backup, DFU, write, reconnect, live edit and restore before any tester flashes one.
- [Experts compare the simulator with real blades] → Honest reporting of unsupported and approximate templates is a requirement in `style-simulator`. `hardware-verification-v2` includes judging a sample of built-in and pasted styles on a blade.
- [Testers find nothing to report through] → Decided during M2 triage whether a support bundle or log export is a blocker.

## Open Questions

- **hwpack key.** The key literal lives in the public source (`apps/desktop/src/main/hwpack.ts`), so anyone who reads the repo can decrypt a pack. Two choices: keep it and say plainly that packs are a convenience format, or inject the key at build time (after checking this fits GPL-3.0). Decide before asking Shadowfoil to ship their hilts. Beta 1 ships only PunkSaber, so this does not block it.
- **Smart App Control behaviour.** The spike in `unsigned-install-guide` answers this. It changes the guide's content, not the milestone plan.
