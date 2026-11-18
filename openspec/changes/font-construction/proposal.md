# Proposal

**Milestone:** M5+ (post-Beta 1). Not started until Beta 1 has shipped.

## Why

Style builders and installers put together their own fonts: they mix sounds from several fonts, or tidy up a download so it works on ProffieOS. Today Hiltwright can import, group, credit, play and install fonts, but it cannot help someone build one. A mistake only shows up on the saber: a wrong WAV format, a misnamed file, a missing hum, an effect the chosen styles use with no sound behind it.

## What Changes

- A guided way to build a font in the font library. The owner starts a new font (empty, or copied from an existing one), adds or replaces sounds by effect, and the app keeps a live checklist.
- **File checks:** WAV format and sample rate as ProffieOS expects, file and folder naming (flat and one-folder-per-sound layouts), numbering, and `config.ini` / `smoothsw.ini` present and readable.
- **Coverage checks:** which effects the font supports (hum, swings or SmoothSwing pairs, clash, blast, lockup, drag, melt, lightning block, force, stab, preon/pstoff, transitions, tracks). It warns where a style used in the presets raises an effect the font has no sound for.
- The result is an ordinary font folder in the library. It can be played in the demo room, picked on Presets and copied to the card like any other.

### Reuse (do not rebuild)

- The WAV and naming checks the SD card copy already runs (`apps/desktop/src/main/sd.ts`).
- The font library's detection of what a font supports (polyphonic or monophonic, SmoothSwing, special effects, tracks) and its playback.
- The demo room's font engine, to hear the result.

## Non-goals

- Recording, generating or editing audio (trimming, looping, pitch, effects). Authoring sounds from scratch is a separate product.
- Converting non-WAV audio formats. Later, if testers ask.
- Rewriting fonts from other boards (CFX, Xenopixel). That stays with the import work.

## Capabilities

### New Capabilities

- `font-construction`: building a ProffieOS font from sounds, with file-format, naming and effect-coverage checks.

### Modified Capabilities

- `font-library`: fonts can be created and edited in the library, not only imported. The spec path is confirmed once `baseline-sd-fonts` is archived.

## Impact

- `apps/desktop` main: font library write paths, reusing the checks in `sd.ts`.
- `apps/desktop` renderer: the font library page gains a build flow and a checklist.
- `packages/core`: a font coverage model shared by the checklist and the Presets warnings.
- Depends on the `font-library` and `sd-card` baseline specs (M1).
