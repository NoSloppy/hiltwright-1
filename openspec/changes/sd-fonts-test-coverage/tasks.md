# Tasks

## 1. Seams (no change in behaviour)

- [x] 1.1 Move the fonts-needed logic from `Fonts.tsx` into `apps/desktop/src/renderer/src/fontNeeds.ts` as `fontsForPresets(presets, cardFonts, library)` (design D2), and call it from `Fonts.tsx`. Verify with `npm run typecheck`, and in 2.3.
  - **Result, 2026-09-29.** `apps/desktop/src/renderer/src/fontNeeds.ts` holds `fontsForPresets(presets, cardFonts, library)`, which returns `needed`, `copyable`, `missing`, `onCard` and `inLibrary`. The code was moved unchanged, and `missing` was added for the tests. `Fonts.tsx` takes all of these from it. The module imports only types. The type check is clean. See 2.3.
- [x] 1.2 Move the Xenopixel "none found" words into `shared/importWords.ts` as `NO_XENO_FONTS`, shown by `XenoImport.tsx` (design D4). Verify with `npm run typecheck`, and in 2.4.
  - **Result, 2026-09-29.** `shared/importWords.ts` holds `NO_XENO_FONTS`, with the words unchanged, and `XenoImport.tsx` shows it. The type check is clean. See 2.4.

## 2. Tests

- [x] 2.1 **Font library,** in `apps/desktop/test/fontLibrary.test.ts`:
  - 1.2: naming a font and giving it a maker leaves the font's folder byte for byte as it was (the same files, sizes and contents)
  - 1.5: a zip with no `.wav` is refused with "…Is it a sound font package?", and nothing is added
  - 1.11: a font whose sounds are stereo shows the mono issue in the library's report

  Verify with `npm test`.
  - **Result, 2026-09-29.** Three tests in a new "font-library audit" block of `apps/desktop/test/fontLibrary.test.ts` pass:
    - 1.2: the font's folder has the same files and bytes before and after `setMeta` (name, maker, notes), and the details are kept.
    - 1.5: a zip of a readme and a picture is refused with "…Is it a sound font package?", and the library stays empty.
    - 1.11: a font of stereo wavs shows the `stereo` issue "…stereo. Fonts should be mono.".

    19 tests pass in the file.
- [x] 2.2 **Font library,** in a new `apps/desktop/test/fontLibraryMove.test.ts` (design D3). 1.3: with `rename` failing as `EXDEV`, moving the library to a new folder puts every font and its details there, leaves none behind, and `list()` shows the same fonts. Verify with `npm test`.
  - **Result, 2026-09-29.** The new `apps/desktop/test/fontLibraryMove.test.ts` mocks `node:fs/promises` so that `rename` fails with `EXDEV` for font folders (names without a dot), and works as usual for the store's own files. 1.3 passes:
    - with two fonts, one with details, `moveTo` took the copy path for each
    - every font's sounds, including one in a subfolder, are in the new folder, and nothing but Hiltwright's own index files is left in the old one
    - `list()` shows the same folders, names and makers as before
- [x] 2.3 **SD card,** in `apps/desktop/test/sdLayout.test.ts`, and a new `apps/desktop/test/fontNeeds.test.ts`:
  - 2.4: a card with two fonts and a tracks folder lists both fonts, with type, count, size and status, and the tracks with their sizes
  - 2.7: `readVoicePack` on a card whose `common` folder has `voice_pack_version=2` and menu sounds gives version 2 with menu sounds
  - 2.8: `copyFont` puts a new font on the card under its folder name, and the source folder is unchanged
  - 2.9: `copyFont` to a card that already has the folder throws "<name> is already on the card", and copies nothing
  - 2.10:
    - `fontsForPresets` with presets naming two library fonts that are not on the card gives both as copyable (and ignores `common`)
    - `FontLibrary.copyToCard` for each puts both on the card
  - 2.14: a tree snapshot of the card is equal before and after `listFonts`, `checkFontDir`, `listTracks` and `readVoicePack` (design D5)

  Verify with `npm test`.
  - **Result, 2026-09-29.** All pass. In the "sd-card audit" block of `apps/desktop/test/sdLayout.test.ts`, on a temporary card with two fonts, a tracks folder and a version 2 voice pack:
    - **2.4:** both fonts with a type, a count, a size and a list of issues; tracks listed with sizes 44 and 144.
    - **2.7:** `{ ini: true, version: 2, menuSounds: true }`.
    - **2.8:** a new font lands under its folder name, with 2 files, and the source tree is unchanged (paths, sizes, times).
    - **2.9:** "Ember is already on the card", with the card unchanged, and its own file kept.
    - **2.14:** the card's tree is equal before and after `listFonts`, `checkFontDir` for each font, `listTracks` and `readVoicePack`.

    In the new `apps/desktop/test/fontNeeds.test.ts`, 2.10: the presets name Mara, valkyrie (a different case), Ember (on the card), a second Mara, Nowhere and common. The result is:
    - needed: Mara, valkyrie, Ember, Nowhere
    - copyable: Mara, valkyrie
    - missing: Nowhere

    Copying each through `FontLibrary.copyToCard` leaves nothing copyable, and the card holds Ember, Mara and Valkyrie.
- [x] 2.4 **Xenopixel,** in `apps/desktop/test/importer.test.ts`. 3.1: `scanXenoCard` on a folder with no numbered slots returns nothing, and `NO_XENO_FONTS` asks for the top of the card. Verify with `npm test`.
  - **Result, 2026-09-29.** In the "xenopixel-import audit" block of `apps/desktop/test/importer.test.ts`, 3.1 passes: `scanXenoCard` on a folder of named fonts and `tracks` finds nothing, and `NO_XENO_FONTS` reads "No Xenopixel font folders found there. … Choose the top of the card: the folder that holds the numbered folders 1, 2, 3 …".

## 3. Checks

- [x] 3.1 Run `npm test` and `npm run typecheck`; verify both pass. Record any expected failures, with their owning change.
  - **Result, 2026-09-29.** From the repository root: `npm test` passes 204 core tests and 380 desktop tests (13 gated skipped), and `npm run typecheck` is clean in both workspaces. No expected failures: every audited scenario already behaves as the specs say, so there was nothing to file.
- [x] 3.2 Hardware check by the owner, from a development build, with hote2's SD card (V2.2) in a card reader. On Fonts & SD, with hote2's presets naming fonts that are in the library but not on the card, the page lists them as copyable. "Copy all N" puts them on the card, which shows the seam in 1.1 works as before. Remove the copied fonts afterwards, if they are not wanted.
  - **Result, 2026-09-29 (owner).** Passed, with hote2's card in a card reader.
    - **At first, nothing to copy:** every font hote2's presets use was already on the card, so the page rightly listed none as copyable.
    - **The check:** the owner then ran it and reported it passed. How the missing fonts were set up was not recorded.
    - **On the way:** editing a preset while the card was out of the saber reset hote2. That is HW-2026-09-26d, now with hote2 evidence in `preset-editor-fixes`.
- [ ] 3.3 After archive, tick roadmap task 3.19 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
