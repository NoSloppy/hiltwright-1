# preset-editing (delta)

## MODIFIED Requirements

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

## ADDED Requirements

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
