# board-connection Specification

## Purpose
Finds a Proffieboard on USB, connects to it without ceremony, reads what the saber is, and carries every command to and from the board reliably on ProffieOS 7 and 8. Every other board-facing capability depends on it.

## Requirements

### Requirement: A saber connects without a click
When the app starts with a Proffieboard plugged in, or when a Proffieboard is plugged in while the app is open, the app SHALL connect to it without asking the owner to pick a device. When no board has been granted yet, pressing Connect SHALL select the Proffieboard by its USB ids without showing a device chooser. On Windows, a board SHALL be recognised even when the system reports only its device instance id.

#### Scenario: Board plugged in before starting the app
- **WHEN** the owner starts the app with a Proffieboard plugged in over a data cable
- **THEN** the app connects and reads the saber with no click and no device prompt
- *Needs a real board (either).*

#### Scenario: Board comes back after a reboot
- **WHEN** a connected board reboots (for example after a firmware install) and appears again
- **THEN** the app connects to it again on its own
- *Needs a real board (either).*

### Requirement: Only one connection attempt runs at a time
The app SHALL NOT start a second connection attempt while one is in progress. A second trigger during an attempt SHALL be ignored.

#### Scenario: Plug-in event during a reconnect
- **WHEN** the board reappears while the app is already reconnecting to it
- **THEN** only one connection is opened and the saber is read once

### Requirement: Stale output never answers a command
On opening the port, the app SHALL discard whatever the board printed before the connection, so that no command is answered by output that predates it.

#### Scenario: Leftover lines at open
- **WHEN** the board has unread output waiting when the port is opened
- **THEN** that output is discarded, and the first command gets its own answer

### Requirement: The connection state is always visible
The header SHALL show one of: not connected, opening the port, reading the saber, connected, no saber found, or error. On error, the Armory SHALL show the reason in plain words. While opening or reading, Connect SHALL be disabled. A connected saber SHALL offer Disconnect, which closes the port and returns to not connected.

#### Scenario: No board plugged in
- **WHEN** the owner presses Connect with no Proffieboard available
- **THEN** the state reads "No saber found", and the Armory explains how to plug one in over a data cable

#### Scenario: Disconnecting
- **WHEN** the owner presses Disconnect
- **THEN** the port is closed, the state reads "Not connected", and the saber's live values are cleared

### Requirement: Connecting identifies the saber
On connecting, the app SHALL read and show the saber's ProffieOS version, config file, prop file, button count, install stamp, battery voltage, volume, current preset, presets, fonts, tracks and blade layout. Versions SHALL be shown readably whether the firmware reports a release number, a git keyword, or a Hiltwright build stamp. Commands the firmware rejects SHALL be listed for the owner, and the app SHALL carry on without them.

#### Scenario: A Hiltwright-built saber
- **WHEN** a saber running Hiltwright firmware on ProffieOS 8.10 connects
- **THEN** the header shows its version as "v8.10 hiltwright <sha>", its prop and its preset count, and the battery in volts
- *Needs a real board (either).*

#### Scenario: A line printed before the version
- **WHEN** the board prints a battery line or status message ahead of the version
- **THEN** the version is still read correctly

#### Scenario: Firmware that lacks a command
- **WHEN** the firmware answers "Whut?" to one of the identifying commands
- **THEN** the Armory names the missing command and the rest of the saber is still read

### Requirement: The app speaks both ProffieOS 7 and 8 framing
On connecting, the app SHALL detect whether the board frames answers with tags (ProffieOS 8) and keep that mode for the session. On a tagged board, every command SHALL end exactly when the board rejects a marker sent right after it. On an untagged board, a command SHALL end at its known last line, or after a short silence when none is known.

#### Scenario: ProffieOS 8 board
- **WHEN** a board running ProffieOS 8 connects
- **THEN** tagged framing is detected and each answer contains only that command's lines

#### Scenario: ProffieOS 7 board
- **WHEN** a board running ProffieOS 7 connects
- **THEN** the tag probe is rejected, untagged mode is kept, and commands complete at their last line or after the silence

### Requirement: Status chatter never counts as an answer
Lines the board prints on its own (font scans, audio and amplifier notices, SD save notices, display lines, prop chatter after a preset change) SHALL NOT be taken as part of a command's answer. On a tagged board, an answer that arrives late for an earlier command SHALL be dropped rather than attributed to the current one.

#### Scenario: A preset change on a Fett263 saber
- **WHEN** the app selects a preset and the Fett263 prop prints its status lines
- **THEN** the next command's answer contains none of those lines

#### Scenario: A late answer
- **WHEN** the board's answer to an earlier tagged command arrives while a later command is waiting
- **THEN** the late answer is logged as late and the later command gets only its own answer

### Requirement: Commands reach the board one at a time
The app SHALL send commands to the board strictly one at a time, in order. Operations the owner starts while the board is busy SHALL wait their turn instead of being dropped.

#### Scenario: Two quick edits
- **WHEN** the owner makes two edits in quick succession while the first is still being written
- **THEN** both reach the board, in the order they were made

### Requirement: A lagging board is nudged, not abandoned
On a tagged board, when the board has gone completely silent while a command is waiting, the app SHALL send harmless lines at short intervals that make the board release answers it is holding back. It SHALL NOT do so while the board is still printing, and a command SHALL give up after a bounded wait.

#### Scenario: A board several lines behind
- **WHEN** a busy ProffieOS 8 board holds back answers and goes quiet
- **THEN** the app nudges it until the current command's end marker arrives, and the nudges' own rejections are not shown as answers
- *Needs a real board (either).*

### Requirement: Rejected commands are reported by name
When the board answers "Whut?", the app SHALL report which command was rejected, using the real command name even on a tagged board.

#### Scenario: Unknown command typed in the console
- **WHEN** the owner sends a command the firmware does not know
- **THEN** the console shows it was rejected, naming that command

### Requirement: Closing the port never leaves a command hanging
If the port closes while a command is waiting, that command SHALL end as timed out and any later commands SHALL end at once. A write that fails SHALL be logged and end its command, never becoming an unhandled error.

#### Scenario: Unplug during a command
- **WHEN** the board is unplugged while a command is waiting for its answer
- **THEN** the command ends, and the app does not keep sending to the closed port
- *Needs a real board (either).*

### Requirement: Rebooting into the bootloader releases the port
When the app asks the board to reboot into its bootloader, it SHALL release the serial port so the flasher can reach the board, falling back to the 1200-baud touch if the reboot command does not take. The connection state SHALL return to not connected.

#### Scenario: Reboot for an install
- **WHEN** an install asks the connected board to enter its bootloader
- **THEN** the serial port is released, the board leaves serial mode, and the state reads "Not connected"
- *Needs a real board (either).*
