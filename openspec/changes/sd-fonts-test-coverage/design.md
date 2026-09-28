# Design

## Context

- **Callable from node today** (`apps/desktop/src/main`):
  - `sd.ts`: `listFonts(root)`, `checkFontDir(dir)`, `listTracks(root)`, `readVoicePack(root)` and `copyFont(src, root, replace)`. `copyFont` throws "<name> is already on the card" when the folder exists and `replace` is false.
  - `fontLibrary.ts`: `FontLibrary` with `setMeta` (details kept in `hiltwright-fonts.json` at the library's root), `moveTo`, `copyToCard` (which calls `copyFont`), and the adding of folders and zips. A zip with no `.wav` is refused with "<name> has no sounds in it. Is it a sound font package?".
  - **Moving across drives:** `moveTo` tries `rename` per font and falls back to `cp` plus `rm` when it fails. That is what happens across drives (`EXDEV`). The existing test moves on one drive only, so `rename` always works there.
  - `scanFont(dir)` returns the core `FontReport` with its issues. Stereo is an issue from the core checker, tested in `packages/core/test/fonts.test.ts`, but not through the library.
  - `importer.ts`: `scanXenoCard(root)` returns `[]` for a folder with no numbered slots.
- **Inside components:**
  - **`Fonts.tsx`** works out `needed` (preset fonts, without `common`), `onCard`, `inLibrary` and `copyable` inline, then "Copy all N" calls `fontLibrary.copyToCard` for each.
  - **`XenoImport.tsx`** holds the "No Xenopixel font folders found there…" text inline.
- **Existing tests to extend:**
  - `fontLibrary.test.ts`, `sdLayout.test.ts` and `importer.test.ts` each have a `wav()` helper and temporary folders.
  - `packages/core/test/fonts.test.ts` has a `wav(rate, channels, …)` writer.

## Goals / Non-Goals

**Goals:**
- One test per audited scenario, named with its audit number, as in `board-side-test-coverage` and `firmware-side-test-coverage`.
- Defects found pinned by `it.fails`, with the owning change named.

**Non-Goals:**
- Component tests.
- Any change in behaviour.

## Decisions

### D1. Test the specified behaviour; mark known defects with `it.fails`
This is the same rule as the two earlier coverage changes:
- Where the code does what the spec says, a normal test pins it.
- Where it does not, the test states the spec, is marked `it.fails`, and a comment names the owning change. The finding goes into that change's proposal.

### D2. `fontsForPresets` in `renderer/src/fontNeeds.ts`
`fontsForPresets(presets, cardFonts, library)` returns `{ needed, copyable, missing }`:
- `needed`: font names from the presets' first font path, not `common`, without duplicates
- `copyable`: names not on the card but in the library, matched without regard to case
- `missing`: names on neither

It is today's inline code, moved verbatim, and `Fonts.tsx` calls it. The module imports only types, so the node test project can type-check it.

**Rejected:**
- *Testing through `Fonts.tsx`.* That needs a component test harness, which is out of scope.

### D3. The move across drives, simulated with a failing `rename`
The new `apps/desktop/test/fontLibraryMove.test.ts` mocks `node:fs/promises` so that `rename` throws an `EXDEV` error, with everything else real. It then moves a library of two fonts with details, and checks:
- every font and its details are in the new folder
- the old folder no longer holds them
- `list()` shows the same fonts

**Rejected:**
- *A real second drive.* The machines running the tests may have no second drive. The fallback path is what differs, and the mock drives it.

### D4. The Xenopixel words in `shared/importWords.ts`
`NO_XENO_FONTS` holds today's text. `XenoImport.tsx` shows it, and 3.1 checks both halves:
- `scanXenoCard` on a folder without numbered slots returns `[]`
- the words ask for the top of the card

### D5. What counts as "nothing changed" (2.14)
A tree snapshot records the path, size and modification time of every file and folder under a temporary card. It is taken before and after the browsing calls: `listFonts`, `checkFontDir` for each font, `listTracks` and `readVoicePack`.

The page reads the card only through these calls (`ipc.ts` `sd:*`), so equal snapshots show that browsing writes nothing.

## Risks / Trade-offs

- **[The `fs/promises` mock leaking into other tests]** → It lives in its own test file. Vitest isolates module mocks per file.
- **[The tree-snapshot check passing because a write kept the same size and time]** → The snapshot also records the set of paths, and each call is read-only by inspection. The test guards against new files and rewrites, which are the likely regressions.
