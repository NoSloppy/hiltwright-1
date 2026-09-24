# saber-library Specification

## Purpose
Remembers every saber the owner has connected or planned, so that each one keeps its name, presets, build model, snapshots and backups between sessions. It also decides which one saber the rest of the app is working on.

## Requirements

### Requirement: Sabers are remembered between sessions
The app SHALL keep a record for every saber it has read and every saber the owner has planned, stored on this computer, and SHALL present the same records after the app restarts. Writing the store SHALL NOT leave a half-written file if the app stops mid-write.

#### Scenario: A connected saber is still listed after a restart
- **WHEN** a saber has been connected once and the app is closed and reopened with nothing plugged in
- **THEN** the Armory lists that saber with its name, config, preset count and when it was last seen

#### Scenario: An unreadable store does not stop the app
- **WHEN** the stored saber records cannot be read or are not in the expected shape
- **THEN** the app starts with no sabers known instead of failing

### Requirement: A returning saber is recognised
When a saber connects, the app SHALL match it to an existing record by the board's USB serial number when one is available. It SHALL fall back to matching only when the config name, the install stamp and the blade layout all agree. It SHALL create a new record when nothing matches. A planned saber SHALL never be matched to a connecting board.

#### Scenario: A reflashed saber keeps its record
- **WHEN** a saber whose USB serial is known is reflashed and connects again
- **THEN** it is matched to its existing record, keeping its name, build model, snapshots and backups
- *Needs a real board (either).*

#### Scenario: No serial number is available
- **WHEN** a board connects without a readable USB serial and its config name, install stamp and blade layout match a record
- **THEN** that record is used; if any of the three differ, a new record is created

#### Scenario: A plan is never mistaken for a board
- **WHEN** a board connects and the only similar record is a planned saber
- **THEN** the board is not matched to the plan (it can only become that plan by adoption)

### Requirement: Reconnecting refreshes what the saber reported
When a known saber connects, its record SHALL be updated with the presets, fonts and tracks the saber reports and with the time it was seen. The owner's name for the saber SHALL be kept.

#### Scenario: Presets changed on the saber itself
- **WHEN** the owner changes presets using the saber's own buttons and then connects it
- **THEN** the record shows the saber's current presets and the saber's name is unchanged

### Requirement: A new saber gets a readable default name
A newly recorded saber SHALL be named from its config file name, without the folder, extension or a `hiltwright_` prefix. When the config is a generic board config, the name SHALL be taken from the prop file (for example "fett263 saber"), or "Proffie saber" when the prop is not known.

#### Scenario: Named from the config
- **WHEN** a saber running `config/hiltwright_hote2.h` is recorded for the first time
- **THEN** it is named "hote2"

### Requirement: A snapshot is kept every time presets are read
Each time a saber's presets are read, on connect or when the owner asks to read again, the app SHALL save a snapshot of those presets to that saber's record. The snapshot SHALL be in `presets.ini` format with its label and time, and the list SHALL show the newest first.

#### Scenario: Connecting keeps a snapshot
- **WHEN** a saber connects
- **THEN** a snapshot labelled as taken on connect appears at the top of that saber's snapshot list
- *Needs a real board (either).*

#### Scenario: A snapshot can be used outside the app
- **WHEN** the owner opens a snapshot file from the saber's folder
- **THEN** it is a valid `presets.ini` that ProffieOS can read from an SD card

### Requirement: Firmware backups are kept per saber
Firmware backups read from a saber SHALL be stored with that saber's record, listed newest first, and each SHALL be marked as a plausible firmware image or not.

#### Scenario: Backups are listed with the saber
- **WHEN** the owner opens the backups of a saber that has been installed twice
- **THEN** both backups are listed, newest first, each marked valid or not

### Requirement: The Armory lists every saber
The Armory SHALL list every remembered and planned saber, the most recently seen first. Each saber SHALL show its name and whether it is plugged in, planned and not seen yet, or when it was last seen with its config and preset count. The Armory SHALL say so when no saber is known.

#### Scenario: A mixed list
- **WHEN** the owner has one saber plugged in, one remembered and one planned
- **THEN** the Armory shows all three, marked "plugged in", "last seen <date>" and "set up ahead" respectively

