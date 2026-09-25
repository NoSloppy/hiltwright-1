# Spec Delta

## ADDED Requirements

### Requirement: Diagnostics offers a diagnostics file
The Diagnostics page SHALL offer Save diagnostics whether or not a saber is connected (see `support-bundle`). Once the file is saved, the page SHALL name the file and say that the owner can read it before sending it.

#### Scenario: Saving from Diagnostics
- **WHEN** the owner presses Save diagnostics on the Diagnostics page
- **THEN** the file's folder opens with the file selected, and the page names the file and says it can be read before sending

#### Scenario: Diagnostics with nothing plugged in
- **WHEN** the owner opens Diagnostics with no saber connected
- **THEN** Save diagnostics is still offered
