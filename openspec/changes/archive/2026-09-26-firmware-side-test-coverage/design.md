# Design

## Context

- **Callable from node today:**
  - `listBackups` and `restoreBackup` (`main/flash.ts`) read the file system. `restoreBackup` refuses a bad image before it looks for dfu-util.
  - `guessBlades` and `draftModel` (`renderer/src/saberModel.ts`) and `newBlade` and `pinTable` (`hardwareModel.ts`) are pure. `hardware.test.ts` and `draftModel.test.ts` already test parts of them.
  - `generateConfig` in core picks `BOARD_INCLUDE[board]`.
  - `download` (`toolchain.ts`) writes to `<dest>.part` and renames only when finished.
- **Out of reach:**
  - **The install sequence.** `writeFromBootloader`, `install2` and `restore` in `Build.tsx` are `useCallback`s that call `api().flash.*` and `board.*` and set React state.
  - **The blade-count rule.** `setCount` sits inside `HardwareEditor`.
  - **The driver installer.** `installBootloaderDriver` calls PowerShell (`usbState`, `Start-Process`) and `fetch` directly, and returns early on anything but Windows.
  - **The toolchain installer.** `installToolchain` calls arduino-cli, `fetch` and `Expand-Archive` directly.
  - **The setup checks.** Path too long and not enough space are checked twice, once in `installToolchain` (throws) and once in the panel (`lowSpace`, `tool.pathTooLong`), with different words.
- **What reading the code showed:**
  - FST-1: `listBackups` sets `valid` from the stack-pointer check alone, ignoring size.
  - FST-2: the too-long notice has no length and names a development switch.
  - ProffieOS 8.10's `Color8` has both `GRBW` (white in addition to RGB) and `GRBw` (white replacing RGB). The app's `GRBW` and `RGBW` are valid names.

## Goals / Non-Goals

**Goals:**
- One test per audited scenario, named after it, so each audit number maps to a test (as in `board-side-test-coverage`).
- Seams that later changes build on: `install-safety-nets`, `install-target-safety` and `safe-staged-install` change `installFlow.ts` and its tests, not a React component.
- Known defects pinned by expected-failure tests.

**Non-Goals:**
- Testing React components or Electron IPC.
- Changing behaviour. Every code change here is an extraction or an optional argument whose default is today's behaviour.

## Decisions

### D1. Test the specified behaviour, and mark known defects with `it.fails`
This follows `board-side-test-coverage` D1:
- Where the code does what the spec says, a normal test pins it.
- Where it does not, the test states the specified behaviour and is marked `it.fails`, with a comment naming the owning change. The owning change turns it into a normal `it` when it fixes the defect.

### D2. The install sequence in `installFlow.ts`
The new `apps/desktop/src/renderer/src/installFlow.ts` imports only types and exports three functions:
- `writeFromBootloader(deps, job)`
- `installSequence(deps, job)`
- `restoreSequence(deps, job, backup)`

Each is the body of today's callback, moved verbatim, with these substitutions:
| Today | In `installFlow.ts` |
|---|---|
| `api().flash.*` | `deps.flash.*` |
| `api().snapshots.save` | `deps.snapshots.save` |
| `board.*` | `deps.board.*` |
| `setStep`, `setNote`, `setXfer` | `deps.report({ step?, note?, xfer? })` |
| the 1.5 s pause | `deps.sleep` |

`job` carries `saber`, `model`, `result` (the build) and `info`.

**Added during implementation:** `deps.board` is described in `installFlow.ts` itself (`info`, `send`, `rebootToBootloader`, `connect`, `expectAfterInstall`, `updateSaber`) rather than as `Pick<Board, …>`. Importing the `Board` type pulled the browser-only `board.ts` into the node test project's type check. `useBoard`'s return value satisfies the interface.

`Build.tsx` keeps its callbacks as thin wrappers that build `deps` from `api()` and `board` and apply each report to state.

The failure hint shown under a stopped install moves to an exported constant, `STOPPED_HINT`, which `Build.tsx` renders unchanged, so a test can check its words. It currently begins "If the saber does not show up after a reboot: hold BOOT, tap RESET…".

**Rejected:**
- *A React test renderer with fake IPC.* It needs new dependencies and a large fake, to test a sequence of awaits.
- *Moving the sequence to main.* It needs the serial port, which the renderer owns.

### D3. Optional stand-ins for system calls
- **`installBootloaderDriver(dir, onLine, sys = realDriverSys)`.** `sys` = `{ platform, usbState, download, launchElevated, waitFor }`. The launch is today's PowerShell `Start-Process -Verb RunAs`, moved into `launchElevated(exe)`.
- **`installToolchain(root, onLine, sys = realToolchainSys)`.** `sys` = `{ run, download, extract, status }`, where `status` defaults to `toolchainStatus`, whose own `run` comes from `sys`.

Callers in `ipc.ts` pass nothing and get today's behaviour.

**Added during implementation:**
- `DriverSys.expected` (`{ bytes, sha256 }`, defaulting to `DRIVER_BYTES` and `DRIVER_SHA256`) lets a test name the file that passes the check, for "a matching file is launched once", without the real 3 MB installer.
- The toolchain checks and their constants (`MAX_ROOT_LENGTH`, `INSTALL_DISK_*`) live in `apps/desktop/src/shared/toolchainChecks.ts`, which `toolchain.ts` re-exports. The Build page runs in the renderer and cannot import the main-process module.

