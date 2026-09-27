# firmware-install (delta)

## MODIFIED Requirements

### Requirement: Installing is deliberate and gated
Install SHALL be available only when all of these hold:
- a build in this session succeeded, and that build is still current: the saber's setup has not changed since
- the wiring is confirmed
- either a connected saber, or a board already in its bootloader

When a condition is missing, the page SHALL say which one:
- "Build first"
- "The setup changed after this build. Build again to install it."
- "Plug the saber in to install"
- confirm the wiring

Installing SHALL take two clicks: the install button, then an explicit confirmation that firmware will be written.

#### Scenario: Wiring not yet confirmed
- **WHEN** a build has succeeded but the wiring has not been confirmed
- **THEN** Install stays locked, and the page warns that wrong power pins can damage hardware and asks the owner to confirm every data and power pin

#### Scenario: Confirming the install
- **WHEN** the owner presses "Install on <saber>"
- **THEN** nothing is written until they also press "Yes, write the firmware", and Cancel leaves the saber untouched

#### Scenario: The setup changes after a build
- **WHEN** a build succeeds, and the owner then changes a preset's style or a blade's pixel count
- **THEN** Install is locked with "The setup changed after this build. Build again to install it."
- **AND** after building again, Install is offered for the new build

#### Scenario: The setup is changed back
- **WHEN** the owner changes the setup after a build and then changes it back
- **THEN** the build counts as current again, and Install is offered

### Requirement: The board is brought into its bootloader
For a connected saber, the installer SHALL reboot it into its bootloader: first with the ProffieOS reboot command, then with the 1200-baud touch as a fallback. It SHALL wait a bounded time for this saber's bootloader to appear, and SHALL remember that bootloader as this saber's.

A board already in its bootloader SHALL be installed without a reboot, but only in two cases:
- It is recognised as this saber by its USB serial number: the serial the saber has when running, or the one its bootloader had when Hiltwright last rebooted it.
- The owner confirms it is this saber, when Hiltwright cannot tell which saber it is. The question names the saber, and Cancel leaves the board untouched.

A board recognised as a different saber SHALL be refused, and nothing SHALL be written.

If the bootloader does not appear, the owner SHALL be told how to enter it by hand (hold BOOT, tap RESET, release BOOT).

#### Scenario: Reboot from running firmware
- **WHEN** an install starts on a connected saber
- **THEN** the saber leaves normal mode, its bootloader appears within the wait, and the install continues without the owner touching the board
- **AND** Hiltwright remembers that bootloader as this saber's
- *Needs a real board (either).*

#### Scenario: Board already in its bootloader
- **WHEN** the board is already in its bootloader when the owner installs, and its serial is this saber's
- **THEN** the reboot is skipped, and the install goes straight to the checks and the backup
- *Needs a real board (either).*

#### Scenario: Board already in its bootloader, not recognised
- **WHEN** a board is in its bootloader whose serial belongs to no saber Hiltwright knows, and the owner presses Install on a saber
- **THEN** the page asks whether the board is that saber, naming it, before anything is read or written
- **AND** Cancel leaves the board untouched, and confirming continues the install

#### Scenario: Board already in its bootloader, another saber
- **WHEN** the board in its bootloader is recognised as a different saber from the one being installed
- **THEN** the install stops, naming the saber the board belongs to, and nothing is written

### Requirement: The firmware is written and the saber brought back
After the backup, the installer SHALL write the firmware. The write counts as successful only when the flasher reports success.

The installer SHALL then wait a bounded time for the saber to return in normal mode, and reconnect to that saber on its own, not another board plugged in beside it. It SHALL then report that the install is finished, with the backup's location. If it cannot tell which port is this saber, and reaches a different saber, the page SHALL say which saber it reached.

If the write fails, the owner SHALL be told where the backup from just now is. If the saber does not come back in time, the owner SHALL be told that the firmware was written and how to reconnect.

