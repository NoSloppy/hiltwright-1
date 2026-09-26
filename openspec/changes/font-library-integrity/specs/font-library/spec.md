# Spec Delta

## MODIFIED Requirements

### Requirement: The library is a folder of plain font folders
The font library SHALL be a folder on the computer holding one ordinary ProffieOS font folder per font. By default it SHALL be in the app's data folder, created when missing.

What the owner writes about fonts (names, makers, bundles, notes) SHALL be kept in one file in the library folder and never inside a font folder, so a font copied to a card carries nothing extra. That file SHALL be kept like the saber library (see `saber-library`):
- Changes made at the same moment SHALL all be kept.
- The previous version SHALL be kept as a backup copy.
- A file that cannot be read SHALL be set aside unchanged, never overwritten. The app SHALL start from the backup copy, or from the entries it could read, and SHALL tell the owner on the Font library page and the Armory which file it was kept as.

Font folders the owner puts into the library by hand SHALL appear in it. The page SHALL show the library's folder, font count and total size, and offer to open the folder.

When a library folder the owner chose is missing (for example its drive is not connected), the app SHALL NOT create an empty one in its place. The Font library page SHALL say the folder cannot be found and offer to look for it again, choose where it is now, or use the default folder.

#### Scenario: A font copied in by hand
- **WHEN** the owner copies a font folder into the library folder with Explorer and opens the Font library
- **THEN** the font is listed with a name taken from its folder

#### Scenario: A font folder stays clean
- **WHEN** the owner names a font and gives it a maker
- **THEN** nothing is added inside the font's own folder

#### Scenario: An unreadable details file
- **WHEN** the file holding the fonts' names and makers cannot be read, and the owner then renames a font
- **THEN** the damaged file is still in the library folder under the name the page gave, the app started from the backup copy if there was one, and the rename is saved

#### Scenario: The library's drive is not connected
- **WHEN** the library was moved to a USB drive that is not plugged in, and the owner opens the Font library
- **THEN** the page says the library folder cannot be found and offers to look again, choose its new place, or use the default folder, and no empty folder is created on another drive

### Requirement: The library can be moved
The owner SHALL be able to choose another folder for the library. When the library has fonts, they SHALL be asked whether to move the fonts and their details there or to use the new folder as it is.

A move SHALL be refused before anything moves when the new folder is the library folder itself, is inside it, or contains it.

Before a move, fonts whose folder name is already taken at the destination SHALL be listed. The owner SHALL choose to keep the fonts already there and move the rest, or to cancel. Kept-back fonts and their details SHALL stay untouched in the old folder. A move SHALL never overwrite or rename a font, and SHALL never overwrite a maker's logo already at the destination.

Each font's details SHALL move with it. If a move stops part-way, the owner SHALL be told which fonts moved, and the library SHALL stay where it was. The owner SHALL be able to go back to the default location. The chosen location SHALL be remembered, and kept the same safe way as the details file.

#### Scenario: Moving the library to another drive
- **WHEN** the owner changes the library folder to one on another drive and chooses to move the fonts
- **THEN** every font and its details are in the new folder, and the library shows the same fonts as before

#### Scenario: Moving the library into one of its own folders
- **WHEN** the owner chooses a folder inside the library folder as its new place
- **THEN** the move is refused with an explanation, and every font is still where it was and still listed

#### Scenario: A font of the same name at the destination
- **WHEN** the owner moves the library to a folder that already holds a font folder named "Kylo", and the library also has "Kylo"
- **THEN** before anything moves, the owner is told that "Kylo" is already there. If they keep the one already there, the other fonts move, the library's own "Kylo" stays untouched in the old folder, and nothing is renamed

### Requirement: Fonts are added from downloaded packages or folders
The owner SHALL be able to add fonts from one or more `.zip` packages as downloaded, or from a font folder or a folder of fonts. Adding SHALL copy the fonts into the library and leave the originals untouched. Every file of a font SHALL come in, including licences, readmes and other audio, except system files such as `__MACOSX`, hidden dot-files, `Thumbs.db` and `desktop.ini`. The page SHALL show progress while adding, and then which fonts were added and which were not, and why. A package with no sounds, or a folder with no font in it, SHALL be refused with an explanation.

#### Scenario: Adding a downloaded package
- **WHEN** the owner adds a font maker's `.zip` as downloaded
- **THEN** the font appears in the library, the `.zip` is untouched, and the page says the font was added and invites the owner to name it

#### Scenario: A package that is not a font
- **WHEN** the owner adds a `.zip` that contains no `.wav` sounds
- **THEN** it is refused with a message asking whether it is a sound font package

#### Scenario: A font with a licence and extra files
- **WHEN** the owner adds a font whose folder holds `License.rtf`, `Readme.docx` and `preview.mp3` beside its sounds
- **THEN** all three are in the font's folder in the library

### Requirement: Packages the app cannot read safely are refused
A `.zip` that is password protected, damaged, uses an unsupported compression or a format too large to read SHALL be refused with a message, suggesting unpacking it first where that helps. A package SHALL count as damaged when any file's contents do not match the checksum or size the package records for it. A `.zip` containing any file that would land outside its own folder SHALL be refused as a whole.

#### Scenario: A path-escaping entry
- **WHEN** a `.zip` contains an entry whose path climbs out of the package's folder
- **THEN** nothing from that package is added

#### Scenario: A corrupted package
- **WHEN** a `.zip` holds a sound whose contents do not match the checksum recorded for it
- **THEN** nothing from that package is added, and the owner is told the package is damaged and to download it again

### Requirement: Fonts inside a package are found and named sensibly
Font folders SHALL be found in the chosen folder or package down to four levels. When a package holds variants for several boards, only the Proffie variant SHALL be kept. Variants SHALL be recognised by the names of the folders above the fonts inside the package, never by a font's own folder name, and fonts left out SHALL be listed as not added, with the reason. Generic folder names (such as "Proffie", "Sound Font" or a version number) SHALL give way to the font's real name, or else the package's name. Folder names SHALL be made safe for an SD card. A new font SHALL never overwrite an existing one: it gets a numbered name instead. When a package or chosen folder brings a single font with a tracks folder beside it, those tracks SHALL go into the font's tracks folder. Tracks SHALL only ever be taken from inside what the owner chose.

#### Scenario: A package with several board variants
- **WHEN** a package holds a font in both a CFX folder and a Proffie folder
- **THEN** only the Proffie font is added, named after the font rather than "Proffie", and the CFX copy is listed as left out because it is for another board

#### Scenario: A font named after Proffie in a folder of fonts
- **WHEN** the owner adds a folder of three fonts, one of them named "ProffieOS Default"
- **THEN** all three fonts are added

#### Scenario: The same font added twice
- **WHEN** a font with the same folder name as one already in the library is added
- **THEN** the new one is added as "<name>-2", and the existing font is unchanged

#### Scenario: A tracks folder outside what was chosen
- **WHEN** the owner adds one font folder from Downloads, and Downloads also has an unrelated `tracks` folder beside it
- **THEN** those tracks are not added to the font
