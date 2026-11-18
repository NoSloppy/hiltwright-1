# style-editor Specification

## Purpose
Lets an owner build a blade style without writing code, in one of two modes:
- **Simple:** a stack of plain-language blocks for a quick start.
- **Full:** a tree with the reach of the official ProffieOS style editor, shown as What / Where / When layer cards.

Either way, the result previews live, can be shown as code, and saves as a style that works everywhere a built-in style does.

## Requirements

### Requirement: The editor has a simple and a full mode
The style editor SHALL offer a Simple mode (a stack of blocks) and a Full mode (the style as a tree of layers), switchable at any time. A new style SHALL start in Simple mode as a steady blade with the common effects and a wipe in and out. A saved built style SHALL reopen in the mode it was saved in. The style SHALL have an editable name.

The editor SHALL show whether the style is unsaved, changed or saved, judged by what Save would write. Save SHALL write the mode whose content the owner changed, not whichever tab is showing:
- Only switching to the other mode's tab SHALL NOT make the style count as changed, and SHALL NOT change what Save writes.
- When both modes were changed, Save SHALL write the mode showing, and the editor SHALL say, before saving, that the other mode's changes are not kept.

#### Scenario: Starting a new style
- **WHEN** the owner chooses "Build a style" on Styles
- **THEN** the editor opens in Simple mode with a steady blue blade, the common effects and a wipe ignition and retraction

#### Scenario: Reopening a tree style
- **WHEN** the owner chooses "Edit the layers" on a style saved from Full mode
- **THEN** the editor opens in Full mode with that style's layers

#### Scenario: Looking at the other mode
- **WHEN** the owner opens a style saved from Full mode, clicks the Simple tab without changing anything, and presses Save
- **THEN** the status still says "Saved", and the stored style is still the Full one, not a default blue blade

### Requirement: Simple mode builds a style from plain-language blocks
Simple mode SHALL offer a base pattern with its own description, sliders and colours. It SHALL offer effect blocks that can be added (on top), moved up or down, and removed, and an ignition and a retraction chosen from a list. Colours SHALL be live settings the owner can change later on Presets without a rebuild. Sliders SHALL be fixed when the style is built, and the editor SHALL say which is which. A Simple style SHALL be openable in Full mode as an editable tree.

#### Scenario: Adding an effect
- **WHEN** the owner adds "Swing flare" to a Simple style
- **THEN** it appears at the top of the effect stack with its own settings, and the preview responds to swings

#### Scenario: Colours stay changeable
- **WHEN** a Simple style with a red base is saved and put on a preset
- **THEN** the base colour can be changed on Presets without a rebuild

### Requirement: Full mode takes any ProffieOS style
Full mode SHALL accept any pasted ProffieOS style expression, including library styles, and show it as layers. Code that cannot be read SHALL be refused with a message. A style whose top is not a stack of layers SHALL be offered a way to put it under one, so effects can go on top.

#### Scenario: Pasting a library style
- **WHEN** the owner pastes a library style into Full mode
- **THEN** its layers appear as cards, and the preview runs it

### Requirement: Layers are arranged in a stack
Full mode SHALL list the layers top first, with the blade and the ignition and retraction pinned underneath and not movable. Each layer SHALL show its colour, its name and what sets it off. Layers SHALL be reorderable by dragging, by keyboard and by buttons. A layer SHALL be hideable from the preview alone while still being saved and built.

#### Scenario: Reordering by dragging
- **WHEN** the owner drags the clash layer above the lockup layer
- **THEN** the stack shows clash above lockup, and the preview draws it that way

#### Scenario: Hiding a layer while working
- **WHEN** the owner hides a layer
- **THEN** the preview no longer shows it, and the saved style still contains it

### Requirement: New layers start from something that shows
Adding a layer SHALL offer ready-made recipes (such as a lockup spot, a flash on an effect, a glowing tip), then every layer type grouped by what it does, with a search over every colour template. A new layer SHALL go on top, be selected, and start from settings that visibly light the blade.

#### Scenario: Adding a recipe
- **WHEN** the owner adds the "Flash on an effect" recipe
- **THEN** a new layer appears on top, and triggering its effect flashes the preview blade

### Requirement: A layer is described as What, Where and When
A layer built from a colour, a shape and a trigger SHALL be shown as three parts:
- **What:** a colour or a pattern.
- **Where:** the whole blade with a strength, a spot with position and width, or a reach from the hilt or tip with a soft edge.
- **When:** always, on a chosen effect, or during a chosen lockup, with how it comes in and goes out.

