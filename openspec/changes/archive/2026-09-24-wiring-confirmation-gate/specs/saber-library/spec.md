# Spec Delta

## MODIFIED Requirements

### Requirement: The installed firmware is recorded
After a successful install, the saber's record SHALL keep what was compiled in: the build's hash, ProffieOS version, time, which style is in which preset slot with its arguments, and the board and blade layout the firmware was built for. Putting a firmware backup back SHALL clear that record, because the restored firmware is not Hiltwright's.

#### Scenario: Install then restore
- **WHEN** a saber is installed with Hiltwright and later has a backup put back
- **THEN** after the install its styles count as compiled in, and after the restore they do not
- *Needs a real board (either).*

#### Scenario: The installed layout is kept
- **WHEN** a saber with a 132-pixel main blade on its own data line and a 2-pixel crystal chained after it is installed
- **THEN** the saber's record says the firmware was built for that board with those two blades, even after the owner later changes the wiring
