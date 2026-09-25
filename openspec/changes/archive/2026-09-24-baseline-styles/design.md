# Design

## Context

This change writes specs for behaviour that already exists (see proposal.md). It uses the method of the three archived baselines. The behaviour was inventoried from the code at 4d1175c:
- `packages/core/src/{looks,lookLibrary,lookSim,sim,styleTree,styleBuilder,layerCard,proffieCatalogue}.ts`
- `apps/desktop/src/main/looksStore.ts`
- `apps/desktop/src/renderer/src/{Looks,StyleEditor,TreeEditor,LayerCard,NodeCard,NumControl,BladePreview,MotionPad}.tsx`
- `apps/desktop/src/renderer/src/{bladeRender,treeWords,editorHistory,slotModel,pendingColours}.ts`

The facts that shape the audit:
- The simulator's maths and the style tree have strong unit tests.
- No Hiltwright style, pasted style or editor output has been compared against a real blade.
- The only styles the owner has judged, by eye in the app, are the first 14 built-ins. That is recorded in session notes only.
- The shader was tuned from screenshots.
- The editor has no screen-level tests. Its only compile evidence is two gated tests and one-off compiles on 2026-09-21.
- The editor work committed in 94b47fc (layer cards, plain words, undo, the guard) has no entry in the plan.

## Goals / Non-Goals

**Goals:**
- Specs precise enough to sort every scenario by its evidence.
- One list of every defect and gap here, for the fourth triage batch. This area decides what the owner sees versus what the saber does, so any mismatch between the two is marked High.

**Non-Goals:**
- Fixes, which come after triage.
- A hardware-verification task. This change touches no code.

## Decisions

### D1. The earlier baselines' method applies unchanged
Specs state what holds; defects are findings; code wins over the plan.
- *Rejected:* re-deciding the method, for the same reason as before: the batches must be comparable.

### D2. Two kinds of evidence are added for this area
- **Comparison with a real blade.** Fidelity scenarios are marked *Needs comparison with a real blade*. Only a side-by-side look at the saber covers them.
- **An owner's check by eye in the app.** This counts for how the app behaves (a gallery animates, a button works). It does not count for fidelity to the saber. When it is recorded only in session notes, it is labelled as such, as in `baseline-sd-fonts` D2.
- *Rejected:* treating the owner's approval of the first 14 simulated styles as blade evidence. It was never side by side with the saber.

### D3. The simulator's honesty is specified where it actually shows
Only the full editor names unmodelled and approximate templates today. The spec says the simulator reports them, and that the full editor shows them. The missing note elsewhere (ST20), and the fact that an unmodelled layer paints over the blade instead of nothing (ST19), are findings.
- *Rejected:* specifying the honest note on every page. That would describe behaviour that does not exist.

### D4. Where the edges are
- **How a chosen style's colours reach the saber after a build:** `preset-editing`.
- **How a style's header and code enter the config:** `config-generation`.
- **The leave-with-unsaved-work guard:** `app-shell`.
- **The demo room's 3D scene:** `baseline-showroom`. The simulator it drives is specified here.
- **The rule that Hiltwright's styles were composed from ideas only, never from Fett263's code:** a process statement, not observable behaviour, so it is recorded here and not specified (ST40).

## Findings for triage

Numbered ST. Severity:
- **High:** the saber can end up with a different style, colours or preset than the owner sees or chose; the owner's styles or edits can be lost; or someone's work can be stripped of its credit or credited wrongly.
- **Med:** misleading, or a visible gap.
- **Low:** polish or stale docs.

