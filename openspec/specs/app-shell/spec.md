# app-shell Specification

## Purpose
The application frame: the window, the navigation that leads from the Armory through the four steps to install, the layout rule that keeps actions within reach, and the guards that keep a fault or unsaved work from costing the owner anything.

## Requirements

### Requirement: Navigation reads as one flow
The sidebar SHALL show three groups. **Saber** lists the Armory and then the numbered steps 1 Wiring, 2 Presets, 3 Fonts & SD, 4 Build & Install. **Workshop** holds Styles, Style editor, Font library, Contributors and Demo room. **Tools** holds Diagnostics. The current page SHALL be highlighted. The sidebar SHALL show which saber is being worked on and whether it is plugged in, planned or not plugged in. The app SHALL open on the Armory.

#### Scenario: Opening the app
- **WHEN** the app starts
- **THEN** the Armory is shown and the sidebar names the working saber and its state

#### Scenario: Pending work is visible from anywhere
- **WHEN** styles have been chosen for presets but are not yet in the installed firmware
- **THEN** Build & Install in the sidebar shows how many are queued

### Requirement: The Armory shows progress through the steps
The Armory SHALL show the four steps for the working saber, with a short status for each:
- **Wiring:** the blade count, and whether the wiring is confirmed, by the rule in `hardware-wiring`.
- **Presets:** the preset count, and whether the presets are staged.
- **Build & Install:** when it was last installed.

It SHALL mark the steps that are done and offer to continue with the next step. With no saber known, it SHALL show where to start.

#### Scenario: A saber with wiring and presets but no install
- **WHEN** the working saber has confirmed wiring and presets but has never been installed
- **THEN** Wiring and Presets are marked done and the Armory offers to continue with Build & Install

#### Scenario: An installed saber whose blades changed
- **WHEN** an installed saber has had a blade changed since its wiring was confirmed
- **THEN** the Armory shows the wiring as not confirmed and offers to continue with Wiring

### Requirement: Pages fit the window
Every page SHALL fit the window at the app's minimum window size and above, with its actions visible without scrolling the page. Long content SHALL scroll inside its own panel.

#### Scenario: Minimum window size
- **WHEN** the window is at its minimum size and any page is open
- **THEN** the page's primary actions are visible, and lists and editors scroll within their panels

### Requirement: The app has its own title bar
The window SHALL have no native title bar. The app's header SHALL act as the title bar: it drags the window, keeps its own controls clickable, shows the page title, the working saber, the connection state and battery, and stays clear of the system caption buttons.

#### Scenario: Moving the window
- **WHEN** the owner drags the header outside its buttons
- **THEN** the window moves

### Requirement: Keyboard shortcuts switch pages
Ctrl plus a number key SHALL switch to the page at that position in the sidebar, for the first nine pages. Each sidebar item SHALL show its shortcut on hover.

#### Scenario: Jump to Presets
- **WHEN** the owner presses Ctrl+3
- **THEN** the Presets page opens

### Requirement: A fault in one page stays in that page
An unexpected fault while showing a page SHALL replace only that page with a plain message, the error text, a way to try again and a way to reload the window. The rest of the app, including the connection to the saber, SHALL keep working, and moving to another page SHALL clear the message.

#### Scenario: A page fails
- **WHEN** a page throws an error while rendering
- **THEN** the sidebar and header still work, the page shows "Something went wrong" with Try again and Reload, and choosing another page shows that page normally

### Requirement: Unsaved style work is not lost silently
While the Style editor holds unsaved changes, leaving the page SHALL ask the owner to stay, leave without saving, or save and leave. Closing or reloading the window SHALL ask to stay or close without saving, with staying as the default.

#### Scenario: Leaving the editor
- **WHEN** the owner has unsaved changes in the Style editor and clicks another page
- **THEN** they are asked whether to save first, and choosing Stay keeps them in the editor with the changes intact

#### Scenario: Closing the window
- **WHEN** the owner closes the window with unsaved changes in the Style editor
- **THEN** a dialog asks whether to stay or close without saving, and pressing Enter stays

### Requirement: The page is isolated from the system
The app's pages SHALL NOT be able to open new windows, navigate away from the app, or reach the file system or processes directly. Everything they ask of the system SHALL go through one checked interface. Links SHALL open outside the app only to known help sites, and folders SHALL open only inside the app's own data folder.

#### Scenario: A link to an unknown site
- **WHEN** a page asks to open a link that is not on the allowed help sites
- **THEN** nothing is opened
