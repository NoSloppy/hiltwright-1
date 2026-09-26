# board-connection (delta)

## MODIFIED Requirements

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

## ADDED Requirements

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
While connected, when a command gets nothing at all back from the saber for 10 seconds, with the nudges unanswered too, the app SHALL end that command and every command waiting behind it. It SHALL then close the port and show the error "The saber stopped answering. Unplug it and plug it back in." A saber that is still printing, however slowly, SHALL NOT count as silent. A command sent to put the board into its bootloader SHALL NOT count, because the board is expected to go quiet. The app SHALL NOT check on an idle saber; silence is noticed the next time anything is sent. This applies to boards that frame their answers with tags (ProffieOS 8). On ProffieOS 7 a command ends after a short quiet, just as a write that prints nothing does, so a silent ProffieOS 7 board is recognised only on connecting.

#### Scenario: The saber goes silent
- **WHEN** a connected saber stops answering, and the next command gets nothing back for 10 seconds
- **THEN** the port is closed and the Armory says the saber stopped answering, instead of the header still saying "Connected"
- *Needs a real board (either), running ProffieOS 8.*

#### Scenario: A slow but talking saber
- **WHEN** a command runs for longer than 10 seconds while the saber keeps printing, as a long font listing does
- **THEN** the command completes normally and the saber stays connected
