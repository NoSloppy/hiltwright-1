# Design

## Context

See proposal.md for why. What the code does now:

- **The preset step.** `installSequence` in `apps/desktop/src/renderer/src/installFlow.ts` runs `clearPresets` just before `rebootToBootloader`, and only for a connected saber:
  - it takes a snapshot labelled `Before bank "<presetsFrom.name>"`
  - it sends `del presets.ini` and `del presets.tmp` without reading the replies
  - a board already in its bootloader skips it (F32)
- **The record.** `writeFromBootloader` writes the model with `presetsFrom` removed, right after the write succeeds (`install-safety-nets` D3).
- **What ProffieOS does:**
  - **The `del` command** prints nothing: `LSFS::Remove(e)`, result ignored (`ProffieOS.ino`, 8.10).
  - **Which presets file is read** is decided in `common/current_preset.h`. A presets file written by ProffieOS itself carries a checksummed header (`0xFF1E5AFE`), and is accepted whatever its `installed=` stamp. A plain file is accepted only when its `installed=` matches the running firmware's compile time (unless `KEEP_SAVEFILES_WHEN_PROGRAMMING`). A saber whose presets were ever edited over serial therefore keeps them across a new install. So the files must be removed for the compiled presets to show.
  - **With no presets file,** `list_presets` and every preset change use the compiled presets.
  - **`reset`** (`STM32.reset()`) restarts the firmware, and is available in every build.
  - **The files** are at the card's root. Generated configs use `CONFIGARRAY(presets)` with no save folder, and `GetSaveDir()` returns `""`.
- **Colours.** `usePendingLookColours` (`pendingColours.ts`) writes waiting colours once the saber is connected with firmware that has the style in that slot. It does not look at `presetsFrom`.
- **The page.** `board.ts` keeps `infoRef` (the presets last read) and `saberRef`. `rebootToBootloader` shows how a command that drops the port is sent (`expectSilence`, then close).

## Goals / Non-Goals

**Goals:**
- A staged install never leaves a saber without presets, or with presets different from what the page shows.
- One path for every way an install ends: from running mode, from the bootloader, after the driver step, and later.

**Non-Goals:**
- Changing how presets are staged (Presets page, sets).

## Decisions

### D1. Apply the staged presets after the install is checked
`applyStagedPresets(deps, saber, model)` is a new function in `installFlow.ts`. It returns the note to show.

**When it runs:** `writeFromBootloader` calls it at the very end, only when all of these hold:
- `model.presetsFrom` is set
- the install check (`checkBack`) matched
- the saber reached is this saber

**What it does:**
1. Snapshot `board.currentPresets()`, the presets the saber reports now, labelled "Before install with staged presets".
2. `send('del presets.ini')` and `send('del presets.tmp')`.
3. `board.restartSaber()`, then `waitForRuntime(serial)`, `reachNext(serial)` and `connect(false, { serial })`, as after a write.
4. Compare `board.currentPresets()` with `model.presets`: the same count, and the same name and font at each position.
5. **If they match:** `updateSaber({ model: settled })`, where `settled` is the model without `presetsFrom`, and the note reads "Your staged presets are on the saber now; its previous presets are kept as a snapshot."
6. **Otherwise,** or on any failure: the list stays staged, and an amber note says what happened and offers "Use the staged presets".

**The record at the write** (`install-safety-nets` D3) keeps `presetsFrom`. The saber still has its own presets until step 5, so the record says "staged" until then.

**Rejected:**
- *Keep the delete before the reboot, and check its reply.* There is no reply (`del` prints nothing), and every failure after the delete leaves the saber without presets. That is F31's problem.
- *Keep the delete before the reboot, and put the snapshot back on failure.* Putting presets back needs a running saber. After a failed write, it is in its bootloader.
- *Delete without restarting.* The preset in memory stays the old one until the next preset change, and it is not certain the prop re-reads everything. A restart takes about 3 s (install-safety-nets 1.1) and leaves nothing to chance.
- *Overwriting presets.ini with the staged list over serial.* That is a second writer of presets.ini, with its own failure modes. The compiled presets are already on the saber.

### D2. The board link: restart, and what the saber has now
`board.ts` gains two things:
- **`restartSaber()`:** sends `reset` with `expectSilence`, closes the port, and sets the status to idle, as `rebootToBootloader` does. It returns whether the command was sent.
- **`currentPresets()`:** returns `infoRef.current?.presets ?? null`, read after the last connect.

`InstallDeps.board` gains both, and the flow waits 1.5 s after the restart before waiting for the saber, so the USB device has gone first.

**Rejected:**
- *Reading presets through `board.info` in the deps.* It is the value from when the deps were made, before the install.

### D3. Using the staged presets later
**When it is offered:** the Build page shows a note, "This saber's firmware has your staged presets, but the saber still uses its own. [Use the staged presets]", when all of these hold:
- the saber is connected
- `model.presetsFrom` is set
- `saber.firmware.presets` has the same names, in order, as `model.presets`

That is `firmwareHasStaged(model, firmware)`, a pure function.

**What it does:** the button runs `applyStagedPresets` alone. It needs no reboot into the bootloader, because nothing is written to flash.

**Before an install,** the note reads "The staged presets replace the N on the saber once the new firmware is on and checked; a snapshot is kept first."

### D4. Colours wait for the staged presets
`waitingColours(model, firmware)` is extracted from `usePendingLookColours` as a pure function. It returns `[]` while `model.presetsFrom` is set. Colours are then written once the list is settled, into the presets the saber now has.

**Rejected:**
- *Writing the colours as part of `applyStagedPresets`.* The hook already writes them, with read-back. It only has to wait.

### D5. Checks
**Unit tests** in `installFlow.test.ts`:
- a staged install applies after the check: the calls are in order, the snapshot has its label, and the model is settled
- no apply on a stop, a mismatched check, nothing read, or another saber
- the presets still differ after the restart: stays staged, with the note
- the restart fails: stays staged
- from a board in its bootloader: applied
- the record at the write keeps `presetsFrom`

**Unit tests** in a new `apps/desktop/test/staged.test.ts`:
- `firmwareHasStaged`
- `waitingColours` returning nothing while staged

**Development run:** `hiltwrightPretendInstall` with a staged model shows the applied note, and the kept-staged note when the pretend saber reports other presets.

**Hardware:**
- on hote2, by the owner: from running mode, and from its bootloader
- on the V3 alone, on a fresh folder: a refused install leaves `list_presets` unchanged

## Risks / Trade-offs

- **[The owner switches the saber off during the restart]** → The files are already removed, so the saber boots with the compiled presets. Those are the staged ones: the firmware carries them. The list stays staged until the next connect offers "Use the staged presets", which then only confirms.
- **[A saber whose config uses a save folder]** → Only configs Hiltwright did not write, which a Hiltwright install replaces. Out of scope (proposal).
- **[`reset` is ignored by an unusual build]** → The saber does not go away. `waitForRuntime` passes at once, the read-back shows the old presets, and the list stays staged with the note. Nothing is lost.
