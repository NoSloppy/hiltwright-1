# Tasks

## 1. Seams (no change in behaviour)

- [ ] 1.1 Move the fonts-needed logic from `Fonts.tsx` into `apps/desktop/src/renderer/src/fontNeeds.ts` as `fontsForPresets(presets, cardFonts, library)` (design D2), and call it from `Fonts.tsx`. Verify with `npm run typecheck`, and in 2.3.
- [ ] 1.2 Move the Xenopixel "none found" words into `shared/importWords.ts` as `NO_XENO_FONTS`, shown by `XenoImport.tsx` (design D4). Verify with `npm run typecheck`, and in 2.4.

## 2. Tests

- [ ] 2.1 **Font library,** in `apps/desktop/test/fontLibrary.test.ts`:
  - 1.2: naming a font and giving it a maker leaves the font's folder byte for byte as it was (the same files, sizes and contents)
  - 1.5: a zip with no `.wav` is refused with "…Is it a sound font package?", and nothing is added
  - 1.11: a font whose sounds are stereo shows the mono issue in the library's report

  Verify with `npm test`.
- [ ] 2.2 **Font library,** in a new `apps/desktop/test/fontLibraryMove.test.ts` (design D3). 1.3: with `rename` failing as `EXDEV`, moving the library to a new folder puts every font and its details there, leaves none behind, and `list()` shows the same fonts. Verify with `npm test`.
- [ ] 2.3 **SD card,** in `apps/desktop/test/sdLayout.test.ts`, and a new `apps/desktop/test/fontNeeds.test.ts`:
  - 2.4: a card with two fonts and a tracks folder lists both fonts, with type, count, size and status, and the tracks with their sizes
  - 2.7: `readVoicePack` on a card whose `common` folder has `voice_pack_version=2` and menu sounds gives version 2 with menu sounds
  - 2.8: `copyFont` puts a new font on the card under its folder name, and the source folder is unchanged
  - 2.9: `copyFont` to a card that already has the folder throws "<name> is already on the card", and copies nothing
  - 2.10:
    - `fontsForPresets` with presets naming two library fonts that are not on the card gives both as copyable (and ignores `common`)
    - `FontLibrary.copyToCard` for each puts both on the card
  - 2.14: a tree snapshot of the card is equal before and after `listFonts`, `checkFontDir`, `listTracks` and `readVoicePack` (design D5)

  Verify with `npm test`.
- [ ] 2.4 **Xenopixel,** in `apps/desktop/test/importer.test.ts`. 3.1: `scanXenoCard` on a folder with no numbered slots returns nothing, and `NO_XENO_FONTS` asks for the top of the card. Verify with `npm test`.

## 3. Checks

- [ ] 3.1 Run `npm test` and `npm run typecheck`; verify both pass. Record any expected failures, with their owning change.
- [ ] 3.2 Hardware check by the owner, from a development build, with hote2's SD card (V2.2) in a card reader. On Fonts & SD, with hote2's presets naming fonts that are in the library but not on the card, the page lists them as copyable. "Copy all N" puts them on the card, which shows the seam in 1.1 works as before. Remove the copied fonts afterwards, if they are not wanted.
- [ ] 3.3 After archive, tick roadmap task 3.19 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
