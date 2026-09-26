# Design

## Context

- **`toolchain.ts`:**
  - `defaultToolchainRoot` runs when `ipc.ts` registers, and `mkdirSync`s each candidate (`%ProgramData%\Hiltwright`, `%LOCALAPPDATA%\Hiltwright\tc`, `%SystemDrive%\Hiltwright`) to find one it can write. The folder therefore exists before the owner agrees to anything (FW32).
  - `installToolchain` downloads arduino-cli (`CLI_VERSION` 1.3.1), runs `core install proffieboard:stm32l4` (no version), and downloads `ProffieOS/archive/refs/tags/v8.10.zip`. None of it is checked.
  - `download` writes to `<dest>.part` and renames when finished, with no timeout and no way to stop it. `run` has only a total timeout.
  - `toolchainStatus` reads arduino-cli's version, but only checks that the core, GCC and ProffieOS folders exist. `proffieOSVersion` is the constant `PROFFIEOS_TAG` whenever `ProffieOS.ino` exists.
- **`build.ts`:** builds into `<toolchainRoot>\builds\<saberId>` (a private ProffieOS copy, the config, and `build\`). That is inside the shared folder.
- **The owner's PC** (read 2026-09-26):
  - `C:\ProgramData\Hiltwright` is owned by `BUILTIN\Administrators`, because it was created by an elevated run. It inherits `BUILTIN\Users:(I)(OI)(CI)(RX)` and `BUILTIN\Users:(I)(CI)(WD,AD,WEA,WA)`: every standard user can create files and folders anywhere in it.
  - Its build folders are owned by `safwyl`.
  - The installed core is `stm32l4\4.6`.
  - The local downloads hash to:
    - `arduino-cli_1.3.1_Windows_64bit.zip`: `cfece6f356fdc9ca003cc3f0a488470030719c8e0e7bfce5e42ac9410d87441f` (17,736,240 bytes)
    - `ProffieOS-v8.10.zip`: `454f2374960ab517b087cb63b438688bc4b5f4b4f2458335afca398d34938dae` (4,760,062 bytes)
- **The Build panel** shows the setup only when the toolchain is not ready. A toolchain that is ready at a path that is too long is shown as ready (FW36). The too-long sentence names `HILTWRIGHT_TOOLCHAIN_DIR` (FST-2).

## Goals / Non-Goals

**Goals:**
- Every tester gets byte-identical tools, or the setup stops and says why.
- Nothing outside the owner's control and the administrators' can change what the compiler and flasher run.
- A build never trips over files another run wrote.

**Non-Goals:**
- macOS and Linux.
- Migrating or deleting old shared builds.
- Auditing files already present.
- Choosing a folder from the app.

## Decisions

### D1. Pins, checked before use
The pins, in `toolchain.ts`:
| Part | Pin |
|---|---|
| arduino-cli | `CLI_SHA256` for `arduino-cli_1.3.1_Windows_64bit.zip` |
| ProffieOS source | `PROFFIEOS_SHA256` for the v8.10 archive |
| Board support | `CORE_VERSION = '4.6'` |

- **Where the hashes come from.** The two hashes are taken from the owner's working downloads. Before they are committed, they are checked:
  - The arduino-cli hash against the checksums file on arduino-cli's GitHub release (`1.3.1-checksums.txt`).
  - The ProffieOS hash by a fresh download of the same URL.
- **The check.** `verifiedDownload(url, dest, sha256, …)` downloads with `download`, then hashes the file. On a mismatch it deletes the file and throws "The <part> download is not the file Hiltwright expects, so it was not used." Only a verified file is unpacked.
- **The core.** The setup runs `core install proffieboard:stm32l4@4.6`. arduino-cli keeps one version per platform, so this replaces any other. The core archives themselves are checked by arduino-cli against the board index's own checksums.

**Rejected:**
- *Downloading ProffieOS by commit instead of tag.* The tag archive is what the owner's working install used, and the hash pins its exact bytes whichever way the tag moves.
- *Bundling the toolchain in the installer.* It adds about 360 MB to every download, and the licences of the parts need care. That is out of scope here.

### D2. Versions read back
`toolchainStatus` reports `versions: { cli, core, proffieOS }`:
- **cli:** from `arduino-cli version`, as today.
- **core:** the version folders under `hardware/stm32l4`. `findDfuUtil` looks only in the pinned one.
- **proffieOS:** from `<osDir>/.hiltwright-source.json` (`{ tag, sha256 }`), written after a verified unpack.

`ready` requires all three to equal the pins, and the path not to be too long.

On the owner's PC the ProffieOS source has no stamp. So the next setup re-fetches and verifies it (4.7 MB) and replaces `osDir`. arduino-cli and the core already match.

### D3. Stalls, cancelling, one setup at a time
- **Stalls.** `download(url, dest, onLine, { signal, stallMs = 60000 })` passes an `AbortSignal` to `fetch`, and aborts when no chunk has arrived for `stallMs`, with "The download stalled". `.part` is never renamed.
- **Cancelling.** `run(…, { signal })` kills the child on abort. `installToolchain(root, onLine, sys, signal)` passes the signal to every download and command, and checks it between steps.
- **One at a time.** `ipc.ts` keeps one `AbortController` and one running promise. `toolchain:install` returns the running promise if there is one (joining it). `toolchain:cancel` aborts it. The panel shows Cancel while installing.

### D4. The folder: created on setup, locked, repaired (FW32)
- **Choosing the folder without creating it.** `plannedToolchainRoot()` chooses from the same candidates without creating anything. The first candidate that already holds a toolchain wins, otherwise the first whose parent exists. `toolchainStatus` works on a folder that does not exist yet, as the install test already does.
- **Creating it.** `ensureToolchainRoot()` runs when the setup starts. It creates the folder, falling back to the next candidate when creation fails, then locks it.
- **Locking.** `lockFolder(root, elevate)` runs, with SIDs so it works on any Windows language:
  ```
  icacls <root> /inheritance:r /grant:r *S-1-5-18:(OI)(CI)F *S-1-5-32-544:(OI)(CI)F *<user SID>:(OI)(CI)F *S-1-5-32-545:(OI)(CI)RX
  ```
  The grants are SYSTEM, Administrators, the running user, and Users read-and-run.
  - The user SID comes from `[Security.Principal.WindowsIdentity]::GetCurrent().User.Value`.
  - When the plain call is denied (a folder owned by Administrators), and only for Repair, it runs the same command through `Start-Process -Verb RunAs`, the Windows approval, as the driver installer does.
- **Detecting an open folder.** `folderOpenToOthers(root)` reads the ACL with PowerShell `Get-Acl` and translates identities to SIDs. It reports true when Users (S-1-5-32-545), Authenticated Users (S-1-5-11) or Everyone (S-1-1-0) has any of: write, append, create files or folders, modify, or full control.
- **What the panel shows.** `toolchainStatus` reports `open`. When it is true, the panel says "Other Windows users on this computer could change the compiler Hiltwright uses." with **Repair**.

**Rejected:**
- *A per-user toolchain.* A user folder such as `C:\Users\<name>\AppData\Local\…` is often too long for GCC's headers, which sit 213 characters below the root.
- *Warning only.* The owner chose to lock.

### D5. Builds per user (HW-2026-09-25a)
`buildFirmware` takes `buildRoot`, which defaults to `%LOCALAPPDATA%\Hiltwright\b`. Each saber builds in `<buildRoot>\<saberId>`, created at the first build.
- **Path length.** Implementation measures the deepest path a build writes, relative to the saber folder. If `%LOCALAPPDATA%\Hiltwright\b` plus that depth exceeds 250 characters for the running user, the build root falls back to `%SystemDrive%\HiltwrightB\<first 8 hex of the user SID's SHA-256>`, locked to the user as in D4.
- **Old builds.** The old `<toolchainRoot>\builds` is left alone.
- **The cache.** The build cache (FW17 in `firmware-side-polish`) is keyed as before. The first build after this change makes a fresh private copy of ProffieOS, which takes seconds.

**Rejected:**
- *Keeping builds shared and repairing on EPERM.* The owner chose per-user builds.
- *Builds under `userData`.* `…\AppData\Roaming\@hiltwright\desktop\…` is long, and roams.

### D6. Too long, stated plainly (FW36, FST-2)
`toolchainBlockers` keeps its shape. `pathTooLong.panel` becomes: "This folder's path is too long for the compiler on Windows: <n> characters, where at most 40 fit. The compiler's own files sit about 213 characters deeper, and Windows stops at 259." It names no development switch.

The panel shows the blocker whenever `pathTooLong` is set, ready or not, and `ready` is false then (D2). The FST-2 expected-failure test becomes a normal test.

### D7. Docs (FW28)
Docs 00 and 02 are brought in line with the code:
- the path limit is 40 (not 120)
- about 1.7 GB on disk and 360 MB of downloads
- the driver helper is ProffieOS's `proffie-dfu-setup.exe`, not libwdi
- the toolchain lives in `%ProgramData%\Hiltwright`, with builds per user
- 83% (starter looks, V2) and 70% (SA22C, the first flash) are two different builds

### D8. Checks
- **Unit tests,** in `toolchainSetup.test.ts` with the fake `sys` and stubbed `fetch`:
  - a mismatched arduino-cli or ProffieOS download is deleted, not unpacked, and the setup stops naming the part
  - the stamp and the core version drive `ready`
  - `pathTooLong` makes a finished toolchain not ready
  - the FST-2 text
  - a stalled download aborts after `stallMs` (set short in the test)
  - a cancel aborts a running download and leaves no file under its real name
  - `setupOnce` joins a running setup
  - `plannedToolchainRoot` creates nothing
- **Windows-only,** skipped elsewhere:
  - a temp folder granted `Users` write is reported open
  - `lockFolder` without elevation (the folder belongs to the test user) makes it not open, and leaves the user full control
- **Gated** (`HILTWRIGHT_INSTALL_TEST`), run by Claude: a fresh setup from nothing into a temp folder checks the real downloads against the pins, reads back 1.3.1, 4.6 and v8.10, and compiles into a temp build root. This also measures the deepest build path for D5.
- **Owner:**
  - On their PC, the panel flags the open `C:\ProgramData\Hiltwright`. Repair asks Windows for approval and then reports it locked, and `icacls` shows Users `(RX)` only.
  - Build & Install to V2.2 hote2 from the per-user build folder. It finishes "Installed", and the build lands under `%LOCALAPPDATA%\Hiltwright\b`.

## Risks / Trade-offs

- [GitHub regenerates the v8.10 archive and its hash changes] → The setup stops with "not the file Hiltwright expects" instead of installing something unverified. The pin is updated in a release. GitHub has committed to stable archives since 2023.
- [Locking stops another Windows user from repairing or updating the toolchain] → They see the same panel, and Repair asks for administrator approval. On a family PC, one account sets it up.
- [`icacls` propagation leaves a child with explicit permissions open] → The check reads the root only. The Windows-only test confirms that children with inherited permissions follow. Explicit child permissions are a non-goal (auditing).
- [A long Windows user name pushes the per-user build path over the limit] → The fallback in D5.