A layer that is a single template SHALL be shown with its settings sorted into the same parts, with settings left at their defaults behind "More settings". Each layer SHALL have a name, a plain-English sentence saying what it does, a way to trigger or hold it on the preview, and duplicate and remove. A layer that fits no card SHALL remain editable as a tree and SHALL compile exactly as written.

#### Scenario: A pasted lockup layer
- **WHEN** a pasted style contains a lockup shown at the clash position
- **THEN** its card reads as a spot, during a lockup, with its colour and transitions editable

#### Scenario: Changing where a layer lands
- **WHEN** the owner switches a layer from "a spot" to "from the tip"
- **THEN** it keeps its colour and trigger, and the preview shows it reaching in from the tip

### Requirement: Settings are edited in plain terms
Colours SHALL be swatches with a plain name, each switchable to a live setting chosen from the saber's named settings. Transitions SHALL be chosen from the common ones with a time. Numbers SHALL be either fixed or reacting to blade angle, swing, twist, sound or battery, with a value at each end in plain units. Touching an angle or swing value SHALL pose the preview saber there. Where two parameters are really one sensor reading, they SHALL be shown as one control.

#### Scenario: A value that follows tilt
- **WHEN** the owner makes a spot's position react to blade angle
- **THEN** they set where it sits with the blade up and with it down, and the preview saber tilts as they adjust each end

### Requirement: Every part of a style can be edited as a tree
Any layer SHALL be viewable and editable as a tree, in which every slot can be changed:
- a template from a menu of those that fit, described in plain words
- a colour, a live setting with its starting colour, an effect, a lockup type, or a number

A slot at its default SHALL show the default and a way to set it. Templates that take a variable number of parts SHALL grow and shrink. Swapping a template SHALL keep the parts that still fit.

#### Scenario: Swapping a template
- **WHEN** the owner swaps a layer's colour template for another that takes the same colours
- **THEN** the colours carry over into the new template

### Requirement: The style previews as it is edited
The editor SHALL run the style being edited on the simulator, with effect and motion controls, restarting shortly after edits settle. In Full mode it SHALL name any templates the preview cannot show and any inputs it only approximates (see `style-simulator`).

#### Scenario: Editing with the preview running
- **WHEN** the owner changes a layer's colour
- **THEN** the preview shows the new colour within a moment

### Requirement: Edits can be undone
The editor SHALL offer undo and redo, by button and by keyboard, except while typing in a field, which keeps its own undo. A quick run of changes (a slider drag, typing) SHALL undo as one step. Adding, removing, moving and pasting SHALL each be their own step. Undo SHALL return to the mode the change was made in.

#### Scenario: Undoing a slider drag
- **WHEN** the owner drags a slider across its range and presses Ctrl+Z
- **THEN** the slider returns to where it was before the drag, in one step

### Requirement: The code is available but never required
The editor SHALL show, on request, the ProffieOS code the style compiles to, with a way to copy it. Nothing in the editor SHALL require the owner to read or write code.

#### Scenario: Copying the code
- **WHEN** the owner chooses "Show the code" and copies it
- **THEN** the clipboard holds the style's ProffieOS code

### Requirement: A saved style works everywhere
Saving SHALL store the style as one of the owner's built styles, credited to them. It keeps its layers for re-editing, its live settings and their default colours, and a preview colour. Later saves SHALL update the same style, and SHALL keep an author name the owner set on Styles.

While Save is working, it SHALL show so and SHALL NOT start again. A second press SHALL NOT make a second style. A failed save SHALL be reported in the editor, and the style SHALL stay unsaved.

The editor SHALL always open the stored, current version of a style, whether it is reached from Styles or from the sidebar.

When a style that sabers already have in their plans is saved again, each of those sabers SHALL get the new version for its next build. The editor SHALL say how many were updated.

A saved style SHALL appear on Styles, preview on Styles, Presets and in the demo room, and be choosable for presets and compiled like any other style. After saving, the editor SHALL offer to open it in the demo room.

#### Scenario: Save then use
- **WHEN** the owner saves a new style and opens Styles
- **THEN** the style is in the gallery as theirs, animated, and can be added to a preset

#### Scenario: A saved style compiles
- **WHEN** a style with every effect layer is saved and built for a V2
- **THEN** the build succeeds

#### Scenario: A double click on Save
- **WHEN** the owner double-clicks Save on a new style
- **THEN** exactly one style is stored

#### Scenario: Reopening from the sidebar after saving
- **WHEN** the owner edits a built style, saves it, visits another page, and comes back to the Style editor from the sidebar
- **THEN** the editor shows the saved version, and saving again changes nothing that was saved

#### Scenario: Editing a style a saber already uses
- **WHEN** the owner changes the colour of a built style that one saber's plan uses and saves it
- **THEN** the editor says one saber was updated, and that saber's next build compiles the new version