#### Scenario: A successful install
- **WHEN** the write completes
- **THEN** the saber reappears, the app reconnects and reads it, and the page says "Installed" with the backup's location
- *Needs a real board (either).*

#### Scenario: Another board plugged in beside it
- **WHEN** two sabers are plugged in, and the owner installs one of them
- **THEN** after the write, the app reconnects to the saber that was installed, not the other one
- *Needs a real board (V2.2 and V3, plugged in together).*

#### Scenario: The saber does not come back
- **WHEN** the firmware was written but the saber does not reappear within the wait
- **THEN** the page says it was written and asks the owner to unplug, replug and connect

### Requirement: A backup can be put back
The Backups tab SHALL list the saber's backups newest first, with date, label and size. It SHALL mark any backup that does not look like complete firmware for this chip (wrong size, or no valid stack pointer and reset vector) as unusable, and SHALL NOT offer to put that one back.

Putting a backup back SHALL take two clicks and use the same bootloader sequence, with the same checks as an install:
- the board must be this saber
- the backup's size must match the flash size the bootloader reports

It SHALL say that presets and fonts on the SD card are not touched, and SHALL reconnect to the saber afterwards. After a restore, the saber's record SHALL no longer claim Hiltwright firmware (see `saber-library`).

#### Scenario: Restoring the previous firmware
- **WHEN** the owner puts back the backup made before the last install
- **THEN** the board runs its previous firmware, the app reconnects, and the page says which backup was restored
- *Needs a real board (either).*

#### Scenario: An erased read
- **WHEN** a backup file is all erased flash or the wrong size
- **THEN** it is listed as not a usable image and cannot be put back

#### Scenario: A backup from the other board size
- **WHEN** a 256 KB backup is to be put back on a board whose bootloader reports 512 KB
- **THEN** nothing is written, and the page says the backup is from a different kind of board

## ADDED Requirements

### Requirement: Firmware is written only to the board it was built for
The installer SHALL compare the build's board with the flash size the bootloader reports: 256 KB is a Proffieboard V2, 512 KB a V3. It SHALL do this before the backup and before anything is written. It SHALL refuse:
- a build for the other board, saying which board the saber is and which the build was for, and that nothing was written
- a flash size Hiltwright does not know

When Hiltwright already knows the saber's board from an earlier install, and the build is for the other one, it SHALL refuse before rebooting the saber. After a refusal in the bootloader, the owner SHALL be told how to bring the board back to its firmware.

#### Scenario: A V2 build on a V3
- **WHEN** a build for a Proffieboard V2 is installed, and the bootloader reports 512 KB
- **THEN** the install stops with "This saber is a Proffieboard V3, but this firmware was built for a V2. Nothing was written.", and says to choose V3 on the Wiring page and build again
- *Needs a real board (V3).*

#### Scenario: A known board, the wrong build
- **WHEN** Hiltwright learnt at an earlier install that this saber is a V3, and a V2 build is installed
- **THEN** the install stops before the saber is rebooted, with the same words

#### Scenario: An unknown board
- **WHEN** the bootloader reports a flash size that is neither 256 KB nor 512 KB, or none
- **THEN** the install stops, saying Hiltwright does not recognise this board, and nothing is written

### Requirement: Only this saber's board is written when several are plugged in
With more than one Proffieboard plugged in, the backup, the write and a restore SHALL each go to this saber's bootloader only. The installer SHALL never take the first board it finds. When it cannot tell which board is this saber, it SHALL stop before anything is read or written, and say that more than one board is plugged in and which to unplug. An example is two boards in their bootloaders, neither known.

#### Scenario: Two sabers, one installed
- **WHEN** two sabers are plugged in, and the owner installs the connected one
- **THEN** only that saber is rebooted, backed up and written, and the other keeps running its firmware
- *Needs a real board (V2.2 and V3, plugged in together).*

#### Scenario: Two boards in their bootloaders
- **WHEN** two boards are in their bootloaders, and neither is known as this saber
- **THEN** the install stops, saying more than one board is in bootloader mode and to unplug the others, and nothing is read or written
