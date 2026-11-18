# preset-editing (delta)

## ADDED Requirements

### Requirement: While the card is shared, presets are not edited
ProffieOS saves preset changes, and the preset in use, on its card. While a connected saber's card is shared with the computer, the Presets page SHALL NOT send it preset changes or preset selections. It SHALL show the presets read-only, saying that the card is shared with this computer and must be given back on Fonts & SD first, with a way to go there. A preset change asked for by any other page meanwhile SHALL be refused with the same reason, and SHALL NOT be sent. Once the card is given back, the page SHALL be live again without reconnecting.

#### Scenario: Presets while the card is shared
- **WHEN** the owner shares the saber's card and opens Presets
- **THEN** the presets are read-only with the shared-card note, and nothing is sent when the owner clicks a preset or a field
- *Needs a real board (V2.2).*

#### Scenario: The card given back
- **WHEN** the owner gives the card back and returns to Presets
- **THEN** the page is live again, without reconnecting
- *Needs a real board (V2.2).*

#### Scenario: A preset change from elsewhere
- **WHEN** a preset change is asked for while the card is shared
- **THEN** it is not sent, and the save status says the card is shared and must be given back first
