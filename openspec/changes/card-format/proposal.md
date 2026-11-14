# Proposal

**Milestone:** M2 (Beta 1 blocker), set by the owner on 2026-11-14. Filed during `card-safety`'s hardware check, when the owner asked for the card list to offer any card and to "prompt you to format one that has unrecognized files (with appropriate warnings)". The list part went into `card-safety` (2.4); formatting is this change. Roadmap 3.24b, straight after `card-safety`.

## Why

A tester setting up a saber often starts from a new or reused card. Today Hiltwright can show such a card (`card-safety` 2.4), but it cannot get it ready:

- **A saber reads FAT32 only.** The Proffieboard's board support (`arduino-proffieboard` 4.6) reads cards through `dosfs`, which knows FAT12, FAT16 and FAT32 (`dosfs_core.h`: `DOSFS_VOLUME_TYPE_FAT12/16/32`), not exFAT. Most cards over 32 GB come formatted exFAT. On such a card a saber finds no fonts and no presets, with no hint why. Hiltwright does not check the card's file system either.
- **Windows cannot make a large FAT32 card.** Its own format offers FAT32 only up to 32 GB, so for a 64 GB card the owner needs another tool.
- **A reused card** has someone else's files on it, which ProffieOS ignores but which take space and confuse which card is which.

## What Changes

- **Check the file system.** Fonts & SD shows each card's file system. It warns, in plain words, when a saber cannot read it (exFAT, NTFS), before any font is copied onto it.
- **Format a card for a saber**, from Fonts & SD, for the chosen card:
  - **Only removable drives Windows lists as such.** Never a fixed disk, and never the drive Windows runs from.
  - **Warnings first:** what is on the card (how many files, their size, whether it is a saber card and whose), and that everything on it will be erased.
  - **Confirmation:** the owner types the drive letter.
  - **A backup option:** a saber card's fonts, tracks and `presets.ini` can be copied into a folder on this computer before formatting.
  - **The result:** FAT32 with the cluster size ProffieOS cards are recommended to use, labelled for the saber, at any card size up to 2 TB. Cards over 32 GB therefore need a FAT32 formatter of Hiltwright's own, or a bundled one.
- **A saber's own card, shared over USB,** is formatted only once the owner has confirmed which saber it belongs to. Afterwards the saber is given its card back.
- After formatting, the page shows the card as empty and ready for fonts, as `card-safety` 2.4 does.

## Non-goals

- Partitioning, repairing or recovering cards.
- Putting the `common` folder or a voice pack on a new card. That is a separate question, of what Hiltwright may ship or fetch.
- Cards for other boards (CFX, Xenopixel).
- macOS and Linux. Beta 1 is Windows only.

## Open questions for the design

- **The FAT32 formatter for cards over 32 GB.** Options: one of Hiltwright's own (FAT32 is a documented format, and the code would be ours under GPL-3.0), or a bundled third-party formatter, checking its licence first. Windows' `format.com` with `/FS:FAT32` refuses large volumes.
- **Administrator rights.** Whether formatting a removable drive from the app needs Windows to ask for them (UAC), and how that is explained.
- **Cluster size.** Which one, from the ProffieOS documentation and a test of a large font playing (SmoothSwing with several sounds open at once).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `sd-card`: the file system is shown and checked, and a removable card can be formatted for a saber, with warnings, a typed confirmation and an optional backup.

## Impact

`apps/desktop/src/main/sd.ts` (file system in `locateCards`, the formatter), `apps/desktop/src/main/ipc.ts`, `apps/desktop/src/renderer/src/Fonts.tsx`. Hardware checks on hote2 and a spare card, all on cards with nothing the owner needs:
- a 32 GB or smaller card from exFAT to FAT32
- a 64 GB card
- a card shared over USB
- the saber reading the newly formatted card
