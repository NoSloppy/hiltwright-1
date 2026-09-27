# firmware-build (delta)

## ADDED Requirements

### Requirement: A build stays tied to the setup it was made from
A build SHALL remember the setup it was made from: the config it compiled, and the model behind it. It SHALL count as current only while the saber's setup would still produce the same config. When the setup changes, the Build step SHALL say that the build is out of date and offer to build again.

After an install, the saber's record SHALL hold the model and firmware record of the build that was written, not the setup as it stands by then.

#### Scenario: A style changed after the build
- **WHEN** the owner builds, then chooses a different style for a preset
- **THEN** the Build step says the build is out of date, and Install is locked until the owner builds again

#### Scenario: The record after an install
- **WHEN** a build is installed
- **THEN** the saber's record holds the styles, blades and presets that build was made from
