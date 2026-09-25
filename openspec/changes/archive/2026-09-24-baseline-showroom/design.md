# Design

## Context

This change writes specs for behaviour that already exists (see proposal.md). It uses the method of the four archived baselines. The behaviour was inventoried from the code at 6c66bcc:
- `apps/desktop/src/renderer/src/{Demo.tsx,demoScene.ts,wield.ts,steer.ts,hiltModel.ts,hiltStore.ts,fontEngine.ts,credits.tsx,Contributors.tsx}`
- `apps/desktop/src/main/{hwpack,packs,contributors,ipc}.ts`
- `apps/desktop/scripts/hwpack.ts`

The facts that shape the audit:
- **Owner feedback shaped the room.** The demo room is the most owner-driven feature in the app: the control modes, the default mode, the staff and the pack fits all came from the owner's hands-on feedback on 2026-09-21. Much else was checked only by offscreen screenshots.
- **The sound has never been heard.** The sound engine has never been listened to by a person and has no tests.
- **Only PunkSaber ships.** The only pack in a build is the built-in PunkSaber hilt. The Shadowfoil hilts and the free ProffieOS font packs exist only on the owner's machine.
- **Two small test sets.** Contributors is tested only for its store and link cleaning. The pack format is tested for its round trip and mesh packing.

## Goals / Non-Goals

**Goals:**
- Specs precise enough to sort every scenario by its evidence.
- The last findings list for triage, after which M2 can be ordered.

**Non-Goals:**
- Fixes, which come after triage.
- Deciding the `.hwpack` key question, which stays open for the Shadowfoil conversation (roadmap design, Open Questions).

## Decisions

### D1. The earlier baselines' method applies unchanged
Specs state what holds; defects are findings; code wins over the plan. The evidence kinds are those of `baseline-styles` D2, plus a person listening (`baseline-sd-fonts` D3).
- *Rejected:* re-deciding the method, for the same reason as before: the batches must be comparable.

### D2. The owner's hands-on feedback counts as use
When the plan records the owner using a behaviour and reacting to it ("the owner found it backwards", "Hold the hilt became the default at the owner's word", "the owner liked the staff"), that counts as the owner using it by hand. Offscreen screenshots with synthetic pointer events do not count.
- *Rejected:* counting screenshot checks. They prove the frame rendered, not that the behaviour works for a person holding a mouse.

### D3. The pack format's protection is specified as what it is
The spec states the contents are not readable by opening the file, and that the format describes itself as protection against casual copying only. Where that falls short of what creators might expect, the gaps are findings: the key in the public source, contents reachable through the page's interface, and unsigned credits. They inform the Shadowfoil conversation.
- *Rejected:* specifying stronger protection. It does not exist.
- *Rejected:* leaving protection out of the spec. Creators need to know what they are agreeing to.

### D4. Where the edges are
- **Crediting a loaded hilt:** `contributors`. The demo room only shows it.
- **What the prop does with a style's requests:** `style-simulator`.
- **The font library as a source:** `font-library`.
- **Where the working saber comes from:** `saber-library`. The demo room using the connected or first saber rather than the working one is already `baseline-board` F21.

## Findings for triage

Numbered SR. Severity:
- **High:** the owner's hilts, fits or credits can be lost; creators' work goes uncredited against its licence; or the room misleads about what the saber does in a way a tester would act on.
- **Med:** a visible gap, or misleading.
- **Low:** polish or stale docs.

