# preset-editing Specification

## Purpose
Lets the owner set up the working saber's presets (names, fonts, tracks, a style and colours per blade, and their order), either live on a plugged-in saber or staged in its build model for the next install. Nothing is ever shown as saved that the saber has not confirmed.

## Requirements

### Requirement: Presets are edited live or staged, and the owner can tell which
The Presets page SHALL edit the working saber's presets. When that saber is plugged in and its list is its own, edits SHALL go to the saber at once, and the page SHALL say it is live. When the saber is not plugged in, or its list has been replaced by a loaded set, edits SHALL be kept in the saber's build model as staged. The page SHALL then say they will replace the presets on the saber at the next install. With no saber known, the page SHALL point the owner to the Armory.

#### Scenario: Editing a plugged-in saber
- **WHEN** the owner opens Presets with a saber plugged in and nothing staged
- **THEN** the page is marked live on the saber, and a change is written to the saber
- *Needs a real board (either).*

#### Scenario: Editing an unplugged saber
- **WHEN** the owner changes a preset's font with the saber not plugged in
- **THEN** the list is marked staged for install, with a note that it will replace the N presets on the saber at the next install

#### Scenario: Going back to the saber's own presets
- **WHEN** a saber with staged presets is plugged in and the owner chooses to discard the staged list
- **THEN** the page shows the saber's own presets live

### Requirement: Each preset's fields can be edited
For each preset the owner SHALL be able to set the name, the sound font folder with a switch for the common sounds folder, the track, and for each blade one style from the styles that fit that blade's role or the saber's default. They SHALL also be able to set the colour arguments of that style. A name SHALL be written when the field is left or Enter is pressed, not on every keystroke. Each blade SHALL show a preview of its style at the blade's LED count where the style can be previewed.

#### Scenario: Changing the font live
- **WHEN** the owner sets a live preset's font to `TeensySF` with common sounds on
- **THEN** the saber's preset uses `TeensySF;common`
- *Needs a real board (either).*

#### Scenario: Changing a colour live
- **WHEN** the owner picks red for the base colour of a style the saber's firmware already has
- **THEN** the saber's blade uses red for that preset, and the preview matches while picking
- *Needs a real board (either).*

### Requirement: The saber's presets are read accurately
Reading a saber's preset list SHALL return every preset with its fields, ignoring status lines the board prints between them, and SHALL tolerate a delayed extra preset block from an earlier command.

#### Scenario: A preset list with status lines in it
- **WHEN** the saber prints SD or audio notices while listing its presets
- **THEN** all its presets are read, and none of the notices appear as preset fields

### Requirement: Selecting a preset while live switches the saber
While live, choosing a preset in the list SHALL make it the saber's current preset, and the editor SHALL follow the saber's current preset.

#### Scenario: Choosing a preset
- **WHEN** the owner clicks the third preset while live
- **THEN** the saber switches to its third preset and the editor shows it
- *Needs a real board (either).*

### Requirement: Presets can be reordered, duplicated, added and deleted
The owner SHALL be able to move a preset up or down, duplicate it (the copy placed after it), add one when the list is empty, and delete one after a second confirming click. The last remaining preset SHALL NOT be deletable. While live, these SHALL act on the saber and the list SHALL be read again afterwards.

#### Scenario: Deleting takes two clicks
- **WHEN** the owner clicks Delete on a preset
- **THEN** nothing is deleted until they click "Really delete", and choosing another preset cancels the confirmation

#### Scenario: Reordering live
- **WHEN** the owner moves a live preset up
- **THEN** the saber's preset order changes, and the list shown is the order read back from the saber
- *Needs a real board (either).*

### Requirement: A change is only shown as saved once the saber confirms it
A live edit SHALL show that it is being written until the saber's read-back matches what was written, and only then show it as saved. If the saber reports different values, the page SHALL say the change failed and show what the saber reports. If the saber stops answering, the page SHALL say so and tell the owner to replug and connect. While a write is in progress, the controls SHALL be disabled, and further clicks SHALL be queued in order, not dropped. A change that changes nothing SHALL send nothing.

#### Scenario: A confirmed write
- **WHEN** the owner renames a live preset
- **THEN** "Writing…" shows until the saber's read-back has the new name, then "Saved"
- *Needs a real board (either).*

#### Scenario: The saber never confirms
- **WHEN** the saber does not report the written value after repeated read-backs
- **THEN** the page says the saber did not confirm the change, and does not show it as saved

### Requirement: Style changes with the blade lit are applied after retraction
A style or colour change written while the blade is lit SHALL be saved on the saber but not applied until the blade is retracted. The page SHALL tell the owner that it applies when they retract the blade. The app SHALL apply it once it sees the blade is off. Firmware that cannot report whether the blade is on SHALL be treated as blade off.

