# hardware-wiring Specification

## Purpose
Lets the owner describe how their saber is built and wired (board, buttons, prop file, and each blade with what it is made of and which pins it uses) in plain terms. Problems that could make a build fail or damage hardware are caught while the owner is still describing it.

## Requirements

### Requirement: Wiring is described for the working saber
The Wiring page SHALL edit the working saber's board, buttons, prop and blades. With no saber known, it SHALL point the owner to the Armory. For a planned saber, it SHALL say the hilt has not been connected yet. Editing SHALL be locked while the board is busy.

#### Scenario: No saber yet
- **WHEN** the owner opens Wiring with no saber known
- **THEN** the page says there is no saber to wire yet and offers to go to the Armory

### Requirement: Board, buttons and prop are chosen per saber
The owner SHALL choose the board (Proffieboard V2 or V3), the number of buttons (1 to 3) and the prop file (Fett263, SA22C, BC or ProffieOS default). For a connected saber, the button count SHALL start from what the saber reports.

#### Scenario: Choosing the prop
- **WHEN** the owner chooses SA22C for a saber
- **THEN** the saber's build uses the SA22C prop file

### Requirement: Blades are counted first, then described one by one
The owner SHALL set the number of blades (1 to 8), and each blade SHALL get its own card with a role: main blade, crystal chamber, accent, side blade or motor. New blades SHALL get the next role and a sensible default: a 132-pixel strip for the main blade, a 1-pixel strip for a crystal, a single LED for an accent. Each also gets the first free data pin and power pin. A card SHALL collapse to a one-line summary with a tick when the blade has no problem, or show its first problem. For a connected saber that has not been confirmed, the page SHALL start from one pixel blade per strip the saber reports, and say that this is a starting point, not the wiring.

#### Scenario: Adding a crystal
- **WHEN** the owner raises the blade count from 1 to 2
- **THEN** a second card appears as a crystal chamber on the next free data pin and power pin

#### Scenario: A connected saber seen for the first time
- **WHEN** a saber reporting strips of 140, 2 and 1 pixels is opened on Wiring before any confirmation
- **THEN** three pixel blades of those lengths are proposed, with a note that they are a starting point

### Requirement: Each blade says what it is built from
A blade SHALL be a pixel strip, a single LED or a star LED, and a motor SHALL be its own kind. A pixel strip SHALL have a pixel count, a colour order and a number of strips wired in parallel. A star LED SHALL use three power pins (red, green, blue). A single LED or a motor SHALL use one. Switching what a blade is built from SHALL keep the pins that still apply. The pins it needs beyond those SHALL be ones no other blade and no other channel of it uses, while any are free.

#### Scenario: A star LED accent
- **WHEN** the owner sets an accent to a star LED
- **THEN** the card asks for a red, a green and a blue power pin

#### Scenario: A new star LED gets pins of its own
- **WHEN** the owner switches a single LED accent on LED 1 to a star LED, with the main blade on LED 2 and 3
- **THEN** the star's channels are on three different pins, none of them LED 2 or LED 3

### Requirement: A pixel blade has its own data line or continues another blade's wire
A pixel strip SHALL be either on its own data line, with at least one power pin, or continue the wire of another pixel blade that has its own line. A continuing blade SHALL show which pixels it occupies on that strip, take the strip's colour order and power, and MAY run in reverse. Continuing another blade's wire SHALL NOT be offered when no other blade has its own line.

#### Scenario: Chaining a crystal after the main blade
- **WHEN** the owner sets a 2-pixel crystal to continue after the 132-pixel main blade
- **THEN** the crystal shows pixels 132 to 133 on the main blade's strip, and uses its data pin and power

### Requirement: Only suitable pins are offered
Data pins SHALL be those of the chosen board: V3 has more than V2, and only the V3-only ones are labelled as such. Power pins SHALL be the board's LED FETs. On a V3, the low-current PWM pins SHALL be offered only for a single LED.

#### Scenario: A motor on a V3
- **WHEN** the owner wires a motor on a V3
- **THEN** only FET power pins are offered for it, not the low-current PWM pins

#### Scenario: The V3's main data pin
- **WHEN** the owner opens a blade's data pin list on a V3
- **THEN** only `blade5Pin`, `blade6Pin` and `blade7Pin` are labelled "(Free)", and `bladePin` is not

### Requirement: Wiring problems are shown while describing it
The page SHALL list the wiring's problems, and SHALL show the offending pins in the pin table. The build SHALL refuse exactly these problems, in the same words (see `config-generation`). The problems covered:
- two separate strips on one data pin, with a suggestion to chain them or use different pins
- no main blade
- a pixel count below 1
- a strip on its own line with no power pin
- a power-wired blade with no pin
- a low-current pin asked to drive a motor or a star LED
- a blade that continues a missing blade, or one that is not a pixel strip on its own line
- a blade that continues a blade placed after it
- a pin the chosen board does not have
- one pin used both as a data line and as a low-current power pin
- the same pin used twice by one blade

