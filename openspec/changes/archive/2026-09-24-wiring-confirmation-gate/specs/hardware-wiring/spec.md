# Spec Delta

## MODIFIED Requirements

### Requirement: The owner confirms they checked the wiring
The Wiring page SHALL offer an "I checked the wiring" confirmation. A confirmation SHALL record the board and blade layout it was given for, and SHALL count only while the saber's board and blades are exactly that layout. Changing the board or any blade SHALL therefore withdraw it. Changing the buttons, the prop file or the presets SHALL NOT. The owner SHALL be able to turn the confirmation off at any time.

A confirmation SHALL be kept with the saber, surviving page changes, saves from other pages, and restarts, whether or not the saber has ever been installed. A confirmation made before this rule existed, with no layout recorded, SHALL NOT count. Such a saber needs to be confirmed once more.

The Wiring page, the Armory's progress rail and Build & Install SHALL all decide "confirmed" by this one rule. Until the wiring counts as confirmed, the Wiring page SHALL NOT lead on to Presets, and installing SHALL stay locked (see `firmware-install`).

#### Scenario: Changing a blade withdraws the confirmation
- **WHEN** the owner has confirmed the wiring of a saber that has never been installed, and then changes a blade's data pin
- **THEN** the confirmation is withdrawn and must be given again

#### Scenario: Confirming a saber that has never been installed
- **WHEN** the owner plans a saber, describes its wiring, confirms it, and builds it
- **THEN** Build & Install shows the wiring as confirmed and asks for nothing more about wiring before installing

#### Scenario: The confirmation is kept
- **WHEN** the owner confirms the wiring, edits the saber's presets, closes the app and reopens it
- **THEN** the wiring still counts as confirmed on Wiring, in the Armory and on Build & Install

#### Scenario: Changing a blade on an installed saber
- **WHEN** a saber has been installed and the owner changes one blade's data pin
- **THEN** the wiring no longer counts as confirmed on any page, and installing is locked until the owner confirms again
- *Needs a real board (either) for the install step.*

#### Scenario: Changing the board
- **WHEN** the owner switches a confirmed saber's board from V2 to V3
- **THEN** the confirmation is withdrawn

#### Scenario: Changing the prop keeps the confirmation
- **WHEN** the owner changes a confirmed saber's prop file
- **THEN** the wiring still counts as confirmed

#### Scenario: Turning the confirmation off
- **WHEN** the owner turns off "I checked the wiring" on a saber that has been installed
- **THEN** the wiring counts as not confirmed, and installing is locked

#### Scenario: A saber confirmed before this rule
- **WHEN** a saber installed or confirmed before this change is opened
- **THEN** its wiring shows as not confirmed until the owner confirms it once
