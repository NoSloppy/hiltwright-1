# firmware-install (delta)

## MODIFIED Requirements

### Requirement: Only firmware Hiltwright built is written
The installer SHALL refuse to write any firmware file that was not produced by Hiltwright's own build, however the path is spelled.

The part of the app that writes firmware SHALL check two things itself, whatever the page asks for:
- the file is the last successful build made for this saber in this run
- the wiring that build was made from is the wiring the owner confirmed

Otherwise it SHALL write nothing, and say which of the two is missing.

#### Scenario: A path with different slashes
- **WHEN** the build's firmware path is given with forward slashes and a different letter case
- **THEN** it is still recognised as Hiltwright's build and written

#### Scenario: An older build of the same saber
- **WHEN** the page asks to write a firmware file from an earlier build of this saber, not its last one
- **THEN** nothing is written, and the owner is told to build again

#### Scenario: Wiring confirmed after a different build
- **WHEN** the last build was made from blades the owner has not confirmed
- **THEN** nothing is written, and the owner is told to confirm the wiring

### Requirement: The saber's firmware is always backed up before a write
Before writing, the installer SHALL read the board's whole flash into a backup file kept with that saber. This step cannot be skipped.

A backup SHALL count only when the file has the board's full flash size and starts like firmware for this chip. Two outcomes are not usable backups:
- **An all-erased read** (a blank or wiped board) is not a backup either. There is nothing on the board to lose, so the install SHALL go on. The page SHALL say that there was no previous firmware to keep, and no backup file SHALL be kept.
- **Any other read that fails, or is not usable,** SHALL stop the install before anything is written. The owner SHALL be told so, and the board SHALL be sent back to its firmware (see "Any failure stops safely with a way back").

#### Scenario: A normal install keeps a backup
- **WHEN** an install runs
- **THEN** a backup of the previous firmware is saved with the saber before the write starts, and the finished install names the backup's location
- *Needs a real board (either).*

#### Scenario: The backup fails
- **WHEN** reading the backup fails
- **THEN** the install stops with "Backup failed, so nothing was written"

#### Scenario: A read that is not firmware
- **WHEN** the backup reads back the full size, but does not start like firmware and is not all erased
- **THEN** the install stops with "Backup failed, so nothing was written", saying the read was not usable firmware, and the saber is sent back to its firmware

#### Scenario: A short read
- **WHEN** the backup file is smaller than the board's flash
- **THEN** the install stops, and nothing is written

#### Scenario: A blank board
- **WHEN** the backup reads back as all erased flash
- **THEN** the install goes on, the page says there was no previous firmware to keep, and no backup file is listed for it

### Requirement: The board is brought into its bootloader
For a connected saber, the installer SHALL reboot it into its bootloader: first with the ProffieOS reboot command, then with the 1200-baud touch as a fallback. It SHALL wait for this saber's bootloader to appear, for a bounded time set from reboot times measured on real boards, and SHALL remember that bootloader as this saber's. After the first few seconds of waiting, the page SHALL say that this can take up to that time.

If the wait ends with the saber still running its firmware, the page SHALL say that the saber ignored the reboot, rather than that the bootloader did not appear.

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

#### Scenario: A slow reboot
- **WHEN** the saber takes longer than a few seconds to appear in bootloader mode
- **THEN** the page says it is still waiting and that this can take up to the measured time, and the install goes on when the bootloader appears within it

#### Scenario: A saber that ignores the reboot
- **WHEN** the wait ends and the saber is still running its firmware, with no bootloader
- **THEN** the install stops, saying the saber did not restart into bootloader mode, with the BOOT/RESET steps, and nothing is written

### Requirement: The Windows bootloader driver is installed in one click
When the bootloader appears on Windows without a usable driver, the installer SHALL pause and explain that this is needed once per computer and that nothing has changed on the saber. One click SHALL download the ProffieOS driver installer and check that it is exactly the expected file (size and pinned SHA-256) before running it. It SHALL then run it with the owner's approval through the Windows prompt, wait for the driver to attach, and resume what was paused. That is an install, or putting a backup back, whichever the owner started. A file that fails the check SHALL be deleted and never run. The owner SHALL also be able to install the driver by hand, then check again, or cancel.

