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
The header SHALL show one of: not connected, opening the port, reading the saber, connected, no saber found, or error. On error, the Armory SHALL show the reason in plain words. While opening or reading, Connect SHALL be disabled. A connected saber SHALL offer Disconnect, which closes the port and returns to not connected. An unplugged saber SHALL return the state to not connected, and its live values SHALL be cleared. A saber that does not answer, or has stopped answering, SHALL be shown as an error that says so and tells the owner to unplug it and plug it back in.

#### Scenario: No board plugged in
- **WHEN** the owner presses Connect with no Proffieboard available
- **THEN** the state reads "No saber found", and the Armory explains how to plug one in over a data cable

#### Scenario: Disconnecting
- **WHEN** the owner presses Disconnect
- **THEN** the port is closed, the state reads "Not connected", and the saber's live values are cleared

#### Scenario: Unplugging the saber
- **WHEN** the owner unplugs a connected saber
- **THEN** the state reads "Not connected" within a few seconds, and the saber's live values are cleared
- *Needs a real board (either).*

### Requirement: Connecting identifies the saber
On connecting, the app SHALL read and show the saber's ProffieOS version, config file, prop file, button count, install stamp, battery voltage, volume, current preset, presets, fonts, tracks and blade layout. Versions SHALL be shown readably whether the firmware reports a release number, a git keyword, or a Hiltwright build stamp. Commands the firmware rejects SHALL be listed for the owner, and the app SHALL carry on without them.

Reading the saber SHALL NOT make it speak or start over:
- **The battery** SHALL be read in a way that prints the voltage without the saber saying it aloud. On firmware that cannot do that, the battery SHALL be read as before, and the quiet way SHALL NOT be listed as a rejected command.
- **The blade layout** SHALL be read from the saber, which makes it detect its blades again, only on the first reading of a firmware build: the first connect after an install, or a board whose saber record cannot be told apart for certain. Otherwise the layout stored for that saber and that build SHALL be used.

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

#### Scenario: Connecting is quiet
- **WHEN** a saber connects, or the owner presses Read again
- **THEN** the saber does not speak its battery voltage, and the header still shows the battery in volts
- *Needs a real board (V2.2).*

#### Scenario: Firmware without the quiet battery reading
- **WHEN** the firmware rejects the quiet battery reading
- **THEN** the battery is read the old way, it is shown in volts, and the Armory does not list the quiet reading as missing

#### Scenario: A saber seen before on the same firmware
- **WHEN** a saber connects whose firmware build has been read before, and its record is found by its USB serial
- **THEN** its blade layout is the stored one, and the saber does not detect its blades again (its log shows no new blade scan)
- *Needs a real board (V2.2).*

#### Scenario: The first connect after an install
- **WHEN** a saber connects with an install stamp the app has not read from it before
- **THEN** its blade layout is read from the saber

#### Scenario: A record that cannot be told apart
- **WHEN** a saber connects without a USB serial the app can use, and more than one record has its config and install stamp
- **THEN** its blade layout is read from the saber, as it was before this change

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
The app SHALL send commands to the board strictly one at a time, in order. Operations the owner starts while the board is busy SHALL wait their turn instead of being dropped. Everything that talks to the board SHALL share that order, including console commands, the Try it and Diagnostics controls, the checks a page makes on its own, and background polls, so that nothing lands between the steps of an edit. An operation that cannot reach the saber, because it is no longer connected, SHALL be reported as not sent. An operation under way when the saber goes away SHALL be reported as not saved because the saber was disconnected. Either report SHALL stay visible after the page has switched to the saber's stored presets, and a new connection SHALL start with a clear save status.

#### Scenario: Two quick edits
- **WHEN** the owner makes two edits in quick succession while the first is still being written
- **THEN** both reach the board, in the order they were made

#### Scenario: A console command during an edit
- **WHEN** the owner sends a console command while a preset edit is being written
- **THEN** the command is sent after the edit's last step, and its answer contains none of the edit's lines

#### Scenario: An edit made just before an unplug
- **WHEN** the owner makes an edit and the saber is unplugged before the edit's turn comes
- **THEN** the save status says the edit was not sent because the saber is not connected

#### Scenario: Unplugged while an edit is being written
- **WHEN** the owner changes a preset's font and pulls the cable while the change is being written
- **THEN** the page, now showing the stored presets, still says the change was not saved because the saber was disconnected. After reconnecting, that report is gone.
- *Needs a real board (either).*

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

### Requirement: An unplug is always noticed
The app SHALL notice that a connected saber has gone, whether the system reports the device removed, the serial read fails, or the serial read simply ends. It SHALL then close the connection, end any command waiting for an answer, and return to not connected. A reconnect when the saber is plugged back in SHALL happen on its own, as for any saber plugged in.

#### Scenario: The read ends quietly
- **WHEN** the serial read of a connected saber ends without an error
- **THEN** the app closes the connection and the state reads "Not connected"

