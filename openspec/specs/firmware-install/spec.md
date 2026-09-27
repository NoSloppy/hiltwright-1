# firmware-install Specification

## Purpose
Writes a firmware build that Hiltwright made onto a Proffieboard over USB, safely. It always backs up first, handles the Windows bootloader driver, brings the saber back connected, and lets any earlier firmware be put back.

## Requirements

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

### Requirement: Only firmware Hiltwright built is written
The installer SHALL refuse to write any firmware file that was not produced by Hiltwright's own build, however the path is spelled.

#### Scenario: A path with different slashes
- **WHEN** the build's firmware path is given with forward slashes and a different letter case
- **THEN** it is still recognised as Hiltwright's build and written

### Requirement: The saber's firmware is always backed up before a write
Before writing, the installer SHALL read the board's whole flash into a backup file kept with that saber. This step cannot be skipped. If the backup fails, nothing SHALL be written, and the owner SHALL be told so.

#### Scenario: A normal install keeps a backup
- **WHEN** an install runs
- **THEN** a backup of the previous firmware is saved with the saber before the write starts, and the finished install names the backup's location
- *Needs a real board (either).*

#### Scenario: The backup fails
- **WHEN** reading the backup fails
- **THEN** the install stops with "Backup failed, so nothing was written"

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

### Requirement: The Windows bootloader driver is installed in one click
When the bootloader appears on Windows without a usable driver, the installer SHALL pause and explain that this is needed once per computer and that nothing has changed on the saber. One click SHALL download the ProffieOS driver installer and check that it is exactly the expected file (size and pinned SHA-256) before running it. It SHALL then run it with the owner's approval through the Windows prompt, wait for the driver to attach, and resume the install. A file that fails the check SHALL be deleted and never run. The owner SHALL also be able to install the driver by hand, then check again, or cancel.

#### Scenario: A computer without the driver
- **WHEN** an install reaches the bootloader on a Windows computer that has never had the driver
- **THEN** the install pauses with "Windows needs a driver", one click and the Windows approval install it, and the install resumes by itself
- *Needs a real board (either) on a Windows computer without the driver.*

#### Scenario: A tampered download
- **WHEN** the downloaded driver installer does not match the expected size and SHA-256
- **THEN** it is deleted, not run, and the owner is told it is not the file expected

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

### Requirement: Install progress is shown as one bar and a log
The whole install SHALL show a single progress bar that moves through rebooting, backing up, writing and waiting, and SHALL count elapsed time. The Log tab SHALL keep the flasher's messages with timestamps, leave out its redrawn progress lines, follow new lines unless the owner has scrolled up, and open by itself when an install starts.

#### Scenario: Progress lines cut into pieces
- **WHEN** the flasher's progress lines arrive split across reads
- **THEN** the bar still moves, and none of those lines appear in the log

### Requirement: Any failure stops safely with a way back
Any error during an install SHALL stop the sequence, show what failed, and tell the owner how to put the board into its bootloader by hand. It SHALL also remind them that a backup can be put back.

#### Scenario: An unexpected error
- **WHEN** a step of the install throws an error
- **THEN** the page shows "Stopped" with the error, the BOOT/RESET instructions and the reminder about backups

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

### Requirement: A failed build or install offers diagnostics
When a build fails, or an install, backup, restore or bootloader step stops with an error, Build & Install SHALL offer Save diagnostics beside the message (see `support-bundle`).

#### Scenario: A build that fails
- **WHEN** a build fails with a compile problem
- **THEN** the failure message offers Save diagnostics, and the saved file shows that build's problems and flash use

#### Scenario: An install that stops
- **WHEN** an install stops because the bootloader never appeared
- **THEN** the message offers Save diagnostics, and the saved file's log shows the bootloader wait and how it ended
- *Needs a real board (either).*

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
