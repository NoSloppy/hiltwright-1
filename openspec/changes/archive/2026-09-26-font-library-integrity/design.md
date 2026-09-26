# Design

## Context

- **The details file.** `FontLibrary` (`main/fontLibrary.ts`) keeps what the owner writes about fonts in `hiltwright-fonts.json` inside the library root: `{ version: 1, fonts: Record<folder, FontMeta>, makers: Record<name, { logo? }> }`.
  - `readIndex` treats every failure as empty.
  - `writeIndex` writes in place, from `setMeta`, `remove`, `importFrom` and `moveTo`.
  - The root is a mutable field. `moveTo` and `forget()` reset the cache.
  - The remembered location lives in `userData/fontlibrary.json`, read and written with plain `readFileSync`/`writeFileSync`, and errors fall back to the default folder silently (`ipc.ts`).
- **A missing root (SF1).** `list()` begins with `mkdir(root, { recursive: true })`, so a missing root is recreated empty. On an absent drive, mkdir fails, the page shows a raw error, and `chooseRoot` then fails too, because it calls `list()` first.
- **Moves (SF3, SF4).** `moveTo` makes the destination first, then renames (or copies and deletes) every directory in the root, with no checks:
  - A subfolder destination moves into itself and fails part-way.
  - A parent destination mixes the fonts with other files.
  - A clash is renamed to "-2" by `freeName`.
  - Logos are copied with `force` (overwriting).
  - The index is written only at the end, so a failure leaves moved fonts without details.
- **Imports.**
  - SF5: `findFontDirs` keeps paths matching `/proffie/i` at depth 0, including a font's own name.
  - SF6: tracks come from `join(dirname(d), 'tracks')`, which is outside the pick when the font is the pick itself.
  - SF7: only `wav|ini|txt|md|pdf|jpg|jpeg|png` are kept, and folders with a dot in their name are dropped.
  - SF8: `unzip.ts` never reads the CRC, and the test zip builder writes CRC 0.
- **Reporting.** `JsonStore` reports damaged files through `storeProblems()`. The Armory note says "in Hiltwright's data folder" and opens userData, which does not fit a file in the library root.

## Goals / Non-Goals

**Goals:**
- Nothing the owner has (fonts, details, logos) is lost, hidden, renamed or silently left out by a move or an import.
- The details file behaves exactly like the saber library's store.

**Non-Goals:**
- A way to resolve clashes by merging or comparing font contents.
- Moving the owner's font library automatically when a drive letter changes.

## Decisions

### D1. The details file and the location on `JsonStore`
- **The store.** `FontLibrary` holds a `JsonStore<IndexFile>` for `join(root, 'hiltwright-fonts.json')`, named "font details". It is made in the constructor, and made again whenever the root changes (`moveTo`) or `forget()` is called. `readIndex` becomes `store.read()`, and every `writeIndex` becomes a `store.update(...)`.
- **`cleanIndex`:**
  - It keeps font entries that are objects with a string `name`, and maker entries that are objects.
  - It counts the rest as dropped.
  - It returns null when `fonts` is not an object.
- **The location.** `fontlibrary.json` (`{ root?, legacyDismissed? }`) moves onto a `JsonStore` named "font library location". Its `clean` keeps a string `root` and a boolean `legacyDismissed`.
- **Where the problem is.** `StoreOptions` gains `place: 'data' | 'fonts'`, and `StoreProblem` carries it:
  - The Armory note says "in the font library folder" and opens it with `fontLibrary.open()` for `fonts`.
  - It keeps "in Hiltwright's data folder" and `app:openPath` for `data`.
  - `app:storeProblems` also awaits the font details before reporting.
  - The Font library page shows its own problems too, filtered by `place === 'fonts'`.

