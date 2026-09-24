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
A blade SHALL be a pixel strip, a single LED or a star LED, and a motor SHALL be its own kind. A pixel strip SHALL have a pixel count, a colour order and a number of strips wired in parallel. A star LED SHALL use three power pins (red, green, blue). A single LED or a motor SHALL use one. Switching what a blade is built from SHALL keep the pins that still apply.

#### Scenario: A star LED accent
- **WHEN** the owner sets an accent to a star LED
- **THEN** the card asks for a red, a green and a blue power pin

### Requirement: A pixel blade has its own data line or continues another blade's wire
A pixel strip SHALL be either on its own data line, with at least one power pin, or continue the wire of another pixel blade that has its own line. A continuing blade SHALL show which pixels it occupies on that strip, take the strip's colour order and power, and MAY run in reverse. Continuing another blade's wire SHALL NOT be offered when no other blade has its own line.

#### Scenario: Chaining a crystal after the main blade
- **WHEN** the owner sets a 2-pixel crystal to continue after the 132-pixel main blade
- **THEN** the crystal shows pixels 132 to 133 on the main blade's strip, and uses its data pin and power

### Requirement: Only suitable pins are offered
Data pins SHALL be those of the chosen board: V3 has more than V2, and the V3-only ones are labelled. Power pins SHALL be the board's LED FETs. On a V3, the low-current PWM pins SHALL be offered only for a single LED.

#### Scenario: A motor on a V3
- **WHEN** the owner wires a motor on a V3
- **THEN** only FET power pins are offered for it, not the low-current PWM pins

### Requirement: Wiring problems are shown while describing it
The page SHALL list the wiring's problems, and SHALL show the offending pins in the pin table. The problems covered:
- two separate strips on one data pin, with a suggestion to chain them or use different pins
- no main blade
- a pixel count below 1
- a strip on its own line with no power pin
- a power-wired blade with no pin
- a low-current pin asked to drive a motor or a star LED

A power pin shared by several blades SHALL be shown as a note, not a problem. A chained blade on the same data pin SHALL NOT count as a conflict.

#### Scenario: Two strips on one pin
- **WHEN** two blades each have their own strip on the same data pin
- **THEN** the page names the pin and both blades, suggests chaining them or using different pins, and marks the pin red

#### Scenario: Shared power
- **WHEN** two blades use the same power pin
- **THEN** the pin table marks it shared, and the page notes that the build handles it

### Requirement: The wiring is drawn as it is described
The page SHALL show a live diagram of the hilt and its blades with their pixel counts or ranges. It SHALL also show a pin table listing each data pin and power pin with the blades that use it, or "free". A header SHALL say whether there are problems, shared power, or no conflicts.

#### Scenario: A free pin
- **WHEN** a board's data pin is not used by any blade
- **THEN** the pin table lists it as free

### Requirement: Wiring is saved as it is described
Changes on the Wiring page SHALL be saved to the saber's record shortly after the owner stops changing them, with nothing plugged in or not.

#### Scenario: Leaving and coming back
- **WHEN** the owner changes a blade's pixel count, waits a moment and switches pages
- **THEN** the new pixel count is there when they return

### Requirement: The owner confirms they checked the wiring
The Wiring page SHALL offer an "I checked the wiring" confirmation. Changing the board or the blades SHALL withdraw it. Until the wiring counts as confirmed, the page SHALL NOT lead on to Presets, and installing SHALL stay locked (see `firmware-install`). The wiring of a saber that has Hiltwright firmware SHALL count as confirmed.

#### Scenario: Changing a blade withdraws the confirmation
- **WHEN** the owner has confirmed the wiring of a saber that has never been installed, and then changes a blade's data pin
- **THEN** the confirmation is withdrawn and must be given again
