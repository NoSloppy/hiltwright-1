# Spec Delta

## ADDED Requirements

### Requirement: Development aids are absent from packaged builds
A packaged build SHALL ignore every `HILTWRIGHT_*` environment variable. That covers the offscreen rendering, screenshot, page-dump and navigation aids, the end-to-end hooks that write to a saber or confirm wiring, and the overrides for the data folder, toolchain folder, font library, SD card location and packs folder. A packaged build's pages SHALL NOT offer the development hooks that those aids call. Development builds SHALL keep all of them.

#### Scenario: An end-to-end hook in a packaged build
- **WHEN** a packaged build is started with `HILTWRIGHT_E2E` set and a saber connected
- **THEN** nothing is written to the saber, and the page has no end-to-end hook to call

#### Scenario: An override in a packaged build
- **WHEN** a packaged build is started with `HILTWRIGHT_PACKS`, `HILTWRIGHT_SD_ROOT` or `HILTWRIGHT_TOOLCHAIN_DIR` set
- **THEN** the app uses its normal packs folder, card search and toolchain folder

#### Scenario: The aids still work in development
- **WHEN** a development build is started with `HILTWRIGHT_DUMP` set
- **THEN** the page's text is written to that file as before

### Requirement: The app shows its real version
The version the app shows (in the sidebar, and stamped into generated configs) SHALL be the version of the build, taken from the app's package, not a value written separately.

#### Scenario: A new version number
- **WHEN** the app's package version is raised and the app is built
- **THEN** the sidebar and newly generated configs show the new version

## MODIFIED Requirements

### Requirement: The page is isolated from the system
The app's pages SHALL NOT be able to open new windows, navigate away from the app, or reach the file system or processes directly. Everything they ask of the system SHALL go through one checked interface. Links SHALL open outside the app only to known help sites. Folders SHALL open only inside the app's own data folder, judged by the folder's resolved path, not by how its name begins. In a packaged build, the page's content security policy SHALL NOT allow live-reload connections (`ws:` and `wss:`), which only development needs.

#### Scenario: A link to an unknown site
- **WHEN** a page asks to open a link that is not on the allowed help sites
- **THEN** nothing is opened

#### Scenario: A folder beside the data folder
- **WHEN** a page asks to open a folder whose path starts with the data folder's path but is a sibling of it (for example `…\desktop-evil` next to `…\desktop`)
- **THEN** it is refused

#### Scenario: Live-reload connections in a packaged build
- **WHEN** a packaged build's page tries to open a `ws:` connection
- **THEN** the content security policy blocks it
