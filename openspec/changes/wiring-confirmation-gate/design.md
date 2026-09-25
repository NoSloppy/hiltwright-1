# Design

## Context

See proposal.md for why. The code as it stands (`beta-1-roadmap` at 79c49db):

- **FW1 (where the stamp is lost).** The confirmation is a bare timestamp, `SaberConfigModel.wiringConfirmedAt` (`packages/core/src/config/generate.ts:49`).
  - The IPC model validator keeps it, and it does reach the saber record.
  - It is lost because `draftModel` (`apps/desktop/src/renderer/src/saberModel.ts`) rebuilds the working model from the record's fields and never copies it. Every page reads that working model (`workspace.ts`: `model = draftModel(info, saber)`).
  - Reproduced on 2026-09-24 at the model level (`baseline-firmware` task 7.2).
- **FW2 (three copies of the rule).** Each place decides "confirmed" for itself:
  - Wiring (`Wiring.tsx:41`): stamp, or firmware plus blades equal to the autosaved record, which is always true.
  - Build & Install (`Build.tsx:93`): stamp, or any firmware.
  - The Armory rail, `flowStatus`/`nextStep` (`workspace.ts:48,60`) and `App.tsx:239`: stamp, or any firmware.

  The firmware record (`FirmwareManifest`, `packages/core/src/looks.ts`) holds no board or blades to compare against. Its IPC validator (`apps/desktop/src/main/ipc.ts:78-88`) rebuilds it field by field, so a new field has to be added there too.
- **Build & Install's own switch.** It saves a fresh stamp through `ws.saveModel` (`Build.tsx:94`), so it is lost in the same way.
- **Development hook.** The build end-to-end hook also writes the stamp (`Build.tsx:237-243`).

## Goals / Non-Goals

**Goals:**
- One stored confirmation that says what it confirmed, one rule to read it, and every page using that rule.
- The firmware record keeps the layout it was built for, which `install-target-safety` needs next.

**Non-Goals:**
- Main-process enforcement of the confirmation at install (FW10, `install-safety-nets`).
- Checking the wiring itself for problems (`wiring-validation`).
- Blade ID variants withdrawing the confirmation (`blade-id-verification`).
- The 300 ms autosave that can lose a last edit (FW22, `wiring-validation`).

## Decisions

### D1. The confirmation records what it confirmed
The bare `wiringConfirmedAt` is replaced by `wiringConfirmation: { at, layout }`, where `layout` is a fingerprint of the board and blades at the moment of confirming. The wiring counts as confirmed exactly when the current layout's fingerprint equals the confirmation's.
- A change to the board or a blade withdraws it automatically, on every page, with no page having to remember to clear it.
- Turning the switch off removes it.
- A successful install needs a matching confirmation, so after an install the confirmation still matches until the owner changes something. That is "installed wiring counts as confirmed until changed", without a second rule.
- *Rejected:* keep the timestamp and also accept "installed and unchanged since install". That gives two sources of truth, a switch that cannot be turned off on an installed saber (FW2's third symptom), and a rule each page would have to combine the same way.
- *Rejected:* store the confirmed layout on the firmware record only. Sabers never installed (the FW1 case) would have nowhere to keep it.

### D2. The fingerprint covers the board and the blades exactly as stored
The fingerprint is a content hash of the board and the full blade list, with object keys in a fixed order. It reuses the config generator's `contentHash`.
- Anything in a blade's description changes it: pixels, kind, colour order, parallel strips, LED templates, pins, chaining, role.
- Buttons, prop and presets are not part of it, because they cannot put power on the wrong pin. The current Wiring page already leaves them out.
- *Rejected:* a hand-picked list of "wiring-relevant" fields. It would drift as the blade model grows, and a missed field is a silent safety gap. Re-confirming after a role change is a small cost.

### D3. The firmware record keeps the installed layout
`generateConfig`'s manifest gains `wiring: { board, blades }`, the layout the firmware was built for. The IPC validator accepts and keeps it, within size limits. It records what is on the saber (for `install-target-safety` and for the owner), and does not decide confirmation.
- *Rejected:* store only the fingerprint on the record. `install-target-safety` needs the board, and a future "what changed since install" view needs the blades.

### D4. One pure function, in core
`wiringConfirmed(model)` and `wiringFingerprint(board, blades)` live in `packages/core` next to the model type. Wiring, Build & Install, `flowStatus`, `nextStep` and the Armory's step marks all call it, and nothing else decides.
- *Rejected:* a renderer helper. Core is where the model and its tests live, and a later main-process check (FW10) can call the same function.

### D5. Old confirmations do not count
A record carrying only the old `wiringConfirmedAt`, or a saber installed before this change, has no layout, so it reads as not confirmed. The owner confirms it once. The old field is dropped at the next save.
- *Rejected:* treat an installed saber's saved blades as its confirmed layout. Those blades are the autosaved draft, not what was installed, which is exactly FW2.

### D6. `draftModel` carries the confirmation
`draftModel` copies `wiringConfirmation` from the saved model like the other saved fields. Build & Install's switch and the development hook write the new field through the same core helper.

### D7. Verifying in the real app without touching the owner's library
The app has no way to point at a separate data folder, so driving the real page would add test sabers to the owner's library. A development-only `HILTWRIGHT_USER_DATA` override sets the app's data folder before start-up, and is ignored in packaged builds. That is enough to plan a saber, confirm, build and watch the rail and Build & Install, all without a board. Install itself needs a board, so it is covered by the hardware check (task group 5).
- *Rejected:* using the owner's real library and cleaning up after. Not safe to do to someone's data.
- *Rejected:* screen tests. The app has no component-test setup yet (see the baselines).

## Risks / Trade-offs

- [hote2, and any saber confirmed before, will ask to be confirmed once] → Expected and correct (D5). The Wiring page says why: the confirmation now records what was checked.
- [Role changes now withdraw the confirmation] → Accepted (D2). Better one extra click than a gap.
- [Record fields grow the saber file] → The layout is a few hundred bytes per saber, and the IPC validator caps it.

## Migration Plan

No data migration step. Old `wiringConfirmedAt` values are ignored and dropped on the next save (D5). Firmware records without `wiring` stay valid. The next install adds it.
