# Beta 1 plan

Written 2026-11-14. Replaces the per-change OpenSpec cycle as the working plan for Beta 1.
The promise, audience and decisions in `openspec/changes/beta-1-roadmap` still stand.

## Where we are

- **Milestones:** M0 and M1 are done. M2 has 24 of 42 deliveries done: waves A, B and C are complete, wave D is 5 of 16. Waves E and F and M3 (ship) are untouched.
- **What the finished waves bought:** first installs work, nothing the owner makes is lost on a bad read, and the build, install and restore path is guarded. That was the dangerous half.
- **What is left:** 17 open changes, all proposal-only. None blocks a tester from installing a saber. They are mostly "the app says something untrue" fixes, credit and licence, and proof on hardware.
- **Code health:** 659 tests pass, typecheck is clean. `npm test` still exits with an error: `cardCopy.test.ts` leaves one unhandled rejection (`sd.ts:270`, "Stopped: the card is being given back").
- **V3:** a V3 build compiles through the app's own build path (checked 2026-11-14: 36% of the V3's flash, against 70% on the V2 for the same saber). Nothing past the compile has run on a V3: flashing, its SD access, its extra pins.
- **Never done:** a V3 flash or run. An install on a PC with Smart App Control. A packaged-installer run by anyone but the owner. There is no `LICENSE` file, and the version is still `0.1.0`.
- **Cost of the process:** `openspec/` holds about 206,000 words (155,000 in the archive) beside about 30,000 lines of source. Each change wrote a proposal, design, spec deltas and tasks, then archived and synced them, and waited on its own hardware check.

## What changes in how we work

1. **One checklist, this file.** No new proposals, designs, spec deltas, archives or syncs. `openspec/` stays as a frozen reference. Nothing is deleted.
2. **The existing proposal is the brief.** Each item below names its proposal and the finding ids to do. An agent gets that plus the files to touch and how done is checked.
3. **One commit per item**, with tests. I review every diff and run the full suite before it lands.
4. **Hardware checks are batched into three owner sessions**, not one per change.
5. **New ideas go to the Later list** at the bottom, one line each. Scope is held as before.

## Scope: ship, trim, defer

These are recommendations. Several reverse earlier owner decisions, so they need the owner's yes.

| Change | Call | Do for Beta 1 | Move to Beta 2 |
|---|---|---|---|
| v3-verification | Ship, moved first | Promise path on the V3 | The full scenario list |
| unsigned-install-guide | Ship, spike first | Spike, guide, blocked-tool message | |
| license-and-notices | Ship | LICENSE, About, notices, source link. SF30: the release link is enough | |
| style-attribution | Ship | ST13, ST14, ST16, ST17, ST40 | ST15 rename reach, ST18 |
| style-to-saber-fixes | Ship | ST3, ST4, ST5, ST6, HW-2026-09-26a | ST7 blade kinds |
| preset-history-restore | Ship | F33, F34 | |
| font-check-alignment | Ship | SF21, SF13, SF14 | |
| demo-sound-fidelity | Ship | SR10, SR11, SR13 | |
| preview-honesty | Trim | ST19, ST20, ST23, one plain "approximate" note | ST21 per-item reports, ST22 prop in 2D |
| editor-output-safety | Trim | ST33, ST34, and ST32 as a notice | ST32 separate settings |
| layout-fit | Trim | Fonts & SD, Font library, the screenshot script | Fixing other pages unless broken |
| sets-safety | Trim | HW-2026-09-24d never throws, confirm before replacing staged edits | Rename, duplicates, F39 |
| diagnostics-feedback | Trim | F6 confirm, F13, HW-2026-09-26c wording | F9, F11, F12 |
| demo-room-fixes | Trim | SR12 | SR9, SR6 |
| card-format | Trim hard | Show the file system, warn on exFAT and NTFS, say how to fix it | The formatter |
| pack-integrity | Defer | SR24 only, inside the notices item | Everything else |
| hardware-verification-v2 | Reshape | One session on the promise path and on what changed | The 150-scenario audit |

Reasons for the three largest cuts:
- **card-format:** a FAT32 formatter of our own, with administrator rights, is the riskiest new code on the list and can erase the wrong drive. A warning removes the silent failure.
- **pack-integrity:** Beta 1 ships one built-in hilt and no third-party packs, as its own non-goals say.
- **hardware-verification-v2:** testers are experts in a closed beta. Their job is the long tail. Ours is the promise path.

