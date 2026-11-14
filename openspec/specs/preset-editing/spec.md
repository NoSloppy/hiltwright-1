# preset-editing Specification

## Purpose
Lets the owner set up the working saber's presets (names, fonts, tracks, a style and colours per blade, and their order), either live on a plugged-in saber or staged in its build model for the next install. Nothing is ever shown as saved that the saber has not confirmed.

## Requirements

### Requirement: Presets are edited live or staged, and the owner can tell which
The Presets page SHALL edit the working saber's presets. When that saber is plugged in and its list is its own, edits SHALL go to the saber at once, and the page SHALL say it is live. When the saber is not plugged in, or its list has been replaced by a loaded set, edits SHALL be kept in the saber's build model as staged. The page SHALL then say they will replace the presets on the saber at the next install. With no saber known, the page SHALL point the owner to the Armory.

The mode shown SHALL match what is true:
- **"Live on the saber"**, only while plugged in with its own list
- **"Staged for install"**, only while something is staged
- **"Not plugged in"**, while the saber is unplugged and nothing is staged. Edits made then are staged.

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

#### Scenario: Unplugged, nothing staged
- **WHEN** the owner opens Presets with the saber unplugged and nothing staged
- **THEN** the mode reads "Not plugged in", not "Staged for install"

### Requirement: Each preset's fields can be edited
For each preset the owner SHALL be able to set:
- the name
- the sound font folder, with a switch for the common sounds folder
- the track
- for each blade, one style from the styles that fit that blade's role
- the colour arguments of that style

**The name and the fields:** a name SHALL be written when the field is left or Enter is pressed, not on every keystroke. After a write the saber did not confirm, each field SHALL show what the saber reports, not what was typed.

**The font:** a font made of several folders SHALL keep them all when its first folder is changed. The page SHALL show the other folders.

**Colours:** a colour SHALL be written once the owner stops moving the picker, without having to click elsewhere.

**"Saber's default":** it SHALL be offered only while the list is staged, where it means no style is chosen for that blade, and the build uses the first style for the blade's kind. It SHALL NOT be offered while live.

**Previews:** each blade SHALL show a preview of its style at the blade's LED count, where the style can be previewed.

#### Scenario: Changing the font live
- **WHEN** the owner sets a live preset's font to `TeensySF` with common sounds on
- **THEN** the saber's preset uses `TeensySF;common`
- *Needs a real board (either).*

#### Scenario: Changing a colour live
- **WHEN** the owner picks red for the base colour of a style the saber's firmware already has
- **THEN** the saber's blade uses red for that preset, and the preview matches while picking
- *Needs a real board (either).*

#### Scenario: A font of several folders
- **WHEN** a preset's font is `Mara;Extra;common` and the owner changes the folder to `Grey`
- **THEN** the preset's font becomes `Grey;Extra;common`, and the page shows that `Extra` is also used
- *Needs a real board (either).*

#### Scenario: A write the saber did not confirm
- **WHEN** the owner types a new name, and the saber does not confirm it
- **THEN** the name field shows the name the saber reports, and the page says the change failed

#### Scenario: A colour without clicking away
- **WHEN** the owner picks a colour and leaves the picker open without clicking elsewhere
- **THEN** the colour is written shortly after the picker stops moving

#### Scenario: The saber's default while live
- **WHEN** a saber's list is live
- **THEN** the style picker does not offer "Saber's default", and no "not on the saber yet" note appears for it

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
A live edit SHALL show that it is being written until the saber's read-back matches what was written, and only then show it as saved. If the saber reports different values, the page SHALL say the change failed and show what the saber reports. If the saber stops answering, the page SHALL say so and tell the owner to replug and connect. If the saber reports that it cannot read its SD card, the page SHALL say that instead, since reconnecting cannot help.

While a write is in progress, the controls SHALL be disabled, and further clicks SHALL be queued in order, not dropped. A change that changes nothing SHALL send nothing.

After each confirmed write, the saber's remembered preset list SHALL be updated, so the list shown "as last read" after unplugging is the saber's latest.

#### Scenario: A confirmed write
- **WHEN** the owner renames a live preset
- **THEN** "Writing…" shows until the saber's read-back has the new name, then "Saved"
- *Needs a real board (either).*