| # | Capability | Finding | Severity |
|---|---|---|---|
| ST1 | style-library | Editing a built style does not reach sabers that already use it. Their plans keep the old copy, so the next build compiles the old code while every preview shows the new one. | High |
| ST2 | style-library | After such an edit, the style still shows "On the saber" and offers "Use it in", which points a preset at the pre-edit build. | High |
| ST3 | style-library | "Use it in" ignores a staged preset list: the picker lists the plan's presets, but the write goes to that position on the live saber, so it can land on a different preset. | High |
| ST4 | style-library | "Use it in" points the preset at another preset's compiled slot without recording that in the plan. If that other preset's style is later changed and rebuilt, this preset silently changes too. | Med |
| ST5 | style-library | "Use it in" drops the blade's earlier custom colours without warning; only the colours tried on Styles are written. | Med |
| ST6 | style-library | Misleading or unreachable messages: an installed style offered "Add to…" when unplugged, and a "Plug the saber in" hint that can never show. | Low |
| ST7 | style-library | Pasted styles are always marked for main and side blades; a pasted crystal style cannot be marked as one. | Med |
| ST8 | style-library | A damaged style store loads as empty, and the next add, remove or rename overwrites it, deleting every pasted and built style. | High |
| ST9 | style-library | Removing one of the owner's styles has no confirmation or undo, even when it is queued or installed. | Med |
| ST10 | style-library | Errors when saving a paste or renaming its author are swallowed. The dialog just stays open. | Med |
| ST11 | style-library | Pasting the same code again gives a new identity, shown as "Needs a build". | Low |
| ST12 | style-library, docs | Stale or unproven statements: "pasted looks cannot be simulated" (plan), comments that ignore built styles, the 84% "pasted Fett263 fire style" compile resting on a fixture since re-authored as Hiltwright's own, and flash costs copied by hand with no check against the measurement. | Low |
| ST13 | style-library | The paste dialog's author field defaults to "Fett263", so anyone's paste is credited to Fett263 unless changed. | High |
| ST14 | style-library | A paste with no author becomes "unknown", which the app treats as the owner's own ("Yours"). | Med |
| ST15 | style-library | A paste with no header is allowed (only a hint). Only leading comments count as the header. Renaming an author later does not update copies already in saber plans. | Med |
| ST16 | style-editor | Pasting a library style into the style editor drops its header entirely, and the saved style is credited "Built by you". | High |
| ST17 | style-library | A test credits code Hiltwright wrote to Fett263, contrary to the 2026-09-13 fixture policy. | Low |
| ST18 | style-library | Unverified: whether preset sets can carry pasted library code off the machine, against the paste dialog's "never redistributes" promise. | Low |
| ST19 | style-simulator | An unmodelled layer is drawn as its first colour, fully opaque, or as white, so it can cover the whole blade in the preview. Docs say it "paints nothing". | High |
| ST20 | style-simulator | The honest "not modelled / approximate" note shows only in the full editor. Styles, Presets and the demo room show pasted and built styles with no warning. | Med |
| ST21 | style-simulator | Simplifications that go unreported: Variation and AltF read 0; SyncAltToVarianceL paints nothing; ColorChange shows one colour; time-bending templates pass straight through; HardStripes are soft; StyleFire ignores its delay; very deep styles turn white; the sound-length stand-in is not flagged. | Med |
| ST22 | style-simulator, blade-preview | The 2D preview always behaves as if the prop were Fett263 (only the demo room uses the saber's prop), and never plays preon or post-off. | Med |
| ST23 | style-simulator | Hiltwright's built-in styles are simulated from hand-written copies. Nothing checks the copies against the C++ that is compiled, so they can drift. | Med |
| ST24 | blade-preview | The Presets preview uses a fraction of the blade's LED count and only updates when the picker loses focus. The plan says real LED count and live while dragging. | Low |
| ST25 | blade-preview | The 2D preview offers abilities 1 and 2 only (the plan says 1–4; Fett263 has 4, BC has 8). | Low |
| ST26 | blade-preview | Stale texts say pasted styles cannot be simulated. The fallback bar's hint gives that as the reason, when it now appears only for unreadable code. | Low |
| ST27 | style-simulator, docs | The performance figure (2 ms per frame for 15 previews) predates 40+ styles. The catalogue does not record which ProffieOS version it came from, and nothing checks it against the pinned 8.10. The "everything but SliceF" claim is unchecked. Documented-entry counts disagree (268 and 284). | Low |
| ST28 | style-simulator, blade-preview | Small issues: an unknown prop is treated as Fett263; blades over 288 LEDs are cut; glow width depends on LED count; the preview dev hook is in production builds; an edited pasted style keeps its old simulator. | Low |
| ST29 | style-editor | Saving writes whichever mode is showing, even if that mode was never touched. Opening a Full style and clicking the Simple tab, then "Save changes", overwrites the style with the default blue blade. The status still says "Saved". | High |
| ST30 | style-editor | Reopening the editor from the sidebar shows the style as it was before the last saved edits. Saving again overwrites the newer version. | High |
| ST31 | style-editor | Save has no error handling or busy state. A double click on a new style makes two styles. The saved/unsaved status compares both modes, but Save writes one. | Med |
| ST32 | style-editor | Some colours share one live setting (Stardust and Core pulse; two copies of one effect). On the saber one setting drives both, while the preview shows them separately. | Med |
| ST33 | style-editor | Nothing checks that a style compiles before saving. Unknown template names pass as written. The amber note says unmodelled templates "compile and run on the saber as written", which a typo would not. | Med |
| ST34 | style-editor | Never compiled: nine of ten Simple bases; the wipe, fade and instant transitions; every recipe and new-layer starting point; what switching shape, trigger or strength writes; templates rewritten by "Reacts to…"; pattern swaps; the Simple-to-tree conversion. | Med |
| ST35 | style-editor | The printer adds `<>` to argument-less templates and reformats the code. "Byte for byte" holds only with whitespace removed. | Low |
| ST36 | docs | The plan's "not yet" lists are stale (undo exists; drag-and-drop exists in Full mode), and there is no plan entry for the editor work in 94b47fc. | Low |
| ST37 | style-editor | In Simple mode, "Copy the style" copies a line the app's own paste box rejects, under an alias that differs from the saved one. | Low |
| ST38 | style-editor | A Simple style saved as a tree cannot go back, and there is no "save as a copy". | Low |
| ST39 | style-editor | Minor: layer selection or hidden state can move to another layer after a paste; a second ignition/retraction layer can be added; undo history ends when the editor is left. | Low |
| ST40 | style-library | The rule that Hiltwright's styles were composed from ideas only, never from Fett263's code, is a process statement with no check. Recorded for the licence work. | Low |

## Risks / Trade-offs

- [The preview is the product's promise, but nothing has been compared with a real blade] → `hardware-verification-v2` needs a side-by-side pass: a sample of built-in, pasted and editor-built styles on hote2 against the app.
- [Attribution findings (ST13–ST16) touch community relations as much as code] → Triage should treat them together with `license-and-notices`.

## Owner review

Approved by the owner on 2026-09-24 with no overrules: the four specs, D1-D4 and the Findings severities stand as written. The batch is triaged straight after archive.
