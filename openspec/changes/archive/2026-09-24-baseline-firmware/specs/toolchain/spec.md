# Spec Delta

## Purpose

Installs, once per computer and with one click, everything needed to compile and flash ProffieOS: the compiler front end, the Proffieboard support with its compiler and flasher, and the pinned ProffieOS source. The owner never has to install Arduino or anything else by hand.

## ADDED Requirements

### Requirement: The compiler setup is offered once, before it is needed
Build & Install SHALL show a compiler step that says whether the toolchain is ready. When it is not, a setup panel SHALL be shown, whether or not a saber is connected. Before anything is downloaded, the panel SHALL show the download size, the disk space the toolchain will use, the free space, and the folder it will go into.

#### Scenario: First visit on a new computer
- **WHEN** the owner opens Build & Install on a computer where the toolchain has never been installed
- **THEN** the compiler step offers a one-time setup, showing the download size, the disk use, the free space and the target folder, and nothing has been downloaded yet

### Requirement: One click installs the whole toolchain
Starting the setup SHALL install, without further questions: arduino-cli, the Proffieboard board support (which brings the compiler and `dfu-util`), and ProffieOS at the version Hiltwright pins (8.10). When every part is present, the compiler step SHALL show as done with the ProffieOS version.

#### Scenario: Installing from nothing
- **WHEN** the owner starts the setup on a computer with no toolchain
- **THEN** all parts are downloaded and installed, and the compiler step reads "ProffieOS v8.10 ready"
- *Needs a real computer with an internet connection.*

### Requirement: The toolchain lives in a short, shared folder
On Windows, the toolchain SHALL be installed into a short machine-wide folder, so the compiler's deepest file paths stay within Windows' path length limit, with shorter fallbacks when that folder cannot be written. When the only available folder is too long, the panel SHALL say so, explain why, and refuse to install.

#### Scenario: A folder path that is too long
- **WHEN** the only toolchain folder available has a path longer than the limit
- **THEN** the panel shows the problem in plain words with the path's length, and the install button is disabled

### Requirement: The setup refuses to start without enough space
When there is not enough free disk space for the parts still missing, the panel SHALL say so, and the setup SHALL NOT start.

#### Scenario: Low disk space
- **WHEN** the target drive has less free space than the toolchain needs
- **THEN** the panel says there is not enough free space, and the install button is disabled

### Requirement: Setup progress is visible
While installing, the compiler step SHALL show that it is working and for how long. Download progress and the installer's own output SHALL be shown on the panel and in the Log tab.

#### Scenario: Watching the install
- **WHEN** the setup is running
- **THEN** the panel shows download progress and the latest installer lines, and the Log tab has the full output

### Requirement: A failed setup can be retried without starting over
If the setup fails, the error SHALL be shown, and the owner SHALL be able to try again. A retry SHALL install only the parts still missing. A download interrupted part-way SHALL never be used as if complete. Running the setup on a complete toolchain SHALL change nothing.

#### Scenario: The network drops mid-install
- **WHEN** the setup fails part-way and the owner presses "Try again"
- **THEN** the parts already installed are kept, the missing ones are installed, and the step ends ready
