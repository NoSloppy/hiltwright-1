# hardware-wiring (delta)

## MODIFIED Requirements

### Requirement: Each blade says what it is built from
A blade SHALL be a pixel strip, a single LED or a star LED, and a motor SHALL be its own kind. A pixel strip SHALL have a pixel count, a colour order and a number of strips wired in parallel. A star LED SHALL use three power pins (red, green, blue). A single LED or a motor SHALL use one. Switching what a blade is built from SHALL keep the pins that still apply. The pins it needs beyond those SHALL be ones no other blade and no other channel of it uses, while any are free.

#### Scenario: A star LED accent
- **WHEN** the owner sets an accent to a star LED
- **THEN** the card asks for a red, a green and a blue power pin

#### Scenario: A new star LED gets pins of its own
- **WHEN** the owner switches a single LED accent on LED 1 to a star LED, with the main blade on LED 2 and 3
- **THEN** the star's channels are on three different pins, none of them LED 2 or LED 3

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
