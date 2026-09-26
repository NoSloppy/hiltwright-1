# Spec Delta

## MODIFIED Requirements

### Requirement: The owner's styles are kept on this computer
Pasted and built styles SHALL be kept on this computer, shared by every saber, and written safely, the same way as the saber library (see `saber-library`):
- Changes made at the same moment SHALL all be kept.
- The previous version SHALL be kept as a backup copy.
- A file that cannot be read SHALL be set aside unchanged, never overwritten, and the Armory SHALL say which file it was kept as.

Each style SHALL be checked for a sound shape before it is stored, and again when the store is read. Styles that fail the check SHALL be left out, and the original file SHALL be kept aside.

The owner SHALL be able to remove one of their styles from the library, after confirming. The confirmation SHALL name any saber that has the style queued or installed, and say that those sabers keep their own copy for their next build.

#### Scenario: A style for every saber
- **WHEN** the owner pastes a style while working on one saber and then switches to another
- **THEN** the style is in the gallery for both

#### Scenario: A damaged style store
- **WHEN** the file holding the owner's styles cannot be read, and the owner then pastes a new style
- **THEN** the damaged file is still in the app's data folder under the name the Armory gave, and the new style is saved

#### Scenario: Removing a style a saber uses
- **WHEN** the owner removes a built style that the working saber has queued for a preset
- **THEN** they are asked to confirm, told that the saber has it queued and keeps its copy, and choosing not to remove leaves the style in the gallery

### Requirement: A library style can be pasted in with its credits
The owner SHALL be able to paste a style's code, give it a name and an author, and save it. Comment blocks at the top SHALL be kept as the style's header, which travels with it into any build. The code SHALL be checked before saving: it must be a style expression, with no preprocessor lines, balanced angle brackets and a closing `()`. Each problem SHALL be explained in plain words, and saving SHALL be refused until the code is valid. Before saving, the dialog SHALL list the colours and options the owner can change live, and say whether a header was found. If saving fails, the dialog SHALL stay open and say why.

#### Scenario: Pasting a library style
- **WHEN** the owner pastes a library style with its copyright header and saves it
- **THEN** it appears in the gallery under its name and author, and the header is kept

#### Scenario: Pasting something that is not a style
- **WHEN** the owner pastes a line with a `#define`
- **THEN** the dialog explains that preprocessor lines are not a style expression, and Save stays disabled

### Requirement: A style shows who made it
The detail SHALL credit a style's maker: Hiltwright for its own styles, the author for pasted styles, the builder for built ones, with the maker's logo. The owner SHALL be able to edit the name on styles they pasted or built. If saving the name fails, the form SHALL stay open and say why. A pasted style's header SHALL be viewable.

#### Scenario: Correcting an author
- **WHEN** the owner changes a pasted style's author
- **THEN** the gallery, the detail and the creator filter all show the new author

### Requirement: A style's state on the working saber is shown
For the working saber, plugged in or not, each style SHALL show one of three states:
- "On the saber": it is in the installed firmware
- "Queued": it is chosen for a preset but not yet built
- "Needs a build": neither

A style whose code has changed since the firmware was built SHALL NOT count as on the saber: it shows as "Queued" when a preset uses it, and otherwise as "Needs a build". Firmware installed before the app kept style fingerprints SHALL count as having the version it names.

#### Scenario: After choosing a new style
- **WHEN** the owner adds a style that the working saber's firmware lacks to one of its presets
- **THEN** the style shows as "Queued"

#### Scenario: A style edited after the install
- **WHEN** the saber's firmware has a built style in preset 1, and the owner edits and saves that style
- **THEN** the style shows as "Queued" rather than "On the saber", and Build & Install counts it as a new style to build
- *Needs a real board (V2.2).*

### Requirement: A style can be put on the working saber from Styles
The owner SHALL be able to choose a preset and a blade of the working saber, defaulting to the current preset and a blade the style suits, with unsuitable blades marked. With no saber known, the page SHALL point to the Armory.
- **Plugged in, and the installed firmware has this version of the style:** the style SHALL be written to that preset and blade at once with the tried colours, and the page SHALL say whether the saber confirmed it.
- **Otherwise:** the style SHALL be put into the saber's plan for the next build, with the tried colours kept beside it (see `preset-editing` for how those colours reach the saber).

#### Scenario: A style already on the saber
- **WHEN** the saber is plugged in, the style is in its firmware, and the owner uses it in preset 2 with a tried colour
- **THEN** preset 2 uses the style with that colour, and the page reports the saber's confirmation
- *Needs a real board (either).*

#### Scenario: A style the saber lacks
- **WHEN** the owner adds a style that the saber's firmware lacks to preset 2
- **THEN** it is queued for the next build with the tried colours, and the page offers to go to Build & Install

#### Scenario: A style edited since the install
- **WHEN** the saber is plugged in and the owner has edited a style that its firmware holds an older version of
- **THEN** the style is not written to the saber at once, but queued for the next build
