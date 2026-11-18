# Tasks

This change touches no code. Its tasks are the evidence audit, as in the earlier baselines, with the evidence kinds from design D1 and D2. For each scenario, confirm the candidate by opening the named test or source, then append the result:
- `→ test: <file> › <name>`
- `→ owner used: <date>, <source>`
- `→ listened: <date>, <source>`
- `→ screenshots only: <date>`
- `→ partial: …`
- `→ neither`

Tick the box only once the result is recorded. The candidates below come from the inventory and are not yet confirmed.

## 1. demo-room

- [x] 1.1 Opening from a style. Candidate: screenshots only (2026-09-21, plan: "not yet driven by hand"). → neither (screenshots only, 2026-09-21: plan says "verified by offscreen screenshots with synthetic pointer events; not yet driven by hand")
- [x] 1.2 A red blade in a dark room. Candidate: screenshots only (2026-09-21). → neither (screenshots only, 2026-09-21: plan says "verified by offscreen screenshots with synthetic pointer events; not yet driven by hand")
- [x] 1.3 A sideways sweep. Candidate: test `wield.test.ts` › "a sweep from left to right carries the blade through forward, level…"; owner used (2026-09-21, plan: hold-the-hilt corrected after the owner's feedback, then made the default). → test: `wield.test.ts` › "a sweep from left to right carries the blade through forward, level, not up and over"; owner used: 2026-09-21 (plan: corrected after the owner's feedback, then made the default at the owner's word)
- [x] 1.4 Switching control. Candidate: partial. `steer.test.ts` covers steering; owner used (the owner chose the default and each mode's pose, 2026-09-21); the reset on switching is untested. → partial: `steer.test.ts` (all three tests) cover steering; owner used: the owner chose the default mode and each mode's pose (2026-09-21, plan); the reset on switching is untested
- [x] 1.5 Aiming by number. Candidate: neither. → neither
- [x] 1.6 Resetting the view. Candidate: neither. → neither
- [x] 1.7 A blaster bolt where clicked. Candidate: screenshots only (2026-09-21). → neither (screenshots only, 2026-09-21: plan says "verified by offscreen screenshots with synthetic pointer events; not yet driven by hand")
- [x] 1.8 A prop without abilities. Candidate: neither. → neither
- [x] 1.9 Loading a preset. Candidate: neither. → neither
- [x] 1.10 Choosing another prop. Candidate: neither. → neither
- [x] 1.11 Picking a library font. Candidate: neither (never heard). → neither (the sound has never been heard by a person)
- [x] 1.12 Swinging with a SmoothSwing font. Candidate: neither (never heard, no tests). → neither (never heard; the sound engine has no tests)
- [x] 1.13 A font with pre-on. Candidate: partial. `wavlen.test.ts` covers the simulator reading sound lengths; the sound was never heard. → partial: `wavlen.test.ts` covers the simulator reading sound lengths; the sound has never been heard
- [x] 1.14 A shorter blade. Candidate: neither (the owner asked for it, 2026-09-21; no use recorded). → neither (the owner asked for it on 2026-09-21; no use recorded)
- [x] 1.15 A staff with two styles. Candidate: owner used (2026-09-21, plan: "The owner liked the staff, so it was finished"). → owner used: 2026-09-21 (plan: "The owner liked the staff, so it was finished")
- [x] 1.16 Choosing a pack hilt. Candidate: owner used (2026-09-21, plan: pack fits set by hand by the owner). → owner used: 2026-09-21 (plan: pack hilts "with fits the owner set by hand")
- [x] 1.17 A CAD-exported OBJ. Candidate: test `hiltModel.test.ts` › "a hilt drawn around its bore keeps the bore on the blade…", "an OBJ with its .mtl gets its colours…"; owner used (the owner's wobble report, 2026-09-21). → test: `hiltModel.test.ts` › "a hilt drawn around its bore keeps the bore on the blade…", "an OBJ with its .mtl gets its colours…"; owner used: the owner's OBJ wobble report led to the fit fix (2026-09-21, plan)
- [x] 1.18 Adjusting the seat. Candidate: test `hiltModel.test.ts` › "seats the blade deeper…"; owner used (pack fits set by hand, 2026-09-21). → test: `hiltModel.test.ts` › "seats the blade deeper in the hilt by finished millimetres…"; owner used: pack fits set by hand (2026-09-21)

## 2. hwpack

- [x] 2.1 Reading a pack's credit. Candidate: partial. `hwpack.test.ts` › "round-trips items through the pack, and refuses a tampered one" (manifest item names only). → partial: `hwpack.test.ts` › "round-trips items through the pack, and refuses a tampered one" checks the manifest's item names only, not the credit fields
- [x] 2.2 Opening a pack in another program. Candidate: test. `hwpack.test.ts` › "round-trips items…" (confirm it asserts the plain bytes are absent). → test: `hwpack.test.ts` › "round-trips items through the pack…" (asserts the plain WAV bytes are absent from the pack)
- [x] 2.3 A tampered pack. Candidate: test. `hwpack.test.ts` › "round-trips items through the pack, and refuses a tampered one". → test: `hwpack.test.ts` › "round-trips items through the pack, and refuses a tampered one"
- [x] 2.4 Playing a pack font. Candidate: neither (by inspection only; never heard). → neither (memory-only by inspection; never heard)
- [x] 2.5 A multi-body hilt. Candidate: test. `hwpack.test.ts` › "turns an OBJ with its MTL into a packed mesh with a material per body, merged across bodies". → test: `hwpack.test.ts` › "turns an OBJ with its MTL into a packed mesh with a material per body, merged across bodies"
- [x] 2.6 The built-in hilt. Candidate: partial. Commit 2cfe0e9 and the plan (2026-09-22) say it ships; no recorded fresh-install check. → partial: commit 2cfe0e9 and the plan (2026-09-22) say it ships in the build; no fresh-install check is recorded
- [x] 2.7 A font that allows playback. Candidate: neither. → neither
- [x] 2.8 Correcting a credit. Candidate: owner used (2026-09-22: the five hilt packs recredited to Shadowfoil Props with the tool, commit 37b000b). → owner used: 2026-09-22, commit 37b000b (the five hilt packs recredited to Shadowfoil Props with the packing tool)

## 3. contributors

- [x] 3.1 Same maker, different case. Candidate: test. `contributors.test.ts` › "keeps a logo and a link per person, matching names regardless of case". → test: `contributors.test.ts` › "keeps a logo and a link per person, matching names regardless of case"
- [x] 3.2 A file that is not a picture. Candidate: test. Same test (`.exe` refused). → test: same test (`x.exe` refused with a message naming PNG)
- [x] 3.3 A bare domain. Candidate: test. `contributors.test.ts` › "accepts web addresses only". → test: `contributors.test.ts` › "accepts web addresses only"; the case test stores `https://fett263.com/`
- [x] 3.4 A new logo. Candidate: neither. → neither
- [x] 3.5 Upgrading from the old library. Candidate: partial. `fontLibrary.test.ts` › "bundles several fonts from one package, and hands old makers logos over" covers finding the old logos; the handover is untested. → partial: `fontLibrary.test.ts` › "bundles several fonts from one package, and hands old makers logos over" finds the old logos; the handover at start is untested
- [x] 3.6 A maker with fonts and styles. Candidate: neither. → neither
- [x] 3.7 Crediting a hilt. Candidate: neither. → neither

## 4. Close-out

- [x] 4.1 Summarise the audit at the end of this file as counts per capability (covered / partial / neither); verify the counts add up to 33 scenarios
- [x] 4.2 In `openspec/changes/beta-1-roadmap/tasks.md` task 2.6, add this change's Findings (SR1–SR40) and uncovered scenarios as the fifth triage batch's inputs; verify the pointer resolves
- [x] 4.3 Owner review of the three specs and the Findings table, recording any overrules in design.md; verify `openspec validate baseline-showroom --strict` passes afterwards
- [x] 4.4 Archive with `openspec archive baseline-showroom`; verify the three specs appear in `openspec list --specs`

## Audit summary

"Covered" means a test, the owner's own use or a person listening covers the whole scenario. Screenshot-only checks count as neither (design D2). "Partial" means only part of it is covered.

| Capability | Covered | Partial | Neither | Scenarios |
|---|---|---|---|---|
| demo-room | 5 | 2 | 11 | 18 |
| hwpack | 4 | 2 | 2 | 8 |
| contributors | 3 | 1 | 3 | 7 |
| **Total** | **12** | **5** | **16** | **33** |

No sound in the demo room has ever been heard by a person. The owner's own use (both control modes, the staff, pack hilt fits, the OBJ fit fix) is the strongest evidence in this area. Three scenarios (1.1, 1.2, 1.7) were checked only by offscreen screenshots.
