# Spec Delta

## Purpose

Lets the owner see and change a connected saber's live settings, set off its effects from the app, and check the parts of the SD card that the firmware depends on, without typing commands.

## ADDED Requirements

### Requirement: Live settings can be changed with sliders
With a saber connected, the Diagnostics page SHALL show volume, blade brightness and clash sensitivity as sliders with their current values read from the saber. A setting the firmware does not answer SHALL be hidden. If the firmware answers none of them, the page SHALL say so. A slider change SHALL be written once the slider has settled, then read back, and the slider SHALL show the value the saber reports.

#### Scenario: Turning the volume down
- **WHEN** the owner drags the volume slider and lets go
- **THEN** the new volume is written to the saber, read back, and shown
- *Needs a real board (either).*

#### Scenario: Firmware without the settings commands
- **WHEN** the connected firmware rejects all three settings commands
- **THEN** no sliders are shown, and the page says this firmware does not answer the settings commands

### Requirement: Effects can be triggered from the app
With a saber connected, the owner SHALL be able to ignite and retract the blade and trigger clash, blast, force and stab. Effects that need a lit blade SHALL be disabled when the blade is known to be off. The page SHALL show whether the blade is on when the firmware can say, and SHALL warn the owner to keep the blade clear before igniting. The same controls SHALL be available in compact form beside a live preset list.

#### Scenario: Igniting from the app
- **WHEN** the owner presses Ignite on a connected saber
- **THEN** the blade lights and the blade chip shows it as on
- *Needs a real board (either).*

### Requirement: Nothing is offered without a saber
Without a connected saber, the settings and effects SHALL NOT be shown, and the page SHALL ask the owner to connect one.

#### Scenario: Diagnostics with nothing plugged in
- **WHEN** the owner opens Diagnostics with no saber connected
- **THEN** the page says to connect a saber and shows no sliders or effect buttons

### Requirement: The owner can see the conversation with the board
Diagnostics SHALL show a console of the commands sent, their answers, and the lines the board prints on its own (shown distinctly), and SHALL let the owner send a command by typing it or choosing a common one.

#### Scenario: Sending a command
- **WHEN** the owner sends `battery` from the console
- **THEN** the command and the board's answer appear in the console

### Requirement: The voice pack is checked for props that need it
For a saber whose prop needs the Fett263 voice pack, the app SHALL check the card in the connected saber and tell the owner one of the following: the pack's version was found and fits, no pack was found, the pack is too old for this firmware, menu sounds are missing, or the card could not be checked.

#### Scenario: An old voice pack
- **WHEN** a saber with the Fett263 prop has voice pack version 1 on its card
- **THEN** the owner is told the card has version 1 and this firmware needs version 2
- *Needs a real board (either).*
