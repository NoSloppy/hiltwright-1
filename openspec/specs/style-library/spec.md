# style-library Specification

## Purpose
The Styles page and the styles behind it. It covers:
- Hiltwright's own original styles for every kind of blade
- library styles the owner pastes in, with their credits kept
- styles the owner builds

From there the owner tries a style's colours and effects and puts it on the working saber, live when it is already in the firmware, or queued for the next build.

## Requirements

### Requirement: Hiltwright ships original styles for every kind of blade
The app SHALL include Hiltwright's own styles, each with a name, a description, the kinds of blade it suits (main, side, crystal, accent or motor) and preview colours. Each kind of blade SHALL have a default style. Blade styles SHALL share one set of effects (blast, clash, lockup, lightning block, drag, stab, and ignition and retraction with adjustable times), each with its own colour. Crystal, accent and motor styles SHALL NOT carry blade effects.

#### Scenario: A crystal's default style
- **WHEN** a crystal chamber has no style chosen
- **THEN** it gets "Follow the blade", the first style listed for crystals

#### Scenario: Every blade style answers the effects
- **WHEN** any Hiltwright blade style is previewed with a clash, a blast and a lockup
- **THEN** each effect shows in its own colour

### Requirement: A style's live settings come from its own code
The colours and options a style lets the owner change on the saber, and their default values, SHALL be read from the style's own code, for built-in, pasted and built styles alike, so they cannot drift from what is compiled.

#### Scenario: Reading a style's colours
- **WHEN** a style's code takes a base colour and a clash colour as live settings
- **THEN** the page offers exactly those two colours, starting at the code's defaults

### Requirement: Each built-in style shows what it costs
The gallery and the detail SHALL show each built-in style's measured flash cost, so the owner can judge how many distinct styles fit on the board.

#### Scenario: Comparing costs
- **WHEN** the owner looks at two built-in styles in the gallery
- **THEN** each card shows its cost in KB

### Requirement: A library style can be pasted in with its credits
The owner SHALL be able to paste a style's code, give it a name and an author, and save it. Comment blocks at the top SHALL be kept as the style's header, which travels with it into any build. The code SHALL be checked before saving: it must be a style expression, with no preprocessor lines, balanced angle brackets and a closing `()`. Each problem SHALL be explained in plain words, and saving SHALL be refused until the code is valid. Before saving, the dialog SHALL list the colours and options the owner can change live, and say whether a header was found.

#### Scenario: Pasting a library style
- **WHEN** the owner pastes a library style with its copyright header and saves it
- **THEN** it appears in the gallery under its name and author, and the header is kept

#### Scenario: Pasting something that is not a style
- **WHEN** the owner pastes a line with a `#define`
- **THEN** the dialog explains that preprocessor lines are not a style expression, and Save stays disabled

### Requirement: The owner's styles are kept on this computer
Pasted and built styles SHALL be kept on this computer, shared by every saber, and written safely. Each SHALL be checked for a sound shape before it is stored. The owner SHALL be able to remove one of their styles from the library.

#### Scenario: A style for every saber
- **WHEN** the owner pastes a style while working on one saber and then switches to another
- **THEN** the style is in the gallery for both

### Requirement: Styles can be browsed and filtered
The gallery SHALL show Hiltwright's styles, then the owner's. Each card SHALL show a live preview, name, state on the working saber, author, blade kinds and cost. The owner SHALL be able to search by name or author, and filter by blade kind, by styles that respond to motion, by creator (their own styles count as "You"), and by what is on the working saber. When a filter hides the selected style, the detail SHALL show the first visible one.

#### Scenario: Styles that respond to motion
- **WHEN** the owner turns on the Motion filter
- **THEN** only styles that read tilt, swing or twist are shown

#### Scenario: A contributor's styles
- **WHEN** the owner chooses "Show their styles" for a contributor
- **THEN** Styles opens filtered to that creator, matched regardless of letter case

### Requirement: A style can be tried before it is chosen
The detail SHALL show the style's preview with effect and motion controls, and offer to open it in the demo room. It SHALL offer a swatch for each colour and a field for each option the style takes live, starting at its defaults. Tried values SHALL change the preview only, and SHALL go with the style when it is put on a preset. They SHALL be resettable to defaults.

#### Scenario: Trying a colour
- **WHEN** the owner sets a style's base colour to red in the detail
- **THEN** the preview turns red, and nothing on any saber changes

### Requirement: A style shows who made it
The detail SHALL credit a style's maker: Hiltwright for its own styles, the author for pasted styles, the builder for built ones, with the maker's logo. The owner SHALL be able to edit the name on styles they pasted or built. A pasted style's header SHALL be viewable.

#### Scenario: Correcting an author
- **WHEN** the owner changes a pasted style's author
- **THEN** the gallery, the detail and the creator filter all show the new author

### Requirement: A style's state on the working saber is shown
For the working saber, plugged in or not, each style SHALL show whether it is in the installed firmware ("On the saber"), chosen for a preset but not yet built ("Queued"), or neither ("Needs a build").

#### Scenario: After choosing a new style
- **WHEN** the owner adds a style that the working saber's firmware lacks to one of its presets
- **THEN** the style shows as "Queued"

### Requirement: A style can be put on the working saber from Styles
The owner SHALL be able to choose a preset and a blade of the working saber, defaulting to the current preset and a blade the style suits, with unsuitable blades marked. If the saber is plugged in and the style is in its firmware, the style SHALL be written to that preset and blade at once with the tried colours, and the page SHALL say whether the saber confirmed it. Otherwise the style SHALL be put into the saber's plan for the next build, with the tried colours kept beside it (see `preset-editing` for how those colours reach the saber). With no saber known, the page SHALL point to the Armory.

#### Scenario: A style already on the saber
- **WHEN** the saber is plugged in, the style is in its firmware, and the owner uses it in preset 2 with a tried colour
- **THEN** preset 2 uses the style with that colour, and the page reports the saber's confirmation
- *Needs a real board (either).*

#### Scenario: A style the saber lacks
- **WHEN** the owner adds a style that the saber's firmware lacks to preset 2
- **THEN** it is queued for the next build with the tried colours, and the page offers to go to Build & Install

### Requirement: A built style can be edited again
A style the owner built SHALL offer to open it in the style editor. Saving there SHALL update the same style.

#### Scenario: Reopening a built style
- **WHEN** the owner chooses "Edit the layers" on a style they built
- **THEN** the style editor opens with its layers, and saving updates that style in the gallery
