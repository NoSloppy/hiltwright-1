# Design

## Context

This change writes specs for behaviour that already exists (see proposal.md). The behaviour was inventoried from the code on branch `beta-1-roadmap` at f56d22c. The main sources were:
- `packages/core/src/protocol/**` and `presetsIni.ts`
- `apps/desktop/src/renderer/src/{board,serial,workspace,saberModel,slotModel,pendingColours}.ts`
- `App.tsx`, `Presets.tsx`, `Controls.tsx` and `Build.tsx`
- `apps/desktop/src/main/{index,library,usb,snapshots,banksStore,ipc}.ts`

Evidence came from `packages/core/test` and `apps/desktop/test`, `docs/00-plan.md`, `docs/09-board-protocol-notes.md` and commit messages.

Three facts shape the audit:
- Only one board has ever been used, a V2.2 ("hote2") on OS 7.8 and 8.10. There is no V3 evidence at all.
- The Presets page, the Armory and the working-saber logic were rewritten on 2026-09-22. The plan says the live paths are "untested on hardware since the rewrite".
- No renderer or main-process module in this area has unit tests. Only the core codecs, the protocol client and the preset session do.

## Goals / Non-Goals

**Goals:**
- Specs precise enough that each scenario can be sorted as covered by a test, covered by a hardware check, or covered by neither.
- One list of every defect, gap and doc contradiction found, so roadmap task 2.6 can triage it.

**Non-Goals:**
- Deciding fixes. Each finding below is triaged in `beta-1-roadmap` task 2.6 into a blocker change, a hardware-verification item, or post-Beta 1.
- A hardware-verification task. This change touches no code, so the rule for changes that touch the board link does not apply. New hardware runs belong to `hardware-verification-v2` and `v3-verification`.

## Decisions

### D1. Specs describe intended behaviour that the code delivers; defects are findings, not requirements
Where the code does what was meant, the requirement states it. Where the code has a clear defect (for example, History restores into whichever preset is selected), the requirement states only the part that holds. The defect goes into the Findings table. Where the code and `docs/00-plan.md` disagree on intended behaviour (for example, where adoption is offered), the spec follows the code, because the plan's later entries describe the rewrite.
- *Rejected:* specifying the code literally, defects included. That would make bugs contractual, and fixing them would read as "breaking" the spec.
- *Rejected:* specifying the desired future behaviour. The baseline would then describe features that do not exist, and the evidence audit would be meaningless.

### D2. Where a behaviour lives when it spans capabilities
- **Connection status and the Armory connection panel:** `board-connection`.
- **Snapshots:** storage, and the snapshot on connect, in `saber-library`; the snapshot before each write, and History, in `preset-editing`.
- **Reading the preset list from the board:** `preset-editing`.
- **The voice pack check:** `diagnostics`, although it shows on Build & Install. It is a read of the card through the board, not part of building.
- **The Armory progress rail and the sidebar badges:** `app-shell`.
- **The wiring confirmation stored on the record:** left to `hardware-wiring` (`baseline-firmware`).
- **Clearing `presets.ini` during an install:** in `preset-editing`, stated only as what staged presets guarantee. The install sequence belongs to `firmware-install`.
- *Rejected:* one spec per page. The pages were just restructured and will move again. Capabilities outlast layouts.

### D3. What counts as evidence
- **Test:** a named test in `packages/core/test` or `apps/desktop/test` that exercises the scenario's behaviour. Tests that replay transcripts recorded from hote2 count as tests. Simulated boards count as tests. A test that only covers a helper the scenario relies on counts as *partial* and is recorded as such.
- **Hardware:** an explicit, dated statement in `docs/00-plan.md`, `docs/09-board-protocol-notes.md` or a commit message that the behaviour was run on a real board, naming the board. For scenarios that need no board, a dated manual run in the real app counts the same way. Screenshots from the dev-only simulated connection do not count.
- **The rewrite rule:** hardware evidence from before 2026-09-22 counts for board-level behaviour whose code did not change (the protocol client and the preset session). It does not count for page behaviour that was rewritten (live/staged mode, the Armory, the working saber).
- *Rejected:* counting descriptions in the plan as evidence. The plan narrates what was built, not what was checked.

