# Design

## Context

This change writes specs for behaviour that already exists (see proposal.md). It uses the method of the archived `baseline-board` and `baseline-firmware` (their design D1–D4), which is not repeated here. The behaviour was inventoried from the code at 21241bd:
- `apps/desktop/src/renderer/src/{Fonts,FontLibrary,XenoImport}.tsx`
- `apps/desktop/src/main/{sd,fontLibrary,unzip,importer,ipc}.ts`
- `packages/core/src/{fonts,voicepack,xenopixel}.ts`

The evidence came from the tests, docs 00, 03 and 09, commit messages, and one owner report recorded in the project's session notes (see D2).

The facts that shape the audit:
- The font library was built on 2026-09-22 and first committed on 2026-09-23. Its only recorded use is an import of the free ProffieOS fonts, and no person has heard its playback.
- The card page has no recorded run against a real card in a reader.
- Sharing the card over USB was seen working by the owner on hote2, but giving it back never was.

## Goals / Non-Goals

**Goals:**
- Specs precise enough to sort every scenario by its evidence.
- One list of every defect and gap here, for the third triage batch. This area holds files the owner cannot easily replace, so anything that could lose, hide or corrupt them is marked High.

**Non-Goals:**
- Fixes, which come after triage.
- A hardware-verification task. This change touches no code; new runs belong to `hardware-verification-v2` and `v3-verification`.

## Decisions

### D1. The earlier baselines' method applies unchanged
Specs state what holds; defects are findings; code wins over the plan.
- *Rejected:* re-deciding the method, for the same reason as before: the batches must be comparable.

### D2. An owner's check recorded in session notes counts, labelled as such
The owner saw sharing over USB work on hote2 on 2026-09-21. That is recorded in the project's session notes but not in the plan, which still says "untested on hardware". The audit counts it as a hardware check, labelled "owner, session notes". Finding SF22 asks for the plan to be corrected.
- *Rejected:* ignoring it, which would understate what is known.
- *Rejected:* counting session notes in general as evidence. Only a first-hand owner check with a date counts.

### D3. Listening is its own kind of check
Playback scenarios need a person listening, not a board. They are marked *Needs a person listening*, and nothing short of that covers them.
- *Rejected:* counting an offscreen playback run. It has no audio device.

### D4. Where the edges are
- **Presets:** font suggestions and the font picker belong to `preset-editing`.
- **Demo room:** font sound belongs to `demo-room` (`baseline-showroom`).
- **Makers' logos:** belong to `contributors` (`baseline-showroom`).
- **Voice pack read through the saber:** belongs to `diagnostics`.
- **Here:** the voice pack line read from the card, and copying fonts from the library to the card (the library supplies them; the card page owns the copy).
- *Rejected:* specifying the library's appearance inside other pages. That would duplicate their specs.

## Findings for triage

Numbered SF to keep them apart from F (`baseline-board`) and FW (`baseline-firmware`). Severity:
- **High:** can lose, hide or corrupt the owner's fonts or card, or silently leave fonts out.
- **Med:** misleading, or a visible gap.
- **Low:** polish or stale docs.

