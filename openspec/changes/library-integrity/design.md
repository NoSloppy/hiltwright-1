# Design

## Context

- **The two stores.** `Library` (`main/library.ts`) and `BanksStore` (`main/banksStore.ts`) each hold a JSON file with the same pattern: cache on first read, and write through `${file}.${process.pid}.tmp` followed by a rename. Both share the same failure modes:
  - A read error or wrong shape reads as empty, and the next write overwrites the file (F14).
  - Two writes at once share one temporary name. The second rename fails with ENOENT, so its data is lost (HW-2026-09-24a, seen on hote2).
  - `Library.list()` throws on records missing `lastSeen`, and `upsert` throws on records missing `identity` (BST-1, pinned in `library.test.ts`).
- **Matching without a serial (F15).** `Library.matches` falls back to config name, install stamp and blade layout. `board.ts` sets `usbSerial` to null whenever `usb.proffieSerials()` finds anything other than exactly one board. A reflash changes the install stamp, so with two boards plugged in the saber comes back as a new record.
- **Where the firmware record lands (F15).** `Build.tsx` saves it with `board.updateSaber({ model, firmware })` and no id, so it goes to whatever record the reconnected board matched.
- **Adoption (F16, FW26).** The Armory offers adoption when `ws.live && !cur.firmware && !cur.planned && plans.length`, and one click calls `library.adopt`, which replaces `target.model` outright.
- **New saber while plugged in (F17).** `plan()` in `App.tsx` calls `ws.choose(plan.id)` and `go('wiring')`. The workspace ignores the choice while a saber is live, so the owner lands on the plugged-in saber's Wiring.

## Goals / Non-Goals

**Goals:**
- One store implementation that 3.7–3.9 adopt by construction, with no copy-and-adjust.
- No path on which the owner's saved data is overwritten by something the app failed to read.

**Non-Goals:**
- Telling two plugged-in boards apart, or choosing between them (F4, FW31).
- Recovering damaged files automatically, or a repair UI. The damaged file is kept for a person to look at.

## Decisions

### D1. `JsonStore<T>`: one file, a queue, a backup, and a damage report
`apps/desktop/src/main/jsonStore.ts` exports `class JsonStore<T>`. It is constructed with:
- the file path
- a display name ("saber list", "preset sets")
- `empty(): T`
- `clean(raw: unknown): { value: T; dropped: number } | null`, which returns null when the shape is not recognisable at all, and otherwise the readable part plus a count of what was left out

It has two methods:
- **`read(): Promise<T>`** loads once and caches the result.
- **`update(fn: (v: T) => void | Promise<void>): Promise<T>`** runs `fn` on the cached value and persists it. Updates are queued, so each one completes, with its file write, before the next starts.

**Persisting:**
1. Write to `${file}.${pid}.${n}.tmp`, with a counter for each write.
2. If the current file was good, copy it to `${base}.bak.json`.
3. Rename the temporary file over the store.

The backup is always the version before the last successful write.

**Loading:**
- **The file reads and `clean` drops nothing:** use it.
- **The file reads but `clean` dropped records:** copy the file aside as `${base}.damaged-<stamp>.json`, and use the readable records. The next write replaces the main file, and the aside copy keeps the original.
- **Parse fails or `clean` returns null:** rename the file aside as `${base}.damaged-<stamp>.json`. Then try the backup through the same `clean`; if that also fails, start from `empty()`.
- **No file:** start from `empty()`, with nothing to report.

Every set-aside is recorded in a module-level list: `storeProblems(): { store: string; keptAs: string; startedFrom: 'backup' | 'readable records' | 'nothing' }[]`.

**Rejected:**
- *Keeping per-store copies of the pattern.* That is how the flaw got into five stores.
- *A database such as SQLite.* It adds a dependency and a migration for files that hold tens of records.
- *Refusing to start when a store is damaged.* The owner can still use the app, and nothing is lost because the file is kept.

### D2. The library and the preset sets on the store
- **`Library`** keeps its methods and file format (`{ version: 1, sabers }`, so no migration). It holds a `JsonStore`, and every mutating method goes through `update`.
- **`cleanLibrary`** keeps records with the expected shape:
  - string `id`, `name`, `firstSeen` and `lastSeen`
  - an `identity` object with a `pixelBlades` array
  - array `presets`, `fonts` and `tracks`

  It counts the rest as dropped. It returns null for anything other than `{ version: 1, sabers: [] }`-shaped data.
