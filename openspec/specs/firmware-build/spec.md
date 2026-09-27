# firmware-build Specification

## Purpose
Compiles the working saber's config into firmware with the installed toolchain. Build problems are explained in plain words, and the owner sees how much of the board's flash the firmware will use before anything is installed.

## Requirements

### Requirement: The config can be previewed before building
Build & Install SHALL show the config that would be built for the working saber, with its warnings and errors, and SHALL refresh it whenever the saber's model changes. Before the wiring has been described, it SHALL say that the config appears once it is.

#### Scenario: Changing a preset updates the preview
- **WHEN** the owner changes a preset's font and opens the Config tab
- **THEN** the config shown carries the new font

### Requirement: Building needs only the compiler and a valid model
The Build button SHALL be available when the toolchain is installed, the working saber has a model, the model has no errors, and nothing else is running. Neither a connected saber nor a wiring confirmation SHALL be needed to build. A saber chosen in the Armory, including a planned one, SHALL build from its saved model with nothing plugged in. Model errors SHALL stop the build and be shown as the problems to fix. The model SHALL be checked before any file is written, and every file a build writes SHALL stay inside that saber's build folder.

#### Scenario: Building a planned saber
- **WHEN** nothing is plugged in and the working saber is a plan with wiring and presets
- **THEN** it can be built, and the page says the saber must be plugged in only to install

#### Scenario: A model with an error
- **WHEN** the model has two strips on one data pin
- **THEN** Build does not compile, and the problem is shown

#### Scenario: A config name that points elsewhere
- **WHEN** a model's config name is not letters, digits and underscores, for example `../../x`
- **THEN** the build is refused with the reason, and no file is written anywhere

### Requirement: Firmware is built against the pinned ProffieOS for the saber's board
Each saber SHALL be built from its own copy of the pinned ProffieOS version, for the board in its model (V2 or V3). The built firmware SHALL report a readable version stamp (`v8.10 hiltwright <sha>`) instead of ProffieOS's raw source keyword. The copy and the build output SHALL be kept in a folder of the Windows user running the app. A build SHALL never depend on being able to overwrite files that another user, or a run with administrator rights, wrote.

#### Scenario: Version after install
- **WHEN** firmware built by Hiltwright is installed and the saber connects
- **THEN** it reports its version as "v8.10 hiltwright <sha>"
- *Needs a real board (either).*

#### Scenario: A build after a run with administrator rights
- **WHEN** Hiltwright was once run with administrator rights and built a saber, and the owner builds it again in a normal run
- **THEN** the build succeeds, with no permission error

### Requirement: Build output is visible as it happens
While building, the step SHALL show the elapsed time, and compiler output SHALL stream into the Log tab without the linker's noise. The Log tab SHALL open by itself when a build starts.

#### Scenario: Watching a build
- **WHEN** the owner starts a build
- **THEN** the Log tab opens and fills with the compiler's progress, and the build step counts seconds

### Requirement: The flash budget is shown
A successful build SHALL report how much of the board's flash the firmware uses, as a percentage of that board's real capacity: the size the compiler reports for the build, or else the limit the board support declares (V2 262,144 bytes, V3 507,904 bytes). The meter SHALL turn amber above 70% and red above 90%.

#### Scenario: A build near the limit
- **WHEN** a V2 build uses 87% of flash
- **THEN** the meter shows 87% in amber

#### Scenario: A V3 build
- **WHEN** a V3 build's firmware is 188,480 bytes
- **THEN** the budget shows 37% of 507,904 bytes, not 36% of 524,288

### Requirement: Build errors are explained in plain words
A failed build SHALL be explained in terms the owner can act on. That covers, at least:
- firmware too big for the flash
- more blades than styles in a preset
- a blade table that does not match the presets
- options the prop says cannot be combined
- a broken or too-deep compiler install, with advice to reinstall
- a part of the config the compiler did not understand

When an error comes from a style in a preset, the explanation SHALL name the preset, the blade and the style. Options the chosen prop refuses together, or requires together, SHALL be caught before compiling and explained in the prop's own words. Anything else SHALL show the compiler's first error line. A build that finishes without producing firmware SHALL count as a failure. A build that stops unexpectedly SHALL end the step as failed, with the reason and the offer to save diagnostics, and SHALL NOT leave the step running.

#### Scenario: Too big for the board
- **WHEN** a build fails because the firmware does not fit in flash
- **THEN** the owner is told the firmware is too big for the board, not shown linker output

#### Scenario: An error in a pasted style
- **WHEN** a pasted style in preset "Valkyrie", blade 1, does not compile
- **THEN** the explanation says it is in preset "Valkyrie", blade 1, style "<the style's name>", with the compiler's message

#### Scenario: Options the prop refuses together
- **WHEN** the config would define `FETT263_SPECIAL_ABILITIES` and `FETT263_MULTI_PHASE` for the Fett263 prop
- **THEN** the build stops before compiling, and says that `FETT263_SPECIAL_ABILITIES` cannot be used with `FETT263_MULTI_PHASE`

#### Scenario: A build that cannot write its files
- **WHEN** the build stops with an error before compiling, for example because a file cannot be written
- **THEN** the build step shows it failed, with the reason and Save diagnostics, and its timer stops

### Requirement: The build step summarises what will be built
Before building, the step SHALL summarise the build: the number of blades and presets, whether the presets are staged, and how many chosen styles are not yet in the installed firmware. The action SHALL read as adopting the saber (first Hiltwright build) or rebuilding it.

#### Scenario: New styles waiting
- **WHEN** two styles have been chosen that the installed firmware does not contain
- **THEN** the build step says there are 2 new styles, and the action reads "Rebuild <saber>"
