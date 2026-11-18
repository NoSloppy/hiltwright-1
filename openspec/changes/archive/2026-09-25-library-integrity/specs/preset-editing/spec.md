# Spec Delta

## ADDED Requirements

### Requirement: Saved preset sets survive a damaged file
Saved preset sets SHALL be kept the same way as the saber library (see `saber-library`):
- Two changes at the same moment SHALL both be kept.
- A file that cannot be read, or holds sets of the wrong shape, SHALL be set aside unchanged and never overwritten.
- The app SHALL start from the last good copy, or otherwise from the sets it could read.
- The Armory SHALL name the file the damaged sets were kept as.

#### Scenario: A damaged sets file
- **WHEN** the saved sets file cannot be read and the owner then saves a new set
- **THEN** the damaged file is still in the app's data folder under the name the Armory gave, and the new set is saved
