# Design

## Context

- **Callable from node today.** `Library` (`main/library.ts`) and `Snapshots` (`main/snapshots.ts`) use only `node:fs`, `node:path`, `node:crypto` and `@hiltwright/core`, so node tests can call them on a temporary folder.
- **Pure and already tested in part.** `defaultName` (library.ts), `queuedLookIds` and `withLookInSlot` (slotModel.ts) are pure. `draftModel` (saberModel.ts) reads `window.hiltwright.appVersion` only when called. `draftModel.test.ts` already stubs `window` and is set up in both tsconfigs, but it covers only a planned record that has a saved model.
- **Blocked.** The connect guard and the operation queue live inside the `useBoard` React hook (`board.ts`, `connect` and `run`), where no node test can reach them.
- **Core.** The presets.ini codec is in `packages/core/src/presetsIni.ts`, and `protocol.test.ts` round-trips recorded board output, but no fixture has an empty track.

Reading the code for these scenarios surfaced the defects listed in the proposal.

## Goals / Non-Goals

**Goals:**
- One test per audited scenario, named after the scenario, so each audit number maps to a test.
- Known defects pinned by tests that turn red the moment they are fixed. Then nobody forgets to turn them into normal tests, and the owning change inherits a ready-made test.

**Non-Goals:**
- Testing React components or Electron IPC.
- Changing behaviour. The one code change (D2) is a pure extraction.

## Decisions

### D1. Test the specified behaviour, and mark known defects with `it.fails`
Where the code does what the spec says, a normal test pins it. Where reading the code shows a defect, the test states the correct behaviour and is marked `it.fails`, with a comment naming the change that owns the fix. vitest reports an `it.fails` test as passing while it fails, and as failing once the code is fixed. So the owning change must turn it into a normal `it`, which gives that change its test for free.

Behaviour the spec allows but a later change will alter is pinned as it is today. For example, without a serial, a reflash makes a new record, and `library-integrity` F15 changes that. The later change updates the test along with its spec delta.

**Rejected:**
- *`it.skip` or `it.todo` for defects.* They go quiet and are never turned back on.
- *Pinning the buggy behaviour as correct.* It would defend the bug.

### D2. Extract the connect gate and the operation queue, unchanged
`apps/desktop/src/renderer/src/boardOps.ts` has no imports and exports two functions:
- **`connectGate(isOpen)`** returns an `attempt(fn)` function. `attempt` checks, synchronously, that no attempt is in flight and that `isOpen()` is false. It then sets the in-flight flag, runs `fn`, clears the flag in `finally`, and returns whether it ran.
- **`serialQueue()`** returns an `enqueue(op)` function that chains `op` after the previous operation and returns its result. It keeps the tail alive past a failure (`.then(noop, noop)`).

`useBoard` keeps one gate (with `() => !!transport.current`) and one queue in refs. `connect` and `run` call them. The log line "connect skipped: already connecting" and every other visible behaviour stay the same.

**Rejected:**
- *Testing the hook with a React test renderer and fake Web Serial.* It needs new dependencies and a large fake, for two small rules.
- *Leaving 3.3 and 3.14 to the hardware pass.* The rules are pure logic, and a board only shows them by luck of timing.

### D3. Where each test goes
- **`apps/desktop/test/library.test.ts` (new):** 1.1, 1.2, 1.4, 1.5, 1.6, 1.7, 1.18 and 1.20. It uses a temporary folder and a `new Library(file)` per "restart".
- **`apps/desktop/test/snapshots.test.ts` (new):** 1.9. The saved file parses back with the core codec, keeps its header, and ends with `end`. `vi.setSystemTime` keeps file names stable.
- **`draftModel.test.ts`:**
  - 1.15: a record with no saved model gives one blade per reported pixel count and the reported presets.
  - 6.16: styles follow presets by name after a reorder.
  - Expected-failure tests for duplicate or blank names, rename plus move, and the V3 draft.
- **`saberModel.test.ts`:** 6.14. A chosen style that is not in the installed firmware is queued, and one in the firmware is not.
- **`boardOps.test.ts` (new):**
  - 3.3: a second attempt while one is in flight or a port is open is skipped, and the gate reopens after a failure.
  - 3.14: operations finish in order, and one failure does not stop the next.
- **`packages/core/test/protocol.test.ts`:** 5.3. A preset with an empty track emits `track=`, parses back empty, and the file ends with `end`.

The expected-failure test for "records of the wrong shape" goes in `library.test.ts`. The unplug-drops-an-edit finding is filed but not tested, because it lives in `runNow`, which stays in the hook.

### D4. Findings are filed in the owning changes' proposals
Each finding is added as a bullet to the owning change's What Changes, tagged `BST-<n>` (for board-side test coverage), with the test that pins it where there is one:
- `library-integrity`
- `preset-editor-fixes`
- `install-target-safety`, as a note under FW3
- `connection-robustness`
- `hardware-verification-v2`, as a board check that a snapshot file loads

### D5. Hardware check
`board.ts` changes (D2), so the project rule asks for a board check. The check is a read-only run on V2.2 hote2, with `-Board` on a scratch folder:
1. Let it connect.
2. Disconnect.
3. Call the auto-connect hook twice at once.

The log must show one port opened, one "connect skipped: already connecting", and a single identify sequence. Only read commands are sent. Operation ordering (3.14) needs writes, so it stays with the unit test and `hardware-verification-v2`.

## Risks / Trade-offs

- [An expected-failure test hides a new, different failure in the same test] → Each such test asserts one specific outcome, with a comment saying what the fix should make true.
- [The extraction subtly changes the connect race] → The gate keeps the check and set synchronous, as today. The hardware check exercises the real double call.
