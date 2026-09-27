# config-generation (delta)

## MODIFIED Requirements

### Requirement: Presets carry their fonts, tracks, names and styles
Each preset in the model SHALL appear in the config with its font, track and name (line breaks in names kept) and one style per blade. A blade with no style chosen SHALL get the default style for its role, and the build SHALL list each such slot as a warning naming the preset, the blade and the style used. A slot whose style does not list the blade's role SHALL be listed as a warning naming the preset, the blade and the style, unless the blade is a motor, which is refused (see "Invalid models are refused before building").

#### Scenario: A preset with no style chosen for the crystal
- **WHEN** a preset has a style for the main blade but none for the crystal
- **THEN** the crystal's slot gets the default crystal style, and the build warns "Preset <name>, crystal: no style chosen, using <style>"

#### Scenario: A main-blade style on a crystal
- **WHEN** a preset puts a style made for main blades on the crystal
- **THEN** the build goes ahead, and warns which preset and blade have a style not made for that blade

### Requirement: Invalid models are refused before building
Generating SHALL refuse a model, with a reason the owner can read, when any of the following holds:
- the config name is invalid
- there are no blades, no main blade, or no presets
- any wiring problem the Wiring page shows (see `hardware-wiring`: "Wiring problems are shown while describing it"), in the same words
- a style is unknown or has empty code
- a motor's slot holds a style that is not made for motors

#### Scenario: Two strips on one data pin
- **WHEN** two blades each have their own strip on the same data pin
- **THEN** the model is refused with a message naming the pin conflict, and nothing is compiled

#### Scenario: A motor on a PWM pin
- **WHEN** a V3 motor is wired to a low-current PWM pin (Free 1–3)
- **THEN** the model is refused with the same message the Wiring page shows, and nothing is compiled

#### Scenario: A blade style on a motor
- **WHEN** a preset puts a blade style on the motor's slot
- **THEN** the model is refused, naming the preset and saying the motor needs a motor style
