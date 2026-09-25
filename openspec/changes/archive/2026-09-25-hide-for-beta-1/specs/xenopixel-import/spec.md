# Spec Delta

## ADDED Requirements

### Requirement: The import is not offered in Beta 1
While the Beta 1 switch for the Xenopixel import is off, Fonts & SD SHALL NOT show the Xenopixel import. The rest of the page SHALL keep its layout. Turning the switch on SHALL show the import again with no other change.

#### Scenario: Fonts & SD in Beta 1
- **WHEN** the owner opens Fonts & SD in a Beta 1 build
- **THEN** there is no Xenopixel import panel, and the card's fonts and the font detail are laid out as usual

#### Scenario: The switch turned on for Beta 2
- **WHEN** the import switch is on and the owner opens Fonts & SD
- **THEN** the Xenopixel import panel is shown as it was before Beta 1
