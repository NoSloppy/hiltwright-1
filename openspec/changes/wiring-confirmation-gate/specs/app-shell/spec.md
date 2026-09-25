# Spec Delta

## MODIFIED Requirements

### Requirement: The Armory shows progress through the steps
The Armory SHALL show the four steps for the working saber, with a short status for each:
- **Wiring:** the blade count, and whether the wiring is confirmed, by the rule in `hardware-wiring`.
- **Presets:** the preset count, and whether the presets are staged.
- **Build & Install:** when it was last installed.

It SHALL mark the steps that are done and offer to continue with the next step. With no saber known, it SHALL show where to start.

#### Scenario: A saber with wiring and presets but no install
- **WHEN** the working saber has confirmed wiring and presets but has never been installed
- **THEN** Wiring and Presets are marked done and the Armory offers to continue with Build & Install

#### Scenario: An installed saber whose blades changed
- **WHEN** an installed saber has had a blade changed since its wiring was confirmed
- **THEN** the Armory shows the wiring as not confirmed and offers to continue with Wiring
