# Spec Delta

## Purpose
Keeps a record of what the app saw, on the owner's own computer. When something goes wrong, the owner can give one readable file to whoever is helping them, with personal details left out and nothing sent by the app.

## ADDED Requirements

### Requirement: The app keeps a log on disk
The app SHALL write a log for every run, in a `logs` folder inside its own data folder, in packaged and development builds alike. Each line SHALL carry the time and where it came from. The log SHALL record:
- connection attempts and their outcome
- every line sent to the board and every line the board sends back, including lines it prints on its own
- toolchain setup, build and install steps, with their output and each step's result
- any request from a page that fails in the app's background process
- messages the pages report
- faults nobody caught, in the pages or the background process

The app SHALL keep the logs of the ten most recent runs and delete older ones when it starts. A single run's log SHALL stop growing at 5 MB and SHALL say that it stopped.

#### Scenario: The board conversation is recorded
- **WHEN** the owner connects a saber and sends `battery` from the Diagnostics console
- **THEN** that run's log shows the identify commands, the `battery` command and the board's answers, each with its time
- *Needs a real board (either).*

#### Scenario: A failed step is recorded
- **WHEN** an install step fails
- **THEN** the log shows which step failed and the text the tool reported

#### Scenario: Old runs are pruned
- **WHEN** the app starts with twelve run logs already in its `logs` folder
- **THEN** the two oldest are deleted, and the new run's log is added

### Requirement: Personal details are kept out
The log and the diagnostics file SHALL NOT contain the owner's user folder path, Windows user name or computer name. Each SHALL be replaced by a fixed placeholder, whatever its letter case. The rest of a path SHALL be kept, so the location can still be understood.

#### Scenario: A toolchain path in the log
- **WHEN** the owner's user folder is `C:\Users\Sam` and the toolchain reports saving a file under it
- **THEN** the log shows the path starting with `%USERPROFILE%`, and neither `Sam` nor the computer name appears anywhere in the log

### Requirement: The owner can save a diagnostics file
Saving diagnostics SHALL write one plain-text file into a `support` folder inside the app's data folder, and SHALL show that file in its folder. The file SHALL be readable without other tools. It SHALL contain:
- when it was made, the app version, whether the build is packaged, and the Windows, Electron and Chromium versions
- the toolchain's state: ready or not, the ProffieOS version, the arduino-cli version, whether the compiler and dfu-util are present, the free space, and any path problem
- the USB state: whether the saber is present normally or in its bootloader, and the bootloader driver's state
- the connection state: connected or not, the last connection error, and the board's version, config, prop, buttons, battery and counts of presets, fonts and tracks
- the working saber: its name, whether it is planned, its identity, and its model:
  - board, buttons, prop and blades
  - whether the wiring is confirmed
  - each preset's name, font and track
  - the installed firmware's date, ProffieOS version and preset count
- the last build in this run: whether it succeeded, whether it was cached, how long it took, the flash use, and its warnings and problems
- the current run's log, and the end of the previous run's log

The file SHALL NOT contain style code, the generated config, fonts, hilt models or firmware backups. It SHALL stay under 2 MB, by cutting the oldest log lines first and saying so. The app SHALL keep the ten most recent diagnostics files and delete older ones. The app SHALL NOT send the file, or anything else, anywhere.

#### Scenario: Saving with a saber connected
- **WHEN** the owner saves diagnostics with a saber connected
- **THEN** a file named with the date and time appears in the `support` folder, which opens with the file selected, and the file shows the saber's name, board, preset names and the recent board conversation
- *Needs a real board (either).*

#### Scenario: Saving with nothing connected
- **WHEN** the owner saves diagnostics with no saber connected and no build made in this run
- **THEN** the file is still written, says that no saber is connected and that no build was made in this run, and still includes the versions, toolchain state and log

#### Scenario: A very long log
- **WHEN** the current run's log is larger than the file's limit
- **THEN** the file keeps the newest lines, says that older lines were left out, and stays under 2 MB
