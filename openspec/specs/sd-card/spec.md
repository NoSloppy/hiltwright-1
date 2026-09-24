# sd-card Specification

## Purpose
Fonts & SD, the third step. It reaches the saber's SD card, either in a card reader or shared by the saber itself over USB. It shows what fonts are on the card and whether ProffieOS can play them, and puts the fonts the presets need onto it without the owner copying folders by hand.

## Requirements

### Requirement: The saber's card is found in a card reader
When the page opens, and when the owner asks it to look again, the app SHALL look for a ProffieOS card among the computer's removable drives. A drive counts as a ProffieOS card when it holds a `presets.ini` (or `presets.tmp`) at its root, or at least one font folder. The page SHALL show the card's drive, label, free and total space, how many fonts and tracks it holds, and whether it has a presets file. When no card is found, the page SHALL say how many removable drives it saw and explain how to put the card in a reader or share it from the saber.

#### Scenario: A card in a reader
- **WHEN** the owner puts the saber's card in a card reader and opens Fonts & SD
- **THEN** the page names the drive and shows its space, font and track counts, and whether `presets.ini` is present
- *Needs a real card in a reader.*

#### Scenario: A removable drive that is not a saber card
- **WHEN** the only removable drive has no presets file and no font folders
- **THEN** the page says it saw one removable drive with no fonts on it

### Requirement: Fonts are recognised in both common layouts
A folder SHALL count as a font when it holds its core sounds (hum, font, out, power-on or in) either as files at its top level or in a folder per sound (for example `hum/hum01.wav` or `clsh/001.wav`).

#### Scenario: A font with one folder per sound
- **WHEN** a font keeps its sounds as `hum/hum01.wav`, `clsh/001.wav` and so on
- **THEN** it is listed as a font and its clash sounds are counted as clashes

### Requirement: The card's fonts are listed with their state
The page SHALL list each font on the card with its type (polyphonic, monophonic, mixed or unknown), number of sound files, size and status: ready, or its number of issues. Selecting a font SHALL show its sounds by type. With nothing selected, the page SHALL list the card's tracks with their sizes.

#### Scenario: Browsing the card
- **WHEN** a card holds two fonts and a tracks folder
- **THEN** both fonts are listed with type, count, size and status, and the tracks are listed with their sizes

### Requirement: Fonts are checked for what ProffieOS can play
Each font on the card SHALL be checked, and the owner told in plain words, when any of these apply:
- it mixes monophonic and polyphonic names for the same effect, so some sounds would be silent (an error)
- it has no hum sound (an error)
- a sound is above 44.1 kHz, stereo, not 16-bit or not plain PCM (a warning)

The same checks SHALL apply to a font the owner is about to copy onto the card.

#### Scenario: Mixed naming
- **WHEN** a font has both `clash1.wav` and `clsh01.wav`
- **THEN** it shows an error explaining that ProffieOS plays only one form of an effect, so some clash sounds will be silent

#### Scenario: A 48 kHz font
- **WHEN** a font's sounds are recorded at 48 kHz
- **THEN** it shows a warning that the saber needs 44.1 kHz or lower

### Requirement: The card's voice pack is shown
The page SHALL show whether the card's common folder has a voice pack, which version it is, and whether its menu sounds are missing.

#### Scenario: A version 2 voice pack
- **WHEN** the card's common folder has a version 2 voice pack with its menu sounds
- **THEN** the page shows voice pack version 2

### Requirement: A font folder can be copied onto the card
The owner SHALL be able to choose a font folder on the computer. They SHALL see its checks before copying, and copy the whole folder onto the card under its own name, reading the original only. A copy SHALL be refused when a font of that name is already on the card, unless the owner explicitly chooses to replace it. It SHALL also be refused when the folder name is not valid on an SD card. The page SHALL say how many sounds were copied.

#### Scenario: Copying a new font
- **WHEN** the owner chooses a font folder and copies it to a card that does not have it
- **THEN** the font appears on the card under the same folder name, and the original folder is unchanged
- *Needs a real card.*

#### Scenario: The font is already on the card
- **WHEN** the owner copies a font whose folder name is already on the card
- **THEN** nothing is copied, and the page says the font is already there and offers to replace it

### Requirement: The fonts the presets need can be put on the card from the library
The page SHALL list every font the working saber's presets use, apart from `common`. For each, it SHALL show whether it is on the card and whether the font library has it. It SHALL offer to copy a missing font from the library, one at a time or all at once, never overwriting a font on the card. It SHALL say which fonts were copied and which were not, and why. A font that is missing from both the card and the library SHALL be pointed out.

#### Scenario: Two fonts missing from the card
- **WHEN** the presets use two fonts that are in the library but not on the card
- **THEN** the page lists both as copyable, "Copy all 2" puts both on the card, and the page says they were copied
- *Needs a real card.*

### Requirement: A saber can share its own card over USB
With a saber connected, the owner SHALL be able to ask it to hand its card to the computer, after being warned that the blade goes off and sound stops. The app SHALL then wait a bounded time for the card to appear as a new drive, and use it like a card in a reader. While the card is shared, the page SHALL say that the saber cannot play until the card is given back, and that copying this way is slow. Firmware that cannot share its card SHALL be named as such, with the way forward (Hiltwright firmware, or a card reader). If the drive does not appear in time, the app SHALL say so and ask the saber to take the card back.

#### Scenario: Sharing the card
- **WHEN** the owner shares the card of a saber running Hiltwright firmware
- **THEN** the card appears as a drive within the wait, and its fonts are listed
- *Needs a real board (either).*

#### Scenario: Vendor firmware
- **WHEN** the connected saber's firmware does not understand the share command
- **THEN** the page says this firmware cannot share its card over USB, and suggests Hiltwright firmware or a card reader

### Requirement: A shared card is given back safely
Giving the card back SHALL first have Windows eject the drive, then return the card to the saber. If Windows will not let go of the drive because something has files open on it, the card SHALL stay shared, and the owner SHALL be told to close what holds it and try again.

#### Scenario: A file is open on the card
- **WHEN** the owner gives the card back while a window has a file on it open
- **THEN** the card stays shared, and the page says to close what has files open on it and try again
- *Needs a real board (either).*

### Requirement: Fonts & SD never deletes from the card
The page SHALL NOT delete anything on the card. The only changes it makes are adding fonts, and replacing a font's files when the owner explicitly chooses to.

#### Scenario: Browsing and checking only
- **WHEN** the owner opens Fonts & SD, looks at fonts and their issues, and leaves
- **THEN** nothing on the card has changed