### Requirement: The app works on one saber at a time
The app SHALL have exactly one working saber when any saber is known. A plugged-in saber SHALL be the working saber. With nothing plugged in, the working saber SHALL be the one the owner last chose with "Work on it" (remembered across restarts), or else the most recently seen saber. While a saber is plugged in, the owner SHALL NOT be able to choose another.

#### Scenario: Choosing a saber to work on offline
- **WHEN** nothing is plugged in and the owner clicks "Work on it" on a remembered saber
- **THEN** Wiring, Presets, Styles and Build & Install all work on that saber, and it is still the working saber after a restart

#### Scenario: Plugging in overrides the choice
- **WHEN** a different saber is plugged in
- **THEN** it becomes the working saber, and "Work on it" on other sabers is disabled with an explanation

### Requirement: A saber can be worked on without being plugged in
With nothing plugged in, the working saber's details (version, prop, presets, fonts, blade layout) SHALL come from what it last reported, and live-only values such as battery SHALL show as unknown. Edits made on Wiring, Presets and Styles SHALL be saved to the saber's record whether or not it is plugged in.

#### Scenario: Editing a remembered saber
- **WHEN** the owner edits the wiring of a remembered saber that is not plugged in, closes the app and reopens it
- **THEN** the edit is still there

### Requirement: Each saber has one build model
Each saber SHALL have one build model (wiring, board, buttons, prop, presets with their styles) that every step edits and Build & Install compiles. A saber with no saved model SHALL be given a draft built from its last report: its blades from the reported pixel counts, the board from the reported version, and its reported presets.

#### Scenario: First visit to a remembered saber
- **WHEN** the owner opens Wiring for a saber that has never been built by Hiltwright
- **THEN** a draft model is shown with one blade per reported pixel count and the saber's reported presets

### Requirement: The installed firmware is recorded
After a successful install, the saber's record SHALL keep what was compiled in: the build's hash, ProffieOS version, time, and which style is in which preset slot with its arguments. Putting a firmware backup back SHALL clear that record, because the restored firmware is not Hiltwright's.

#### Scenario: Install then restore
- **WHEN** a saber is installed with Hiltwright and later has a backup put back
- **THEN** after the install its styles count as compiled in, and after the restore they do not
- *Needs a real board (either).*

### Requirement: A saber can be planned before it exists
The owner SHALL be able to create a planned saber from the Armory by giving it a name. A plan has no board identity, starts with a starter build model and no presets, becomes the working saber, and opens the first step. A plan that is not the working saber SHALL be removable. Removing SHALL NOT be offered for a saber that has been seen on a board.

#### Scenario: Plan a saber
- **WHEN** nothing is plugged in and the owner chooses "New saber", names it "Kylo build" and starts it
- **THEN** "Kylo build" appears in the Armory as set up ahead, is the working saber, and Wiring opens on it

#### Scenario: Drop a plan
- **WHEN** the owner removes a plan that is not the working saber
- **THEN** it disappears from the Armory

### Requirement: A planned saber can be adopted by a real one
When a saber is plugged in that has no Hiltwright firmware record, is not itself a plan, and at least one plan exists, the Armory SHALL ask whether it is one of the planned sabers. Adopting a plan SHALL move the plan's build model (wiring, prop, presets, styles) onto the connected saber's record and remove the plan. The plan's name SHALL replace the saber's name only while the saber still has its default name.

#### Scenario: Adopt on connect
- **WHEN** the owner plugs in a saber never installed by Hiltwright while "Kylo build" is planned, and answers that it is "Kylo build"
- **THEN** the connected saber's record carries the plan's wiring, prop and presets, is named "Kylo build", and the plan is gone
- *Needs a real board (either).*

### Requirement: The plugged-in saber can be renamed
The owner SHALL be able to rename the plugged-in saber from the Armory. An empty name SHALL leave the name unchanged.

#### Scenario: Rename
- **WHEN** the owner renames the plugged-in saber to "Ahsoka"
- **THEN** the Armory, sidebar and header show "Ahsoka", and the name is kept after reconnecting
