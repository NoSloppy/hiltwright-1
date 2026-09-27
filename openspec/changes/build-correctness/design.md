# Design

## Context

- **`build.ts`:**
  - `FLASH_BYTES = { V2: 262144, V3: 524288 }`. The board support's `boards.txt` (core 4.6) declares `ProffieboardV3-L452RE.upload.maximum_size=507904` and 262144 for V2.
  - arduino-cli's JSON result gives `executable_sections_size` entries, which carry `max_size` where the board declares one. Only `size` is read today.
- **The order of writes (FW16).** `buildFirmware` calls `validateModel` first, but writes `<saberDir>/<model.name>.h` before it checks the errors. `validateModel` does refuse a name that is not `[A-Za-z_][A-Za-z0-9_]*`, but only after the write.
- **`translateErrors`** recognises flash overflow, a wrong board, "cannot be combined", fewer styles than blades, a blade table mismatch, a broken install and parse errors, then falls back to the first error line. Two things are missing:
  - `presetNames` is passed and ignored.
  - The "cannot be combined" and "Preset* to BladeBase*" patterns have no test.
- **`generate.ts`** writes names into comments raw, in three places:
  - `/* ${l.name} */` before a pasted style's code
  - `// Look "${l.name}" (${l.by}):` above its header
  - `// ${r.name}` after a Blade ID row, with only line breaks stripped

  Preset names, fonts and tracks go through `quote()` and are safe.
- **The props' own rules.** ProffieOS's props state their option conflicts as `#if <condition>` then `#error <sentence>`. `saber_fett263_buttons.h` has 31 of them, in three forms:
  - `defined(A) && defined(B)`
  - `defined(A) && !defined(B)`
  - `defined(A) && NUM_BUTTONS == n` (or `< n`)
- **The unhandled throw (HW-2026-09-25b).** `Build.tsx`'s `build` callback awaits `api().build.run` with no `catch`, and `build:run` rethrows. A throw (EPERM, and so on) left the step on "building" with the timer running.

## Goals / Non-Goals

**Goals:**
- Numbers and messages the owner can trust and act on.
- No input the app accepts can break the generated config or write outside the build folder.

**Non-Goals:**
- The build cache.
- Pin checks (FW6).
- A full C++ error explainer.

## Decisions

### D1. Real capacity (FW13)
- `FLASH_BYTES` becomes `{ V2: 262144, V3: 507904 }`, from `boards.txt` for core 4.6, which the toolchain now pins.
- After a compile, the capacity is the `max_size` arduino-cli reports for `.text` (or `text`) when present, else the table. `BuildResult.flashBytes` carries the value used.
- The cached result stores it, so a cached build reports the same.

### D2. Safe comments (FW15)
`commentSafe(s, kind)` in `generate.ts`:
- **Line comments:** line breaks become spaces, and trailing backslashes are removed.
- **Block comments:** also, `*/` becomes `* /`.

It is used at the three sites. The manifest keeps the real names. The header's JSON sits inside a block comment and `JSON.stringify` does not escape `/`, so `*/` in it is replaced with `*\/` (still valid JSON, which `readGeneratedHeader` reads back unchanged).

**Rejected:**
- *Refusing such names.* Library style names come from pasted text, and the owner should not have to rename them.

### D3. Where an error comes from (FW14)
- **The line map.** `generateConfig` returns `slotLines: { line: number; endLine: number; preset: number; blade: number; lookId: string; lookName: string }[]`. These are the 1-based lines of the config text that each preset slot's style occupies, counted after the header is added.
- **Reading it back.** `translateErrors(stderr, { configFile, slotLines, presetNames })` finds the first `<configFile>:<line>:<col>: error:` or `… note:` that falls inside a slot. It puts `In preset "<name>", blade <n>, style "<lookName>":` before the headline it would have given, or before the compiler's message when none matched.
- **Untested patterns.** Tests cover every pattern, including "cannot be combined" and "Preset* to BladeBase*".