#### Scenario: A computer without the driver
- **WHEN** an install reaches the bootloader on a Windows computer that has never had the driver
- **THEN** the install pauses with "Windows needs a driver", one click and the Windows approval install it, and the install resumes by itself
- *Needs a real board (either) on a Windows computer without the driver.*

#### Scenario: A tampered download
- **WHEN** the downloaded driver installer does not match the expected size and SHA-256
- **THEN** it is deleted, not run, and the owner is told it is not the file expected

#### Scenario: Putting a backup back on a computer without the driver
- **WHEN** the owner puts a backup back, and the bootloader appears without a driver
- **THEN** the same driver step is offered, and once the driver is in, the backup is put back, never a build installed in its place

### Requirement: The firmware is written and the saber brought back
After the backup, the installer SHALL write the firmware. The write counts as successful only when the flasher reports success.

As soon as the write succeeds, the saber's record SHALL hold the firmware record and model of that build, before the saber has come back. So a slow return, or none, never leaves the record describing the old firmware.

The installer SHALL then wait a bounded time for the saber to return in normal mode, and reconnect to that saber on its own, not another board plugged in beside it. A board that comes back running without giving its USB serial, while this saber's bootloader is gone, SHALL count as this saber coming back. A saber that is back but not answering yet SHALL be read once more before the page says it could not be checked.

