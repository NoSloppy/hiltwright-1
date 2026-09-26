# Tasks

## 1. The saber library and snapshots

- [x] 1.1 Add `apps/desktop/test/library.test.ts` (design D3), one test per scenario, named after it:
  - 1.1 listed after a restart (a second `Library` on the same file lists the saber with name, config, presets and last seen)
  - 1.2 an unreadable store lists no sabers and does not throw, for both unparseable JSON and a wrong `version`
  - 1.4 no serial: matched when config, install stamp and blade layout all agree, and a new record when any differs
  - 1.5 a planned saber is never matched by a connecting board
  - 1.6 presets are replaced and the name kept on reconnect
  - 1.7 `config/hiltwright_hote2.h` is named "hote2"
  - 1.18 removing a plan drops it and leaves the rest
  - 1.20 rename: a new name is kept after reconnecting, and a blank name keeps the old one

  Add `it.fails` for "records of the wrong shape read as no sabers" (owner: `library-integrity`). Verify with `npm test`: the normal tests pass, and the expected-failure test is reported as expected.
  - **Result, 2026-09-25.** `library.test.ts`: 8 scenario tests pass, and the expected-failure test fails as intended. Run as a normal test, it throws `TypeError: Cannot read properties of undefined (reading 'localeCompare')`, which is the defect filed as BST-1.
- [x] 1.2 Add `apps/desktop/test/snapshots.test.ts` for 1.9. A saved snapshot keeps its `#` header, parses back to the same presets with `parsePresetsIni`, and ends with `end`. Verify with `npm test`.
  - **Result, 2026-09-25.** `snapshots.test.ts`: 1 test passes. It covers the header lines, the final `end`, the round trip through `parsePresetsIni`, `read()` and `list()`, with a label containing a line break and a preset with an empty track.

## 2. Drafts and queued styles

- [x] 2.1 In `draftModel.test.ts`, add:
  - 1.15: a record with no saved model gives one blade per reported pixel count and the reported presets
  - 6.16: after the saber reorders presets, each keeps the styles chosen for it by name

  Add `it.fails` for "two presets with the same or a blank name keep their own styles" and "a preset renamed and moved does not take its new position's styles" (owner: `preset-editor-fixes`). Add `it.fails` for "a new saber whose config names V3 is drafted as V3" (owner: `install-target-safety`, FW3). Verify with `npm test`.
  - **Result, 2026-09-25.** `draftModel.test.ts`: 1.15 and 6.16 pass. Run as normal tests, the three expected failures fail with exactly the filed defects: `[look_2, look_2]` where `[look_1, look_2]` was expected, `[look_b, look_b]` where `[look_b, null]` was expected, and `V2` where `V3` was expected.
- [x] 2.2 In `saberModel.test.ts`, add 6.14. A chosen style missing from the installed firmware is queued, one in the firmware is not, and with no firmware record every chosen style is queued. Verify with `npm test`.
  - **Result, 2026-09-25.** `saberModel.test.ts`: 3 tests for 6.14 pass. A style is counted once however many slots use it, it is not queued when the firmware has it, and every chosen style is queued on firmware Hiltwright did not build.

## 3. Connection and queue

- [x] 3.1 Add `apps/desktop/src/renderer/src/boardOps.ts` with `connectGate` and `serialQueue` (design D2), and add `apps/desktop/test/boardOps.test.ts`:
  - 3.3: a second attempt while one is in flight is skipped, an attempt while a port is open is skipped, and the gate reopens after an attempt throws
  - 3.14: queued operations finish in the order queued, and a failing one does not stop the next

  Verify with `npm test`.
  - **Result, 2026-09-25.** `boardOps.ts` exports `connectGate` and `serialQueue`. `boardOps.test.ts`: 5 tests pass (3 for 3.3 and 2 for 3.14).
- [x] 3.2 Use `connectGate` and `serialQueue` in `board.ts` in place of the inline guard and queue, keeping the log line and behaviour (design D2). Verify with `npm run typecheck` and in task 5.1.
  - **Result, 2026-09-25.** `board.ts` holds one gate and one queue (`useState` initialisers), in place of the `connecting` ref and the inline promise chain. The log line "connect skipped: already connecting" is unchanged. The type check is clean. Checked on hote2 in task 5.1.

