# sd-card (delta)

## MODIFIED Requirements

### Requirement: The saber's card is found in a card reader
When the page opens, and when the owner asks it to look again, the app SHALL look for a ProffieOS card among the computer's removable drives. A drive counts as a ProffieOS card when it holds a `presets.ini` (or `presets.tmp`) at its root, or at least one font folder. The page SHALL show the card's drive, label, free and total space, how many fonts and tracks it holds, and whether it has a presets file. When no card is found, the page SHALL say how many removable drives it saw and explain how to put the card in a reader or share it from the saber.

**Which card:** the page SHALL show, and copy to, one card at a time, chosen as follows:
- **The connected saber's own card, when it is sharing it:** recognised by the drive belonging to that saber's USB connection, or by being the drive that appeared when the app asked it to share. That card SHALL be marked as the saber's own.
- **Otherwise the one ProffieOS card present.**
- **With several ProffieOS cards and none of them the connected saber's:** the page SHALL say so and let the owner choose. It SHALL NOT pick one silently.

The owner SHALL be able to switch to another card that is present. A choice SHALL hold until the owner changes it or that card is gone.

#### Scenario: A card in a reader
- **WHEN** the owner puts the saber's card in a card reader and opens Fonts & SD
- **THEN** the page names the drive and shows its space, font and track counts, and whether `presets.ini` is present
- *Needs a real card in a reader.*

#### Scenario: A removable drive that is not a saber card
- **WHEN** the only removable drive has no presets file and no font folders
- **THEN** the page says it saw one removable drive with no fonts on it

#### Scenario: A shared card and a card in a reader
- **WHEN** a connected saber is sharing its card and another ProffieOS card is in a reader
- **THEN** the page shows the saber's own card, marked as its own, and the owner can switch to the reader's card
- *Needs a real board (V2.2) and a card in a reader.*

#### Scenario: Two cards in readers
- **WHEN** two ProffieOS cards are in readers and no saber is sharing its card
- **THEN** the page says there are two cards and asks the owner which one to show, and nothing is copied until one is chosen

### Requirement: A font folder can be copied onto the card
The owner SHALL be able to choose a font folder on the computer. They SHALL see its checks before copying, and copy the whole folder onto the card under its own name, reading the original only. A copy SHALL be refused when a font of that name is already on the card, unless the owner explicitly chooses to replace it. It SHALL also be refused when the folder name is not valid on an SD card, or contains `;` or `,`, which ProffieOS reads as separators between font folders. The page SHALL say how many sounds were copied.

**Replacing** SHALL ask the owner to confirm, naming the font. Once confirmed, the font on the card SHALL end up with exactly the new folder's files, none of the old ones mixed in.

#### Scenario: Copying a new font
- **WHEN** the owner chooses a font folder and copies it to a card that does not have it
- **THEN** the font appears on the card under the same folder name, and the original folder is unchanged
- *Needs a real card.*

#### Scenario: The font is already on the card
- **WHEN** the owner copies a font whose folder name is already on the card
- **THEN** nothing is copied, and the page says the font is already there and offers to replace it

#### Scenario: Replacing a font
- **WHEN** the card's `Kylo` has monophonic sounds, and the owner replaces it with a polyphonic `Kylo` and confirms
- **THEN** the card's `Kylo` holds only the new files, and the page shows no mixed-font issue for it

#### Scenario: Replace needs a confirmation
- **WHEN** the owner clicks Replace once
- **THEN** nothing is copied until they confirm, and choosing another font cancels the confirmation

#### Scenario: A name ProffieOS cannot use
- **WHEN** the owner chooses a folder named `Kylo;old`
- **THEN** nothing is copied, and the page says the name cannot contain `;` or `,` and should be renamed first

### Requirement: A saber can share its own card over USB
With a saber connected, the owner SHALL be able to ask it to hand its card to the computer, after being warned that the blade goes off and sound stops. The app SHALL then wait a bounded time for the card to appear as a new drive, and use it like a card in a reader. While the card is shared, the page SHALL say that the saber cannot play until the card is given back, and that copying this way is slow. Firmware that cannot share its card SHALL be named as such, with the way forward (Hiltwright firmware, or a card reader). If the drive does not appear in time, the app SHALL say so and ask the saber to take the card back.

The app SHALL know the card is shared on every page, not only on Fonts & SD. On connecting, it SHALL ask the saber whether its card is shared. A card shared from the saber's own menu, or left shared by an earlier session, SHALL then be shown as shared, with the offer to give it back.

#### Scenario: Sharing the card
- **WHEN** the owner shares the card of a saber running Hiltwright firmware
- **THEN** the card appears as a drive within the wait, and its fonts are listed
- *Needs a real board (either).*

