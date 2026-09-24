# Tasks

This change touches no code. Its tasks are the evidence audit, as in the earlier baselines. For each scenario, confirm the candidate by opening the named test or source, then append the result:
- `→ test: <file> › <name>`
- `→ hardware: <what>, <date>, <source>` (an owner check recorded in session notes counts, labelled; see design D2)
- `→ partial: …`
- `→ neither`

Tick the box only once the result is recorded. The candidates below come from the inventory and are not yet confirmed.

## 1. font-library

- [x] 1.1 A font copied in by hand. Candidate: neither. → neither
- [x] 1.2 A font folder stays clean. Candidate: test. `fontLibrary.test.ts` › "adds a folder of fonts, keeps names unique, remembers what the owner said, and moves" (details kept in the library's index; confirm nothing is written inside the font). → partial: `fontLibrary.test.ts` › "adds a folder of fonts, keeps names unique, remembers what the owner said, and moves" shows details are kept in the library index, but nothing asserts the font folder is untouched (correction to the candidate)
- [x] 1.3 Moving the library to another drive. Candidate: partial (that test moves on the same drive only). → partial: `fontLibrary.test.ts` › "adds a folder of fonts… and moves" moves on the same drive only
- [x] 1.4 Adding a downloaded package. Candidate: test. `fontLibrary.test.ts` › "adds a zip package, keeps only the Proffie variant, and describes what it supports"; plan: the free ProffieOS fonts were imported on 2026-09-22 (not stated as done by the owner). → test: `fontLibrary.test.ts` › "adds a zip package, keeps only the Proffie variant, and describes what it supports" (added, name, from, support, staging removed); plan: free ProffieOS fonts imported 2026-09-22, not stated as done by the owner
- [x] 1.5 A package that is not a font. Candidate: neither. → neither
- [x] 1.6 A path-escaping entry. Candidate: test. `fontLibrary.test.ts` › "refuses a zip entry that escapes its folder". → test: `fontLibrary.test.ts` › "refuses a zip entry that escapes its folder"
- [x] 1.7 A package with several board variants. Candidate: test. `fontLibrary.test.ts` › "adds a zip package, keeps only the Proffie variant…". → test: `fontLibrary.test.ts` › "adds a zip package, keeps only the Proffie variant…" (only "Kyber Ember" added)
- [x] 1.8 The same font added twice. Candidate: test. `fontLibrary.test.ts` › "adds a folder of fonts, keeps names unique…" (`Alpha-2`). → test: `fontLibrary.test.ts` › "adds a folder of fonts, keeps names unique…" (`Alpha-2`, original untouched)
- [x] 1.9 A multi-font package. Candidate: test. `fontLibrary.test.ts` › "bundles several fonts from one package, and hands old makers logos over". → test: `fontLibrary.test.ts` › "bundles several fonts from one package, and hands old makers logos over"
- [x] 1.10 A font with effect folders. Candidate: test. `fontLibrary.test.ts` › "names sounds the way ProffieOS plays them". → test: `fontLibrary.test.ts` › "names sounds the way ProffieOS plays them" (`clsh/clsh1.wav`, `clsh/001.wav` → clash)
- [x] 1.11 A stereo font. Candidate: partial. The check itself is tested in `fonts.test.ts` › "flags 48 kHz, stereo, 24-bit and a missing hum"; the library showing it is untested. → partial: `fonts.test.ts` › "flags 48 kHz, stereo, 24-bit and a missing hum" tests the check; the library showing it is untested
- [x] 1.12 Searching by maker. Candidate: neither. → neither
- [x] 1.13 Renaming for display only. Candidate: partial. `fontLibrary.test.ts` (details saved); the page wording is untested. → partial: `fontLibrary.test.ts` › "adds a folder of fonts…" (display name and maker saved); the page wording is untested
- [x] 1.14 Giving a bundle one maker. Candidate: neither. → neither
- [x] 1.15 Hearing a clash. Candidate: neither (the plan says playback has not been heard by a person). → neither (plan 2026-09-22: playback not yet heard by a person)
- [x] 1.16 Removing by mistake. Candidate: partial. `fontLibrary.test.ts` uses a stub recycle bin. → partial: `fontLibrary.test.ts` › "adds a folder of fonts…" removes to a stub recycle bin; the real bin is untested
- [x] 1.17 Declining the offer. Candidate: neither. → neither

## 2. sd-card

- [x] 2.1 A card in a reader. Candidate: neither (no recorded run against a real card in a reader). → neither
- [x] 2.2 A removable drive that is not a saber card. Candidate: neither. → neither
- [x] 2.3 A font with one folder per sound. Candidate: test. `sdLayout.test.ts` › "finds fonts laid out flat and fonts with one folder per sound". → test: `sdLayout.test.ts` › "finds fonts laid out flat and fonts with one folder per sound"
- [x] 2.4 Browsing the card. Candidate: partial. `sdLayout.test.ts` covers listing; the page is untested. → partial: `sdLayout.test.ts` covers listing (names, file counts, clash counts); the page is untested
- [x] 2.5 Mixed naming. Candidate: test. `fonts.test.ts` › "flags mono/poly mixing…". → test: `fonts.test.ts` › "flags mono/poly mixing for the same effect, per effect"
- [x] 2.6 A 48 kHz font. Candidate: test. `fonts.test.ts` › "flags 48 kHz, stereo, 24-bit and a missing hum". → test: `fonts.test.ts` › "flags 48 kHz, stereo, 24-bit and a missing hum"
- [x] 2.7 A version 2 voice pack. Candidate: partial. `voicepack.test.ts` covers parsing; reading from the card is untested; the owner's 2026-09-20 check does not say which path. → partial: `voicepack.test.ts` › "parses voicepack.ini…" and "recognises the menu number sounds…"; reading from the card is untested; the owner's 2026-09-20 voice pack check does not say which path
- [x] 2.8 Copying a new font. Candidate: neither. → neither
- [x] 2.9 The font is already on the card. Candidate: neither. → neither
- [x] 2.10 Two fonts missing from the card. Candidate: neither. → neither
- [x] 2.11 Sharing the card. Candidate: hardware (owner, hote2, 2026-09-21: `sd 1` mounted as H:; session notes only). → hardware: owner, hote2, 2026-09-21, session notes ("sd 1 mounts as H: after a moment"); the plan still says untested (SF22)
- [x] 2.12 Vendor firmware. Candidate: neither. → neither
- [x] 2.13 A file is open on the card. Candidate: neither (giving the card back has never been run). → neither (giving the card back has never been run)
- [x] 2.14 Browsing and checking only. Candidate: neither. → neither

## 3. xenopixel-import

- [x] 3.1 Choosing the wrong folder. Candidate: partial. `importer.test.ts` › "lists the fonts on the card… skipping empty slots"; the "none found" message is untested. → partial: `importer.test.ts` › "lists the fonts on the card with their names, colours and counts, skipping empty slots"; the "none found" message is untested
- [x] 3.2 A font already converted. Candidate: test. `importer.test.ts` › "refuses to overwrite unless asked, and refuses unsafe folder names". → test: `importer.test.ts` › "refuses to overwrite unless asked, and refuses unsafe folder names"

## 4. Close-out

- [x] 4.1 Summarise the audit at the end of this file as counts per capability (covered / partial / neither); verify the counts add up to 33 scenarios
- [x] 4.2 In `openspec/changes/beta-1-roadmap/tasks.md` task 2.6, add this change's Findings (SF1–SF34) and uncovered scenarios as the third triage batch's inputs; verify the pointer resolves
- [x] 4.3 Owner review of the three specs and the Findings table, recording any overrules in design.md; verify `openspec validate baseline-sd-fonts --strict` passes afterwards
- [x] 4.4 Archive with `openspec archive baseline-sd-fonts`; verify the three specs appear in `openspec list --specs`

## Audit summary

"Covered" means a test, a hardware check or both cover the whole scenario. "Partial" means only part of it is covered.

| Capability | Covered | Partial | Neither | Scenarios |
|---|---|---|---|---|
| font-library | 6 | 5 | 6 | 17 |
| sd-card | 4 | 2 | 8 | 14 |
| xenopixel-import | 1 | 1 | 0 | 2 |
| **Total** | **11** | **8** | **14** | **33** |

The uncovered scenarios are everything that touches a real card except sharing over USB, all library playback (never heard by a person), and the page-level behaviour of both pages. Correction to the candidates: 1.2 is partial, because no test asserts the font folder stays untouched.
