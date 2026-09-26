# Proposal

**Milestone:** M2 (Beta 1 blocker). Triaged on 2026-09-24 from the findings of `baseline-firmware` (archived as `openspec/changes/archive/2026-09-24-baseline-firmware/`, design.md Findings table). This is Wave C task 3.11: seams and tests for the flasher before `install-safety-nets`, `install-target-safety` and `safe-staged-install` change it.

## Why

`flash.ts` and `driver.ts` have no tests, and every failure path of an install is unevidenced. The install sequence lives inside `Build.tsx`'s callbacks, where no test can reach it. Several kinds of blade have never been compiled with the real toolchain. Beta 1 testers will hit exactly these paths, and three later changes rewrite them. They need tests that say what the paths do today.

## What Changes

- **Unit tests,** one per audited scenario from `baseline-firmware`, named after it:
  - **hardware-wiring:**
    - adding a crystal (1.3), through the blade-count stepper
    - the first guess from a connected saber (1.4)
    - a free pin (1.10)
  - **toolchain:**
    - path too long (2.3)
    - low disk space (2.4)
    - recovery after a failed download (2.6)
  - **config-generation:** the V3 include (3.3)
  - **firmware-install:**
    - the backup fails (5.5)
    - a tampered driver download (5.9)
    - the saber does not come back (5.11)
    - an unexpected error (5.13)
    - an erased read (5.15)
- **Small seams, with no change in behaviour,** so the tests can run against fakes:
  - The install and restore sequences move out of `Build.tsx` into a plain `installFlow.ts`, which takes the flash and board calls as arguments.
  - The blade-count stepper's rule moves out of `Hardware.tsx` into `hardwareModel.ts`.
  - The checks that stop a toolchain setup (path too long, not enough space) become one function, used by both the installer and the panel.
  - `installBootloaderDriver` and `installToolchain` take optional stand-ins for the system calls (USB state, download, launching, running a command).
- **FW20:** compile tests with the real toolchain, gated like the existing build tests:
  - chained sub-blades
  - a single LED
  - a star LED
  - a motor
  - 3 buttons
  - extra defines
  - RGBW colour orders
  - a V3 build

  Reading ProffieOS 8.10's `common/color.h` shows that `Color8::GRBW` and `Color8::RGBW`, as the app writes them, are valid names. The compile confirms it.
- **Findings,** where the code does not do what the spec says. Each is pinned by an expected-failure test and filed in the change that owns the fix:
  - **FST-1** (to `install-safety-nets`, beside FW7): the Backups tab marks a backup of the wrong size as usable, because only its first bytes are checked. The spec says a wrong-size file is listed as not usable. Putting it back is refused, but only after the owner has pressed Restore.
  - **FST-2** (to `toolchain-integrity`, beside FW36): when the toolchain path is too long, the panel does not give the path's length, as the spec requires. It also tells the owner to set `HILTWRIGHT_TOOLCHAIN_DIR`, a development switch that packaged builds strip.
  - Any further findings from writing the tests are filed the same way.

## Non-goals

- Component tests for screens. Those scenarios are checked by hand in `hardware-verification-v2`.
- Fixing the defects the tests expose. Each becomes its own change or joins an existing one.
- Changing the owner-visible behaviour of an install. The extraction moves code; it does not change what happens.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change adds evidence only (`skip_specs`).

## Impact

- **Main:** small seams in `apps/desktop/src/main/{toolchain,driver}.ts`.
- **Renderer:**
  - a new `apps/desktop/src/renderer/src/installFlow.ts`, which `Build.tsx` calls
  - the count rule moves into `hardwareModel.ts`, which `Hardware.tsx` calls
- **Tests:**
  - new `installFlow.test.ts`, `driver.test.ts` and `toolchainSetup.test.ts`
  - additions to `backups.test.ts`, `hardware.test.ts`, `draftModel.test.ts` and `build.test.ts` (gated) in `apps/desktop/test/`
  - an addition to `packages/core/test/generate.test.ts`
- **Hardware check:** V2.2 hote2. The install path now runs through the extracted sequence, so the owner does one install and looks at the Backups tab from a development build.