**Rejected:**
- *`vi.mock` of `node:child_process` and `fetch`.* It is brittle across the three call sites, and hides which calls a function makes.

### D4. One check for "can the setup start"
`toolchainBlockers(status): { pathTooLong: string | null; lowSpace: string | null }` in `toolchain.ts` returns today's words:
- **Path too long:** the installer's message has the length; the panel's names the switch.
- **Low space:** the same threshold, `INSTALL_DISK_MARGIN`, which the panel duplicates today as `2.5 * 1073741824`.

`installToolchain` throws with these texts, and `Build.tsx` shows them and disables the button when either is set. The panel keeps its own sentence until FST-2 is fixed, so the words on screen do not change. The expected-failure test asks for the length in the panel's sentence and no mention of a development switch.

### D5. Where each test goes
- **`hardware.test.ts`:**
  - 1.3: `withBladeCount([main], 2, 'V2')` gives a second blade, a crystal on `blade2Pin` and `bladePowerPin1`. The rule moves from `setCount` into `hardwareModel.ts`, and `Hardware.tsx` calls it.
  - 1.10: in `pinTable` for a one-blade V2, every data pin but `bladePin` has no users (the panel renders a row with no users as "free").
- **`draftModel.test.ts`:** 1.4. `guessBlades([140, 2, 1])` gives three pixel blades of 140, 2 and 1 pixels. `draftModel` for a connected saber with no saved model starts from them.
  - The "starting point" note is a screen check, left to `hardware-verification-v2`.
- **`toolchainSetup.test.ts` (new):**
  - 2.3: `toolchainBlockers` for a 60-character root on Windows names the length. `installToolchain` refuses before downloading anything. The panel's words are an expected failure (FST-2).
  - 2.4: with low free space, it refuses before downloading, and says how much is free.
  - 2.6, with a fake `sys`:
    1. arduino-cli is present and the core is present. The ProffieOS download fails part-way.
    2. The first attempt rejects, and nothing named `ProffieOS` is left in place.
    3. The retry downloads only ProffieOS and ends ready.
    4. A further call downloads nothing.
  - `download` itself, with `fetch` stubbed to fail mid-stream: the destination does not exist, and only `.part` remains.
- **`packages/core/test/generate.test.ts`:** 3.3. A V3 model's config includes `proffieboard_v3_config.h` and not `proffieboard_v2_config.h`.
- **`installFlow.test.ts` (new):**
  - 5.5: the backup returns `ok: false`. The report ends at step `failed` with "Backup failed, so nothing was written", and `write` is never called.
  - 5.11: the write succeeds and `waitForRuntime` returns false. The note says the firmware was written and to unplug, replug and connect. The saber record is not updated, which FW9 in `install-safety-nets` changes.
  - 5.13: `write` throws. The report ends at `failed` with the error, and `STOPPED_HINT` names BOOT, RESET and the Backups tab.
  - A normal install for contrast: backup, write, wait, connect, update the record, "Installed" with the backup's path.
- **`driver.test.ts` (new):** 5.9, with a fake `sys` on `win32` and a bootloader present without WinUSB.
  - A downloaded file of the wrong size, or of the right size with the wrong SHA-256, is deleted and never launched. The text says it is not the file expected.
  - A matching file is launched once.
- **`backups.test.ts`:**
  - 5.15: an all-`0xFF` image of 256 KB is listed as not valid, and `restoreBackup` refuses it without reaching dfu-util.
  - An image of 100 KB that starts like firmware: restoring it is refused (normal test). Listing it as not valid is an expected failure (FST-1).
- **`build.test.ts` (gated on `HILTWRIGHT_TOOLCHAIN_DIR`), FW20.** Two compiles, to keep the run to a few minutes:
  1. **A V2 saber:**
     - a GRBW main blade with a chained crystal sub-blade
     - a single-LED accent
     - a star LED on three FETs
     - 3 buttons
     - two extra defines
  2. **A V3 saber:**
     - an RGBW main blade
     - a chained sub-blade
     - a motor on a FET

  Each must compile and produce a `.dfu`. When one fails, the translated error names the part, and the test is split to find it before anything is filed.

**FST-3, found while writing the FW20 model.** `withKind(blade, 'star')` keeps the blade's one pin and pads the other channels with the first FET, so a new star LED repeats a pin, possibly another blade's. The V2 compile model gives the star its own three pins explicitly. The default is pinned as an expected failure in `hardware.test.ts`.

### D6. Findings are filed in the owning changes' proposals
Findings are tagged `FST-<n>` and added to the owning change's What Changes, naming the test that pins them. This follows `board-side-test-coverage` D4.

### D7. Hardware check
This change touches the install path (D2, D3), so the project rule asks for a board check, on V2.2 hote2. From a development build on the owner's data:
1. Build & Install to hote2.
2. Confirm it finishes "Installed" with the backup's location.
3. Confirm the Backups tab lists that backup as usable.

This shows that the extracted sequence behaves as before. The driver path is not exercised, because hote2's computer already has the driver.

## Risks / Trade-offs

- [The extraction changes the order of awaits or state updates] → Each body moves verbatim, with only the substitutions in D2. The unit tests pin the order of calls. The owner's install exercises the real path.
- [Stand-in arguments leak into production calls] → They are optional and default to the real calls. `ipc.ts` passes none.
- [FW20 compiles take minutes] → Two combined builds, gated as the existing build tests are.
