# toolchain (delta)

## MODIFIED Requirements

### Requirement: One click installs the whole toolchain
Starting the setup SHALL install, without further questions: arduino-cli, the Proffieboard board support (which brings the compiler and `dfu-util`), and ProffieOS at the version Hiltwright pins (8.10). Each part SHALL be the exact version Hiltwright pins:
- arduino-cli and the ProffieOS source SHALL be checked against a pinned SHA-256 before they are unpacked.
- The board support SHALL be installed at a pinned version.

A download that fails its check SHALL be deleted and never used, and the setup SHALL stop and say which part was not the file expected. The installed versions SHALL be read back from what is installed, not assumed. A toolchain whose versions differ from the pins SHALL NOT count as ready, and the setup SHALL put the pinned versions in place. When every part is present at its pinned version, the compiler step SHALL show as done, with the ProffieOS version and the versions of the other parts.

#### Scenario: Installing from nothing
- **WHEN** the owner starts the setup on a computer with no toolchain
- **THEN** all parts are downloaded, checked and installed, and the compiler step reads "ProffieOS v8.10 ready"
- *Needs a real computer with an internet connection.*

#### Scenario: A download that is not the pinned file
- **WHEN** the arduino-cli or ProffieOS download does not match its pinned SHA-256
- **THEN** the file is deleted and not unpacked, and the setup stops, saying which part was not the file expected

#### Scenario: A board support version that is not the pinned one
- **WHEN** the installed board support is a different version from the pinned one
- **THEN** the compiler step is not ready, and the setup installs the pinned version

### Requirement: The toolchain lives in a short, shared folder
On Windows, the toolchain SHALL be installed into a short machine-wide folder, so the compiler's deepest file paths stay within Windows' path length limit, with shorter fallbacks when that folder cannot be written.
- **Creating it.** The folder SHALL be created only when the owner starts the setup. When the setup creates it, administrators and the Windows user running the setup SHALL be able to change it, and other users SHALL only be able to read and run it.
- **An open folder.** When an existing toolchain folder can be changed by other standard users, the panel SHALL say so and offer a Repair that locks it the same way, asking Windows for approval when the folder belongs to administrators.
- **A path too long.** When the only available folder is too long, the panel SHALL say so, explain why, give the path's length, and refuse to install. A toolchain already installed at a path that is too long SHALL be flagged the same way, instead of being left to fail the build. The panel SHALL NOT tell the owner to set a development switch.

#### Scenario: A folder path that is too long
- **WHEN** the only toolchain folder available has a path longer than the limit
- **THEN** the panel shows the problem in plain words with the path's length, and the install button is disabled

#### Scenario: An installed toolchain at a path that is too long
- **WHEN** a complete toolchain is found at a path longer than the limit
- **THEN** the panel says the path is too long for the compiler, with its length, instead of showing the toolchain as ready

#### Scenario: Starting the app
- **WHEN** the app starts on a computer where the setup has never been run
- **THEN** no toolchain folder is created

#### Scenario: A folder other users can change
- **WHEN** the toolchain folder can be changed by any standard user on the computer
- **THEN** the panel says other users could change the compiler, and Repair, after Windows' approval where needed, leaves it changeable only by administrators and the owner's own account
- *Needs a real computer (Windows).*

### Requirement: A failed setup can be retried without starting over
If the setup fails, the error SHALL be shown, and the owner SHALL be able to try again. A retry SHALL install only the parts still missing. A download interrupted part-way SHALL never be used as if complete. Running the setup on a complete toolchain SHALL change nothing.
- **A stall.** A download that receives nothing for 60 seconds SHALL stop, as a failure.
- **Cancelling.** The owner SHALL be able to cancel a running setup. Cancelling SHALL stop the current download or step, and leave what is already installed to be kept by the next attempt.
- **One at a time.** Only one setup SHALL run at a time. Starting it again while it runs SHALL join the running one.

#### Scenario: The network drops mid-install
- **WHEN** the setup fails part-way and the owner presses "Try again"
- **THEN** the parts already installed are kept, the missing ones are installed, and the step ends ready

#### Scenario: A stalled download
- **WHEN** a download stops receiving data for 60 seconds
- **THEN** the setup stops with a message that the download stalled, and "Try again" is offered

#### Scenario: Cancelling the setup
- **WHEN** the owner presses Cancel during the setup
- **THEN** the setup stops within a few seconds, nothing partly downloaded is kept under its real name, and the panel offers the setup again