#### Scenario: The saber never confirms
- **WHEN** the saber does not report the written value after repeated read-backs
- **THEN** the page says the saber did not confirm the change, and does not show it as saved

#### Scenario: The card is gone during an edit
- **WHEN** the saber answers an edit with "Failed to mount SD card."
- **THEN** the page says the saber has no readable SD card, so the change was not saved, and does not tell the owner to replug

#### Scenario: Unplugging after live edits
- **WHEN** the owner renames a live preset, it is confirmed, and the owner unplugs the saber
- **THEN** the presets shown as last read include the new name

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
Choosing a style for a blade that the saber's installed firmware does not contain SHALL mark it as queued for the next build, in the picker, on the preset, and in Build & Install. It SHALL NOT be written to the saber. On firmware not built by Hiltwright, no style SHALL count as present. The blade's current style SHALL be shown as not built here.

The saber's build model SHALL always hold the owner's latest choice for each preset and blade. A style the firmware has, chosen live and written to the saber, SHALL replace any queued style for that blade in the model, so the next build compiles what the saber shows.

#### Scenario: A new style on a live saber
- **WHEN** the owner picks a style that is not in the saber's firmware for a live preset
- **THEN** the blade shows the style as queued, a note says it goes on with the next Build & Install, and Build & Install counts one new style

#### Scenario: A queued style replaced live
- **WHEN** a blade has a queued style, and the owner then picks a style the firmware has for it
- **THEN** the saber uses the chosen style, the blade no longer shows the queued one, and the next build compiles the chosen style
- *Needs a real board (either).*

### Requirement: Colours chosen for a queued style follow it onto the saber
Colours chosen for a queued style SHALL be kept with the preset. After an install, once the connected firmware has that style in that preset slot, the app SHALL write those colours to the saber, confirm them, return to the preset that was selected, and forget them.

#### Scenario: Colours after an install
- **WHEN** a saber is installed with a newly queued style whose colours were chosen beforehand
- **THEN** after it reconnects, the preset uses the chosen colours without the owner choosing them again
- *Needs a real board (either).*

### Requirement: Chosen styles follow presets by name
While a saber's list is its own, the styles chosen for its presets SHALL stay with the presets by name. Reordering or renaming presets on the saber itself SHALL NOT move a style to a different preset.
- **Repeated names:** presets that share a name, or have none, SHALL match in their order.
- **Unknown names:** a preset whose name was not seen before SHALL take no chosen styles, rather than those of the preset that used to sit at its position.
- **Renames in the app:** a rename made on the Presets page SHALL carry the preset's chosen styles to its new name.

#### Scenario: Presets reordered on the saber
- **WHEN** the owner reorders presets with the saber's own buttons and reconnects
- **THEN** each preset still has the style that was chosen for it

#### Scenario: Two presets with the same name
- **WHEN** two presets have no name, each with its own chosen style
- **THEN** each keeps its own style

#### Scenario: Renamed and moved on the saber
- **WHEN** a preset is renamed and moved with the saber's own buttons
- **THEN** it takes no chosen style from the preset that used to sit at its new position

#### Scenario: Renamed in the app
- **WHEN** the owner renames a live preset on the Presets page
- **THEN** its chosen styles stay with it under the new name

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
When a saber with staged presets is installed, the app SHALL NOT touch the saber's presets until the new firmware is installed and checked (see `firmware-install`). That holds whether the install started from a connected saber or from a board already in its bootloader.

Only once the saber is back running the new firmware, and the install check has confirmed it, SHALL the app:
1. Snapshot the presets the saber reports, labelled "Before install with staged presets".
2. Remove the saber's presets files.
3. Restart the saber, so that it starts with the presets compiled into the new firmware.
4. Read its presets back.

Only when the saber then reports the staged presets SHALL the list stop being marked staged.

If any of those steps cannot be done, the list SHALL stay staged and the saber SHALL keep its own presets, and the page SHALL say which step it was:
- the install stopped
- the saber did not come back, or could not be checked
- a file could not be removed, or the restart failed
- the saber still reports other presets

While the saber is connected and its installed firmware carries the staged presets, the Build page SHALL offer to apply them without installing again ("Use the staged presets").

