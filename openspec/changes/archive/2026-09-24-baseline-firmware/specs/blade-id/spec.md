# Spec Delta

## Purpose

Lets a saber with swappable blades carry one blade layout per blade, chosen at power-on by the ID resistor the saber measures. This is stub depth: the feature exists in code, is hidden for Beta 1 (`hide-for-beta-1`), and is verified and shown again in Beta 2 (`blade-id-verification`).

## ADDED Requirements

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
