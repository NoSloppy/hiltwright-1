# Spec Delta

## MODIFIED Requirements

### Requirement: The editor has a simple and a full mode
The style editor SHALL offer a Simple mode (a stack of blocks) and a Full mode (the style as a tree of layers), switchable at any time. A new style SHALL start in Simple mode as a steady blade with the common effects and a wipe in and out. A saved built style SHALL reopen in the mode it was saved in. The style SHALL have an editable name.

The editor SHALL show whether the style is unsaved, changed or saved, judged by what Save would write. Save SHALL write the mode whose content the owner changed, not whichever tab is showing:
- Only switching to the other mode's tab SHALL NOT make the style count as changed, and SHALL NOT change what Save writes.
- When both modes were changed, Save SHALL write the mode showing, and the editor SHALL say, before saving, that the other mode's changes are not kept.

#### Scenario: Starting a new style
- **WHEN** the owner chooses "Build a style" on Styles
- **THEN** the editor opens in Simple mode with a steady blue blade, the common effects and a wipe ignition and retraction

#### Scenario: Reopening a tree style
- **WHEN** the owner chooses "Edit the layers" on a style saved from Full mode
- **THEN** the editor opens in Full mode with that style's layers

#### Scenario: Looking at the other mode
- **WHEN** the owner opens a style saved from Full mode, clicks the Simple tab without changing anything, and presses Save
- **THEN** the status still says "Saved", and the stored style is still the Full one, not a default blue blade

### Requirement: A saved style works everywhere
Saving SHALL store the style as one of the owner's built styles, credited to them. It keeps its layers for re-editing, its live settings and their default colours, and a preview colour. Later saves SHALL update the same style, and SHALL keep an author name the owner set on Styles.

While Save is working, it SHALL show so and SHALL NOT start again. A second press SHALL NOT make a second style. A failed save SHALL be reported in the editor, and the style SHALL stay unsaved.

The editor SHALL always open the stored, current version of a style, whether it is reached from Styles or from the sidebar.

When a style that sabers already have in their plans is saved again, each of those sabers SHALL get the new version for its next build. The editor SHALL say how many were updated.

A saved style SHALL appear on Styles, preview on Styles, Presets and in the demo room, and be choosable for presets and compiled like any other style. After saving, the editor SHALL offer to open it in the demo room.

#### Scenario: Save then use
- **WHEN** the owner saves a new style and opens Styles
- **THEN** the style is in the gallery as theirs, animated, and can be added to a preset

#### Scenario: A saved style compiles
- **WHEN** a style with every effect layer is saved and built for a V2
- **THEN** the build succeeds

#### Scenario: A double click on Save
- **WHEN** the owner double-clicks Save on a new style
- **THEN** exactly one style is stored

#### Scenario: Reopening from the sidebar after saving
- **WHEN** the owner edits a built style, saves it, visits another page, and comes back to the Style editor from the sidebar
- **THEN** the editor shows the saved version, and saving again changes nothing that was saved

#### Scenario: Editing a style a saber already uses
- **WHEN** the owner changes the colour of a built style that one saber's plan uses and saves it
- **THEN** the editor says one saber was updated, and that saber's next build compiles the new version