Colours chosen with a style for a staged preset SHALL be written to the saber only after the staged presets are applied.

#### Scenario: Installing a staged list
- **WHEN** the owner installs a saber whose presets were staged from a set
- **THEN** the saber boots with the staged presets, a snapshot of its previous presets is kept, and Presets shows the list as live
- *Needs a real board (either).*

#### Scenario: An install that stops
- **WHEN** an install with staged presets stops before the new firmware is checked (a refused board, a failed backup or write, or Cancel at the driver step)
- **THEN** the saber's own presets are untouched, and the list is still staged

#### Scenario: From a board already in its bootloader
- **WHEN** a saber with staged presets is installed from a board already in its bootloader
- **THEN** once the new firmware is up and checked, the staged presets are applied the same way, and the list stops being staged only when the saber reports them
- *Needs a real board (either).*

#### Scenario: The saber still reports its own presets
- **WHEN** after removing the presets files and restarting, the saber still reports presets other than the staged ones
- **THEN** the list stays staged, the page says the saber still has its own presets, and it offers "Use the staged presets"

#### Scenario: Using the staged presets later
- **WHEN** the saber was slow to come back after a staged install, and is connected later with that firmware
- **THEN** the Build page offers "Use the staged presets", which snapshots, removes, restarts and reads back as after an install

#### Scenario: The snapshot's name
- **WHEN** staged presets are applied
- **THEN** the snapshot of the saber's previous presets is listed as "Before install with staged presets"

#### Scenario: Colours for a staged preset
- **WHEN** a staged preset has colours chosen with a new style, and the install is done
- **THEN** the colours are written only after the saber reports the staged presets, and they land in those presets

### Requirement: Saved preset sets survive a damaged file
Saved preset sets SHALL be kept the same way as the saber library (see `saber-library`):
- Two changes at the same moment SHALL both be kept.
- A file that cannot be read, or holds sets of the wrong shape, SHALL be set aside unchanged and never overwritten.
- The app SHALL start from the last good copy, or otherwise from the sets it could read.
- The Armory SHALL name the file the damaged sets were kept as.

#### Scenario: A damaged sets file
- **WHEN** the saved sets file cannot be read and the owner then saves a new set
- **THEN** the damaged file is still in the app's data folder under the name the Armory gave, and the new set is saved

### Requirement: Without a readable SD card, presets are not edited
ProffieOS saves preset changes, and the current preset, on the SD card. While a connected saber reports that it cannot read its card (it prints "Failed to mount SD card."), the Presets page SHALL NOT send it preset changes or preset selections. It SHALL show the presets read-only, saying that the saber has no readable SD card, so preset changes cannot be saved until one is in, and to put the card back and reconnect.

#### Scenario: A saber connected without its card
- **WHEN** a saber is connected whose card is not in it
- **THEN** the Presets page shows its presets read-only with the no-card note, and nothing is sent when the owner clicks a preset or a field
- *Needs a real board (V2.2).*

#### Scenario: The card put back
- **WHEN** the owner puts the card back and reconnects
- **THEN** the Presets page is live again
- *Needs a real board (V2.2).*

### Requirement: While the card is shared, presets are not edited
ProffieOS saves preset changes, and the preset in use, on its card. While a connected saber's card is shared with the computer, the Presets page SHALL NOT send it preset changes or preset selections. It SHALL show the presets read-only, saying that the card is shared with this computer and must be given back on Fonts & SD first, with a way to go there. A preset change asked for by any other page meanwhile SHALL be refused with the same reason, and SHALL NOT be sent. Once the card is given back, the page SHALL be live again without reconnecting.

#### Scenario: Presets while the card is shared
- **WHEN** the owner shares the saber's card and opens Presets
- **THEN** the presets are read-only with the shared-card note, and nothing is sent when the owner clicks a preset or a field
- *Needs a real board (V2.2).*

#### Scenario: The card given back
- **WHEN** the owner gives the card back and returns to Presets
- **THEN** the page is live again, without reconnecting
- *Needs a real board (V2.2).*

#### Scenario: A preset change from elsewhere
- **WHEN** a preset change is asked for while the card is shared
- **THEN** it is not sent, and the save status says the card is shared and must be given back first
