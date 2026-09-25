# Spec Delta

## Purpose

Lets the owner wield a saber in a dark 3D room with the mouse, before and after it is built. The saber can carry any premade or created style, the font's own sounds and the saber's own prop, in their own hilt, so they see and hear what the saber will do.

## ADDED Requirements

### Requirement: The room opens with a lit saber
Workshop > Demo room SHALL open a dark room with a saber in it, igniting on its own shortly after opening. The Styles page SHALL be able to open the room with a style chosen, and the Font library with a font chosen. Without WebGL, the room SHALL say that it needs WebGL.

#### Scenario: Opening from a style
- **WHEN** the owner chooses "Demo room" on a style in Styles
- **THEN** the room opens with a saber carrying that style, and it ignites

### Requirement: The blade looks lit and lights the room
The blade SHALL show the simulated LEDs of its style (see `style-simulator`) along a glowing tube, with only the blade and its tip glowing. Lamps along the blade SHALL light the floor and the hilt in the blade's colours. An unlit blade SHALL read as an unlit tube.

#### Scenario: A red blade in a dark room
- **WHEN** a red blade is lit
- **THEN** the blade glows, the floor under it is lit red, and the hilt does not glow

### Requirement: The saber is wielded by holding the hilt
In the default "Hold the hilt" control, dragging SHALL move the hand holding the hilt from where it was grabbed, without a jump. The blade SHALL follow with weight: a raised hand points it up, and a lowered hand points it out and down. A quick move SHALL make the blade trail, whip through and settle. A sideways sweep SHALL carry the blade forward and level, not overhead.

#### Scenario: A sideways sweep
- **WHEN** the owner drags quickly from left to right in Hold the hilt
- **THEN** the blade sweeps through in front, close to level, then settles

### Requirement: The saber can be steered by tilt and swing
The "Tilt and swing" control SHALL keep the hand still. Dragging left and right SHALL swing the blade level with the floor, and dragging up and down SHALL change only its tilt, stopping short of vertical. The owner SHALL be able to choose between the two controls. The choice SHALL be remembered, and switching SHALL reset to that control's own pose and view.

#### Scenario: Switching control
- **WHEN** the owner switches from Hold the hilt to Tilt and swing
- **THEN** the saber and camera go to Tilt and swing's starting pose, and the choice is kept after reopening the room

### Requirement: What the sensors would read is shown and used
The room SHALL show what the saber's sensors would read (swing speed, tilt, turn and twist) and feed those same values to the style. Sliders SHALL let the owner aim the blade by number.

#### Scenario: Aiming by number
- **WHEN** the owner sets the tilt slider to 45 degrees
- **THEN** the blade points 45 degrees up, and the readout shows that tilt

### Requirement: The view can be moved
Scrolling SHALL twist the hilt. Ctrl+scroll or plus and minus SHALL zoom. A right-drag SHALL orbit and a middle-drag SHALL pan. R SHALL reset the pose and view.

#### Scenario: Resetting the view
- **WHEN** the owner has orbited and zoomed and presses R
- **THEN** the camera and saber return to the control's starting view and pose

### Requirement: Every effect the prop has can be done to the saber
The room SHALL offer, as buttons with their keys:
- Ignite and Retract, plus double-click
- clash (stronger with the swing behind it) and hard clash
- blast, and a blaster bolt where the owner clicks on the blade
- stab
- the held effects lockup, drag, melt and lightning block, which take only while the blade is lit
- special abilities, shown only when the chosen prop has them

A style that turns the saber off or on SHALL do so only where the chosen prop allows it (see `style-simulator`).

#### Scenario: A blaster bolt where clicked
- **WHEN** the owner clicks the lit blade near its tip
- **THEN** a blaster effect lands near the tip

#### Scenario: A prop without abilities
- **WHEN** the chosen prop is SA22C
- **THEN** no special ability buttons are shown

### Requirement: The saber carries the owner's styles, colours and prop
The Blade tab SHALL offer Hiltwright's styles and the owner's saved styles that can be simulated, with a swatch per colour setting to try colours in the room. It SHALL be able to load a preset of the working saber, taking that preset's style and font. The Saber tab SHALL offer the prop file, starting at the working saber's own, with a plain list of what that prop does. A Help tab SHALL list the controls. The panel SHALL remember its tab.

#### Scenario: Loading a preset
- **WHEN** the owner loads preset 3 of the working saber
- **THEN** the room's saber takes that preset's style and font