## Order of work

### Step 0: risks first (owner, about two hours, before most code)

The roadmap left these to the end. They are the only items that can still move the date.

- [x] **V3 smoke:** backup, install, reconnect, one live preset edit, restore. Done 2026-11-18 except the live preset edit; see the hardware checklist.
- [x] **Smart App Control spike:** done 2026-11-18 on the owner's PC. With it on, Windows blocks the unsigned installer and the installed app, with no way to allow them; a build from the development app still worked, so the downloaded compiler is not blocked. Decision: ship unsigned with instructions.
- [x] Decide the scope table above. Accepted by the owner, 2026-11-14.

### Step 1: four lanes in parallel

Lanes share few files. Each runs in its own worktree and I merge.

**Lane A, presets and the saber (Opus).** Wrong here writes the wrong thing to a saber.
- [x] A1 style-to-saber-fixes
- [x] A2 preset-history-restore
- [x] A3 sets-safety (trimmed, Sonnet)

**Lane B, styles and preview (Opus, then Sonnet).**
- [x] B1 preview-honesty (trimmed, Opus: simulator and evaluator)
- [x] B2 editor-output-safety (Sonnet: catalogue check and compile tests)
- [x] B3 style-attribution (Sonnet)

**Lane C, fonts, card and demo (Sonnet, one Opus item).**
- [x] C1 font-check-alignment (Sonnet)
- [x] C2 card file system warning (Sonnet)
- [x] C3 layout-fit (Sonnet, judged from offscreen screenshots)
- [x] C4 demo-sound-fidelity (Opus: a port of `hybrid_font.h` behaviour)
- [x] C5 demo-room SR12 (Sonnet)

**Lane D, release (Haiku and Sonnet).**
- [x] D1 fix the unhandled rejection in `cardCopy.test.ts` (Sonnet)
- [x] D2 `LICENSE`, third-party notices generated from dependencies, pack font credits (Haiku)
- [x] D3 About screen with licence and tagged-source link (Sonnet)
- [x] D4 diagnostics-feedback (trimmed, Sonnet)
- [x] D5 install guide and blocked-tool message, from the spike's notes (Sonnet)
- [x] D6 version `0.2.0-beta.1`, release notes, what is hidden (Haiku)
- [x] D7 Later list: one line per deferred finding, from the open proposals (Haiku)

### Step 2: one hardware session on hote2 (owner; the checklist is `docs/beta-1-hardware-checklist.md`)

- [x] The promise path end to end from a packaged build Run from the development build, not the packaged one.
- [x] Each Lane A fix: "Use it in" staged and live, move then restore, a set with a missing style
- [x] Six styles side by side with the preview: two built-in, two pasted, two built
- [x] Listening: a SmoothSwing font and a plain font in the demo room, melt, pre-on and post-off
- [ ] The same short blade and install pass on the V3

Failures are fixed in the lane that owns them, then only the failed line is re-run.

### Step 3: dry run and ship

- [ ] Someone other than the owner installs from the packaged installer with only the guide
- [ ] Their notes: fix what breaks the promise, the rest goes to Later
- [ ] Tag, GitHub release with installer, guide and notes
- [x] Feedback channel and triage rule in the release notes GitHub Issues.
- [ ] Invite testers

## Who does what

| Model | Work | Why |
|---|---|---|
| Fable (me) | Briefs, review of every diff, merges, full test runs, hardware checklists, calls on scope | Holds the whole picture |
| Opus | A1, A2, B1, C4 | Saber-writing logic and firmware-faithful ports, where a subtle mistake costs a hardware session |
| Sonnet | A3, B2, B3, C1, C2, C3, C5, D1, D3, D4, D5 | Well-specified changes with tests |
| Haiku | D2, D6, D7 | Mechanical writing and extraction |

Rules for every agent: no board access, no app launch with a board connected, tests with the change, no scope beyond the brief, report what was not verified.

## Later (Beta 2 and after)

Existing: `board-side-polish`, `firmware-side-polish`, `sd-fonts-polish`, `styles-polish`, `showroom-polish`, `board-side-later`, `firmware-side-later`, `font-construction`, signing, Blade ID.
Added by this plan: the card formatter, `pack-integrity` apart from SR24, and the right-hand column of the scope table.
