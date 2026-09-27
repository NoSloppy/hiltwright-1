# firmware-build (delta)

## MODIFIED Requirements

### Requirement: Firmware is built against the pinned ProffieOS for the saber's board
Each saber SHALL be built from its own copy of the pinned ProffieOS version, for the board in its model (V2 or V3). The built firmware SHALL report a readable version stamp (`v8.10 hiltwright <sha>`) instead of ProffieOS's raw source keyword. The copy and the build output SHALL be kept in a folder of the Windows user running the app. A build SHALL never depend on being able to overwrite files that another user, or a run with administrator rights, wrote.

#### Scenario: Version after install
- **WHEN** firmware built by Hiltwright is installed and the saber connects
- **THEN** it reports its version as "v8.10 hiltwright <sha>"
- *Needs a real board (either).*

#### Scenario: A build after a run with administrator rights
- **WHEN** Hiltwright was once run with administrator rights and built a saber, and the owner builds it again in a normal run
- **THEN** the build succeeds, with no permission error