### D4. The prop's own rules, before compiling (FW14)
`propRuleProblems(propFileText, defines, numButtons)` in `build.ts` scans for `#if <cond>` directly followed by `#error <text>`. It evaluates only conditions made of `defined(X)`, `!defined(X)`, `NUM_BUTTONS <op> n` and `&&`, and skips anything else as unknown, so it never guesses.
- **The inputs.** `defines` are the names defined in the generated config's `CONFIG_TOP`, plus the ones `ProffieOS.ino` defines implicitly that matter here (`ENABLE_ALL_EDIT_OPTIONS` is emitted by the generator, so it is already in the set).
- **What the owner sees.** A true condition gives the `#error` sentence, trimmed of any path, as a problem. The build stops before compiling, as a model error does.
- **Where the rules come from.** The prop file is read from the installed `ProffieOS/props/<file>.h`, named by the generator's prop include. If it cannot be read, the check is skipped: the compiler still catches the conflict, and the translation still explains it.

**Rejected:**
- *A hand-kept table of conflicts.* It goes stale when ProffieOS changes, and the prop file is the authority.

### D5. Check first, write inside (FW16)
- `buildFirmware` returns the model errors before creating or writing anything.
- Every write path is resolved and checked to be under `saberDir`. The saber id is already sanitised; the config name is checked by `validateModel`, and again by the path check as a second line of defence.

### D6. A thrown build ends as failed (HW-2026-09-25b)
- **The page.** `Build.tsx`'s `build` wraps the call in `try/catch`. On a throw it:
  - sets `step: 'failed'`
  - shows the message without the IPC wrapper ("Could not build: <reason>")
  - sets a `BuildResult`-shaped failure, so Save diagnostics appears
  - logs it
- **Main.** `build:run` keeps rethrowing, so the run log still records the handler's failure (the `logged` wrapper), but the page no longer leaves it unhandled.

### D7. Checks
- **Core,** in `packages/core/test/generate.test.ts`:
  - A style named `Fire */ Blade` by `Kyber\`, and a Blade ID variant named with a line break and a trailing backslash: the config parses back with the same presets, `*/` appears only where the generator ends its own comments, and no comment line ends in a backslash.
  - `slotLines` point at each slot's style code.
- **Desktop,** in `apps/desktop/test/build.test.ts`:
  - `translateErrors` for every pattern, and for an error at a slot's line (names the preset, blade and style).
  - `propRuleProblems` on the real Fett263 prop text when `HILTWRIGHT_TOOLCHAIN_DIR` is set, with a fixture otherwise: `FETT263_SPECIAL_ABILITIES` with `FETT263_MULTI_PHASE`, and `FETT263_EDIT_MODE_MENU` without `ENABLE_ALL_EDIT_OPTIONS`.
  - `buildFirmware` with the name `../../x` returns the error and writes nothing (the temp build root stays empty).
  - The capacity: V3 uses 507,904.
- **Gated compiles** against `C:\ProgramData\Hiltwright`, run by Claude:
  - a V2 model with the FW15 names compiles
  - a V3 build reports `flashBytes` from arduino-cli (507,904) and the matching percentage
  - a model with a deliberately broken pasted style fails, naming its preset, blade and style
- **Development run:** a thrown build (the build root made unwritable) ends "Stopped" with the reason and Save diagnostics, and the timer stops.
- **Owner:** Build & Install to V2.2 hote2 from a development build. It finishes "Installed", and the saber reports its version as usual.

## Risks / Trade-offs

- [The prop-rule parser misreads a condition] → It only evaluates the three simple forms, and skips anything else. The compiler remains the final check.
- [`max_size` is missing from arduino-cli's JSON] → The table from `boards.txt` is used.
- [The line map drifts from the text] → It is computed from the emitted text itself, and a test pins it.
