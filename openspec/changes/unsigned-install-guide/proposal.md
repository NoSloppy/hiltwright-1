# Proposal

**Milestone:** M2 (Beta 1 blocker). From `beta-1-roadmap` task 3.3.

## Why

Beta 1 ships unsigned. Windows puts several barriers in front of unsigned software, and one of them, Smart App Control, may block the downloaded toolchain (GCC, dfu-util) as well as the installer, with no way to click through.

## What Changes

- **Spike first:** on a Windows 11 PC with Smart App Control on, run install, toolchain setup, build and flash, and record exactly what is blocked and when.
- **The guide:** what testers will see and what to do at each step:
  - the browser's download warning
  - unblocking the file
  - SmartScreen's "More info → Run anyway"
  - Smart App Control: how to tell it is on, and what can be done
  - Defender false positives, and how to report them
  - that S mode is unsupported
  - the one Windows approval to expect, for the bootloader driver
- **In the app:** the first-run check detects a blocked tool, or Smart App Control, and says so in plain words instead of showing a failed build.

## Non-goals

- Signing (Beta 2).

## Capabilities

### New Capabilities

- `install-guide`: the documented path through Windows' barriers to unsigned software, and the app's own detection of a blocked tool.

### Modified Capabilities

- `toolchain`: the setup and first build report blocked tools plainly.

## Impact

A guide in `docs/` linked from the release, `apps/desktop/src/main/toolchain.ts` and `Build.tsx` for detection. Verified by following the guide on a clean Windows 11 PC.
