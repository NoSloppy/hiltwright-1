# Beta 1 hardware checklist

One pass for the owner. Everything here was changed on 2026-11-14 and has only been unit-tested.
Mark each line pass or fail, with a word on what you saw. A fail goes back to the lane that owns it; only that line is re-run.

Before you start: build the installer with `npm run dist` and install it, so the pass runs on a packaged build. Have hote2 (V2.2) with its card and a battery, the V3 with a card and at least two presets, a card reader, and headphones or speakers.

## 1. Packaged build (no saber needed)

- [ ] The installer shows the licence page.
- [ ] About (under Tools) shows version 0.2.0-beta.1, opens the licence text and the third-party notices, and the source link opens the browser.
- [ ] The sidebar footer says "beta".

## 2. V3 smoke

- [ ] Connect. The app knows it is a V3 and matches it to its own record.
- [ ] Back up the firmware.
- [ ] Build and install. Note the flash percentage shown (a plain saber was 36% in a test build).
- [ ] It reconnects by itself after the install.
- [ ] Change one preset's font and one colour live. Both are confirmed.
- [ ] Share the card over USB, then give it back.
- [ ] Restore the backup.
- [ ] Ten preset selections, each after 30 s idle. Count the ones that stall, and check each recovers.

## 3. hote2: the promise path

- [ ] Plan, choose styles and fonts, build and install, with a pasted style and an editor-built style among the presets.
- [ ] After the install, live preset edits are confirmed.

## 4. hote2: "Use it in" from Styles

- [ ] Live list, a style already installed, preset 2, with a blast colour you tried on Styles: the saber confirms, the blade keeps its base colour, and after a reconnect the button reads "Already in" preset 2.
- [ ] The same style on a preset that already has it: the button is disabled and says so.
- [ ] Load a preset set so presets are staged, then "Use it in" the first staged preset: the saber does not change, and Presets shows the style in the staged preset.
- [ ] Share the card, then try "Use it in": nothing is sent, and the page says the card is shared.
- [ ] Rebuild after the first step: preset 2 keeps the style.

## 5. hote2: History, move, copy, delete

- [ ] Edit preset 3's font, move it to position 1, then Undo the edit: only the preset now at position 1 changes.
- [ ] Undo the move: the order comes back.
- [ ] Delete preset 2, then Undo: it comes back at position 2.
- [ ] Copy a preset, rename the copy, then Undo: the copy is gone.
- [ ] Each restore shows a plain list of what it will change before it does it.
- [ ] Unplug in the middle of a restore: an honest failure is shown, and the page shows what the saber has.

## 6. Preset sets

- [ ] Load a set that names a style you have since deleted: the problems are shown first, "Load it anyway" works, and Build accepts it.
- [ ] Stage some edits, then load a set: you are asked before they are replaced.

## 7. Cards and fonts

- [ ] A font in per-sound folders (`hum/hum1.wav`) gets the same verdict in the Font library and on the card, with no "no hum".
- [ ] hote2's card shared over USB: the font list loads, and giving the card back works straight after, including while a list is still loading.
- [ ] A card formatted exFAT in the reader: Fonts & SD shows its format and a red warning, and copying a font asks first.
- [ ] Fonts & SD and Font library at the smallest window size, and at 150% display scaling: nothing cut off.

## 8. Blade against preview (hote2, then the same six on the V3)

Two built-in styles, two pasted, two built in the editor. For each: idle, ignition, clash, blast, lockup, retraction.

- [ ] Each matches the preview closely enough that a style builder would not call it wrong.
- [ ] Where the preview shows "approximate" or "not modelled", the note is true.
- [ ] Known difference to confirm: on built-in styles, drag and lightning block change with twist and blade angle on the blade but not in the preview.

## 9. Listening (demo room, no saber needed)

Passed by the owner on 2026-11-18, with fonts from the library and two test fonts made from TeensySF. Found: choosing a card as the font source froze the room for 20 to 30 seconds, so cards are no longer a source there.

- [x] A font with melt sounds: melt starts with its begin sound, holds, and ends with its end sound.
- [x] A font with drag but no melt: melt plays drag.
- [x] A font with a lockup but no end sound, and with `clash` files: ending the lockup plays a clash.
- [x] A font with swing sounds and no SmoothSwing: a fast swing gives one swing sound, and a second needs a pause. A slow wave makes the hum swell.
- [x] An old single-sound font (`poweron`, `swing1`): the swing takes the hum's place, then the hum returns.
- [x] A SmoothSwing font sounds as it did before.
- [x] Ignition with pre-on, and retraction with post-off, sound as on the saber. Listen for the hum starting too early or too late.
- [x] The hum does not crackle or distort on a hard swing.
- [x] "From hote2" brings the preset's colours as well as its style and font.

## 10. Diagnostics

- [ ] Typing `reboot` in the console asks before sending.
- [ ] With the saber not answering, the voice pack line says it could not check, and does not say the pack is missing.

## Separate: Smart App Control spike

On a clean Windows 11 PC with Smart App Control on: run the installer, the toolchain setup, a build and a flash. Write down each thing Windows blocks and at which step. The install guide is written from these notes.