A power pin shared by several blades SHALL be shown as a note, not a problem. A chained blade on the same data pin SHALL NOT count as a conflict.

#### Scenario: Two strips on one pin
- **WHEN** two blades each have their own strip on the same data pin
- **THEN** the page names the pin and both blades, suggests chaining them or using different pins, and marks the pin red

#### Scenario: Shared power
- **WHEN** two blades use the same power pin
- **THEN** the pin table marks it shared, and the page notes that the build handles it

#### Scenario: V3 pins after switching to V2
- **WHEN** a blade uses `blade6Pin` and the owner switches the board to V2
- **THEN** the page says that blade uses a pin the V2 does not have, and the build refuses it with the same words

#### Scenario: A star LED with one pin for every colour
- **WHEN** a star LED's three channels are all on LED 4
- **THEN** the page says the blade uses LED 4 more than once, and the build refuses it

### Requirement: The wiring is drawn as it is described
The page SHALL show a live diagram of the hilt and its blades with their pixel counts or ranges. It SHALL also show a pin table listing each data pin and power pin with the blades that use it, or "free". A header SHALL say whether there are problems, shared power, or no conflicts.

#### Scenario: A free pin
- **WHEN** a board's data pin is not used by any blade
- **THEN** the pin table lists it as free

### Requirement: Wiring is saved as it is described
Changes on the Wiring page SHALL be saved to the saber's record shortly after the owner stops changing them, with nothing plugged in or not. A change SHALL still be saved when the owner leaves the page before that moment has passed. When the saber's saved model changes elsewhere while the page is open (an adoption, a restore), the page SHALL show the new model, and SHALL NOT later save its older copy over it.

#### Scenario: Leaving and coming back
- **WHEN** the owner changes a blade's pixel count, waits a moment and switches pages
- **THEN** the new pixel count is there when they return

#### Scenario: Leaving at once
- **WHEN** the owner changes a blade's pixel count and switches pages immediately
- **THEN** the new pixel count is there when they return

#### Scenario: The model changed elsewhere
- **WHEN** the saber's model is replaced elsewhere while the Wiring page is open, and the owner has no change waiting
- **THEN** the page shows the new model, and nothing is saved over it

### Requirement: The owner confirms they checked the wiring
The Wiring page SHALL offer an "I checked the wiring" confirmation. A confirmation SHALL record the board and blade layout it was given for, and SHALL count only while the saber's board and blades are exactly that layout. Changing the board or any blade SHALL therefore withdraw it. Changing the buttons, the prop file or the presets SHALL NOT. The owner SHALL be able to turn the confirmation off at any time.

A confirmation SHALL be kept with the saber, surviving page changes, saves from other pages, and restarts, whether or not the saber has ever been installed. A confirmation made before this rule existed, with no layout recorded, SHALL NOT count. Such a saber needs to be confirmed once more.

The Wiring page, the Armory's progress rail and Build & Install SHALL all decide "confirmed" by this one rule. Until the wiring counts as confirmed, the Wiring page SHALL NOT lead on to Presets, and installing SHALL stay locked (see `firmware-install`).

#### Scenario: Changing a blade withdraws the confirmation
- **WHEN** the owner has confirmed the wiring of a saber that has never been installed, and then changes a blade's data pin
- **THEN** the confirmation is withdrawn and must be given again

#### Scenario: Confirming a saber that has never been installed
- **WHEN** the owner plans a saber, describes its wiring, confirms it, and builds it
- **THEN** Build & Install shows the wiring as confirmed and asks for nothing more about wiring before installing

#### Scenario: The confirmation is kept
- **WHEN** the owner confirms the wiring, edits the saber's presets, closes the app and reopens it
- **THEN** the wiring still counts as confirmed on Wiring, in the Armory and on Build & Install

#### Scenario: Changing a blade on an installed saber
- **WHEN** a saber has been installed and the owner changes one blade's data pin
- **THEN** the wiring no longer counts as confirmed on any page, and installing is locked until the owner confirms again
- *Needs a real board (either) for the install step.*

#### Scenario: Changing the board
- **WHEN** the owner switches a confirmed saber's board from V2 to V3
- **THEN** the confirmation is withdrawn

#### Scenario: Changing the prop keeps the confirmation
- **WHEN** the owner changes a confirmed saber's prop file
- **THEN** the wiring still counts as confirmed

#### Scenario: Turning the confirmation off
- **WHEN** the owner turns off "I checked the wiring" on a saber that has been installed
- **THEN** the wiring counts as not confirmed, and installing is locked

#### Scenario: A saber confirmed before this rule
- **WHEN** a saber installed or confirmed before this change is opened
- **THEN** its wiring shows as not confirmed until the owner confirms it once
