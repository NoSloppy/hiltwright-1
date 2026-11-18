# Proposal

**Milestone:** M5+ (Later). Triaged on 2026-09-24 from the findings of `baseline-firmware` (archived as `openspec/changes/archive/2026-09-24-baseline-firmware/`, design.md Findings table).

## Why

Firmware-side findings that are real but belong after Beta 2.

## What Changes

- **FW19:** Use the existing config parser to import a hand-written `config.h` ("import as text, edit what we understand"), or retire it.
- **FW30:** Installing on macOS and Linux (USB state, bootloader detection, no driver step).
- **SF32** (from `baseline-sd-fonts`): Ejecting a shared card on Linux, part of the same "other platforms" work as FW30.

## Non-goals

- Anything scheduled for Beta 1 or Beta 2.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `firmware-install`, `config-generation`: to be written when scheduled.

## Impact

To be sized when scheduled.
