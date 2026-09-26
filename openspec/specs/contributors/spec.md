# contributors Specification

## Purpose
Credits the people whose fonts, styles and hilts are in the app, with one shared list of their logos and links used everywhere, and a page that shows what of each person's work is here.

## Requirements

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

### Requirement: Credits look the same everywhere
Adding or changing a logo or link SHALL show on every page at once. Where there is no logo, the person's initials SHALL stand in. Hiltwright SHALL wear its own icon unless the owner sets a logo. The owner's own work SHALL show as "You", with no logo or link controls.

#### Scenario: A new logo
- **WHEN** the owner adds a logo for a font maker on the Font library
- **THEN** the same logo appears on that maker's styles and on the Contributors page without reloading

### Requirement: Logos the font library kept are brought over
Logos the font library used to keep for its makers SHALL be brought into the shared list when the app starts, for people not already in it.

#### Scenario: Upgrading from the old library
- **WHEN** the app starts with a font library that still has a maker's logo in its old place
- **THEN** that maker's logo appears in the shared list

### Requirement: The Contributors page gathers everyone credited
The Contributors page SHALL list everyone credited anywhere in the app: font makers in the library, style authors, creators of pack hilts and of hilts the owner credited, and people with only a stored logo or link. They SHALL be sorted by how much of their work is here. Each SHALL show their logo, a count of fonts, styles and hilts, and their link, and SHALL be findable by name. A person's detail SHALL list their fonts by bundle, their styles and their hilts, and SHALL open Styles filtered to them, the Font library or the demo room. Someone with nothing in the app SHALL keep their logo and link.

#### Scenario: A maker with fonts and styles
- **WHEN** a person has two fonts in the library and one pasted style
- **THEN** the page shows "2 fonts · 1 style" for them, and "Show their styles" opens Styles filtered to them

### Requirement: A loaded hilt can be credited
The owner SHALL be able to credit a hilt model they loaded into the demo room to its creator, and edit that credit later. The creator's logo SHALL show beside the hilt, and the hilt SHALL count toward that person on the Contributors page.

#### Scenario: Crediting a hilt
- **WHEN** the owner credits a loaded hilt to "Shadowfoil Props"
- **THEN** the demo room shows Shadowfoil Props' logo beside it, and the Contributors page counts one hilt for them

### Requirement: A renamed author keeps their credit
When the owner changes the author of one of their styles, and the old name has a logo or a link while the new name has neither, Styles SHALL offer to give the new name the same logo and link. Accepting SHALL copy them, and the old name SHALL keep its own, because other fonts or styles may still credit it. Declining SHALL change nothing.

#### Scenario: Correcting a misspelt author
- **WHEN** a pasted style's author "Fet263" has a logo and link, and the owner corrects it to "Fett263", which has neither, and accepts the offer
- **THEN** the style shows the same logo and link under "Fett263", and "Fet263" still has its own
