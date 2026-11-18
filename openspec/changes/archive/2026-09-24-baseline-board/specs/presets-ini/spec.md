# Spec Delta

## Purpose

Reads and writes the ProffieOS `presets.ini` format so that a saber's preset list can be kept as a snapshot and put back on a card, without losing any preset field the firmware uses.

## ADDED Requirements

### Requirement: A preset list round-trips
Writing a preset list as `presets.ini` and reading it back SHALL give the same presets in the same order: name, font, track, one style per blade in blade order, variation, and the `installed` stamp. Names containing line breaks, tabs or backslashes SHALL survive through escaping.

#### Scenario: The saber's own list
- **WHEN** the 13 presets read from a V2.2 are written as `presets.ini` and read back
- **THEN** every preset field and the install stamp are identical

#### Scenario: A two-line preset name
- **WHEN** a preset named with a line break is written and read back
- **THEN** the name still contains the line break

### Requirement: Written files use the form ProffieOS reads
A written `presets.ini` SHALL contain the `installed` line when known, then each preset as `new_preset` followed by its font, track, style lines, name and variation, and SHALL end with `end`. Empty values SHALL still be written. Lines SHALL end in LF.

#### Scenario: A preset with no track
- **WHEN** a preset with an empty track is written
- **THEN** its `track=` line is present and empty, and the file ends with `end`

### Requirement: Hand-written files are read leniently
Reading SHALL accept keys in any letter case and skip comment lines starting with `#`. A missing field SHALL read as empty, and a missing or non-numeric variation SHALL read as 0. Reading SHALL NOT fail on content it does not understand. Such content SHALL be left out, not preserved.

#### Scenario: Comments and mixed case
- **WHEN** a hand-written file uses `FONT=` and `Name=` with comment lines between presets
- **THEN** the presets are read with their fonts and names, and the comments are ignored

### Requirement: A cut-off file is reported
A file that stops before `end` SHALL be reported as truncated, and the presets read up to that point SHALL still be returned.

#### Scenario: Truncated file
- **WHEN** a `presets.ini` is missing its final `end` line
- **THEN** it is flagged as truncated
