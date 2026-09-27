# hardware-wiring (delta)

## MODIFIED Requirements

### Requirement: Board, buttons and prop are chosen per saber
The owner SHALL choose the board (Proffieboard V2 or V3), the number of buttons (1 to 3) and the prop file (Fett263, SA22C, BC or ProffieOS default). For a connected saber, the button count SHALL start from what the saber reports.

The board SHALL be known from the saber where Hiltwright can tell it: from the flash size its bootloader reported at an install, or from the firmware Hiltwright installed on it. When the board is not known, the Wiring page SHALL select neither board. It SHALL ask the owner to check the label on the board, and SHALL refuse to build until the owner chooses. A saber's config name that mentions a board MAY be offered as a hint, but SHALL NOT choose the board by itself.

For a connected saber whose board is not known, the Wiring page SHALL also offer to check the board. Hiltwright SHALL reboot the saber into its bootloader, read the flash size, and return the saber to its firmware, with nothing written. It SHALL then reconnect, and the board found SHALL be known from then on. If the check cannot finish, the page SHALL say why, and how to bring the saber back to its firmware when it is left in its bootloader. Examples: Windows has no bootloader driver yet, or the flash size is not one Hiltwright knows.

When the board known from the saber differs from the board in the saved wiring, the known board SHALL be used, and the page SHALL say so. The owner then confirms the wiring again.

#### Scenario: Choosing the prop
- **WHEN** the owner chooses SA22C for a saber
- **THEN** the saber's build uses the SA22C prop file

#### Scenario: A new saber whose board is not known
- **WHEN** a saber Hiltwright has never installed is connected for the first time
- **THEN** the Wiring page selects neither Proffieboard V2 nor V3, and asks the owner to check the label on the board
- **AND** building is refused with "Choose the board (Proffieboard V2 or V3) on the Wiring page." until they choose

#### Scenario: A config name that mentions a V3
- **WHEN** a new saber reports a config name mentioning a V3
- **THEN** the page suggests V3, but neither board is chosen until the owner chooses

#### Scenario: A board learnt at an install
- **WHEN** the owner installs a saber whose bootloader reports 512 KB, and later opens its Wiring page
- **THEN** Proffieboard V3 is selected without the owner choosing it
- *Needs a real board (V3).*

#### Scenario: Checking the board
- **WHEN** the owner presses "Check the board" for a connected saber whose board is not known
- **THEN** the saber leaves normal mode, comes back within a few seconds on the same firmware, and the Wiring page shows its board as found, with nothing written to it
- *Needs a real board (V3).*

#### Scenario: Checking without the bootloader driver
- **WHEN** the owner checks the board on a Windows computer that has no bootloader driver yet
- **THEN** the page says the driver is needed first (it is installed with the first install), and how to bring the saber back to its firmware

#### Scenario: The saved wiring names the other board
- **WHEN** the saved wiring says V2, but the saber's bootloader reported 512 KB at an install
- **THEN** the Wiring page shows V3, says the board was corrected from what the saber reported, and the wiring needs confirming again