| # | Capability | Finding | Severity |
|---|---|---|---|
| SR1 | demo-room | Loaded hilts and adjusted pack fits are stored by display name. Loading a file with the same name as a stored hilt silently replaces it, losing its hand-set fit and credit. Loading your own `YS.obj` overwrites the adjusted fit of the YS pack hilt, and "Reset fit" on a pack deletes your own hilt of that name. | High |
| SR2 | demo-room | Removing a loaded hilt has no confirmation, and deletes the stored model for good. | Med |
| SR3 | demo-room | Saving a loaded hilt fails silently (for example, when storage is full): it looks loaded now and is gone next session. | Med |
| SR4 | demo-room | Hilts and room settings are stored per page origin, so hilts loaded under development do not appear in an installed build (or after the dev port changes). There is no export or backup. | Med |
| SR5 | demo-room | Stored scene settings are not checked, so an older or edited store can feed invalid values into the blade geometry. | Low |
| SR6 | demo-room | Changing any Scene setting while the staff blade is on appears to rebuild the staff blade's simulator, replaying its ignition and dropping its held effect. Inferred from reading the code, not reproduced. | Med |
| SR7 | demo-room | The "Point the blade" sliders permanently switch the saved control to Tilt and swing. | Low |
| SR8 | demo-room | Double-clicking the lit blade to retract also fires blaster bolts. | Low |
| SR9 | demo-room | Keys 1–4 raise special abilities under every prop, including those without them. The ability row stays enabled with the blade off. BC's abilities 5–8 are never offered. | Med |
| SR10 | demo-room | Melt always plays drag sounds, although ProffieOS plays a font's own melt sounds when it has them. A lockup with no end sound gets no clash fallback, although ProffieOS plays one. | Med |
| SR11 | demo-room | Fonts without SmoothSwing play no swing sounds at all (plain and accent swings are never played, although ProffieOS plays them), and the room says "no swing sounds". | Med |
| SR12 | demo-room | "From <saber>" loads the preset's style and font but not its colours, and silently keeps the previous style when the preset's can't be simulated. | Med |
| SR13 | demo-room | The sound engine has no tests at all, not even for grouping a font's files. | Med |
| SR14 | demo-room | A real `.glb` hilt has never been tried. A `.gltf` with separate files cannot be loaded, and Draco or meshopt files only produce an error. | Med |
| SR15 | demo-room, docs | Stale text: the staff tooltip still says it shows the same LEDs as the main blade; the hilt-size comment says 20–40 cm (the code uses 15–50, and the Length slider stops at 45); the plan's wording differs from the code ("Your looks", "As on <saber>", "blade brightness"). | Low |
| SR16 | demo-room | Minor: twist stops at ±180°; clicking the staff blade never lands a blast; the Scene reset also resets blade size and the staff. | Low |
| SR17 | hwpack | The key is in the public source, so anyone can decrypt a pack. The format says it only stops casual copying, but nothing tells creators so. | Med |
| SR18 | hwpack | Unlocked pack contents (every sound of a font, a hilt's full mesh) can be pulled through the page's own interface with the developer tools, which packaged builds do not disable. | Med |
| SR19 | hwpack | A pack's header is not signed, so anyone can rewrite its creator, licence or permissions. The packing tool's own credit command does exactly that by design. | Med |
| SR20 | hwpack | The readable header lists every item's name and size, and a font pack's full `config.ini` and `smoothsw.ini`. | Low |
| SR21 | hwpack | A crafted pack (possible, since the key is public) can exhaust memory in the main process. Header fields are not validated, and a pack missing its permissions breaks the demo room's font list. | Med |
| SR22 | hwpack | The pack folder override (`HILTWRIGHT_PACKS`) works in packaged builds. This is the same pattern as `baseline-board` F25. | Med |
| SR23 | hwpack | "May be copied to a card" is recorded in font packs but never read. There is no way to copy a pack font to a card. | Low |
| SR24 | hwpack, contributors | Pack fonts are never credited: their creator and licence (CC BY-SA 4.0 for the free ProffieOS fonts) are not shown in the demo room, and the Contributors page leaves pack fonts out. | High |
| SR25 | hwpack | Looking up a preset's font among packs ignores whether the pack allows playback, so it can pick one that then refuses to play. | Low |
| SR26 | hwpack | The font packer leaves out pre-on, post-off, fast-on and power-off sounds, which the demo room plays. | Med |
| SR27 | hwpack | Pack fonts have no memory cap, unlike card and library fonts. | Low |
| SR28 | hwpack | In a build, only PunkSaber ships, and the owner has no way to find the folder where other packs would go. | Low |
| SR29 | hwpack | Every pack file is read into memory just to list it, and kept for the session. A pack changed on disk is not seen until restart. | Low |
| SR30 | hwpack | Any pack with the built-in's identity silently replaces the built-in hilt and its credit. | Low |
| SR31 | hwpack | Tool gaps: `credit` is missing from the help, rewrites a pack in place (a crash can corrupt it), and rewrites unchanged with no flags; an unknown finish silently falls back; bad fit JSON crashes the tool. | Low |
| SR32 | hwpack, docs | GLB hilt packing exists only on another branch. The plan calls the Shadowfoil hilts "the owner's hilts" in one entry and credits Shadowfoil Props in another. Nothing records whether Shadowfoil has agreed even to local packing. The pack entry in the plan is buried inside another entry. | Med |
| SR33 | contributors | A damaged contributors file loads as empty, and the next save overwrites it, losing every link. Logo files are left orphaned. | High |
| SR34 | contributors | Two saves at once share one temporary file, and logo and link changes don't wait for the start-up handover of old logos. | Med |
| SR35 | contributors | Changing a logo deletes the old file before the list is saved, so a failed save leaves a reference to a missing file. | Low |
| SR36 | contributors | Renaming a style's author leaves the logo and link under the old name. | Med |
| SR37 | contributors | Names differing only in case merge, but the Contributors page and the store can show different spellings. | Low |
| SR38 | contributors | Names and links are cut to length before validation, so a long link can be saved in a truncated, wrong form. | Low |
| SR39 | contributors | Opening a link does not re-check it, so a hand-edited store could make the app open a non-web address. | Med |
| SR40 | contributors | Logos are checked by file extension only. The risk is low, because they only show as images. | Low |

## Risks / Trade-offs

- [The sound half of "demo … fonts" has never been heard] → The listening pass already planned in `hardware-verification-v2` must include the demo room: hum, SmoothSwing, pre-on and post-off, effects, and melt.
- [Findings SR17–SR19 and SR24 bear on creators] → Triage should put them alongside `style-attribution` and `license-and-notices`, and in front of the Shadowfoil conversation.

## Owner review

Approved by the owner on 2026-09-24 with no overrules: the three specs, D1-D4 and the Findings severities stand as written. The batch is triaged straight after archive.
