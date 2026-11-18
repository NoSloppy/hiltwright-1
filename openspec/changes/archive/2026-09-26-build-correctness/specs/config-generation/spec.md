# config-generation (delta)

## ADDED Requirements

### Requirement: Names never break the config
Style names, style authors and swappable-blade names SHALL appear in the config only in a form that cannot end or extend the comment they sit in: no comment end inside a block comment, and no line break or trailing backslash in a line comment. Any name the owner can type SHALL therefore give a config that parses and compiles, with the name still readable.

#### Scenario: A style name that looks like code
- **WHEN** a pasted style is named `Fire */ Blade` and its author is `Kyber\`
- **THEN** the generated config parses back with the same presets and styles, and compiles
- *Needs the toolchain (a compile), no board.*
