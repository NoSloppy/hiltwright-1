# Spec Delta

## ADDED Requirements

### Requirement: A failed build or install offers diagnostics
When a build fails, or an install, backup, restore or bootloader step stops with an error, Build & Install SHALL offer Save diagnostics beside the message (see `support-bundle`).

#### Scenario: A build that fails
- **WHEN** a build fails with a compile problem
- **THEN** the failure message offers Save diagnostics, and the saved file shows that build's problems and flash use

#### Scenario: An install that stops
- **WHEN** an install stops because the bootloader never appeared
- **THEN** the message offers Save diagnostics, and the saved file's log shows the bootloader wait and how it ended
- *Needs a real board (either).*
