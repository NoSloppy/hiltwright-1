# Beta 1 hardware checklist

One pass for the owner. Everything here was changed on 2026-11-14 and has only been unit-tested.
Mark each line pass or fail, with a word on what you saw. A fail goes back to the lane that owns it; only that line is re-run.

Before you start: build the installer with `npm run dist` and install it, so the pass runs on a packaged build. Have hote2 (V2.2) with its card and a battery, the V3 with a card and at least two presets, a card reader, and headphones or speakers.

## 1. Packaged build (no saber needed)

- [ ] The installer shows the licence page.
- [ ] About (under Tools) shows version 0.2.0-beta.1, opens the licence text and the third-party notices, and the source link opens the browser.
- [ ] The sidebar footer says "beta".

## 2. V3 smoke

Run by the owner on 2026-11-18 on a bare V3.9 (serial 207A349A5430), USB power only, with a card of seven library fonts. From the app's log:

- [x] Connect. Matched to its own record, before and after the install and after the restore. No second record.
- [x] Back up the firmware. 524288 bytes read in 1.1 s; the bootloader's flash size identified it as a V3.
- [x] Build and install. Built in 19.8 s at 43% of the V3's flash; written in 58 s.
- [x] It reconnects by itself after the install.
- [x] Restore the backup. Written in 140 s; the saber came back on its old firmware and matched its record.
- [ ] Change one preset's font and one colour live. Not run. Preset switching works; the owner confirmed it on the V2.2 with sound. The V3 has no speaker, so nothing can be heard on it.
- [x] Share the card over USB, then give it back. With the new wait (2026-11-18): the drive was found after 9 s by its USB serial, the six free fonts were copied from their packs (7 fonts on the card became 13), and the card was given back. With the card open in File Explorer the first give-back was refused and the second worked. After that the saber no longer said "font directory not found".
- [ ] Ten preset selections, each after 30 s idle. Only four were made, close together: one stalled and recovered by itself ("ok after a pause").
- [ ] With a battery. Waits until the board is in a hilt.

Found: the installed presets named the default fonts (TeensySF, SmthJedi and others), which were not on the card, so the saber said "font directory not found" and "voice pack not found" on every preset change. Build & Install did not warn before installing, and the voice pack check passed because `common` is on the card, although no preset uses it.

## 3. hote2: the promise path

- [ ] Plan, choose styles and fonts, build and install, with a pasted style and an editor-built style among the presets.
- [ ] After the install, live preset edits are confirmed.

## 4. hote2: "Use it in" from Styles

First, second and fourth lines passed by the owner on hote2, 2026-11-18.

- [x] Live list, a style already installed, preset 2, with a blast colour you tried on Styles: the saber confirms, the blade keeps its base colour, and after a reconnect the button reads "Already in" preset 2.
- [x] The same style on a preset that already has it: the button is disabled and says so.
- [x] With presets staged, "Use it in" the first staged preset: the saber is not written to, the page says the style goes into the staged preset and reaches the saber with the next install, and the button then reads "Already in" that preset. Run in the hidden copy with a simulated connection, 2026-11-18.
- [x] Share the card, then try "Use it in": nothing is sent, and the page says the card is shared.
- [ ] Rebuild after the first step: preset 2 keeps the style.

## 5. hote2: History, move, copy, delete

Passed by the owner on hote2, 2026-11-18. In History only the newest entry says "Undo"; older ones say "Restore", with "only this one" or "the whole list".

- [x] Edit preset 3's font, move it to position 1, then restore the edit: only the preset now at position 1 changes.
- [x] Restore the move: the order comes back.
- [x] Delete preset 2, then restore: it comes back at position 2.
- [x] Copy a preset, rename the copy, then restore: the copy is gone.
- [x] Each restore shows a plain list of what it will change before it does it.
- [ ] Unplug in the middle of a restore: an honest failure is shown, and the page shows what the saber has. Not run.

## 6. Preset sets

Run on hote2 by the owner, 2026-11-18. Found: a style removed from the style library but still carried by the saber's plan was shown on Presets as "Saber's default", although the plan still installs it. Presets now lists such styles under "Only on this saber", with their preview.

Re-run the same day in a hidden copy of the app on a copy of the owner's data, with board access off and a simulated connection (no saber involved):

- [x] Load a set whose style was removed from the library but is still in the saber's plan ("hotetest presets"): it loads with no warning and the preset shows the style ("My style").
- [x] Load a set that names a style gone from both the library and the plan ("hote2 presets"): the problem is listed first, and the button reads "Load it anyway".
- [x] With presets staged, load a set: the page says it replaces the staged presets and waits for "Load it" or Cancel.
- [ ] After "Load it anyway", Build accepts the plan. Not run.

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

Passed by the owner on hote2, 2026-11-18.

- [x] Typing `reboot` in the console asks before sending.
- [x] The voice pack line matches the saber's presets.

## Separate: Smart App Control spike

On a clean Windows 11 PC with Smart App Control on: run the installer, the toolchain setup, a build and a flash. Write down each thing Windows blocks and at which step. The install guide is written from these notes.