### D4. Scenarios that only a real board can confirm are marked
Each such scenario carries the line *Needs a real board (either)*. "Either" means a V2.2 or a V3, because nothing in this capability area depends on the board model.
- *Rejected:* marking V2.2 only. Beta 1 promises V3 too, and `v3-verification` will reuse these scenarios.

### D5. Dev-only aids are not specified
The simulated connection (`HILTWRIGHT_PAGE=fake:`), offscreen rendering, screenshots, page dumps and end-to-end hooks are development tools. They are not part of the product contract. The fact that they are live in packaged builds is listed as finding F25.

## Findings for triage (roadmap task 2.6)

Severity is a first guess for triage:
- **High:** can cost the owner data or put wrong firmware or presets on a saber.
- **Med:** misleading, or a visible gap.
- **Low:** polish or stale docs.

| # | Capability | Finding | Severity |
|---|---|---|---|
| F1 | board-connection | An unplug is noticed only when a read errors. If the read ends cleanly, the app stays "Connected". There is no listener for the serial disconnect event. | High |
| F2 | board-connection | A silent OS 7 board reaches "Connected" with every value empty, and each connect or "Read again" creates a new saber record. | High |
| F3 | board-connection | A dead OS 8 board waits up to 30 s per command, so "Reading the saber…" can last minutes. | Med |
| F4 | board-connection | With several boards granted, the first is used and the owner cannot choose. | Low |
| F5 | board-connection | Console commands and the Try it controls bypass the app's operation queue and can land between the steps of a preset edit. | Med |
| F6 | diagnostics | The console sends any command unfiltered, including `RebootDFU` and `del`. | Med |
| F7 | docs | Stale statements: the `protocol.test.ts` test "OS 8.10 still has no tag framing" contradicts doc 09; doc 09 still says a 6 s read-back ceiling (the code uses 10 s); the plan lists `list_named_style` and says the 1200-baud touch is "still to confirm". | Low |
| F8 | board-connection | `scanid` on every connect re-runs blade detection on the board. This is a side effect, not a pure read. | Low |
| F9 | diagnostics | A failed slider write is silent, and its pending marker can stay forever. | Med |
| F10 | diagnostics | The page claims the settings survive a restart; this was never verified. | Low |
| F11 | diagnostics | The effect buttons give no confirmation or error, and have never been run on hardware. | Med |
| F12 | diagnostics | On OS 7.8 the voice pack check always ends "could not check" (`dir` is rejected). Doc 09 contradicts itself on which voice pack version Fett263 needs. | Low |
| F13 | diagnostics | The console's `id` quick command is always rejected on OS 8. | Low |
| F14 | saber-library | An unreadable library file is treated as empty, and then **overwritten** on the next save, losing every record. | High |
| F15 | saber-library | Without a USB serial (two boards plugged in), a reflash creates a new record, and the install's firmware record may be written to that new record instead of the saber worked on. | Med |
| F16 | saber-library | Adoption is offered to a saber that has a saved model but no Hiltwright firmware record, and adopting overwrites that model. | Med |
| F17 | saber-library | "New saber" while a saber is plugged in creates the plan but leaves the owner on the plugged-in saber's Wiring. | Med |
| F18 | hardware-wiring | The Armory rail and Build & Install treat an installed saber's wiring as confirmed even after its blades were changed, while the Wiring page does not. A changed wiring could be installed unconfirmed. | High |
| F19 | app-shell | The rail never marks Fonts & SD done, and always ends on "Continue with Build & Install". | Low |
| F20 | saber-library | After unplugging, the working saber reverts to the last Armory choice rather than the saber just unplugged. | Low |
| F21 | saber-library | The demo room uses the connected or first remembered saber, not the working saber. | Low |
| F22 | saber-library | Snapshots and backups are never pruned. Removing a plan leaves its folders. Real sabers cannot be removed. | Low |
| F23 | app-shell | Tooltips advertise Ctrl+10 and Ctrl+11, which do nothing. The shortcuts also fire inside text fields. | Low |
| F24 | app-shell | The minimum window is 1180×700 in code, against 1280×760 or 1180×760 in the plan. A page taller than the window scrolls as a whole instead of being prevented. | Low |
| F25 | app-shell | The `HILTWRIGHT_*` dev aids work in packaged builds, and `HILTWRIGHT_E2E` writes to a real board. | Med |
| F26 | app-shell | The app version is hard-coded in the preload script. | Low |
| F27 | app-shell | The production content security policy still allows `ws:`/`wss:`. | Low |
| F28 | app-shell | The "open folder" check compares path prefixes as strings, so a sibling folder with a longer name would pass. | Low |
| F29 | app-shell | The error screen asserts that nothing was written to the saber, without checking. | Low |
| F30 | presets-ini | Leading spaces in values are lost. Unknown keys, comments and letter case are not preserved. This matters only if the codec starts writing cards. | Low |
| F31 | preset-editing | The replies to `del presets.ini` and `del presets.tmp` are not checked. If the reboot or write fails after the delete, the saber is left with no `presets.ini`, and only the snapshot remains. The "Check again" path can reboot without the clear. | High |
| F32 | preset-editing | A board already in its bootloader installs without clearing `presets.ini`, yet the staged mark is dropped with no warning. The staged list vanishes and the old presets remain. | High |
| F33 | preset-editing | History "Undo" restores into whichever preset is selected. After a move, duplicate or delete, it overwrites a different preset. | High |
| F34 | preset-editing | Move, duplicate and delete report success without checking the list read back. | Med |
| F35 | preset-editing | The set warnings (missing styles, blade kinds the saber lacks, empty names or fonts) are no longer shown. Loading a set silently replaces staged edits. Sets cannot be renamed, and saving twice makes duplicates. | Med |
| F36 | preset-editing | Choosing "Saber's default" while live writes nothing and shows a misleading "not on the saber yet" note. | Med |
| F37 | preset-editing | Once a blade has a queued style, choosing a style the firmware has is written to the saber but not to the model. The page keeps showing the queued style, and the next build compiles it. | High |
| F38 | preset-editing | The stored preset list is refreshed only on connect, so after live edits and unplugging, "as last read" is stale. | Low |
| F39 | preset-editing | Sets match styles to presets by position, while the rest of the app matches by name. A reorder since install maps styles to the wrong presets. | Med |
| F40 | preset-editing | Only one apply-after-retraction is remembered. A second one replaces the first. | Low |
| F41 | preset-editing | Editing a font keeps only the first folder and `common`, so `A;B;common` loses `B`. | Med |
| F42 | preset-editing | A two-line preset name is flattened by the single-line name field (inferred, not tested). | Low |
| F43 | preset-editing | With the saber unplugged and nothing staged, the chip already says "Staged for install". | Low |
| F44 | preset-editing | After a failed write, the field keeps the typed text while the chip says it failed. | Low |
| F45 | preset-editing | Colours are written when the swatch loses focus, so the owner may have to click elsewhere first. | Low |
| F46 | preset-editing | Variation cannot be edited, although the plan's Tier 1 lists it. | Low |
| F47 | preset-editing | Staged edits are labelled "edits made here", so the install snapshot reads `Before bank "edits made here"`. | Low |

## Risks / Trade-offs

- [The specs look complete while most scenarios have no evidence] → The audit in tasks.md makes the gap explicit per scenario. The expected result is that most page-level scenarios are covered by neither, and that is the point.
- [A finding is fixed before triage, widening this change] → Config rule: a fix is its own change. This change archives with the findings unresolved.
- [D1 needs judgement about what counts as a defect] → Every such call is in the Findings table, so the owner can overrule any of them in review before archive.

## Owner review

Approved by the owner on 2026-09-24 with no overrules: the six specs, the D1 judgements and the Findings severities stand as written. The owner asked for this batch of findings to be triaged straight after archive rather than waiting for the other four baselines (see `beta-1-roadmap` task 2.6).
