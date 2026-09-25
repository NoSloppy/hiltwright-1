# Tasks

## 1. The saber library and snapshots

- [ ] 1.1 Add `apps/desktop/test/library.test.ts` (design D3), one test per scenario, named after it:
  - 1.1 listed after a restart (a second `Library` on the same file lists the saber with name, config, presets and last seen)
  - 1.2 an unreadable store lists no sabers and does not throw, for both unparseable JSON and a wrong `version`
  - 1.4 no serial: matched when config, install stamp and blade layout all agree, and a new record when any differs
  - 1.5 a planned saber is never matched by a connecting board
  - 1.6 presets are replaced and the name kept on reconnect
  - 1.7 `config/hiltwright_hote2.h` is named "hote2"
  - 1.18 removing a plan drops it and leaves the rest
  - 1.20 rename: a new name is kept after reconnecting, and a blank name keeps the old one

  Add `it.fails` for "records of the wrong shape read as no sabers" (owner: `library-integrity`). Verify with `npm test`: the normal tests pass, and the expected-failure test is reported as expected.
- [ ] 1.2 Add `apps/desktop/test/snapshots.test.ts` for 1.9. A saved snapshot keeps its `#` header, parses back to the same presets with `parsePresetsIni`, and ends with `end`. Verify with `npm test`.

## 2. Drafts and queued styles

- [ ] 2.1 In `draftModel.test.ts`, add:
  - 1.15: a record with no saved model gives one blade per reported pixel count and the reported presets
  - 6.16: after the saber reorders presets, each keeps the styles chosen for it by name

  Add `it.fails` for "two presets with the same or a blank name keep their own styles" and "a preset renamed and moved does not take its new position's styles" (owner: `preset-editor-fixes`). Add `it.fails` for "a new saber whose config names V3 is drafted as V3" (owner: `install-target-safety`, FW3). Verify with `npm test`.
- [ ] 2.2 In `saberModel.test.ts`, add 6.14. A chosen style missing from the installed firmware is queued, one in the firmware is not, and with no firmware record every chosen style is queued. Verify with `npm test`.

## 3. Connection and queue

- [ ] 3.1 Add `apps/desktop/src/renderer/src/boardOps.ts` with `connectGate` and `serialQueue` (design D2), and add `apps/desktop/test/boardOps.test.ts`:
  - 3.3: a second attempt while one is in flight is skipped, an attempt while a port is open is skipped, and the gate reopens after an attempt throws
  - 3.14: queued operations finish in the order queued, and a failing one does not stop the next

  Verify with `npm test`.
- [ ] 3.2 Use `connectGate` and `serialQueue` in `board.ts` in place of the inline guard and queue, keeping the log line and behaviour (design D2). Verify with `npm run typecheck` and in task 5.1.

## 4. Codec and findings

- [ ] 4.1 In `packages/core/test/protocol.test.ts`, add 5.3. A preset with an empty track emits a `track=` line with nothing after it, parses back as an empty track, and the file ends with `end`. Verify with `npm test`.
- [ ] 4.2 File the findings (design D4) as `BST-1`…`BST-5` bullets in the proposals of `library-integrity`, `preset-editor-fixes`, `install-target-safety` (under FW3), `connection-robustness` and `hardware-verification-v2`, naming the pinning test where there is one. Verify with `openspec validate` on each changed change, and by reading the bullets.

## 5. Checks

- [ ] 5.1 Hardware check on V2.2 hote2 (`-Board`, scratch folder), per design D5: connect, disconnect, then call the auto-connect hook twice at once. Verify that the log shows exactly one `port opened` and one `connect skipped: already connecting`, and a single identify sequence, and that only read commands were sent.
- [ ] 5.2 Run `npm test` and `npm run typecheck`; verify both pass, with every `it.fails` reported as an expected failure.
- [ ] 5.3 Map each audited scenario (1.1, 1.2, 1.4–1.7, 1.9, 1.15, 1.18, 1.20, 3.3, 3.14, 5.3, 6.14, 6.16) to its test in this file's results. Verify that none is left without a test.
- [ ] 5.4 After archive, tick roadmap task 3.5 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
