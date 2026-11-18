# Spec Delta

## Purpose

Shows what a style will do on the blade before it is ever compiled. It works LED by LED with ProffieOS's own maths, answers every effect and motion input the saber has, and follows the prop's reactions to what a style asks for. Anything it cannot model is named, so a style builder can trust the preview.

## ADDED Requirements

### Requirement: The preview uses the firmware's own maths
The simulator SHALL compute each LED with ProffieOS's own arithmetic: the same fixed-point scale and the same lookup tables. Every Hiltwright built-in style SHALL be previewable, with the style's preset arguments (colours and times) applied. For a given random seed, the same inputs SHALL give the same blade.

#### Scenario: Every built-in style previews
- **WHEN** any of Hiltwright's built-in styles is previewed
- **THEN** it produces LED values in range for every LED

#### Scenario: Matching the real blade
- **WHEN** a built-in style is shown in the app and on a real blade side by side
- **THEN** the owner judges them to match in colour, motion and timing
- *Needs comparison with a real blade.*

### Requirement: Ignition and retraction follow the style's times
An off blade SHALL be dark. Ignition SHALL light the blade from the hilt over the ignition time, and retraction SHALL darken it from the tip over the retraction time. Both SHALL use the preset's time settings where the style takes them.

#### Scenario: A slower ignition
- **WHEN** a preset sets a style's ignition time to 800 ms
- **THEN** the preview takes 800 ms to light the whole blade

### Requirement: Every effect is answered as on the saber
The simulator SHALL answer each of these as the firmware does:
- **clash:** a bump placed by the blade's tilt, with a clash strength that grows with swing speed, and a hard clash
- **blast:** a ring spreading from where it landed
- **stab:** at the tip
- **held effects:** lockup, drag, melt and lightning block, each lasting while held and releasing when let go, with melt kept distinct from drag

#### Scenario: Clash on a raised blade
- **WHEN** a clash happens with the blade pointing up
- **THEN** the clash bump appears nearer the hilt than it would on a lowered blade

#### Scenario: Holding a lockup
- **WHEN** lockup is held for two seconds and released
- **THEN** the lockup effect shows for the whole time and ends on release

### Requirement: Motion inputs reach the style
Swing speed, blade tilt and twist SHALL be inputs to the simulation, and styles that read them SHALL respond. The sound level SHALL be a stand-in that follows the hum and rises with swings and effects.

#### Scenario: A tilt-driven style
- **WHEN** a style whose colour follows tilt is previewed with the blade raised and then lowered
- **THEN** the colour changes between the two poses

### Requirement: Any ProffieOS style expression can be read and printed back
The simulator SHALL accept a style as ProffieOS code: a `StylePtr<…>()` or a bare expression, with comments and a trailing comma allowed. It SHALL print it back without changing its meaning, and SHALL reject broken input with a message saying what is wrong.

#### Scenario: A library style pasted as is
- **WHEN** a long library style is pasted with its comment header and trailing comma
- **THEN** it is read, and printing it back gives the same expression

#### Scenario: Broken input
- **WHEN** the pasted code has unbalanced angle brackets
- **THEN** it is rejected with a message, and no preview is attempted

### Requirement: Library styles run the way the compiler builds them
Templates that ProffieOS defines as shortcuts for other templates SHALL be expanded as the compiler expands them. Transitions, layers with transparency, and effect detectors SHALL behave as the firmware's do. A style built from modelled templates SHALL therefore preview as it would run.

#### Scenario: A library-shaped style
- **WHEN** a style with responsive clash, blast, lockup, drag, melt and lightning-block layers is previewed
- **THEN** each effect triggers its own layer, and the preview reports nothing unsupported

### Requirement: Styles that steer the saber are followed, per prop
A style can turn the saber off and on itself, ask for its own sounds, or answer special abilities. The simulator SHALL carry those requests out as the chosen prop would. Fett263 obeys a style's off and on requests; SA22C, BC and the default prop ignore them. Where the preview has an Ignite button, it SHALL follow what the style did to the saber.

#### Scenario: A style that shorts the blade out
- **WHEN** a Fett263 saber previews a style that switches the saber off after an armed clash
- **THEN** the blade retracts in the preview, and the Ignite button shows it as off

#### Scenario: The same style on SA22C
- **WHEN** the same style is previewed on a saber with the SA22C prop
- **THEN** the blade stays lit, because that prop ignores the request

### Requirement: What cannot be modelled is named
The simulator SHALL report the templates in a style that it does not model, and separately those it shows only approximately because they depend on sensors it stands in for (such as clash strength, sound level and sound lengths). The full style editor SHALL show both lists under the preview.

#### Scenario: A fully modelled style
- **WHEN** a style uses only modelled templates
- **THEN** the editor shows no unsupported templates under the preview

### Requirement: Saved styles preview everywhere
A style the owner pasted or built SHALL preview on the Styles page, on Presets and in the demo room, like a built-in style. A pasted style that cannot be read SHALL show a flat colour bar instead.

#### Scenario: A pasted style on Presets
- **WHEN** a pasted library style is chosen for a preset's blade
- **THEN** the preset shows it animated, as on the Styles page