#### Scenario: Choosing another prop
- **WHEN** the owner changes the prop file to BC
- **THEN** the Saber tab lists what BC does, and the effects offered follow BC

### Requirement: Fonts come from the library, cards and packs
The Sound tab SHALL list fonts from the font library first, then fonts on any ProffieOS card found, then pack fonts that allow demo playback. It SHALL show progress while a font loads, say when reading a card over USB is slow, and play the font's own name sound when loaded. Volume SHALL be adjustable and remembered.

#### Scenario: Picking a library font
- **WHEN** the owner picks a font from the library in the Sound tab
- **THEN** the font loads with progress shown, and its name sound plays
- *Needs a person listening.*

### Requirement: The saber sounds like its font
With a font loaded, the room SHALL play:
- the hum while lit, fading in as the font says
- clash, blast and stab sounds
- begin, loop and end sounds for held effects
- SmoothSwing from the font's swing pairs, following swing speed
- the font's ignition sequence: pre-on, then ignition, and a fast ignition when the style or prop asks for one
- the retraction followed by post-off
- numbered transition sounds a style asks for, where the prop plays them

The Sound tab SHALL say whether the font has SmoothSwing.

#### Scenario: Swinging with a SmoothSwing font
- **WHEN** the owner swings the saber with a SmoothSwing font loaded
- **THEN** the swing sound rises and falls with the swing, over the hum
- *Needs a person listening.*

#### Scenario: A font with pre-on
- **WHEN** the owner ignites with a font that has a pre-on sound
- **THEN** the pre-on plays, the blade lights as it ends, and pressing ignite again during pre-on cancels it
- *Needs a person listening.*

### Requirement: The blade's size and strip match the saber
The Scene panel SHALL set the blade's length (20 to 40 inches) and tube diameter (1 inch or 7/8 inch), and the strip's LED density (60, 100, 120 or 144 per metre). The number of LEDs simulated SHALL follow length times density, so a pattern keeps its physical size. The owner SHALL choose whether the unlit tube is shown when off or the blade grows out of the emitter. The Scene panel SHALL also adjust glow, blade brightness, how strongly the blade lights the room, the room's lamps, haze and the floor grid, with a reset. Scene settings SHALL be remembered.

#### Scenario: A shorter blade
- **WHEN** the owner sets the blade to 24 inches at 144 LEDs per metre
- **THEN** the blade is shorter, simulates about 88 LEDs, and a pattern's bands keep their size

### Requirement: A staff has a second blade
The owner SHALL be able to add a second blade from the pommel for a staff. It SHALL have its own style and colours, light and go out with the main blade, receive every effect, and point the opposite way, with its own seat in the hilt.

#### Scenario: A staff with two styles
- **WHEN** the owner turns on the second blade and gives it a different style
- **THEN** both blades light together, each with its own style, and a clash shows on both

### Requirement: The saber is shown in a hilt
The room SHALL show a hilt: the built-in PunkSaber hilt, a pack hilt with its creator and licence and the pack's fit, or a model the owner loads. The chosen hilt SHALL be remembered.

#### Scenario: Choosing a pack hilt
- **WHEN** the owner chooses a pack hilt
- **THEN** the saber shows that hilt fitted as its pack says, with its creator and licence

### Requirement: The owner's own hilt models can be loaded and fitted
The owner SHALL be able to load a hilt model as `.glb`, `.obj` with its `.mtl` and textures, or `.stl`. The app SHALL fit it automatically:
- the longest dimension becomes the blade axis
- the units are guessed from a hilt's plausible length
- the blade comes out of the emitter end
- the file's own origin is the axis when it runs through the model

The owner SHALL be able to adjust length, turn, sideways shift, blade seat, staff seat, lean, the axis choice and which end the blade comes out of. The fit SHALL be kept with the hilt, and for a pack hilt it SHALL be resettable to the pack's fit. Loaded hilts SHALL be kept between sessions.

#### Scenario: A CAD-exported OBJ
- **WHEN** the owner loads an OBJ in millimetres, drawn around its bore, with its `.mtl`
- **THEN** the hilt appears the right size, coloured from its materials, and turning it keeps its bore on the blade

#### Scenario: Adjusting the seat
- **WHEN** the owner sets the blade seat deeper
- **THEN** the blade starts further into the hilt, and the setting is there next time