#### Scenario: Vendor firmware
- **WHEN** the connected saber's firmware does not understand the share command
- **THEN** the page says this firmware cannot share its card over USB, and suggests Hiltwright firmware or a card reader

#### Scenario: Already shared when connecting
- **WHEN** a saber whose card is already shared connects
- **THEN** every page treats the card as shared, and Fonts & SD offers to give it back
- *Needs a real board (V2.2).*

### Requirement: A shared card is given back safely
Giving the card back SHALL first have Windows eject the drive, then return the card to the saber. If Windows will not let go of the drive because something has files open on it, the card SHALL stay shared, and the owner SHALL be told to close what holds it and try again.

The card SHALL count as given back only when the saber says its card access is off. Any other answer SHALL leave the card shown as shared, with a note saying the saber did not confirm.

When the connection to a saber sharing its card is lost, the app SHALL eject the drive if it is still mounted. It SHALL tell the owner that the saber may still be holding its card, and that reconnecting lets them give it back.

#### Scenario: A file is open on the card
- **WHEN** the owner gives the card back while a window has a file on it open
- **THEN** the card stays shared, and the page says to close what has files open on it and try again
- *Needs a real board (either).*

#### Scenario: The saber does not confirm
- **WHEN** the owner gives the card back and the saber does not answer that its card access is off
- **THEN** the card is still shown as shared, and the page says the saber did not confirm

#### Scenario: The connection is lost while shared
- **WHEN** the connection to a saber sharing its card is lost and its drive is still mounted
- **THEN** the drive is ejected, and the page says the saber may still hold its card until it is reconnected and the card given back

### Requirement: Fonts & SD never deletes from the card
The page SHALL NOT delete anything on the card, with two exceptions:
- replacing a font, once the owner confirms, removes that font's old files
- the app's own unfinished copies are cleared

Otherwise the only change it makes is adding fonts.

#### Scenario: Browsing and checking only
- **WHEN** the owner opens Fonts & SD, looks at fonts and their issues, and leaves
- **THEN** nothing on the card has changed

#### Scenario: A replace touches one font
- **WHEN** the owner replaces `Kylo` on a card that also holds `Vader`
- **THEN** `Vader` and every other folder on the card are unchanged

## ADDED Requirements

### Requirement: Copies onto the card are all or nothing
Every copy onto the card, from a folder or from the font library, SHALL:
- **Check the space first.** It SHALL check the card's free space before copying. A font that does not fit SHALL be refused, with the size it needs and the space free.
- **Show progress.** The page SHALL show progress while it copies, as files copied of the total.
- **Land whole or not at all.** The font SHALL appear on the card under its name only once every file is there. A copy that fails, or is cut short by the card or the saber going away, SHALL leave no folder under the font's name. Its leftovers SHALL never be listed as a font, and SHALL be cleared by the next copy to that card.
- **Keep the old font until the new one is complete.** When replacing, the old font SHALL stay on the card until the new copy is complete. A replace that fails SHALL leave the old font as it was.

#### Scenario: Not enough space
- **WHEN** the owner copies a 300 MB font to a card with 120 MB free
- **THEN** nothing is copied, and the page says the font needs 300 MB and the card has 120 MB free

#### Scenario: A copy that fails part way
- **WHEN** a copy fails after some of its files are written
- **THEN** there is no font of that name on the card, and copying it again works

#### Scenario: A card pulled during a copy
- **WHEN** the card is pulled out of the reader during a copy, put back, and the font copied again
- **THEN** the second copy completes, and the card lists the font once, with all its files
- *Needs a real card in a reader.*

#### Scenario: A replace that fails
- **WHEN** a replace fails before the new copy is complete
- **THEN** the card still has the old font, unchanged

#### Scenario: Progress during a copy
- **WHEN** a font with many files is being copied
- **THEN** the page shows how many files of the total have been copied

### Requirement: Nothing uses the saber's card while it is shared
While a connected saber's card is shared with the computer, the app SHALL NOT ask the saber to do anything that uses its card:
- **Diagnostics:** the settings and the effect buttons SHALL be off.
- **Build & Install:** install and restore SHALL be off, and the voice pack check over the saber SHALL NOT run.
- **Presets:** covered in preset-editing.

Each page SHALL say that the card is shared, and that it must be given back on Fonts & SD first. The console SHALL still send what the owner types.

#### Scenario: A setting while shared
- **WHEN** the saber's card is shared and the owner opens Diagnostics
- **THEN** the sliders and effect buttons are off, and the page says to give the card back first
- *Needs a real board (V2.2).*

#### Scenario: An install while shared
- **WHEN** the saber's card is shared and the owner opens Build & Install
- **THEN** Install and Restore are off, the page says to give the card back first, and no voice pack check is sent to the saber
- *Needs a real board (V2.2).*
