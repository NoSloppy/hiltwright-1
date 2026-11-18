# Tasks

This change touches no code. Its tasks are the evidence audit from design.md D3: one line per scenario. For each, confirm the candidate evidence by opening the named test or source, then append the result to the line as `→ test: <file> › <test name>`, `→ hardware: <board>, <date>, <source>`, `→ partial: …` or `→ neither`. Tick the box only once the result is recorded. The candidates below come from the inventory and are not yet confirmed.

## 1. saber-library

- [x] 1.1 A connected saber is still listed after a restart. Candidate: neither (no test; the plan describes the store, no recorded run). → neither
- [x] 1.2 An unreadable store does not stop the app. Candidate: neither. → neither
- [x] 1.3 A reflashed saber keeps its record. Candidate: partial hardware (reconnected after reflash on V2.2 on 2026-09-09 and on the clean PC on 2026-09-20; keeping the same record is not stated). → partial: hardware shows the board reconnecting after a reflash (doc 09 item 10, V2.2, 2026-09-09; plan, clean PC, 2026-09-20), but not that the same record was kept
- [x] 1.4 No serial number is available. Candidate: neither (`Library.matches` untested). → neither
- [x] 1.5 A plan is never mistaken for a board. Candidate: neither. → neither
- [x] 1.6 Presets changed on the saber itself. Candidate: neither. → neither
- [x] 1.7 Named from the config. Candidate: neither. → neither
- [x] 1.8 Connecting keeps a snapshot. Candidate: hardware (commit 6534719, V2.2, 2026-09-09: "library and snapshot written to disk"). → hardware: V2.2, 2026-09-09, commit 6534719 ("library and snapshot written to disk")
- [x] 1.9 A snapshot can be used outside the app. Candidate: partial test (`protocol.test.ts` › presets.ini round-trip covers the codec, not the snapshot file with its header). → partial: test `protocol.test.ts` › presets.ini › "round-trips what the board reported, with escaping" covers the codec; the snapshot file and its header are unchecked
- [x] 1.10 Backups are listed with the saber. Candidate: hardware (backup restore by the owner, 2026-09-20, implies the listing). → hardware: owner, 2026-09-20, plan ("Backups can be put back … Verified on hardware by the owner on 2026-09-20")
- [x] 1.11 A mixed list. Candidate: neither (only fake-connected screenshots after the rewrite). → neither
- [x] 1.12 Choosing a saber to work on offline. Candidate: neither (rewritten 2026-09-22). → neither
- [x] 1.13 Plugging in overrides the choice. Candidate: neither. → neither
- [x] 1.14 Editing a remembered saber. Candidate: neither. → neither
- [x] 1.15 First visit to a remembered saber. Candidate: partial test (`hardware.test.ts`: guessed blades pass validation; the draft itself is untested). → neither (`hardware.test.ts` never builds a draft; correction to the candidate)
- [x] 1.16 Install then restore. Candidate: partial hardware (install V2.2 2026-09-09, restore 2026-09-20; the record update is unchecked). → partial: hardware install (V2.2, 2026-09-09) and restore (owner, 2026-09-20); the record update itself is unchecked
- [x] 1.17 Plan a saber. Candidate: neither (the 2026-09-22 offline check used the flow before the rewrite). → neither
- [x] 1.18 Drop a plan. Candidate: neither. → neither
- [x] 1.19 Adopt on connect. Candidate: neither (the plan says explicitly untested on hardware). → neither
- [x] 1.20 Rename. Candidate: neither. → neither

## 2. app-shell

