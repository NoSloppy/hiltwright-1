# Design

## Context

- **The simulator** (`packages/core/src/sim.ts`):
  - `BladeSim(lookId, leds, seed)` runs a style frame by frame.
  - `trigger('clash' | 'blast', strength)`, `setLockup(type | null)` and `setAngle(deg)` drive it.
  - `LIBRARY_LOOKS` lists the built-in styles with their `roles`.
  - `sim.test.ts` tests clash, blast and lockup on Steady (`hw_blade`) only. Its "covers every look in the library" test checks only that values stay in range.
- **Clash placement:** `hitPos` places the clash by tilt with `ResponsiveClashL`'s default formula. The comment at `sim.ts` line 522 and the catalogue default (`proffieCatalogue.ts`) agree.
- **Measured before planning** (a scratch script, 132 LEDs, seed 7):
  - **Every blade style changes the frame under each effect.** For clash, blast and lockup, the largest change against an identical simulator without the effect was 0.19 or more. `hw_core`'s clash was the lowest, at 0.19; most were 0.9 or more.
  - **Clash on Steady:** the peak was at LED 26 pointing down (−80°), 64 level, and 29 pointing up (80°).
- **Saved styles** (`packages/core/src/lookSim.ts`):
  - `registerLookSim(look)` builds a simulator from a built style's `StyleDoc`, a tree, or pasted code (through its alias define when there is one). It returns false when that cannot be done, and the page then shows a flat bar.
  - It returns at once if the id already has a simulator.
  - The style editor, on save, calls `registerStyleSim(id, …)` directly (`StyleEditor.tsx`), which replaces the old one. That is how an edited style gets a fresh simulator.
- **The queued count:** `queuedLookIds` (`renderer/src/slotModel.ts`) is tested by the "6.14" tests in `apps/desktop/test/saberModel.test.ts`, and by the style-save-integrity tests after them.

## Goals / Non-Goals

**Goals:**
- One test per audited scenario still untested, named with its audit number.
- The evidence for 1.12 recorded against the existing tests.

**Non-Goals:**
- Changing the simulator, or the spec's 2.4 wording (STC-1, `preview-honesty`).

## Decisions

### D1. The same rule as the earlier coverage changes, with one addition
Where the code does what the spec says, a normal test pins it. Where it does not, `it.fails` states the spec and names the owning change.

**New here:** where the spec itself disagrees with the firmware, and the code follows the firmware, the test pins the firmware. The spec correction is filed with its owner. An `it.fails` stating a spec known to be wrong would hold the wrong behaviour up as the goal.

### D2. Effects on every blade style (1.2)
For each style in `LIBRARY_LOOKS` whose `roles` include `main`, two simulators are built with the same seed and ignited.
- One gets a clash, a blast, or a lockup. The other gets nothing.
- The frames are compared shortly afterwards (20 ms for clash and blast, 300 ms for lockup).
- The largest channel difference must be at least 0.15. That is under the lowest measured (0.19), and well above noise, which is 0 with equal seeds.
- **For the colour:** on Steady with default arguments, the clash and blast raise the red channel, the effect colour being white over blue. The existing tests already pin that.

**Rejected:**
- *Checking an exact colour per style.* The styles take their effect colours from arguments and layer them differently, so a per-style colour check would restate each style.

### D3. Clash by tilt (2.4)
On `hw_blade`, with the blade at −80°, 0° and 80°, the peak of a clash is found:
- level: past the middle third (more than 50 on 132)
- both raised and lowered: in the hilt quarter (fewer than 40)
- lowered: no further from the hilt than raised

The test names `ResponsiveClashL` and STC-1 in a comment.

### D4. Saved styles and the simulator (2.13)
A new `packages/core/test/lookSim.test.ts`:
- **Registering:** a pasted style (`StylePtr<Red>()`) and a built style (`defaultStyle()` as its `StyleDoc`) each register, can be simulated, and light the blade.
- **Refusing:** pasted text that is not a style does not register.
- **An edited style:** replacing a style's simulator as the editor does (`registerStyleSim` with the new version) makes a new `BladeSim` show the new colour.
- **Early return:** registering the same id again through `registerLookSim` keeps the current simulator. This pins the early return, so a later change that relies on `registerLookSim` to refresh must change it knowingly.

Each test unregisters its ids afterwards (`unregisterStyleSim`), so the registry stays clean between tests.

## Risks / Trade-offs

- **[1.2's threshold hides a style whose effect became faint]** → A style at 0.19 today would fail at 0.15 only if its effect nearly vanished, which is the regression this guards against.