**Byte-order mark (found during implementation).** A settings file saved with a UTF-8 byte-order mark (Notepad, PowerShell's `-Encoding utf8`) failed `JSON.parse` and was set aside as damaged. `JsonStore` now strips a leading mark before parsing, so every store benefits. A test in `jsonStore.test.ts` covers it.

**Rejected:**
- *Moving the details file to userData.* The spec keeps it with the fonts, so a library copied or moved by hand keeps its details.

### D2. A missing library folder is reported, not recreated (SF1)
- **`list()`** creates the root only when it is the default folder. For a chosen root that does not exist, it returns `[]` without touching the disk.
- **`fontlib:status`** gains `missing: boolean`, which is true when the root is not the default and is not a directory.
- **`importFrom` and `copyToCard`** refuse, with the message "The font library folder cannot be found", while it is missing.
- **FontLibrary.tsx** shows a panel in place of the list when `missing`. It names the folder and offers:
  - **Look again:** refresh.
  - **Choose where it is:** `chooseRoot` with no move question, because there is nothing to move.
  - **Use the default folder:** `resetRoot`.
- **`fontlib:chooseRoot`** no longer calls `list()` when the root is missing.

**Rejected:**
- *Creating the folder and warning.* On a reassigned drive letter it would write into someone else's drive.

### D3. Planning a move before moving (SF3, SF4)
`planMove(next)` returns `{ refused: string | null; clashes: string[] }`:
- **Refused** when the resolved `next` equals the root, lies inside the root, or contains the root. It is judged by `path.relative`, as `insideFolder` does, and case-insensitively on Windows. The message names the reason.
- **Clashes** are the font folders in the root whose name already exists as a directory in `next`, or as a key in `next`'s details file.

`fontlib:chooseRoot` works in this order:
1. Pick the folder.
2. `planMove`.
3. If refused, throw the message; the page shows it as a red note.
4. If there are fonts, ask the existing move question.
5. If moving and there are clashes, show a second message box listing up to 12 names (with "and N more"), with **Keep the ones already there and move the rest** or **Cancel**.

`moveTo(next, move, onLine, { keepBack })` then leaves `keepBack` fonts, and their entries in the old details file, untouched.

A clash is anything already at that name, file or folder. On Windows, a rename would silently replace a plain file with the moved folder, which a test caught during implementation.

**Rejected:**
- *Renaming clashes, or refusing on any clash.* The owner chose keeping the destination's fonts with a list, on 2026-09-25.

### D4. Moving font by font, details with each (SF3)
For each font:
1. Rename it, or copy and delete across drives. The destination name is always the same name, never `freeName`.
2. `update` the target store to add its entry.
3. `update` the source store to remove it.

Logos are copied with `force: false` and `errorOnExist: false`, so an existing logo is kept. The target keeps its own maker entry, as today.

If a font fails, the loop stops and throws `Moved N of M fonts to <next> (…names); <font> could not be moved: <reason>. The library is still at <root>.` The root is not switched, and the setting is not saved. A retry moves the rest, since the moved fonts are no longer in the old root.

When everything moves, the old details file is removed. The side files are left: its backup and any damaged copy, which are the owner's.

### D5. Imports (SF5–SF8)
- **SF5 variants (corrected 2026-09-25, during implementation).** The first version looked only at the folders above each font. That missed the common layout where the board-named folder *is* the font folder (`Kyber Ember/Proffie`, `Kyber Ember/CFX`), and the existing test caught it. The rule now counts a font's own folder too, but only when its whole name is a board's name (`BOARD_ONLY`: "Proffie", "ProffieOS v2", "CFX", …). A font named "ProffieOS Default" is never a variant.
- **SF5 variants (original wording, kept for the record).**
  - `findFontDirs` collects all font dirs as today, then works out each font's parent path inside the pick (its relative path without the font's own folder).
  - Variants are recognised only when at least one parent path has a segment matching `proffie`, and at least one other font's parent path has a segment naming another board: `cfx`, `crystal ?focus`, `xeno(pixel)?`, `golden ?harvest`, `ghv?\d`, `verso`, `asteria`, `plecter`, `lgt`, `sn-?pixel`, `darkwolf`, `polaris`, `emb`, `smoothswing ?v?\d? ?board`.
  - Then fonts under another board's segment are dropped, each reported as `{ name, why: "for <segment>, not Proffie" }`, and all others are kept.
  - `importFrom` returns those in `skipped`.
