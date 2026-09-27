# Tasks

## 1. The config

- [x] 1.1 In `generate.ts`, add `commentSafe` and use it at the three comment sites (design D2). Add the FW15 test to `generate.test.ts`. Verify with `npm test` in `packages/core`.
  - **Result, 2026-09-26.**
    - `commentSafe(s, 'line' | 'block')` turns line breaks into spaces and drops trailing backslashes, and in a block comment writes `*/` as `* /`.
    - It is used for the style comment before pasted code, the `// Look "…" (…)` line, and the Blade ID row comment.
    - The header JSON writes `*/` with an escaped slash.
    - Both helpers are exported.

    The test passes: `Fire */ Blade` by `Kyber\` and a two-line blade name. The config parses back with the same preset names, no `//` line ends in a backslash, and the header still reads the look.
- [x] 1.2 Return `slotLines` from `generateConfig` (design D3), with a test that each entry points at its slot's style code. Verify with `npm test`.
  - **Result, 2026-09-26.** `generateConfig` returns `slotLines`, counted from the emitted text: the array's line, then per preset its `{ font, track,` line, each style's code lines, and the name. The test passes: an entry for every slot, the pasted style's line holds its code, each slot ends in `,`, and the line before a preset's first slot is its font line. 186 core tests pass.

## 2. The build

- [x] 2.1 In `build.ts`:
  - `FLASH_BYTES.V3 = 507904`
  - the capacity from arduino-cli's `max_size`, stored with the cached result (design D1)
  - model errors returned before any write, and every write path checked to be under `saberDir` (design D5)

  Add the tests of design D7. Verify with `npm test`.
  - **Result, 2026-09-26.**
    - `FLASH_BYTES.V3` is 507,904.
    - After a compile, the capacity is arduino-cli's `max_size` for `.text`, else the table. It is stored as `maxSize` with the cached result, and the build log says which ("capacity reported by arduino-cli").
    - `validateModel` runs before anything: an invalid model returns before the build root is even created.
    - An `inside()` check guards every write (the config, the sketch's config, the cache).

    Tests pass: `../../x` is refused with nothing written (the temp build root stays empty); `FLASH_BYTES` is `{ V2: 262144, V3: 507904 }`.
- [x] 2.2 Extend `translateErrors` to take the config file, `slotLines` and preset names, and to name the preset, blade and style (design D3). Test every pattern. Verify with `npm test`.
  - **Result, 2026-09-26.** `translateErrors(stderr, { configFile, slotLines, presetNames })` finds the first `<config>.h:<line>:<col>: error` (or `note`) inside a slot. It puts `In preset "<name>", blade <n>, style "<look>": ` before the headline, or before a generic line when nothing matched. The six old pattern tests pass without a context. The two untested patterns ("cannot be combined", "Preset* to BladeBase*") now have tests, and a slot-line error names "Valkyrie", blade 1 and its style. An error outside every slot is unchanged.
- [x] 2.3 Add `propRuleProblems` and run it before compiling, reading the installed prop file (design D4). Add its tests. Verify with `npm test`, and with the real prop text when the toolchain is present.
  - **Result, 2026-09-26.**
    - **The rules read.** `propRuleProblems` reads `#if` then `#error` pairs of `defined`, `!defined` and `NUM_BUTTONS <op> n` joined by `&&`, and skips `||` and anything else.
    - **Three-valued terms.** A term is true if the config defines it, and unknown if `ProffieOS.ino` or the prop could define it themselves (which covers, for example, `MOUNT_SD_SETTING`). A rule counts only when every term is known true, so it never refuses a build the compiler would accept.
    - **Where it runs.** The generated config's prop include names the file, read from the installed `ProffieOS/props`. A conflict stops the build before compiling, with the prop's own sentence.

    Tests pass:
    - with a fixture: combined options, a missing required option, a button rule, a path-trimmed message, an `||` rule skipped, and an uncertain define not refused
    - with the real Fett263 prop in 3.1
- [x] 2.4 In `Build.tsx`, a thrown build ends as failed with the reason and Save diagnostics (design D6). Verify with `npm run typecheck`, and in 3.2.
  - **Result, 2026-09-26.** `build` in `Build.tsx` catches a throw. It ends the step `failed`, with the red note "Could not build: <reason>", which carries Save diagnostics, and logs `[build] threw`. The type check is clean. See 3.2.

## 3. Checks

- [x] 3.1 Gated compiles against `C:\ProgramData\Hiltwright` (design D7), run by Claude. Verify that:
  - the V2 model with the FW15 names compiles
  - the V3 build reports 507,904 and the matching percentage
  - a deliberately broken pasted style fails, naming its preset, blade and style
  - **Result, 2026-09-26.** Against `C:\ProgramData\Hiltwright`:
    - **The prop rule:** the real Fett263 prop's rule stopped `FETT263_SPECIAL_ABILITIES` with `FETT263_MULTI_PHASE` before compiling, with no compiler output.
    - **FW15:** the style named `Fire */ Blade` by `Kyber\` compiled.
    - **V3:** 224,336 of 507,904 bytes, 44%. The build log said "capacity reported by arduino-cli", added so the source is visible, and the test asserts it.
    - **The broken style:** "In preset "Valkyrie", blade 1, style "Broken on purpose": The compiler did not understand part of the config: error: 'Layerz' was not declared in this scope; did you mean 'Layers'?"
- [x] 3.2 Development run with no board, on a scratch folder, with the build root made unwritable. Verify that Build ends "Stopped" with the reason and Save diagnostics, and the timer stops.
  - **Result, 2026-09-26.** A development switch, `HILTWRIGHT_BUILD_ROOT` (packaged builds strip it), pointed the build root at a file, so the build threw `ENOTDIR` at its first `mkdir`. It used the scratch folder with the remembered hote2, `fake:build`, and no board.
    - **The step:** Build firmware ended at "Stopped", with no seconds counter, and still "Stopped" 2.5 s later.
    - **The note:** "Could not build: ENOTDIR: not a directory, mkdir '…not-a-folder'", with Save diagnostics.
    - **The log:** it has the handler's `[ipc] build:run failed` and the page's `[build] threw`, with no unhandled rejection.
- [ ] 3.3 Hardware check on V2.2 hote2, by the owner, from a development build. Verify that Build & Install finishes "Installed" and the saber reports `v8.10 hiltwright <sha>`.
- [x] 3.4 Run `npm test` and `npm run typecheck`; verify both pass.
  - **Result, 2026-09-26.** 186 core and 266 desktop tests pass (13 gated skipped), and the type check is clean in both workspaces.
- [ ] 3.5 After archive, tick roadmap task 3.14 in `openspec/changes/beta-1-roadmap/tasks.md`; verify the tick.
