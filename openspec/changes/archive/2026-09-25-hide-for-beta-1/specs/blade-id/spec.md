# Spec Delta

## ADDED Requirements

### Requirement: Blade ID is not offered in Beta 1
While the Beta 1 switch for Blade ID is off, the Wiring page SHALL NOT ask whether the owner swaps blades. It SHALL NOT show blade variants or offer to measure a blade's ID. A saber whose saved model already has blade variants SHALL still be built with them. Turning the switch on SHALL offer Blade ID again with no other change.

#### Scenario: Wiring in Beta 1
- **WHEN** the owner opens Wiring for a saber whose main blade is a pixel strip, in a Beta 1 build
- **THEN** there is no "Do you swap blades on this saber?" question and no Measure button

#### Scenario: The switch turned on for Beta 2
- **WHEN** the Blade ID switch is on and the owner opens Wiring for a saber whose main blade is a pixel strip
- **THEN** the page asks "Do you swap blades on this saber?" as it did before Beta 1
