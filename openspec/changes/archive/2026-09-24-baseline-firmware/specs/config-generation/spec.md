# Spec Delta

## Purpose

Turns a saber's build model (board, buttons, prop, blades and their wiring, presets and their styles) into a ProffieOS `config.h`. It also returns a record of what is in the firmware, so the rest of the app knows which style sits in which preset slot and which colours it takes.

## ADDED Requirements

### Requirement: The same model always gives the same config
Generating a config from a build model SHALL be deterministic: the same model SHALL give byte-identical output.

#### Scenario: Generating twice
- **WHEN** the same saber model is turned into a config twice
- **THEN** both configs are identical, byte for byte

### Requirement: A generated config identifies itself
A generated config SHALL begin with a comment carrying a one-line summary: the generator, the saber's name, board, buttons, prop, blades, preset count, the styles used, and a hash. The hash SHALL be taken over the config's body only. Things that do not change the firmware (the header itself, the app version, the colours chosen for presets, the wiring confirmation, staged-preset markers) SHALL NOT change it.

#### Scenario: Colours chosen after a build
- **WHEN** the owner chooses new colours for a preset's style, which the saber applies at runtime
- **THEN** the generated config and its hash are unchanged

### Requirement: The config targets the chosen board and prop
The config SHALL include the ProffieOS board file for the model's board (V2 or V3) and the prop file for the model's prop (Fett263, SA22C, BC or default). It SHALL declare the saber's number of blades and buttons.

#### Scenario: A V3 saber
- **WHEN** the model's board is V3
- **THEN** the config includes the Proffieboard V3 board file and not the V2 one

### Requirement: Every build has the same runtime options
Every generated config SHALL enable audio, motion, WS281x strips, the SD card, saved state, direct colour change and ProffieOS's edit options, with default volume and clash threshold. It SHALL NOT disable ProffieOS's diagnostic commands, which the app relies on. A Fett263 saber SHALL also get the Fett263 edit-mode menu and spoken battery and colour options.

#### Scenario: A Fett263 saber
- **WHEN** the model's prop is Fett263
- **THEN** the config enables the Fett263 edit-mode menu, and every edit option ProffieOS offers is available on the saber

### Requirement: Buttons follow the button count
The config SHALL define the Power button always, the Aux button from two buttons, and the Aux2 button from three.

#### Scenario: A one-button saber
- **WHEN** the model has one button
- **THEN** only the Power button is defined

### Requirement: Blade rows follow the wiring
The config SHALL have one blade row per blade, in the model's order. A pixel strip on its own data line SHALL be a WS281x strip on that pin with its power pins. A blade that continues another blade's wire SHALL be a sub-blade of that strip, reversed when the model says so. A single LED, star LED or motor SHALL be a simple blade on its power or PWM pins. Power pins shared between blades SHALL be allowed and reported to the owner as a note.

#### Scenario: A crystal chained after the main blade
- **WHEN** a 2-pixel crystal continues the main blade's wire, reversed
- **THEN** the main blade and the crystal are sub-blades of one strip, the crystal's range is reversed, and each gets its own style slot

#### Scenario: Shared power
- **WHEN** two blades use the same power pin
- **THEN** the config is generated, and the owner sees a note that the power pin is shared

### Requirement: Presets carry their fonts, tracks, names and styles
Each preset in the model SHALL appear in the config with its font, track and name (line breaks in names kept) and one style per blade. A blade with no style chosen SHALL get the default style for its role.

#### Scenario: A preset with no style chosen for the crystal
- **WHEN** a preset has a style for the main blade but none for the crystal
- **THEN** the crystal's slot gets the default crystal style

### Requirement: Only the styles used are compiled in
The config SHALL contain definitions only for the styles its presets use, plus the shared effects wrapper when a used style needs it. A pasted or editor-built style SHALL be labelled with its name. The copyright header of a pasted library style SHALL be kept once, credited with the style's name and author.

#### Scenario: A pasted library style
- **WHEN** a preset uses a pasted library style that came with a copyright header
- **THEN** the header appears once in the config, with the style's name and author, and styles no preset uses are absent

### Requirement: Special abilities are enabled where the prop supports them
When a used style responds to special-ability effects, a Fett263 saber SHALL get the special-abilities option, and the owner SHALL be told how the gesture goes. On props without the gesture (SA22C, default), the owner SHALL be warned that the ability cannot be triggered.

#### Scenario: A special ability on SA22C
- **WHEN** a style that uses a special ability is chosen on a saber with the SA22C prop
- **THEN** the owner is warned that this prop has no gesture for it

### Requirement: The build returns a record of what is in the firmware
Generating a config SHALL also return a record of which style is in each preset slot (by the style's identity), each style's argument numbers and default colours, and the config hash. The argument numbers and default colours SHALL be read from the style's own code, so they cannot drift from it. This record is what the saber keeps after an install (see `saber-library`).

#### Scenario: Looking up a slot
- **WHEN** a style was compiled into preset 3, blade 1
- **THEN** the record says which style is in that slot and which argument number sets its base colour

### Requirement: Invalid models are refused before building
Generating SHALL refuse a model, with a reason the owner can read, when any of the following holds:
- the config name is invalid
- there are no blades, no main blade, or no presets
- a pixel strip has no power pin or fewer than one pixel
- a power-wired blade has no pin
- two separate strips share a data pin
- a style is unknown or has empty code

#### Scenario: Two strips on one data pin
- **WHEN** two blades each have their own strip on the same data pin
- **THEN** the model is refused with a message naming the pin conflict, and nothing is compiled