| # | Capability | Finding | Severity |
|---|---|---|---|
| SF1 | font-library | A missing or moved library folder (for example a drive letter now used by another drive) is silently replaced by an empty one, and the page says "No fonts yet". An absent drive shows a raw error. | Med |
| SF2 | font-library | The details file (names, makers, bundles, notes) is written in place with no backup. After a crash mid-write or a broken hand edit it reads as empty, and the next save overwrites it. | High |
| SF3 | font-library | Moving the library into one of its own sub-folders fails part-way. Fonts already moved end up hidden one level down, and their details are lost. Moving into a parent folder mixes fonts with other files. | High |
| SF4 | font-library | A move into a folder that already has a font of the same name renames the moved one to "-2", so presets naming that folder now play a different font. A same-named logo file is overwritten. | Med |
| SF5 | font-library | The "keep only the Proffie variant" rule keeps any font whose path contains "proffie", its own name included. A folder of fonts where one is called, say, "ProffieOS Default" imports only that one, silently. | High |
| SF6 | font-library | Adding a single font folder can pull in an unrelated `tracks` folder that sits beside it (for example in Downloads), while tracks further up a deep package are never found. | Med |
| SF7 | font-library | Adding silently drops files other than wav, ini, txt, md, pdf, jpg and png. That includes licences in .rtf, .docx or .html, and .mp3 files. | Med |
| SF8 | font-library | Zip entries are not checked against their CRCs, so a corrupted uncompressed entry is imported without warning. | Med |
| SF9 | font-library | Moving to the recycle bin has not been checked on USB or network drives, where it may fail or delete outright. | Low |
| SF10 | font-library | The one-time offer to import the old font folder is dismissed for good even when the import added nothing. | Low |
| SF11 | font-library | "Set maker for all" with a blank maker clears every maker in the bundle without confirmation. A failure part-way leaves some fonts changed. | Low |
| SF12 | font-library | Sounds added or removed outside the app are not reflected until restart. | Low |
| SF13 | font-library | Any unrecognised `.wav` name (such as `readme.wav`) counts as a special effect. | Low |
| SF14 | font-library | The "not a font" message says a hum is needed, but other core sounds also qualify. A zip's sound count includes `__MACOSX` junk. | Low |
| SF15 | font-library | `smoothsw.ini` is read but never used or shown. | Low |
| SF16 | font-library | The size chip pairs a sound count without tracks with a size that includes them. | Low |
| SF17 | font-library | Docs are stale: logos are still described as kept in the library, and "where it came from" as editable. | Low |
| SF18 | font-library | A logo removed from the contributors list can come back after restart from the library's old logo entries. | Low |
| SF19 | font-library | Adding the library folder itself, or a font already in it, duplicates everything as "-2" copies. | Low |
| SF20 | font-library | Trailing dots are not stripped from folder names (Windows rejects them). A crash mid-import leaves a hidden staging folder. Details are keyed by exact folder case. | Low |
| SF21 | sd-card | Two font checkers disagree. The card's checker treats `clsh/clsh1.wav` as unknown and `hum/hum1.wav` as no hum (a false error), runs track files through the sound checks, and reads fewer header bytes. The same font can be "Ready" in the library and have issues on the card. | Med |
| SF22 | sd-card, docs | The plan says sharing over USB is untested; the owner saw it work on 2026-09-21. Giving the card back and `sd 0` have never been run anywhere. USB copy speed (plan measurement 5) is still open. | Low |
| SF23 | sd-card | After sharing, the page still shows the first ProffieOS card it finds. With a card reader also plugged in, it can show, and copy to, the wrong card. | Med |
| SF24 | sd-card | While the card is shared, nothing stops the saber being asked to write to it: preset edits from other pages, or the Xenopixel "Add a preset for each". The saber writing `presets.ini` while Windows has the card mounted risks corrupting the card. | High |
| SF25 | sd-card | Giving the card back is not confirmed: the saber's answer is not checked. A disconnect while shared resets the page without ejecting, so the page can say idle while the card is still released or mounted. | Med |
| SF26 | sd-card | "Replace on card" merges the new font into the old folder instead of replacing it, with no confirmation. An old monophonic set plus a new polyphonic one silently makes a mixed font. | High |
| SF27 | sd-card | An interrupted copy leaves a partial font folder, which then blocks a retry as "already on the card". There is no free-space check before copying. Over USB, copies take minutes. | High |
| SF28 | sd-card | The folder-copy path allows `;` and `,` in font folder names, which break ProffieOS font paths. The library and the Xenopixel path strip them. | Med |
| SF29 | sd-card | "Fonts the presets use" offers a copy that is bound to fail when a non-font folder of that name is on the card. | Low |
| SF30 | sd-card | Planned but not built: keeping the exact config and a pointer to the ProffieOS source on the card (the plan ties this to GPL), and naming conversion in the SD manager outside the Xenopixel import. | Med |
| SF31 | sd-card | The card is looked for only when the page opens or on "Look again". The first ProffieOS card wins, with no choice. A failing drive query is silent. The development override of the card location is live in packaged builds. | Low |
| SF32 | sd-card | Ejecting on Linux passes a mount path where a block device is expected. | Low |
| SF33 | sd-card | Small issues: a lone `presets.tmp` shows as "presets.ini present"; a card with only menu sounds shows voice pack version 1; lockup is listed twice among effect names. | Low |
| SF34 | xenopixel-import | Still visible: the hide switch is not built yet (covered by `hide-for-beta-1`). A track-name collision overstates the track count, and the `poweron` to `boot` mapping has no test. | Low (hidden in Beta 1) |

## Risks / Trade-offs

- [High findings touch files the owner paid for] → Triage should put SF2, SF3, SF5, SF24, SF26 and SF27 in M2. Library data loss and card corruption are exactly what a Beta 1 tester would never forgive.
- [Playback has never been heard] → `hardware-verification-v2` gets a listening pass: the library, the font picker, and the demo room once `baseline-showroom` is written.

## Owner review

Approved by the owner on 2026-09-24 with no overrules: the three specs, D1-D4 and the Findings severities stand as written. The batch is triaged straight after archive.