## 4. Codec and findings

- [x] 4.1 In `packages/core/test/protocol.test.ts`, add 5.3. A preset with an empty track emits a `track=` line with nothing after it, parses back as an empty track, and the file ends with `end`. Verify with `npm test`.
  - **Result, 2026-09-25.** `protocol.test.ts`: the new 5.3 test passes (line 3 is `track=`, and the file ends with `variation=3`, then `end`, and reads back unchanged). There are 30 protocol tests.
- [x] 4.2 File the findings (design D4) as `BST-1`…`BST-5` bullets in the proposals of `library-integrity`, `preset-editor-fixes`, `install-target-safety` (under FW3), `connection-robustness` and `hardware-verification-v2`, naming the pinning test where there is one. Verify with `openspec validate` on each changed change, and by reading the bullets.
  - **Result, 2026-09-25.** BST-1 to BST-5 are filed in `library-integrity`, `preset-editor-fixes`, `install-target-safety` (joins FW3), `connection-robustness` and `hardware-verification-v2`. `openspec validate` reports the same single error on each before and after the edit: "Change must have at least one delta". These are proposal-only stubs whose specs are written when each is proposed. The bullets add no error.

## 5. Checks

- [x] 5.1 Hardware check on V2.2 hote2 (`-Board`, scratch folder), per design D5: connect, disconnect, then call the auto-connect hook twice at once. Verify that the log shows exactly one `port opened` and one `connect skipped: already connecting`, and a single identify sequence, and that only read commands were sent.
  - **Result, 2026-09-25, V2.2 hote2 (COM8), with `-Board` on a scratch folder.** The saber connected on its own, Disconnect was pressed, and then the auto-connect hook was called twice at once (both calls returned "attempted"). After that point the log shows 1 `port opened`, 1 `connect skipped: already connecting`, 1 identify sequence (`hwt| version`) and 1 library record update, and the saber reconnected. Only reads were sent: version, battery, get_volume, get_preset, list_presets, list_fonts, list_tracks, scanid, and the hw_end sentinels.
- [x] 5.2 Run `npm test` and `npm run typecheck`; verify both pass, with every `it.fails` reported as an expected failure.
  - **Result, 2026-09-25.** 177 core and 164 desktop tests pass (7 gated skipped), and the type check is clean. vitest lists the four `it.fails` tests as passing, which is how it reports an expected failure. Each was also run once as a normal test to confirm that it fails for its filed reason (tasks 1.1 and 2.1).
- [x] 5.3 Map each audited scenario (1.1, 1.2, 1.4–1.7, 1.9, 1.15, 1.18, 1.20, 3.3, 3.14, 5.3, 6.14, 6.16) to its test in this file's results. Verify that none is left without a test.
  - **Result, 2026-09-25.** Every audited scenario has a test:
    - saber-library:
      - 1.1 → library.test.ts "1.1 a connected saber is still listed after a restart"
      - 1.2 → library.test.ts "1.2 an unreadable store starts with no sabers instead of failing", plus the BST-1 expected failure
      - 1.4 → library.test.ts "1.4 with no serial…"
      - 1.5 → library.test.ts "1.5 a plan is never mistaken for a board"
      - 1.6 → library.test.ts "1.6 presets changed on the saber itself…"
      - 1.7 → library.test.ts "1.7 a saber is named from its config"
      - 1.9 → snapshots.test.ts "1.9 a snapshot can be used outside the app…" (the board side is BST-5)
      - 1.15 → draftModel.test.ts "1.15 first visit to a remembered saber…"
      - 1.18 → library.test.ts "1.18 dropping a plan…"
      - 1.20 → library.test.ts "1.20 a new name is kept…"
    - board-connection:
      - 3.3 → boardOps.test.ts, three "3.3" tests, plus the hote2 check in task 5.1
      - 3.14 → boardOps.test.ts, two "3.14" tests
    - presets-ini 5.3 → protocol.test.ts "5.3 writes a preset with no track…"
    - preset-editing:
      - 6.14 → saberModel.test.ts, three "6.14" tests
      - 6.16 → draftModel.test.ts "6.16 presets reordered on the saber…", plus the BST-2 expected failures
- [ ] 5.4 After archive, tick roadmap task 3.5 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
