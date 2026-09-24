# Proposal

**Milestone:** M2 (Beta 1 blocker; candidate to move to M4 if Beta 1 scope needs trimming). Triaged on 2026-09-24 from the findings of `baseline-board` (archived as `openspec/changes/archive/2026-09-24-baseline-board/`, design.md Findings table).

## Why

Diagnostics is where expert testers will poke the saber, and it currently gives no feedback when something fails. The console will also send destructive commands without a word.

## What Changes

- **F9:** A slider write that fails says so, and never leaves its pending marker behind.
- **F11:** The effect buttons show that the effect ran, or why it did not.
- **F6:** Console commands that reboot the board or delete files ask for confirmation first.
- **F12:** On firmware that cannot list a folder (OS 7.8), the voice pack check says why it could not check. Doc 09's contradiction about which voice pack version is needed is corrected.
- **F13:** The `id` quick command is dropped (or chosen per ProffieOS version).

## Non-goals

- New settings such as blade length.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `diagnostics`: requirements for failure feedback, effect confirmation and destructive-command confirmation.

## Impact

`apps/desktop/src/renderer/src/{Controls.tsx,App.tsx,Build.tsx}`, `packages/core/src/voicepack.ts`, `docs/09-board-protocol-notes.md`. Hardware check on V2.2: effects and a failed slider write.