- [x] 2.1 Opening the app. Candidate: neither (screenshots only). → neither
- [x] 2.2 Pending work is visible from anywhere. Candidate: neither (`queuedLookIds` untested). → neither
- [x] 2.3 A saber with wiring and presets but no install. Candidate: neither. → neither
- [x] 2.4 Minimum window size. Candidate: neither (screenshot checks at 1280×760 on 2026-09-20 predate the rewrite and do not match the code's 1180×700). → neither
- [x] 2.5 Moving the window. Candidate: neither. → neither
- [x] 2.6 Jump to Presets. Candidate: neither. → neither
- [x] 2.7 A page fails. Candidate: neither. → neither
- [x] 2.8 Leaving the editor. Candidate: neither (`editorHistory.test.ts` covers undo, not the guard). → neither
- [x] 2.9 Closing the window. Candidate: neither. → neither
- [x] 2.10 A link to an unknown site. Candidate: neither. → neither

## 3. board-connection

- [x] 3.1 Board plugged in before starting the app. Candidate: hardware (doc 09, V2.2, 2026-09-09; clean PC, 2026-09-20). → hardware: doc 09 "Electron Web Serial, verified 2026-09-09" ("No click is needed"), V2.2; plan, clean PC, 2026-09-20
- [x] 3.2 Board comes back after a reboot. Candidate: hardware (doc 09 item 10, V2.2, 2026-09-09; clean PC install, 2026-09-20). → hardware: doc 09 item 10, V2.2, 2026-09-09 (runtime re-enumerated and Web Serial fired `connect`)
- [x] 3.3 Plug-in event during a reconnect. Candidate: neither (guard added after the race was seen; not re-run). → neither
- [x] 3.4 Leftover lines at open. Candidate: neither (the bug was seen on V2.2; the fix is not recorded as verified). → neither
- [x] 3.5 No board plugged in. Candidate: neither. → neither
- [x] 3.6 Disconnecting. Candidate: neither. → neither
- [x] 3.7 A Hiltwright-built saber. Candidate: hardware (clean PC, 2026-09-20: `v8.10 hiltwright ce12a06`) and test (`protocol.test.ts` OS 8.10 "version is a git keyword…"). → hardware: plan, clean PC, 2026-09-20 (board reported `v8.10 hiltwright ce12a06`); test `protocol.test.ts` › "version survives an unsolicited battery line…" (Hiltwright stamp)
- [x] 3.8 A line printed before the version. Candidate: test (`protocol.test.ts` › "version survives an unsolicited battery line printed on connect"). → test: `protocol.test.ts` › recorded OS 7.8 transcripts › "version survives an unsolicited battery line printed on connect (seen from Electron)"
- [x] 3.9 Firmware that lacks a command. Candidate: partial test (`protocol.test.ts` › "commands the firmware lacks are rejected with Whut?" covers parsing, not the Armory note). → partial: test `protocol.test.ts` › "commands the firmware lacks are rejected with Whut?" covers detection; the Armory note is untested
- [x] 3.10 ProffieOS 8 board. Candidate: test (`tagged.test.ts` › "detects tagging and then frames every command…") and hardware (commit 3143b47, V2.2 OS 8.10, 2026-09-13). → test: `tagged.test.ts` › "detects tagging and then frames every command with a sentinel that ends the response"; hardware: commit 3143b47, V2.2 OS 8.10, 2026-09-13
- [x] 3.11 ProffieOS 7 board. Candidate: test (`tagged.test.ts` › "an OS 7 board that rejects the probe stays untagged"; `protocol.test.ts` › BoardClient 7.8 transcript tests). → test: `tagged.test.ts` › "an OS 7 board that rejects the probe stays untagged"; `protocol.test.ts` › BoardClient › "completes show_current_preset at VARIATION= without waiting for idle" (7.8 transcript)
- [x] 3.12 A preset change on a Fett263 saber. Candidate: test (`protocol.test.ts` › "a Fett263 preset change is all chatter…", transcript os8/31). → test: `protocol.test.ts` › recorded OS 8.10 transcripts › "a Fett263 preset change is all chatter, then the read-back is a clean block" (os8/31, os8/32)
- [x] 3.13 A late answer. Candidate: test (`tagged.test.ts` › "drops late answers to earlier commands…") and hardware (commit 3143b47, 2026-09-13). → test: `tagged.test.ts` › "drops late answers to earlier commands instead of taking them for the current one"; hardware: commit 3143b47, 2026-09-13 (os8/34)
- [x] 3.14 Two quick edits. Candidate: partial test (`protocol.test.ts` › "serialises commands…" covers the client; the app's operation queue is untested). → partial: test `protocol.test.ts` › BoardClient › "serialises commands and routes the SD unmount notice to events" covers the client; the app operation queue is untested
- [x] 3.15 A board several lines behind. Candidate: test (`tagged.test.ts` kick tests, simulated) and hardware (commit 3143b47, V2.2, 2026-09-13; the later silence-only rule was not re-run). → test: `tagged.test.ts` › "kicks a board that runs behind…" and "does not kick a board that is still talking…"; hardware: commit 3143b47 ("Verified live on hote2 while three lines behind"), 2026-09-13; the silence-only rule (c58e6ff, 2026-09-20) was not re-run on hardware
- [x] 3.16 Unknown command typed in the console. Candidate: test (`tagged.test.ts` › "an unknown command inside a tag is reported as Whut? with the real command name"). → test: `tagged.test.ts` › "an unknown command inside a tag is reported as Whut? with the real command name"
- [x] 3.17 Unplug during a command. Candidate: neither (commit ce0d719 fixed what was seen on hardware; the fix was not re-run). → neither
- [x] 3.18 Reboot for an install. Candidate: hardware (doc 09 item 10, V2.2, 2026-09-09; clean PC, 2026-09-20). → hardware: doc 09 item 10, V2.2, 2026-09-09 (RebootDFU dropped the CDC device; the 1200-baud touch was never needed); plan, clean PC, 2026-09-20

## 4. diagnostics

- [x] 4.1 Turning the volume down. Candidate: hardware (owner, 2026-09-20, "Diagnostics sliders"; commit 7280076). → hardware: owner, 2026-09-20, plan ("along with the Diagnostics sliders")
- [x] 4.2 Firmware without the settings commands. Candidate: neither. → neither
- [x] 4.3 Igniting from the app. Candidate: neither (the stress run used the dev hook, not the buttons). → neither
- [x] 4.4 Diagnostics with nothing plugged in. Candidate: neither. → neither
- [x] 4.5 Sending a command. Candidate: neither. → neither
- [x] 4.6 An old voice pack. Candidate: test (`voicepack.test.ts` › "only Fett263 needs the pack, and it needs version 2") and hardware (owner, 2026-09-20, voice pack check). → test: `voicepack.test.ts` › "only Fett263 needs the pack, and it needs version 2"; hardware: owner, 2026-09-20, plan ("the voice pack check")

## 5. presets-ini

- [x] 5.1 The saber's own list. Candidate: test (`protocol.test.ts` › presets.ini › "round-trips what the board reported, with escaping"). → test: `protocol.test.ts` › presets.ini › "round-trips what the board reported, with escaping"
- [x] 5.2 A two-line preset name. Candidate: test (same test; confirm that it includes an escaped newline). → test: same test; the fixture has the two-line name `Battery\nLevel` and the test asserts its escaped form
- [x] 5.3 A preset with no track. Candidate: partial test (confirm the round-trip fixture has an empty track and checks the `end` line). → partial: the same test checks the final `end` line, but no fixture has an empty track
- [x] 5.4 Comments and mixed case. Candidate: test (`protocol.test.ts` › "reads the documented hand-written form, comments and mixed case"). → test: `protocol.test.ts` › presets.ini › "reads the documented hand-written form, comments and mixed case"
- [x] 5.5 Truncated file. Candidate: test (`protocol.test.ts` › "flags a truncated file"). → test: `protocol.test.ts` › presets.ini › "flags a truncated file"

## 6. preset-editing

- [x] 6.1 Editing a plugged-in saber. Candidate: neither (rewritten 2026-09-22). → neither
- [x] 6.2 Editing an unplugged saber. Candidate: neither. → neither
- [x] 6.3 Going back to the saber's own presets. Candidate: neither. → neither
- [x] 6.4 Changing the font live. Candidate: hardware for the board-level write (doc 09, V2.2, 2026-09-09) and test (`session.test.ts` › "waits out the deferred save…"); page path neither. → partial: test `session.test.ts` › editCurrentPreset › "waits out the deferred save…" (font `TeensySF;common`); hardware doc 09 "Live preset edit from Electron, verified 2026-09-09", V2.2; the page path was rewritten 2026-09-22 and is untested
- [x] 6.5 Changing a colour live. Candidate: hardware for the board-level write (plan, hote2, 2026-09-10; commit be1e7b0, 2026-09-13); page path neither. → partial: hardware plan "Looks, 2026-09-10" (hote2, base colour to red and back) and commit be1e7b0 (12/12, 2026-09-13); the page path is untested since the rewrite
- [x] 6.6 A preset list with status lines in it. Candidate: test (`protocol.test.ts` › "list_presets: 13 presets…" and "a delayed show_current_preset ran into the next list_presets…"). → test: `protocol.test.ts` › "the 13 carried-over presets…" (os8/06 includes the SD unmount notice) and "a delayed show_current_preset ran into the next list_presets…" (fixture includes audio underflow lines)
- [x] 6.7 Choosing a preset. Candidate: test (`session.test.ts` › selectPreset) and hardware (doc 09, `set_preset`, 2026-09-09); page path neither. → partial: test `session.test.ts` › selectPreset › "selects, confirms the index and reads the block back through the font-scan chatter"; hardware `set_preset` (doc 09, 2026-09-09); the editor following the saber is untested since the rewrite
- [x] 6.8 Deleting takes two clicks. Candidate: neither. → neither
- [x] 6.9 Reordering live. Candidate: neither. → neither
- [x] 6.10 A confirmed write. Candidate: test (`session.test.ts` › "waits out the deferred save and reports success only after the read-back matches") and hardware for the board-level write (2026-09-08/09); page path neither. → partial: test `session.test.ts` › "waits out the deferred save and reports success only after the read-back matches"; hardware commit 6534719 (V2.2, 2026-09-09); the page chips are untested since the rewrite
- [x] 6.11 The saber never confirms. Candidate: test (`session.test.ts` › "fails honestly when the board never confirms"). → partial: test `session.test.ts` › "fails honestly when the board never confirms" covers the session; the page message is untested
- [x] 6.12 Colour change during a lit blade. Candidate: test (`session.test.ts` › "with the blade on, a style write is saved but not re-applied") and hardware (commit be1e7b0, stress with the blade on, 2026-09-13); the 3 s retraction check is neither. → partial: test `session.test.ts` › "with the blade on, a style write is saved but not re-applied"; hardware commit be1e7b0 (stress-on 12/12, 2026-09-13); the 3 s retraction check (aadd7ff) is untested
- [x] 6.13 Undoing a font change. Candidate: partial test (`session.test.ts` › diffPreset "produces the smallest patch that restores a snapshot"); page path neither. → partial: test `session.test.ts` › diffPreset › "produces the smallest patch that restores a snapshot"; hardware commit 6534719 ("edit + restore confirmed by read-back", V2.2, 2026-09-09) before the rewrite; the History page is untested since
- [x] 6.14 A new style on a live saber. Candidate: neither. → neither
- [x] 6.15 Colours after an install. Candidate: neither (the plan says not yet run against hardware, 2026-09-21). → neither
- [x] 6.16 Presets reordered on the saber. Candidate: neither. → neither
- [x] 6.17 Loading a set onto another saber. Candidate: test (`banks.test.ts` › "maps roles onto a saber's blades and carries the looks it needs"). → partial: test `banks.test.ts` › "maps roles onto a saber's blades and carries the looks it needs" covers the mapping and staging; loading from the page is untested
- [x] 6.18 A font that is not on the card. Candidate: neither. → neither
- [x] 6.19 Installing a staged list. Candidate: neither (the plan says untested on hardware, 2026-09-22). → neither

## 7. Close-out

- [x] 7.1 Summarise the audit at the end of this file as counts per capability (test / hardware / partial / neither); verify the counts add up to 78 scenarios
- [x] 7.2 In `openspec/changes/beta-1-roadmap/tasks.md` task 2.6, add a pointer to this change's Findings table (design.md) and its neither list, so triage starts from them; verify the pointer resolves
- [x] 7.3 Owner review of the six specs and the Findings table; record any overrules of D1 judgements in design.md; verify `openspec validate baseline-board --strict` passes afterwards
- [x] 7.4 Archive with `openspec archive baseline-board`; verify the six specs exist under `openspec/specs/` and `openspec list --specs` shows them

## Audit summary

"Covered" means a test, a hardware check, or both cover the whole scenario. "Partial" means only part of it is covered, usually the board-level step and not the page rewritten on 2026-09-22.

| Capability | Covered | Partial | Neither | Scenarios |
|---|---|---|---|---|
| saber-library | 2 | 3 | 15 | 20 |
| app-shell | 0 | 0 | 10 | 10 |
| board-connection | 11 | 2 | 5 | 18 |
| diagnostics | 2 | 0 | 4 | 6 |
| presets-ini | 4 | 1 | 0 | 5 |
| preset-editing | 1 | 8 | 10 | 19 |
| **Total** | **20** | **14** | **44** | **78** |

Nothing has been checked on a V3. Corrections to the candidates: 1.15 is neither, because no test builds a draft model; 5.3 is partial, because no fixture has an empty track; 6.13 gains hardware evidence from before the rewrite (commit 6534719).