- **`BanksStore`** does the same with `isBank`.

`library.test.ts`'s BST-1 test becomes a normal `it`, and its 1.2 test gains the set-aside assertions.

### D3. Telling the owner
The IPC call `app:storeProblems` returns the list. The Armory reads it once on mount and shows one amber note per problem, for example: "Your saber list could not be read. It was kept as library.damaged-20260925-161500.json in Hiltwright's data folder, and Hiltwright started from its backup copy." The note has an Open folder button (`app:openPath`, which already allows userData) and Dismiss. It is logged too, through the run log from `support-bundle`.

**Rejected:**
- *A modal at start-up.* The app still works, so a note is enough and does not block.

### D4. The saber being installed is expected back (F15)
`board.ts` gains `expectAfterInstall(saberId, configName)`, which `Build.tsx` calls just before rebooting to the bootloader, with `config/${model.name}.h`. The next `identify` passes `{ id, configName }` to `library:upsert` as `expect`, then clears it. The hint also expires after 5 minutes.

`Library.upsert` resolves in this order:
1. A serial match.
2. When the connecting board has no serial and `expect` is given, that record, if it exists, is not a plan, and the board reports `expect.configName`.
3. The three-part match.
4. A new record.

Separately, `Build.tsx` passes `saber.id` to `updateSaber` for the firmware record, so the record always lands on the saber installed.

**Rejected:**
- *Ignoring the install stamp whenever the config is a Hiltwright one.* Two sabers can share a config name, and a match without an expectation could merge them.
- *Mapping the opened COM port to its USB serial through Windows PnP.* The page does not know which port main granted, and choosing between boards belongs to F4.

### D5. Adoption confirms first (F16, FW26)
Clicking "It is X" in the Armory's adoption note replaces the note's buttons with a confirmation. It says that the next install replaces the styles compiled into this saber's current firmware, and that its card's presets will then be the plan's. When `cur.model` exists, it also says that the saber's current wiring and presets in Hiltwright will be replaced by the plan's. The buttons are Adopt, and Not now, which restores the note. `library.adopt` is called only on Adopt.

**Rejected:**
- *Not offering adoption when the saber has a model.* The owner may really want the plan, so a warning keeps the choice.

### D6. New saber while plugged in (F17)
When `ws.live`, `plan()` creates the plan and stays on the Armory, without `choose` or `go`. It shows a note: "Kylo build is set up. [saber] is plugged in, so it stays the saber you are working on. Unplug it to work on Kylo build." With nothing plugged in, the flow is unchanged.

**Rejected:**
- *Switching to the plan while a board is live.* The owner chose the note on 2026-09-25.

### D7. Checks
- **Unit tests:** `jsonStore.test.ts` (D1) and `library.test.ts` (D2, D4).
- **A no-board development run:** a deliberately damaged library in a scratch folder. The Armory note appears, the file is kept under its new name, and connecting nothing still works.
- **A read-only run with hote2 (`-Board`), on a scratch folder:**
  - F17: "New saber" while connected shows the note and keeps hote2 working.
  - F16/FW26: the adoption confirmation appears, Not now changes nothing, and Adopt moves the plan. This touches only the scratch library, and no board writes happen.
- **The owner's two-board check:** hote2 and the V3 plugged in together, and an install on hote2 from the installed build, with the header checked first to show hote2. Afterwards the owner's library has one hote2 record, carrying the new firmware record. I compare `library.json` before and after, through `\\localhost\C$`.

## Risks / Trade-offs

- [The backup copy doubles the writes to disk] → The files are small, and it is one copy per write.
- [The expectation matches the wrong board when both boards run the same Hiltwright config] → It requires the config just written. Two boards with the same config and no serial are indistinguishable anyway (F4).
- [A damaged file is copied aside on every start until the next write replaces it] → The first write after the report replaces the main file, and the stamp in the name keeps copies apart. A start that only reads never writes.
- [The two-board install could land on the V3, because the app cannot yet refuse the wrong board] → The owner checks that the header shows hote2 before Install, and unplugs the V3 to connect first if needed, then plugs it back in before installing.