#### Scenario: Colour change during a lit blade
- **WHEN** the owner changes a colour while the saber's blade is lit
- **THEN** the page says it applies when the blade is retracted, and after retracting, the blade shows the new colour
- *Needs a real board (either).*

### Requirement: A snapshot is taken before every write
Before any live change to a saber's presets, the app SHALL save a snapshot of the saber's whole preset list, labelled with the change. While live, a History view SHALL list the snapshots newest first. Restoring one SHALL write back the fields of the currently selected preset that differ from that snapshot, and SHALL wait for the saber to confirm.

#### Scenario: Undoing a font change
- **WHEN** the owner changes a live preset's font and then restores the newest snapshot with that preset selected
- **THEN** the preset's previous font is written back and confirmed by the saber
- *Needs a real board (either).*

### Requirement: Styles the firmware lacks are queued for the next build
Choosing a style for a blade that the saber's installed firmware does not contain SHALL mark it as queued for the next build in the picker, on the preset and in Build & Install. It SHALL NOT be written to the saber. On firmware not built by Hiltwright, no style SHALL count as present. The blade's current style SHALL be shown as not built here.

#### Scenario: A new style on a live saber
- **WHEN** the owner picks a style that is not in the saber's firmware for a live preset
- **THEN** the blade shows the style as queued, a note says it goes on with the next Build & Install, and Build & Install counts one new style

### Requirement: Colours chosen for a queued style follow it onto the saber
Colours chosen for a queued style SHALL be kept with the preset. After an install, once the connected firmware has that style in that preset slot, the app SHALL write those colours to the saber, confirm them, return to the preset that was selected, and forget them.

#### Scenario: Colours after an install
- **WHEN** a saber is installed with a newly queued style whose colours were chosen beforehand
- **THEN** after it reconnects, the preset uses the chosen colours without the owner choosing them again
- *Needs a real board (either).*

### Requirement: Chosen styles follow presets by name
While a saber's list is its own, the styles chosen for its presets SHALL stay with the presets by name, so reordering or renaming presets on the saber itself does not move a style to a different preset.

#### Scenario: Presets reordered on the saber
- **WHEN** the owner reorders presets with the saber's own buttons and reconnects
- **THEN** each preset still has the style that was chosen for it

### Requirement: A preset list can be saved and loaded as a set
The owner SHALL be able to save the working saber's list as a named set that records names, fonts, tracks, and a style and colours per kind of blade. They SHALL be able to load a set onto any saber, mapping each kind of blade onto that saber's blades, adding any pasted styles the set needs, and staging the result for that saber's next install. Sets SHALL be kept on this computer and SHALL be deletable.

#### Scenario: Loading a set onto another saber
- **WHEN** the owner loads a set saved from one saber onto another saber with a main blade and a crystal
- **THEN** the second saber's presets are staged with the set's names, fonts and tracks, and the main blade and crystal styles are mapped onto its blades

### Requirement: Fonts and tracks are suggested from what the owner has
The font and track fields SHALL suggest folders from every remembered saber's card, the current card and the font library. The font field SHALL say whether the chosen font is in the library and whether it is on the saber's card, and SHALL offer to copy it from the library when it is missing from the card. The owner SHALL be able to choose a font from the library in a dialog, where fonts can be searched and heard.

#### Scenario: A font that is not on the card
- **WHEN** the owner chooses a font that is in the library but not on the saber's card
- **THEN** the field says it is not on the card and offers to copy it over

### Requirement: Staged presets replace the saber's at install
When a saber with staged presets is installed from normal running mode, the app SHALL snapshot the saber's current presets, then remove the saber's `presets.ini` before rebooting it, so the new firmware starts with the staged presets. After a successful install, the list SHALL no longer be marked staged.

#### Scenario: Installing a staged list
- **WHEN** the owner installs a saber whose presets were staged from a set
- **THEN** the saber boots with the staged presets, a snapshot of its previous presets is kept, and Presets shows the list as live
- *Needs a real board (either).*

### Requirement: Saved preset sets survive a damaged file
Saved preset sets SHALL be kept the same way as the saber library (see `saber-library`):
- Two changes at the same moment SHALL both be kept.
- A file that cannot be read, or holds sets of the wrong shape, SHALL be set aside unchanged and never overwritten.
- The app SHALL start from the last good copy, or otherwise from the sets it could read.
- The Armory SHALL name the file the damaged sets were kept as.

#### Scenario: A damaged sets file
- **WHEN** the saved sets file cannot be read and the owner then saves a new set
- **THEN** the damaged file is still in the app's data folder under the name the Armory gave, and the new set is saved
