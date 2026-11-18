# Spec Delta

## Purpose

Writes a firmware build that Hiltwright made onto a Proffieboard over USB, safely. It always backs up first, handles the Windows bootloader driver, brings the saber back connected, and lets any earlier firmware be put back.

## ADDED Requirements

### Requirement: Installing is deliberate and gated
Install SHALL be available only after a successful build in this session, with the wiring confirmed, and with either a connected saber or a board already in its bootloader. When a condition is missing, the page SHALL say which one ("Build first", "Plug the saber in to install", confirm the wiring). Installing SHALL take two clicks: the install button, then an explicit confirmation that firmware will be written.

#### Scenario: Wiring not yet confirmed
- **WHEN** a build has succeeded but the wiring has not been confirmed
- **THEN** Install stays locked, and the page warns that wrong power pins can damage hardware and asks the owner to confirm every data and power pin

#### Scenario: Confirming the install
- **WHEN** the owner presses "Install on <saber>"
- **THEN** nothing is written until they also press "Yes, write the firmware", and Cancel leaves the saber untouched

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
For a connected saber, the installer SHALL reboot it into its bootloader: first with the ProffieOS reboot command, then with the 1200-baud touch as a fallback. It SHALL wait a bounded time for the bootloader to appear. A board already in its bootloader SHALL be installed without a reboot. If the bootloader does not appear, the owner SHALL be told how to enter it by hand (hold BOOT, tap RESET, release BOOT).

#### Scenario: Reboot from running firmware
- **WHEN** an install starts on a connected saber
- **THEN** the saber leaves normal mode, its bootloader appears within the wait, and the install continues without the owner touching the board
- *Needs a real board (either).*

#### Scenario: Board already in its bootloader
- **WHEN** the board is already in its bootloader when the owner installs
- **THEN** the reboot is skipped, and the install goes straight to the backup

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
After the backup, the installer SHALL write the firmware. The write counts as successful only when the flasher reports success. The installer SHALL then wait a bounded time for the saber to return in normal mode, reconnect to it on its own, and report that the install is finished with the backup's location. If the write fails, the owner SHALL be told where the backup from just now is. If the saber does not come back in time, the owner SHALL be told that the firmware was written and how to reconnect.

#### Scenario: A successful install
- **WHEN** the write completes
- **THEN** the saber reappears, the app reconnects and reads it, and the page says "Installed" with the backup's location
- *Needs a real board (either).*

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
The Backups tab SHALL list the saber's backups newest first, with date, label and size. It SHALL mark any backup that does not look like complete firmware for this chip (wrong size, or no valid stack pointer and reset vector) as unusable, and SHALL NOT offer to put that one back. Putting a backup back SHALL take two clicks and use the same bootloader sequence. It SHALL say that presets and fonts on the SD card are not touched, and SHALL reconnect to the saber afterwards. After a restore, the saber's record SHALL no longer claim Hiltwright firmware (see `saber-library`).

#### Scenario: Restoring the previous firmware
- **WHEN** the owner puts back the backup made before the last install
- **THEN** the board runs its previous firmware, the app reconnects, and the page says which backup was restored
- *Needs a real board (either).*

#### Scenario: An erased read
- **WHEN** a backup file is all erased flash or the wrong size
- **THEN** it is listed as not a usable image and cannot be put back
