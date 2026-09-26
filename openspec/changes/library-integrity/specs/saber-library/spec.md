# Spec Delta

## MODIFIED Requirements

### Requirement: Sabers are remembered between sessions
The app SHALL keep a record for every saber it has read and every saber the owner has planned, stored on this computer, and SHALL present the same records after the app restarts. Writing the store SHALL NOT leave a half-written file if the app stops mid-write. Two changes made at the same moment SHALL both be kept. The previous version of the store SHALL be kept as a backup copy.

When the store cannot be read, or holds records that are not in the expected shape, the app SHALL NOT overwrite it:
- The file SHALL be set aside unchanged under a new name.
- The app SHALL start from the backup copy when it can be read, and otherwise from the records it could read (none, if the file could not be read at all).
- The Armory SHALL tell the owner, naming the file the damaged store was kept as.

#### Scenario: A connected saber is still listed after a restart
- **WHEN** a saber has been connected once and the app is closed and reopened with nothing plugged in
- **THEN** the Armory lists that saber with its name, config, preset count and when it was last seen

#### Scenario: An unreadable store does not stop the app
- **WHEN** the stored saber records cannot be read or are not in the expected shape
- **THEN** the app starts without failing, from the backup copy if there is one, and the Armory says the damaged store was kept aside

#### Scenario: A damaged store is never overwritten
- **WHEN** the store cannot be read, and the owner then connects a saber
- **THEN** the damaged file is still in the app's data folder under the name the Armory gave, unchanged, and the new saber is saved in a fresh store

#### Scenario: Two changes at the same moment
- **WHEN** an install's firmware record and a change to the saber's model are saved at the same moment
- **THEN** both are in the store afterwards, and neither save reports an error

### Requirement: A returning saber is recognised
When a saber connects, the app SHALL match it to an existing record by the board's USB serial number when one is available. Without a serial, it SHALL match:
- a board reconnecting after an install to the saber that was installed, when the board reports the config that install wrote
- otherwise, only when the config name, the install stamp and the blade layout all agree

It SHALL create a new record when nothing matches. A planned saber SHALL never be matched to a connecting board.

#### Scenario: A reflashed saber keeps its record
- **WHEN** a saber whose USB serial is known is reflashed and connects again
- **THEN** it is matched to its existing record, keeping its name, build model, snapshots and backups
- *Needs a real board (either).*

#### Scenario: No serial number is available
- **WHEN** a board connects without a readable USB serial, outside an install, and its config name, install stamp and blade layout match a record
- **THEN** that record is used; if any of the three differ, a new record is created

#### Scenario: A reflash with two boards plugged in
- **WHEN** two boards are plugged in (so no USB serial can be read), and the owner installs one of them and it reconnects reporting the config just written
- **THEN** it is matched to the saber that was installed, and no second record appears
- *Needs real boards (V2.2 and V3 together).*

#### Scenario: A plan is never mistaken for a board
- **WHEN** a board connects and the only similar record is a planned saber
- **THEN** the board is not matched to the plan (it can only become that plan by adoption)

### Requirement: The installed firmware is recorded
After a successful install, the record of the saber that was installed SHALL keep what was compiled in:
- the build's hash, ProffieOS version and time
- which style is in which preset slot, with its arguments
- the board and blade layout the firmware was built for

The record SHALL go to that saber even if the reconnecting board was matched to another record. Putting a firmware backup back SHALL clear that record, because the restored firmware is not Hiltwright's.

#### Scenario: Install then restore
- **WHEN** a saber is installed with Hiltwright and later has a backup put back
- **THEN** after the install its styles count as compiled in, and after the restore they do not
- *Needs a real board (either).*

#### Scenario: The installed layout is kept
- **WHEN** a saber with a 132-pixel main blade on its own data line and a 2-pixel crystal chained after it is installed
- **THEN** the saber's record says the firmware was built for that board with those two blades, even after the owner later changes the wiring

#### Scenario: The record goes to the saber installed
- **WHEN** a saber is installed and, after the reboot, the board is matched to a different record
- **THEN** the firmware record is on the saber that was installed, and the other record gains none

### Requirement: A saber can be planned before it exists
The owner SHALL be able to create a planned saber from the Armory by giving it a name. A plan has no board identity, and starts with a starter build model and no presets.
- With nothing plugged in, the plan SHALL become the working saber and open the first step.
- With a saber plugged in, the plan SHALL be created and listed. The Armory SHALL say that the plugged-in saber stays the working saber, and that the plan's steps open once it is unplugged.

A plan that is not the working saber SHALL be removable. Removing SHALL NOT be offered for a saber that has been seen on a board.

#### Scenario: Plan a saber
- **WHEN** nothing is plugged in and the owner chooses "New saber", names it "Kylo build" and starts it
- **THEN** "Kylo build" appears in the Armory as set up ahead, is the working saber, and Wiring opens on it

#### Scenario: Plan a saber while another is plugged in
- **WHEN** a saber is plugged in and the owner chooses "New saber" and names it "Kylo build"
- **THEN** "Kylo build" appears in the Armory as set up ahead, the plugged-in saber stays the working saber, and a note says Kylo build's steps open once the plugged-in saber is unplugged

#### Scenario: Drop a plan
- **WHEN** the owner removes a plan that is not the working saber
- **THEN** it disappears from the Armory

### Requirement: A planned saber can be adopted by a real one
When a saber is plugged in that has no Hiltwright firmware record, is not itself a plan, and at least one plan exists, the Armory SHALL ask whether it is one of the planned sabers. Before adopting, the owner SHALL be asked to confirm, and told:
- that the next install replaces the styles compiled into the saber's current firmware, and that the presets on its card will then be the plan's
- when the connected saber already has a build model in Hiltwright, that adopting replaces it with the plan's

Adopting a plan SHALL move the plan's build model (wiring, prop, presets, styles) onto the connected saber's record and remove the plan. The plan's name SHALL replace the saber's name only while the saber still has its default name. Declining SHALL change nothing.

#### Scenario: Adopt on connect
- **WHEN** the owner plugs in a saber never installed by Hiltwright while "Kylo build" is planned, answers that it is "Kylo build", and confirms
- **THEN** the connected saber's record carries the plan's wiring, prop and presets, is named "Kylo build", and the plan is gone
- *Needs a real board (either).*

#### Scenario: Adopting over a model the owner already made
- **WHEN** the connected saber already has wiring set up in Hiltwright and the owner answers that it is "Kylo build"
- **THEN** they are warned that its current wiring and presets will be replaced by the plan's, and choosing not to go ahead leaves both the saber's model and the plan as they were
