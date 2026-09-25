# Spec Delta

## Purpose

A pack format that lets creators' hilts and fonts ship with Hiltwright, credited to them and limited to what they allow. The contents cannot be lifted by simply opening the file.

## ADDED Requirements

### Requirement: A pack shows its credits and permissions openly
A pack SHALL carry a readable header listing its identity, kind (hilt or font), name, creator, licence, what the app may do with it (play a font in the demo, copy a font to a card), a hilt's fit, and its items. None of this SHALL need the contents to be unlocked.

#### Scenario: Reading a pack's credit
- **WHEN** the app lists a pack
- **THEN** it shows the pack's name, creator and licence without unlocking its contents

### Requirement: A pack's contents are not readable by opening the file
A pack's contents (sounds, meshes) SHALL be compressed and encrypted per pack, so the original files cannot be read by opening the pack. A tampered item SHALL be refused. A file that is not a pack, or is from a newer version of the format, SHALL be refused with a message. The format SHALL describe itself as protection against casual copying only.

#### Scenario: Opening a pack in another program
- **WHEN** a hilt pack is opened in a text or hex editor
- **THEN** none of the original mesh or sound data appears in it

#### Scenario: A tampered pack
- **WHEN** a byte of a pack's encrypted content has been changed
- **THEN** the app refuses that item

### Requirement: Unlocked contents never touch the disk
The app SHALL unlock a pack's contents in memory only, and SHALL never write them to a file.

#### Scenario: Playing a pack font
- **WHEN** the owner plays a pack font in the demo room
- **THEN** no copy of its sounds is written anywhere on the computer

### Requirement: A hilt pack holds a display model, not the CAD file
A hilt pack SHALL contain a display mesh with one material per surface finish, each with its colour and whether it is metal or paint, and not the creator's original CAD export. Finishes MAY be named by the packer (chrome, polished, brushed, satin, anodised, brass, paint, plastic), and otherwise SHALL be guessed from the material's name and colour. Its header SHALL carry the fit the packer set (length, turn, blade seat and so on).

#### Scenario: A multi-body hilt
- **WHEN** a hilt exported as several bodies sharing two materials is packed
- **THEN** the pack holds one mesh with two material groups

### Requirement: Packs are found where they are installed
The app SHALL look for packs in the owner's own packs folder first, then among the packs shipped with the app. The first pack found with a given identity SHALL win, and a broken pack SHALL be left out. The PunkSaber hilt SHALL ship inside the app as the built-in hilt.

#### Scenario: The built-in hilt
- **WHEN** a fresh install opens the demo room
- **THEN** the PunkSaber hilt is shown, credited as the built-in hilt

### Requirement: Pack fonts play only where the creator allows
A pack font SHALL be offered for demo playback only when its pack allows it. A pack that does not SHALL be refused with a message saying the creator has not allowed it.

#### Scenario: A font that allows playback
- **WHEN** a font pack allows demo playback
- **THEN** it is listed as a sound source in the demo room and plays when picked

### Requirement: Packs are made with a packing tool
A command-line tool SHALL make hilt packs from an OBJ with its materials, requiring a creator and a licence and accepting a fit and finishes. It SHALL make font packs from a font folder, optionally allowing copying to a card. It SHALL show a pack's header, and SHALL rewrite a pack's creator or licence without touching its encrypted contents.

#### Scenario: Correcting a credit
- **WHEN** the packer sets a new creator on an existing hilt pack
- **THEN** the app shows the new creator, and the hilt's mesh is unchanged
