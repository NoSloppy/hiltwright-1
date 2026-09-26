# Spec Delta

## MODIFIED Requirements

### Requirement: One shared list of people, matched by name
The app SHALL keep one list of contributors on this computer, each with an optional logo and an optional link, kept across restarts. Names SHALL match regardless of letter case. A person with neither a logo nor a link SHALL drop off the stored list.

The list SHALL be kept like the saber library (see `saber-library`):
- Changes made at the same moment SHALL all be kept.
- The previous version SHALL be kept as a backup copy.
- A file that cannot be read SHALL be set aside unchanged, never overwritten, and the Armory SHALL say which file it was kept as.

Changes, and opening a link, SHALL wait until the logos the font library used to keep have been brought over at start-up.

#### Scenario: Same maker, different case
- **WHEN** a font's maker is "kyberphonic" and the list has a logo for "Kyberphonic"
- **THEN** the font shows Kyberphonic's logo

#### Scenario: A damaged contributors file
- **WHEN** the contributors file cannot be read, and the owner then gives a style author a link
- **THEN** the damaged file is still in the app's data folder under the name the Armory gave, and the new link is saved

#### Scenario: Two changes at once
- **WHEN** the owner sets one person's link and another person's logo at the same moment
- **THEN** both are kept

### Requirement: Logos are pictures the owner chooses
A logo SHALL be chosen through a file dialog, SHALL be a PNG, JPEG, WebP, GIF or SVG of at most 2 MB, and SHALL be copied into the app's data, leaving the original in place. Other types and larger files SHALL be refused with a plain message. A logo SHALL be changeable and removable. When a logo is changed or removed, the old picture SHALL be deleted only after the list has been saved, so the list never names a picture that is gone.

#### Scenario: A file that is not a picture
- **WHEN** the owner chooses an `.exe` as a logo
- **THEN** it is refused with a message naming the accepted picture types

#### Scenario: A logo change that cannot be saved
- **WHEN** the owner chooses a new logo for a maker and the list cannot be saved
- **THEN** the maker still shows the old logo

### Requirement: Links are web addresses and open only as stored
A contributor's link SHALL be a web address: a bare domain gets `https://`, and other kinds of address such as `javascript:` or `file:` SHALL be refused. A stored link that is not a web address (for example, from a hand-edited file) SHALL be dropped when the list is read. Opening a contributor's link SHALL check again that it is a web address, and SHALL open exactly the stored address in the system browser.

#### Scenario: A bare domain
- **WHEN** the owner enters "kyberphonic.com" as a link
- **THEN** it is stored and opened as "https://kyberphonic.com"

#### Scenario: A hand-edited link
- **WHEN** the contributors file has been edited by hand to give someone the link `file:///C:/Windows/System32/calc.exe`
- **THEN** the link is not shown and nothing is opened, and the original file is kept aside

## ADDED Requirements

### Requirement: A renamed author keeps their credit
When the owner changes the author of one of their styles, and the old name has a logo or a link while the new name has neither, Styles SHALL offer to give the new name the same logo and link. Accepting SHALL copy them, and the old name SHALL keep its own, because other fonts or styles may still credit it. Declining SHALL change nothing.

#### Scenario: Correcting a misspelt author
- **WHEN** a pasted style's author "Fet263" has a logo and link, and the owner corrects it to "Fett263", which has neither, and accepts the offer
- **THEN** the style shows the same logo and link under "Fett263", and "Fet263" still has its own