- **SF6 tracks.**
  - The candidates are `join(dirname(d), 'tracks')`, only when `dirname(d)` is inside `top` (the pick or the staging folder), and `join(top, 'tracks')`.
  - A candidate must exist and must not be `d`'s own tracks folder.
  - When the font is the pick itself, no outside folder is looked at.
- **SF7 files.** One `junk(path)` rule is shared by the zip and folder paths: any path segment starting with `.`, `__MACOSX`, `Thumbs.db` or `desktop.ini`. Everything else is kept, including folders with dots in their names.
- **Escape check (found during implementation).** `extractZip` checked paths only for the entries its filter kept. With a filter, an escaping entry the filter dropped (a `..` segment counts as a hidden name) was skipped silently instead of refusing the package. That was true of the old whitelist too, for `../x.exe`. Every entry's path is now checked before filtering.
- **SF8 CRC.** `listZip` reads the CRC-32 (central directory +16) into `ZipEntry.crc`. `extractZip` checks `zlib.crc32(data) === e.crc` and `data.length === e.size`. Otherwise it throws "This package is damaged (<file> does not match its checksum). Download it again." `zlib.crc32` is available in Electron 37's Node 22.21 and in the test Node 24. The test zip builder writes real CRCs.

### D6. Tests
In `apps/desktop/test/fontLibrary.test.ts`:
- a damaged details file is set aside and not overwritten, and the store starts from its backup
- a missing chosen root gives `[]`, creates no folder, and reports `missing`
- `planMove` refuses self, child and parent destinations, and lists clashes from disk and from the details file
- `moveTo` with `keepBack` leaves those untouched, moves the rest with their details, and keeps an existing logo
- a failure part-way keeps the root and each moved font's details at the destination
- a folder of fonts where one is named "ProffieOS Default" imports all three
- CFX and Proffie variants keep Proffie and report CFX
- an unrelated sibling `tracks` folder is not taken
- `.rtf`, `.docx` and `.mp3` files come in, while `__MACOSX`, `Thumbs.db` and dot-files do not
- a zip with a wrong CRC is refused, and nothing is added

The existing tests keep passing once the builder writes real CRCs.

### D7. Checks
- **A no-board development run** with `HILTWRIGHT_FONT_LIBRARY` on a scratch folder holding a damaged `hiltwright-fonts.json`: the Font library page and the Armory both name the kept file, and Open folder opens the library folder.
- **A second run** where `fontlibrary.json` points at a folder that does not exist, with no environment override: the missing panel appears, and no folder is created.
- **The owner's check** on the installed build, without moving the real library:
  - "Change…" to a folder inside the library is refused.
  - "Change…" to a test folder holding a font folder with the same name as one of theirs lists it, and Cancel moves nothing.

### D8. No board check
This change touches only files on the computer: the font library, its details and location, and packages. It does not change what is copied to a card or sent to a board, so the rule's hardware task does not apply. Copying to the card keeps its current code, apart from the missing-folder refusal.

## Risks / Trade-offs

- [The board-name list misses a vendor's folder name, so both variants are imported] → That is the safe failure: nothing is left out silently. The list can grow.
- [Kept-back fonts stay in the old folder, outside the library] → The clash dialog says so. They are untouched and can be moved by hand.
- [A slower import, because every file is copied and checksummed] → Font packages are tens of MB, and checksumming is fast next to disk time.
- [A second `JsonStore` per root leaves `.bak.json` and damaged files in the library folder] → `list()` and moves skip non-directories, and the files are small and named plainly.
