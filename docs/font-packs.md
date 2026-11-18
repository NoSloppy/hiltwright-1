# Free ProffieOS font packs

Beta 1 ships the six free sound fonts from the ProffieOS default SD card as Hiltwright packs: TeensySF, SmthJedi, SmthGrey, SmthFuzz, RgueCmdr and TthCrstl (all CC BY-SA 4.0). Fonts & SD offers "Copy to card" for any of them that a preset names and the card lacks.

## Where the source comes from

The ProffieOS default SD card download, a folder that holds `TeensySF`, `SmthJedi`, `SmthGrey`, `SmthFuzz`, `RgueCmdr`, `TthCrstl` and `tracks`. TODO(owner): download URL. (The ProffieOS page that describes the card is https://pod.hubbe.net/config/get-from-sd-card.html.)

## Rebuild the packs

```
npm ci
npm run fontpacks --workspace @hiltwright/desktop -- "<folder of the default SD card>"
```

This writes six `.hwpack` files to `apps/desktop/resources/packs/`, each with copy-to-card allowed and holding the font's complete folder (every sound, `config.ini`, `smoothsw.ini`, the licence and readme files). A copy from a pack is identical to the original folder, and the licence and credit travel with it. The credits are set in `apps/desktop/scripts/fontpacks.mjs`: TeensySF by KRSABERS.COM, TthCrstl by Dayad Jocen, the other four "ProffieOS default sound fonts" (their files name no author).

The packs are about 100 MB and are not in git (the folder is in `.gitignore`). `npm run dist` first checks that all six exist and stops with a message naming `npm run fontpacks` if one does not, so an installer is never built without them. The installer ships `resources/packs/*.hwpack` into `<resources>/packs`; nothing from the repo's own `packs/` folder (hilt packs) is shipped.
