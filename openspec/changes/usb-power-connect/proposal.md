# Proposal

**Milestone:** M2 (Beta 1 blocker). Filed by the owner on 2026-10-25, from the `preset-editor-fixes` hardware check on hote2. First in wave D after `preset-editor-fixes`, ahead of `card-safety` (roadmap 3.24a). The owner set that order on 2026-10-25.

## Why

Installers often work with no battery in the saber. Some flash fifteen boards in a row, swapping one Proffieboard for the next on the same USB cable. On hote2 with no battery, about half of preset selections from the app ended with "The saber stopped answering":

- `hiltwright-20261025-135632.log`, 14:42:47: `set_preset 9` got nothing back for 10 s, and the app gave the saber up. When the owner pressed Connect (no replug), the saber's first output was the rest of that command's reply, `Playing TheBoldOne/font/font.wav` and the end marker for `set_preset 9`. It had not crashed or rebooted. Its reply had stalled and went on once the port was reopened.
- Across the owner's logs there are six such stalls: `set_preset` twice, `set_style1`, `cat common/voicepack.ini` three times, and `get_volume` once on 2026-09-26. Every one came at least 28 s after the last activity, when the saber has powered down its card, amplifier and booster. About 30 other card reads went through. With no battery the battery pin reads 0.03 to 1.48 V, so hote2 runs on USB power alone. A supply dip when card, amplifier and booster wake together is the leading guess; a USB serial fault in the board is the other. Either way, pressing Connect recovers it.

Connecting also makes the saber talk and re-initialise:

- The app's connect sequence sends `battery`. ProffieOS prints the voltage and also speaks it ("zero point zero three volts").
- It sends `scanid` to learn the LED counts. That re-runs blade detection: every blade style is freed and rebuilt, the preset is read again, and the font is rescanned from the card. This is card work and output on every connect, for numbers the firmware gives directly.

## What Changes

- **A quiet, light connect:**
  - The battery is read with `battery_voltage`, which prints only the number. Firmware that answers `Whut?` gets `battery` as before.
  - LED counts come from `get_max_blade_length <n>` for each blade. Nothing is re-initialised.
  - `scanid` is sent only when the owner asks for a Blade ID measurement on the Wiring page.
- **Recovery from a stalled link:** when the saber goes silent in the middle of a command, the app reopens the port once, as the Connect button does, and reads the saber again.
  - If the command took effect, the app says so.
  - If it did not, the change is reported as not made, and nothing is sent a second time without the owner.
  - Only a second silence, or a port that does not reopen, reports the saber as lost.
- **A no-battery notice:** a reading under 2 V means no battery is connected. While connected, the app says the saber is running on USB power alone, that it may pause when it plays sound or reads its card, and that Hiltwright reconnects if it does. The battery chip says "No battery" rather than a voltage.

## Non-goals

- The boot sound on plug-in. Without a battery, plugging in powers the board on, and ProffieOS plays the font's `boot.wav` as it boots. Stock ProffieOS has no setting for a quiet boot, and Hiltwright does not patch the firmware.
- Finding the root cause of the stall (power or USB firmware). The V3 check records whether it happens there too. A board-side fix, if one is found, is its own change.
- Retrying a write on its own. A command whose result is unknown is read back and reported, never repeated without the owner.
- Batch flashing several boards in one session. Swapping boards on one cable must work, but a batch workflow is later work.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `board-connection`: the connect sequence reads the battery and LED counts without speech or re-initialisation; one silent stall is recovered by reopening the port; the saber is reported lost only after a second silence or a failed reopen.
- `diagnostics`: a reading under 2 V is shown as no battery, with the USB-power notice.
- `blade-id`: `scanid` runs only for a requested Blade ID measurement.

## Impact

`apps/desktop/src/renderer/src/{serial,board,boardOps,App,Wiring}.ts|tsx`, `packages/core/src/protocol/{session,responses}.ts`, and the transcript tests in `packages/core/test/transcripts/os8` (new: `battery_voltage`, `get_max_blade_length`). Hardware check on V2.2 hote2 with no battery: repeated connects make no speech and no font rescan, preset selections after 30 s idle recover from a stall without an error, and the no-battery notice shows. Then the same on the V3, recording whether it stalls at all.
