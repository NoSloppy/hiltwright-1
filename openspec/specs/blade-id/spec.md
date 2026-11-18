# blade-id Specification

## Purpose
Lets a saber with swappable blades carry one blade layout per blade, chosen at power-on by the ID resistor the saber measures. This is stub depth: the feature exists in code, is hidden for Beta 1 (`hide-for-beta-1`), and is verified and shown again in Beta 2 (`blade-id-verification`).

## Requirements

### Requirement: Swappable blades are described as measured variants
When the owner says they swap blades on a saber whose main blade is a pixel strip, the saber SHALL get a list of blade variants: up to six named blades with their pixel counts, and optionally an empty emitter. Each variant's ID SHALL be measured from the saber, never typed. Measuring SHALL be offered only once the saber runs firmware built with swapping turned on.

#### Scenario: Measuring before the first install
- **WHEN** the owner turns swapping on for a saber whose installed firmware was built without it
- **THEN** Measure is disabled, with a note to build and install once first

### Requirement: Measured variants become blade layouts in the build
With swapping on, the build SHALL add the options ProffieOS needs to measure blade IDs, and SHALL add one blade layout per measured variant, plus the empty emitter when present. Two variants whose IDs are within 15% of each other SHALL be refused with an explanation that they need different ID resistors.

#### Scenario: Two blades too close to tell apart
- **WHEN** two variants measure within 15% of each other
- **THEN** the build is refused with a message that those blades need a different ID resistor

### Requirement: Blade ID is not offered in Beta 1
While the Beta 1 switch for Blade ID is off, the Wiring page SHALL NOT ask whether the owner swaps blades. It SHALL NOT show blade variants or offer to measure a blade's ID. A saber whose saved model already has blade variants SHALL still be built with them. Turning the switch on SHALL offer Blade ID again with no other change.

#### Scenario: Wiring in Beta 1
- **WHEN** the owner opens Wiring for a saber whose main blade is a pixel strip, in a Beta 1 build
- **THEN** there is no "Do you swap blades on this saber?" question and no Measure button

#### Scenario: The switch turned on for Beta 2
- **WHEN** the Blade ID switch is on and the owner opens Wiring for a saber whose main blade is a pixel strip
- **THEN** the page asks "Do you swap blades on this saber?" as it did before Beta 1
