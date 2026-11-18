# Spec Delta

## MODIFIED Requirements

### Requirement: Development aids are absent from packaged builds
A packaged build SHALL ignore every `HILTWRIGHT_*` environment variable. That covers:
- the offscreen rendering, screenshot, page-dump and navigation aids
- the end-to-end hooks that write to a saber or confirm wiring
- the overrides for the data folder, toolchain folder, font library, SD card location and packs folder
- the switch that keeps a development run away from every board

A packaged build's pages SHALL NOT offer the development hooks that those aids call. Development builds SHALL keep all of them.

In a development build, the no-board switch (`HILTWRIGHT_NO_BOARD`) SHALL make every board unreachable for that run: no serial device is granted or selected, no connection is attempted on start-up or when a board is plugged in, and pressing Connect says that board access is off for this run.

#### Scenario: An end-to-end hook in a packaged build
- **WHEN** a packaged build is started with `HILTWRIGHT_E2E` set and a saber connected
- **THEN** nothing is written to the saber, and the page has no end-to-end hook to call

#### Scenario: An override in a packaged build
- **WHEN** a packaged build is started with `HILTWRIGHT_PACKS`, `HILTWRIGHT_SD_ROOT` or `HILTWRIGHT_TOOLCHAIN_DIR` set
- **THEN** the app uses its normal packs folder, card search and toolchain folder

#### Scenario: The aids still work in development
- **WHEN** a development build is started with `HILTWRIGHT_DUMP` set
- **THEN** the page's text is written to that file as before

#### Scenario: A development run with a saber plugged in and no-board on
- **WHEN** a development build is started with `HILTWRIGHT_NO_BOARD=1` while a Proffieboard is plugged in
- **THEN** the app opens no serial port at start-up, and pressing Connect says board access is off for this run
- *Needs a real board (either) plugged in.*

#### Scenario: Plugging in during a no-board run
- **WHEN** a Proffieboard is plugged in during a development run with `HILTWRIGHT_NO_BOARD=1`
- **THEN** no connection is attempted
- *Needs a real board (either).*
