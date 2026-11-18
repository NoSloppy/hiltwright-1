# blade-preview Specification

## Purpose
Draws the simulated LEDs so they look like a lit, diffused blade rather than a row of coloured squares, wherever styles are shown, with effect and motion controls to try a style out.

## Requirements

### Requirement: The preview looks like a lit blade
The preview SHALL draw the LED values as a lit, diffused blade with a glow, keeping bright colours bright rather than dulling them. Many previews SHALL be able to animate on one page at once, and only previews on screen SHALL animate. Without WebGL, a preview SHALL show a flat bar and say that it needs WebGL.

#### Scenario: A gallery of styles
- **WHEN** the owner opens the Styles gallery
- **THEN** every style on screen animates as a glowing blade at the same time

### Requirement: Previews appear wherever styles are chosen
A preview SHALL appear for each style in the Styles gallery and detail, for each blade of a preset on Presets, and in the style editor. Full previews SHALL offer:
- Ignite/Retract
- clash, hard clash, blast and stab
- the held effects: lockup, drag, melt and lightning block
- special abilities

Effects that need a lit blade SHALL be disabled while it is off.

#### Scenario: Trying an effect
- **WHEN** the owner presses Blast on a lit style in the Styles detail
- **THEN** a blast shows on the preview

### Requirement: The preview follows the colour being picked
On the Styles page, the preview SHALL follow a colour swatch while the owner is still dragging the picker.

#### Scenario: Dragging the colour picker
- **WHEN** the owner drags the base colour picker from blue toward red
- **THEN** the preview's blade changes colour continuously as they drag

### Requirement: Motion can be tried by hand
Full previews SHALL offer a small saber the owner can drag to tilt it, where drag speed counts as swing speed that fades after release, and sliders for swing, tilt and twist that set the same values.

#### Scenario: Swinging with the mouse
- **WHEN** the owner drags the small saber quickly and lets go
- **THEN** the swing speed rises during the drag and fades after release, and a swing-reactive style responds
