# font-library Specification

## Purpose
Keeps the sound fonts the owner has bought or downloaded in one place on the computer, as plain ProffieOS font folders. Fonts come in from downloaded packages. The library shows what each font supports, lets the owner name and group them and hear them, and supplies them to the rest of the app.

## Requirements

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
Font folders SHALL be found in the chosen folder or package down to four levels. When a package holds variants for several boards, only the Proffie variant SHALL be kept. Variants SHALL be recognised only by folders inside the package whose whole name is a board's name (such as "Proffie", "ProffieOS" or "CFX"), whether that folder holds the font or is the font's own folder. A font whose name merely contains a board's name SHALL never be taken for a variant. Fonts left out SHALL be listed as not added, with the reason. Generic folder names (such as "Proffie", "Sound Font" or a version number) SHALL give way to the font's real name, or else the package's name. Folder names SHALL be made safe for an SD card. A new font SHALL never overwrite an existing one: it gets a numbered name instead. When a package or chosen folder brings a single font with a tracks folder beside it, those tracks SHALL go into the font's tracks folder. Tracks SHALL only ever be taken from inside what the owner chose.

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

### Requirement: A new font starts with a name, a source and, when it came with others, a bundle
Each added font SHALL start with a display name from its folder, empty maker and notes, the time it was added, and where it came from (package or folder name). When one import brings several fonts, each SHALL also get that import's name as its bundle.

#### Scenario: A multi-font package
- **WHEN** the owner adds a package containing three fonts
- **THEN** all three are in one bundle named after the package

### Requirement: The library shows what each font supports
For each font, the library SHALL read its sounds and show:
- whether it is polyphonic, monophonic or mixed
- whether it has SmoothSwing
- which special effects it has beyond the basics (for example lockup, drag, melt, lightning block, blaster, force, stab, pre-on and post-off, colour change, blade transitions)
- its tracks with their lengths, and how a preset names each track

Both flat and one-folder-per-effect layouts SHALL be understood. Each font SHALL show as ready, or with its issues (mixed naming or a missing hum as problems; sample rate, channels, bit depth or format as warnings).

#### Scenario: A font with effect folders
- **WHEN** a font keeps its clashes as `clsh/clsh1.wav`, `clsh/clsh2.wav`
- **THEN** the library counts them as clash sounds, not as special effects

#### Scenario: A stereo font
- **WHEN** a font's sounds are stereo
- **THEN** the font shows an issue explaining that ProffieOS expects mono

### Requirement: Fonts can be found quickly
The owner SHALL be able to search fonts by name, maker, bundle, folder or notes, and filter them to polyphonic fonts, SmoothSwing fonts or fonts with tracks. When nothing matches, the page SHALL say so. An empty library SHALL explain how to add fonts.

#### Scenario: Searching by maker
- **WHEN** the owner types a maker's name in the search box
- **THEN** only that maker's fonts are listed

### Requirement: The owner can describe each font
The owner SHALL be able to edit a font's display name, maker, bundle and notes, with suggestions for makers and bundles already in use. A blank name SHALL fall back to the folder name. The page SHALL say that the saber knows the font by its folder name, which does not change when the display name does.

#### Scenario: Renaming for display only
- **WHEN** the owner renames a font from "Grey_Jedi_v2" to "Grey Jedi"
- **THEN** the library shows "Grey Jedi", and presets still refer to the unchanged folder name

### Requirement: Fonts can be grouped by maker or bundle
The owner SHALL be able to list fonts all together, by maker or by bundle, and the choice SHALL be remembered. Makers SHALL match regardless of letter case. Each group SHALL fold and show its font count and total size. A bundle SHALL be able to give all its fonts one maker at once. Makers' logos SHALL come from the shared contributors list (see `contributors`), with initials when there is none.

#### Scenario: Giving a bundle one maker
- **WHEN** the owner sets the maker for all fonts in a bundle
- **THEN** every font in that bundle shows that maker, and grouping by maker puts them together

### Requirement: Fonts can be heard in the library
The owner SHALL be able to play any sound or track of a font, one sound at a time. Playing an effect SHALL pick one of its sounds at random, and each file SHALL be playable on its own. Starting a sound SHALL stop the one playing, and leaving the page SHALL stop playback. Only sounds inside the chosen font SHALL be readable.

#### Scenario: Hearing a clash
- **WHEN** the owner presses Play on a font's clash row twice
- **THEN** a clash sound plays each time, possibly a different one, and never two sounds at once
- *Needs a person listening.*

### Requirement: Removing a font is recoverable
Removing a font SHALL take a confirming second click, SHALL move the font's folder to the recycle bin rather than delete it, and SHALL forget its details.

#### Scenario: Removing by mistake
- **WHEN** the owner removes a font and confirms
- **THEN** the font's folder is in the recycle bin and can be restored from there

### Requirement: An old font folder is offered once for import
When the owner had pointed an earlier version of Hiltwright at a font folder that still exists, the library SHALL offer once to add its fonts, copying them and leaving the old folder alone, or not to ask again.

#### Scenario: Declining the offer
- **WHEN** the owner chooses not to be asked again
- **THEN** the offer does not return
