# board-connection (delta)

## MODIFIED Requirements

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

## ADDED Requirements

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
