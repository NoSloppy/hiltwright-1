# preset-editing (delta)

## MODIFIED Requirements

### Requirement: Staged presets replace the saber's at install
When a saber with staged presets is installed, the app SHALL NOT touch the saber's presets until the new firmware is installed and checked (see `firmware-install`). That holds whether the install started from a connected saber or from a board already in its bootloader.

Only once the saber is back running the new firmware, and the install check has confirmed it, SHALL the app:
1. Snapshot the presets the saber reports, labelled "Before install with staged presets".
2. Remove the saber's presets files.
3. Restart the saber, so that it starts with the presets compiled into the new firmware.
4. Read its presets back.

Only when the saber then reports the staged presets SHALL the list stop being marked staged.

If any of those steps cannot be done, the list SHALL stay staged and the saber SHALL keep its own presets, and the page SHALL say which step it was:
- the install stopped
- the saber did not come back, or could not be checked
- a file could not be removed, or the restart failed
- the saber still reports other presets

While the saber is connected and its installed firmware carries the staged presets, the Build page SHALL offer to apply them without installing again ("Use the staged presets").

Colours chosen with a style for a staged preset SHALL be written to the saber only after the staged presets are applied.

#### Scenario: Installing a staged list
- **WHEN** the owner installs a saber whose presets were staged from a set
- **THEN** the saber boots with the staged presets, a snapshot of its previous presets is kept, and Presets shows the list as live
- *Needs a real board (either).*

#### Scenario: An install that stops
- **WHEN** an install with staged presets stops before the new firmware is checked (a refused board, a failed backup or write, or Cancel at the driver step)
- **THEN** the saber's own presets are untouched, and the list is still staged

#### Scenario: From a board already in its bootloader
- **WHEN** a saber with staged presets is installed from a board already in its bootloader
- **THEN** once the new firmware is up and checked, the staged presets are applied the same way, and the list stops being staged only when the saber reports them
- *Needs a real board (either).*

#### Scenario: The saber still reports its own presets
- **WHEN** after removing the presets files and restarting, the saber still reports presets other than the staged ones
- **THEN** the list stays staged, the page says the saber still has its own presets, and it offers "Use the staged presets"

#### Scenario: Using the staged presets later
- **WHEN** the saber was slow to come back after a staged install, and is connected later with that firmware
- **THEN** the Build page offers "Use the staged presets", which snapshots, removes, restarts and reads back as after an install

#### Scenario: The snapshot's name
- **WHEN** staged presets are applied
- **THEN** the snapshot of the saber's previous presets is listed as "Before install with staged presets"

#### Scenario: Colours for a staged preset
- **WHEN** a staged preset has colours chosen with a new style, and the install is done
- **THEN** the colours are written only after the saber reports the staged presets, and they land in those presets
