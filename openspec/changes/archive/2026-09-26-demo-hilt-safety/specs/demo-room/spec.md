# demo-room (delta)

## MODIFIED Requirements

### Requirement: The blade's size and strip match the saber
The Scene panel SHALL set the blade's length (20 to 40 inches) and tube diameter (1 inch or 7/8 inch), and the strip's LED density (60, 100, 120 or 144 per metre). The number of LEDs simulated SHALL follow length times density, so a pattern keeps its physical size. The owner SHALL choose whether the unlit tube is shown when off or the blade grows out of the emitter. The Scene panel SHALL also adjust glow, blade brightness, how strongly the blade lights the room, the room's lamps, haze and the floor grid, with a reset. Scene settings SHALL be remembered. Each remembered setting SHALL be checked when read: a value that is missing, of the wrong kind or outside the panel's range SHALL fall back to its default, and the others SHALL be kept.

#### Scenario: A shorter blade
- **WHEN** the owner sets the blade to 24 inches at 144 LEDs per metre
- **THEN** the blade is shorter, simulates about 88 LEDs, and a pattern's bands keep their size

#### Scenario: A stored setting out of range
- **WHEN** the remembered scene settings say the blade is 500 inches long and the glow is 2
- **THEN** the room opens with a 36-inch blade and a glow of 2

### Requirement: The owner's own hilt models can be loaded and fitted
The owner SHALL be able to load a hilt model as `.glb`, `.obj` with its `.mtl` and textures, or `.stl`. The app SHALL fit it automatically:
- the longest dimension becomes the blade axis
- the units are guessed from a hilt's plausible length
- the blade comes out of the emitter end
- the file's own origin is the axis when it runs through the model

The owner SHALL be able to adjust length, turn, sideways shift, blade seat, staff seat, lean, the axis choice and which end the blade comes out of. The fit SHALL be kept with the hilt, and for a pack hilt it SHALL be resettable to the pack's fit. A pack hilt's adjusted fit SHALL be kept apart from the owner's own hilts, so neither can overwrite the other whatever their names. Loaded hilts SHALL be kept between sessions. A remembered fit SHALL be checked when read, and a value outside its control's range SHALL fall back to its default.

#### Scenario: A CAD-exported OBJ
- **WHEN** the owner loads an OBJ in millimetres, drawn around its bore, with its `.mtl`
- **THEN** the hilt appears the right size, coloured from its materials, and turning it keeps its bore on the blade

#### Scenario: Adjusting the seat
- **WHEN** the owner sets the blade seat deeper
- **THEN** the blade starts further into the hilt, and the setting is there next time

#### Scenario: A file named like a pack hilt
- **WHEN** the owner has adjusted the fit of the pack hilt "YS" and then loads their own `YS.obj`
- **THEN** both hilts are listed, the pack hilt keeps its adjusted fit, and resetting the pack hilt's fit leaves the owner's own YS in place

## ADDED Requirements

### Requirement: A hilt is never replaced without asking
When the owner loads a file with the same name as one of their stored hilts, ignoring letter case, the app SHALL ask before storing it. It SHALL offer three choices:
- **Replace:** the new model takes the stored hilt's place and keeps its fit and credit.
- **Keep both:** the new model is added under the next free numbered name, such as "YS 2", with a fresh fit.
- **Cancel:** nothing changes.

#### Scenario: Keeping both
- **WHEN** the owner has a fitted hilt "YS", loads another `YS.obj` and chooses Keep both
- **THEN** "YS" keeps its model and fit, and "YS 2" is added with a fresh fit and chosen

#### Scenario: Replacing with a revised model
- **WHEN** the owner has a fitted and credited hilt "YS", loads another `YS.obj` and chooses Replace
- **THEN** "YS" shows the new model with the same fit and credit

### Requirement: Removing a hilt or resetting a fit asks first
Removing one of the owner's hilts SHALL ask first, naming the hilt and saying the original file is not touched. Resetting a pack hilt's fit SHALL ask first, saying the adjustments will be lost. Declining SHALL change nothing.

#### Scenario: Changing their mind
- **WHEN** the owner presses Remove on the hilt "YS" and then chooses Keep
- **THEN** "YS" is still listed, with its fit, and is still there next time

### Requirement: A hilt that cannot be saved says so
When a loaded hilt, its fit or its credit cannot be saved, for example because the disk is full, the Hilt panel SHALL say so in plain words. A hilt whose model could not be saved SHALL NOT be listed as loaded.

#### Scenario: A full disk
- **WHEN** the owner loads a hilt and it cannot be saved
- **THEN** the Hilt panel says the hilt could not be kept and why, and the hilt is not listed as loaded

### Requirement: Hilts are kept with the app's data and can be exported
Loaded hilts, pack fit adjustments, the chosen hilt and the scene settings SHALL be kept in Hiltwright's data on this computer, so every build of the app on it sees the same ones. On first opening the room, any hilts, fit adjustments and scene settings kept by an earlier version SHALL be brought over. None SHALL be replaced: a different model under a name already taken is added under the next free numbered name, and the earlier copy SHALL be left where it was. If the stored hilts cannot be read, the app SHALL set the file aside, start empty and say so on the Armory, as for its other stores. The owner SHALL be able to export every hilt they loaded, with its fit and credit, and every pack fit adjustment, to one `.zip` file, and to import such a file. An import SHALL add what is not already here and SHALL never replace a hilt already here.

#### Scenario: From development to the installed app
- **WHEN** the owner loaded a hilt while running a development build and then opens the installed app on the same computer
- **THEN** the installed app lists that hilt with its fit

#### Scenario: Moving to a new computer
- **WHEN** the owner exports their hilts, and imports the file into Hiltwright on another computer
- **THEN** that computer lists the same hilts with the same fits and credits

#### Scenario: Importing twice
- **WHEN** the owner imports the same export file a second time
- **THEN** no hilt is duplicated and none is changed