#### Scenario: Plugging back in
- **WHEN** the owner plugs an unplugged saber back in
- **THEN** the app connects to it and reads it again, with no click
- *Needs a real board (either).*

### Requirement: A saber that does not answer is not connected
When a saber answers nothing on connecting, the app SHALL stop reading it at the first command met with total silence. It SHALL show that the saber is not answering, and SHALL NOT show it as connected or create or change a saber record for it. This SHALL take no more than 15 seconds on either ProffieOS 7 or 8.

#### Scenario: A silent ProffieOS 7 board
- **WHEN** a board that prints nothing at all is connected, and the tag probe and `version` get no reply
- **THEN** "Reading the saber…" ends with the saber not answering, within 15 seconds, and no saber record is created

#### Scenario: A dead ProffieOS 8 board
- **WHEN** a board that ignores every command, nudges included, is connected
- **THEN** "Reading the saber…" ends with the saber not answering within 15 seconds, not after minutes

### Requirement: A saber that stops answering is let go
While connected, a command gets nothing at all back from the saber for 10 seconds, with the nudges unanswered too. The app SHALL then end that command, close the port and open it again once on its own, as the Connect button does. It SHALL then read the saber's current preset and preset list again. Commands waiting behind it SHALL wait for this, not end.

When the saber answers that reading, it SHALL stay connected:
- The command that met the silence SHALL be judged by what the saber now reports. A preset change the saber now shows SHALL be reported as saved. One it does not show SHALL be reported as not made, and SHALL NOT be sent again without the owner.
- The page SHALL show what the saber reports.
- Output the saber printed before the reopen SHALL NOT answer any command sent after it.
- The run log SHALL record the pause and the reconnect.

When the port does not open again, or the saber is silent again while it is read, the app SHALL let the saber go. It SHALL end every command waiting, close the port and show the error "The saber stopped answering. Unplug it and plug it back in."

These rules SHALL NOT apply while the saber is first being read; that case is covered by the requirement on a saber that does not answer.

A saber that is still printing, however slowly, SHALL NOT count as silent. A command sent to put the board into its bootloader SHALL NOT count, because the board is expected to go quiet. The app SHALL NOT check on an idle saber; silence is noticed the next time anything is sent. This applies to boards that frame their answers with tags (ProffieOS 8). On ProffieOS 7 a command ends after a short quiet, just as a write that prints nothing does, so a silent ProffieOS 7 board is recognised only on connecting.

#### Scenario: A stalled preset selection
- **WHEN** a saber with no battery is connected, the owner selects a preset after it has been idle for 30 seconds, and its reply stalls
- **THEN** after a pause the app reconnects on its own, the saber is on the chosen preset, and the page shows the selection as saved with no error
- *Needs a real board (V2.2).*

#### Scenario: A stalled change that did not happen
- **WHEN** a change stalls, and after the reconnect the saber reports the old value
- **THEN** the page says the change was not made, the field shows the saber's value, and nothing is sent again

#### Scenario: A click waiting behind a stall
- **WHEN** the owner clicks another preset while an earlier command has stalled
- **THEN** that click is carried out after the reconnect, in its turn

#### Scenario: Old output after the reopen
- **WHEN** the saber prints the rest of its stalled reply once the port is opened again
- **THEN** none of it is taken as the answer to a command sent after the reopen

#### Scenario: The saber goes silent
- **WHEN** a connected saber goes silent, and is still silent after the port is opened again
- **THEN** the port is closed and the Armory says the saber stopped answering, instead of the header still saying "Connected"
- *Needs a real board (either), running ProffieOS 8.*

#### Scenario: A slow but talking saber
- **WHEN** a command runs for longer than 10 seconds while the saber keeps printing, as a long font listing does
- **THEN** the command completes normally and the saber stays connected

### Requirement: A saber without a battery is flagged
A battery reading under 2 volts means no battery is connected. While a connected saber reads under 2 volts:
- the header SHALL show "No battery" instead of a voltage
- the Armory SHALL say that the saber is running on USB power alone, that it may pause when it plays sound or reads its card, and that Hiltwright reconnects if it does

A reading of 2 volts or more SHALL be shown in volts, with no note, even when no battery is connected. Some boards read a voltage with none: a Proffieboard V3 with no battery read 3.17 V. On those boards the app cannot tell a missing battery from a flat one, so it SHALL show no note. A saber whose firmware gives no battery reading SHALL get no note.

#### Scenario: No battery connected
- **WHEN** a saber with no battery connected is plugged in
- **THEN** the header shows "No battery", and the Armory shows the USB-power note
- *Needs a real board (V2.2).*

#### Scenario: A battery connected
- **WHEN** a saber reading 3.9 volts connects
- **THEN** the header shows 3.90 V, and there is no USB-power note

#### Scenario: A V3 with no battery
- **WHEN** a Proffieboard V3 with no battery connected is plugged in, and reads 3.17 V
- **THEN** the header shows 3.17 V, and there is no USB-power note
- *Needs a real board (V3).*
