# xenopixel-import Specification

## Purpose
Brings an owner's fonts and blade colours over from a Xenopixel saber's card onto a ProffieOS card and into presets. This is stub depth: the code exists, it has been tested only against a fabricated card, and it is hidden for Beta 1 (`hide-for-beta-1`) until real Xenopixel references are available.

## Requirements

### Requirement: An old Xenopixel card is read for its fonts
Choosing the top of a Xenopixel card SHALL list each font slot that holds a font, in slot order. Each is shown with its name and colour (from the slot's font config), the ProffieOS folder it will become, and its sound and track counts. The old card SHALL only be read. When no font slots are found, the owner SHALL be told to choose the top of the card.

#### Scenario: Choosing the wrong folder
- **WHEN** the owner chooses a folder that holds no numbered font slots
- **THEN** the page says no Xenopixel font folders were found and asks for the top of the card

### Requirement: Chosen fonts are converted onto the ProffieOS card without overwriting
Converting SHALL copy each chosen font into a new folder on the ProffieOS card. Sounds are renamed to ProffieOS names and music is moved into the font's tracks. A folder already on the card SHALL be left alone and reported as already there. A preset per converted font SHALL be addable afterwards with the font and its old colour, where the saber's style takes a colour.

#### Scenario: A font already converted
- **WHEN** a chosen font's ProffieOS folder already exists on the card
- **THEN** it is not overwritten, and the result reports it as already there

### Requirement: The import is not offered in Beta 1
While the Beta 1 switch for the Xenopixel import is off, Fonts & SD SHALL NOT show the Xenopixel import. The rest of the page SHALL keep its layout. Turning the switch on SHALL show the import again with no other change.

#### Scenario: Fonts & SD in Beta 1
- **WHEN** the owner opens Fonts & SD in a Beta 1 build
- **THEN** there is no Xenopixel import panel, and the card's fonts and the font detail are laid out as usual

#### Scenario: The switch turned on for Beta 2
- **WHEN** the import switch is on and the owner opens Fonts & SD
- **THEN** the Xenopixel import panel is shown as it was before Beta 1