It SHALL then check the install: read the version and config name the saber reports, and compare them with the build (the build's config name, and the Hiltwright version stamp). Only when they match SHALL the page say "Installed", with what the saber reports and the backup's location. On a mismatch, the page SHALL say the firmware was written, what the saber reports instead, and that the backup can be put back. When the saber cannot be read, it SHALL say the firmware was written but could not be checked.

If it cannot tell which port is this saber, and reaches a different saber, the page SHALL say which saber it reached.

If the write fails, the owner SHALL be told where the backup from just now is, and the board SHALL stay in its bootloader so that a backup can be put back. If the saber does not come back in time, the owner SHALL be told that the firmware was written and how to reconnect.

If the saber's record cannot be saved after a successful write, the page SHALL still say that the firmware was installed. It SHALL report the record problem separately, as a warning, in words that wrap within the page.

#### Scenario: A successful install
- **WHEN** the write completes
- **THEN** the saber reappears, the app reconnects and reads it, the version and config name match the build, and the page says "Installed" with what the saber reports and the backup's location
- *Needs a real board (either).*

#### Scenario: Another board plugged in beside it
- **WHEN** two sabers are plugged in, and the owner installs one of them
- **THEN** after the write, the app reconnects to the saber that was installed, not the other one
- *Needs a real board (V2.2 and V3, plugged in together).*

#### Scenario: The saber does not come back
- **WHEN** the firmware was written but the saber does not reappear within the wait
- **THEN** the page says it was written and asks the owner to unplug, replug and connect
- **AND** the saber's record already holds the new firmware record

#### Scenario: The saber comes back without its USB serial
- **WHEN** after the write, the board comes back running but gives no USB serial
- **THEN** the install counts it as this saber coming back, reconnects, and checks what it reports, rather than saying it has not reappeared
- *Needs a real board (V3); seen twice in twenty returns on the V3.9.*

#### Scenario: The saber reports something else
- **WHEN** the saber comes back reporting a different config name from the build's
- **THEN** the page says the firmware was written but the saber reports that config instead, and that the backup can be put back

#### Scenario: The write fails
- **WHEN** the flasher reports a failed write
- **THEN** the page names the backup from just now, the board stays in its bootloader, and the saber's record is not changed

#### Scenario: The record cannot be saved
- **WHEN** the write succeeds, but saving the saber's record fails
- **THEN** the page says the firmware was installed, and shows the record problem as a separate warning that wraps within the page

### Requirement: Any failure stops safely with a way back
Any error during an install SHALL stop the sequence, show what failed, and tell the owner how to put the board into its bootloader by hand. It SHALL also remind them that a backup can be put back.

When an install or restore stops before anything is written, with this saber's board in its bootloader, Hiltwright SHALL send the board back to its firmware itself, with nothing written, and say so. Examples: a failed backup, a refused board, an unknown flash size. Only if that fails SHALL the owner be told to press RESET or unplug the board. A board recognised as another saber SHALL be left as it is. After a failed write, the board SHALL be left in its bootloader.

#### Scenario: An unexpected error
- **WHEN** a step of the install throws an error
- **THEN** the page shows "Stopped" with the error, the BOOT/RESET instructions and the reminder about backups

#### Scenario: A stop before the write
- **WHEN** the install stops after the saber was rebooted into its bootloader, but before anything was written
- **THEN** the saber is sent back to its firmware and reconnects, and the page says it is back on the firmware it had
- *Needs a real board (either).*

#### Scenario: The board cannot be sent back
- **WHEN** sending the board back to its firmware fails
- **THEN** the page says to press RESET on the board, or unplug it and plug it back in

### Requirement: A backup can be put back
The Backups tab SHALL list the saber's backups newest first, with date, label and size. It SHALL mark any backup that does not look like complete firmware for this chip as unusable, and SHALL NOT offer to put that one back. That covers a size other than 256 KB or 512 KB, or no valid stack pointer and reset vector.

Putting a backup back SHALL take two clicks and use the same bootloader sequence, with the same checks as an install:
- the board must be this saber
- the backup's size must match the flash size the bootloader reports

Before writing, it SHALL back up what is on the board now, as an install does, with the same rules for a backup that is not usable. It SHALL say that presets and fonts on the SD card are not touched, and SHALL reconnect to the saber afterwards. As soon as the write succeeds, the saber's record SHALL no longer claim Hiltwright firmware (see `saber-library`), whether or not the saber has come back yet.

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

#### Scenario: A restore keeps what it replaces
- **WHEN** the owner puts a backup back
- **THEN** the firmware on the board is first read to a new backup, labelled as taken before the restore, and listed on the Backups tab afterwards
- *Needs a real board (either).*

#### Scenario: A wrong-size file on the list
- **WHEN** a backup file of 100 KB that starts like firmware is in the saber's backups
- **THEN** the Backups tab lists it as not a usable image, with no Put back button

### Requirement: Firmware is written only to the board it was built for
The installer SHALL compare the build's board with the flash size the bootloader reports: 256 KB is a Proffieboard V2, 512 KB a V3. It SHALL do this before the backup and before anything is written. It SHALL refuse:
- a build for the other board, saying which board the saber is and which the build was for, and that nothing was written
- a flash size Hiltwright does not know

When Hiltwright already knows the saber's board from an earlier install, and the build is for the other one, it SHALL refuse before rebooting the saber. After a refusal in the bootloader, Hiltwright SHALL send the board back to its firmware (see "Any failure stops safely with a way back").

#### Scenario: A V2 build on a V3
- **WHEN** a build for a Proffieboard V2 is installed, and the bootloader reports 512 KB
- **THEN** the install stops with "This saber is a Proffieboard V3, but this firmware was built for a V2. Nothing was written.", and says to choose V3 on the Wiring page and build again
- **AND** the saber is sent back to its firmware
- *Needs a real board (V3).*

#### Scenario: A known board, the wrong build
- **WHEN** Hiltwright learnt at an earlier install that this saber is a V3, and a V2 build is installed
- **THEN** the install stops before the saber is rebooted, with the same words

#### Scenario: An unknown board
- **WHEN** the bootloader reports a flash size that is neither 256 KB nor 512 KB, or none
- **THEN** the install stops, saying Hiltwright does not recognise this board, and nothing is written
