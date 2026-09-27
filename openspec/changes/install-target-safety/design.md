# Design

## Context

See proposal.md for why. The current state:

- **The board in the draft.** `draftModel` (`apps/desktop/src/renderer/src/saberModel.ts`) sets `board` from the saved model, or else `/v3/i` against the ProffieOS version string, which never names the board. So a new saber is always V2. `SaberConfigModel.board` is `'V2' | 'V3'`, used in 19 places, including the pin rules and the wiring fingerprint that the confirmation gate checks.
- **What the running board can tell.**
  - `version` prints the version, config file, prop, buttons and install time, and no board.
  - The USB product string is "Proffieboard" for V2 and V3 alike (`boards.txt`, core 4.6).
  - Only the bootloader proves the board: `dfu-util -l` shows the flash layout, parsed by `dfuInfo` in `apps/desktop/src/main/flash.ts`. The V2 (STM32L433) is 256 KB, the V3 (STM32L452) 512 KB.
- **Serials.**
  - The running saber's USB serial is the composite device's PnP instance id (`usb.ts`, `proffieSerials`). `board.ts` records it only when exactly one board is plugged in.
  - The ST bootloader has its own serial in its instance id. The spike's log (`spike/flash-log.json`, 2026-09-08, the owner's V2.2) holds `USB\VID_0483&PID_DF11\206033865232`, while hote2 runs as `209133815232`. The last four digits match and the first eight do not. So the two are related but not equal, and one sample does not give the rule.
- **Install.**
  - `installFlow.ts` skips the reboot whenever any bootloader is present (`flash.usb().bootloaderPresent`), whichever board it is.
  - `backupFlash` runs `dfu-util -d 0483:df11`, and `writeFirmware` runs `-d 1209:6668,0483:df11`. Neither says which device.
  - `restoreBackup` accepts 256 KB or 512 KB, whatever the board.
  - After the write, `board.connect(false)` opens the first granted port.
  - Main chooses the port in `select-serial-port` (`main/index.ts`) by vendor and product id only.
- **The build on the page.**
  - `Build.tsx` keeps `result` until the next build, while `model` follows every edit.
  - `writeFromBootloader` records the current `model` with the old build's manifest.
  - `build:preview` and `buildFirmware` both hash the generated config with the same `contentHash` (`gen.hash`, `result.configHash`).

## Goals / Non-Goals

**Goals:**
- Hardware facts decide the board and the target wherever they exist, and the owner decides the rest explicitly.
- Every refusal happens before anything is read from or written to the board, and says what to do.

**Non-Goals:**
- A board picker for editing (F4).
- A main-process check that the file is the current build (FW10).
- Leaving the bootloader automatically after a refusal (FW29). This change tells the owner how.

## Decisions

### D1. What Hiltwright knows about a saber's board lives on the saber record
`SaberRecord` gains:

```
bootloader?: { serial: string | null; flashBytes: number; board: 'V2' | 'V3'; at: string }
```

It is written only by the install and restore sequences, when they have seen this saber's bootloader (D4). It goes through a new `library.noteBootloader(id, …)` call, which main checks: a serial of at most 40 characters, and a flash size of 256 KB or 512 KB.

**Rejected:**
- *A field on `SaberIdentity`.* The identity is rebuilt from each normal connection and merged over the record, so every connect would have to carry it through. It also describes what the running firmware reports, which the bootloader is not.

### D2. How the model says its board is known
`SaberConfigModel` gains `boardFrom?: 'bootloader' | 'firmware' | 'owner'`.

**`draftModel` decides the board:**
- **From the bootloader:** if the saber's `bootloader` record exists, its board with `'bootloader'`. When the saved board differs, `boardCorrected: true` is set on the draft, for the Wiring note. The wiring confirmation lapses by itself, because the fingerprint includes the board.
- **From the firmware:** otherwise, if the saber's `firmware.wiring.board` equals the saved board, that board with `'firmware'`. A saber running Hiltwright firmware has had it built for that board.
- **From the owner:** otherwise, the saved model's `boardFrom`, if it is `'owner'`.
- **Not known:** otherwise, `board` stays as saved (or `'V2'` for pin tables), and `boardFrom` is absent.
- **The name hint:** `boardHint(configName)` returns V2 or V3 when the config file name contains `v2` or `v3` as a word part. It is shown as a suggestion only.

**Where the rule applies:**
- **`validateModel`** refuses a model without `boardFrom`: "Choose the board (Proffieboard V2 or V3) on the Wiring page."
- **On the Wiring page**, when `boardFrom` is absent, neither board button is pressed. A note says "Which Proffieboard is this? Check the label on the board (V2.2 or V3.x).", plus the hint when there is one. Pressing either button saves `boardFrom: 'owner'`.

**Migration:**
- hote2's model has a firmware record for V2, so it needs nothing.
- A saved model with no firmware record and no bootloader record asks once. In the owner's library, that is only the Darksaber.

**Rejected:**
- *Making `board` nullable.* 19 uses, pin tables and the fingerprint would all need a no-board branch, and the pin lists need a board to show anything.
- *Defaulting to V2 and relying on the install check.* The owner chose to ask.
- *Letting the config name choose.* A config name is whatever the installer called the file, and the stock `proffieboard_v3_config.h` is a pin header.

### D3. The board check at the bootloader
**What main reports:**
- `usbState()` also returns `bootloaders: { serial: string | null; driver; problem }[]` and `runtimeSerials: string[]`, from the same PnP query. A serial is the text after the last `\` of the instance id. An id containing `&` is Windows's generated id, which means no serial.
- `dfuInfo` returns one entry per `Found DFU:` line: its `serial="…"` and the flash bytes of its `@Internal Flash` layout.
- The board for a flash size comes from `boardForFlash(bytes)`: 262144 → V2, 524288 → V3, anything else → null.

**The check itself,** a new `flash.target(serial)` call, returns `{ serial, flashBytes, board }` for that one bootloader. The install flow checks the target before `flash.backup`:
- a null board: "Hiltwright does not recognise this board (its bootloader reports N KB). Nothing was written."
- a board different from `result.board`, which `BuildResult` gains from `model.board`: "This saber is a Proffieboard V3, but this firmware was built for a V2. Nothing was written. Choose V3 on the Wiring page and build again."
- either refusal adds "To bring the saber back to its firmware, press RESET on the board, or unplug it and plug it back in."

**The early check:** when the saber's `bootloader` record exists and its board differs from `result.board`, the same words are shown before the reboot. Nothing is touched.

**Restore** uses the same target check, and adds the backup's size against `target.flashBytes`: "This backup is from a Proffieboard V2 (256 KB); this saber is a V3. Nothing was written."

**Rejected:**
- *Checking only the size of the `.dfu` file.* A V2 build fits in a V3's flash, so size alone would pass the very case that matters.
- *Reading the board from the running firmware.* It does not report it.

### D4. Recognising this saber's bootloader
**Rebooting a connected saber:**
1. The flow notes the bootloader serials present before the reboot.
2. After the touch, it waits for a bootloader whose serial was not there before. When exactly one new one appears, it is this saber's.
3. It is recorded with `noteBootloader` after the target check passes.

The recorded serial becomes the target for backup, write and wait. When more than one new one appears at once, the flow stops (D6).

**A board already in its bootloader** (Install pressed with no saber connected, or the reboot skipped):
- **Exactly one bootloader, whose serial is this saber's `bootloader.serial`:** go on.
- **Exactly one bootloader, whose serial is another saber's recorded `bootloader.serial`:** stop with "The board in bootloader mode is <other>, not <this>. Nothing was written."
- **Exactly one bootloader, unknown or with no serial:** the page asks "Hiltwright has not seen this board in bootloader mode before. Is it <saber>?", with "Yes, it is <saber>" and Cancel. Confirming goes on. The pairing is recorded only after the write, when the saber comes back and its running serial is this saber's `identity.usbSerial`. An owner's mistaken answer is therefore never remembered.
- **More than one bootloader:** go on only if exactly one is this saber's. Otherwise stop (D6).

**A connected saber when a bootloader is already present:** the reboot still happens, and the target is the new serial from step 2. The existing bootloader belongs to another board.

**Rejected:**
- *Treating the bootloader serial as the running serial.* The spike shows they differ.
- *Deriving one from the other.* The rule is unknown from one sample, and 1.1 records a second. If 1.1 shows a fixed rule on both boards, it is noted, not relied on.
- *Refusing an unrecognised bootloader.* A board whose write failed can only sit in its bootloader, and refusing would strand it. The owner confirms instead.

### D5. A build goes stale; the record is what was built
**The page:**
- `Build.tsx` keeps `built: { model, result }` from the model passed to `build.run`.
- The build is current while `preview.hash === built.result.configHash`. The preview is regenerated from the current model on every change, and both use `contentHash` of the same generated text. Changing something back makes it current again.
- When it is stale, the Build step shows "Out of date" and "The setup changed after this build. Build again to install it.", and Install is locked. Building again usually reuses the cache, so it is quick.

**The install:**
- `InstallJob.model` is `built.model`.
- `expectAfterInstall` uses `built.model.name`.
- The record after the install is `built.model` with the build's manifest.

**Rejected:**
- *Rebuilding silently when Install is pressed.* A minute of compiling behind an install click, and a different image from the one the owner saw built.
- *Comparing the whole model.* It contains fields that do not change the firmware (the wiring confirmation), and would mark builds stale for nothing.

### D6. Several boards: one target, one reconnect
**The target.** `backup`, `write` and `restore` take the target serial and run:

```
dfu-util -d 0483:df11 -S <serial> …
```

The runtime id pair (`1209:6668,…`) is dropped, so dfu-util can never detach another running board. A bootloader with no serial is used only when it is the only bootloader present.

**Refusals, before anything is read:**
- Two bootloaders appear after one reboot: "More than one board is in bootloader mode. Unplug the other Proffieboards, then press Install again."
- Two or more bootloaders are present and none is known as this saber: the same words.

**The reconnect:**
- The install flow calls `board.connect(false, { serial: saber.identity.usbSerial })`.
- `board.ts` passes the serial to main (`usb.wantSerial(serial)`), then calls `requestPort`.
- Main's `select-serial-port` picks the port whose USB serial is the wanted one. It uses `SerialPort.serialNumber` when Electron fills it. Otherwise it maps the port's device instance id to its composite parent's serial through PnP (`DEVPKEY_Device_Parent`). Task 1.1 records which of the two works.
- The identity read on that connection takes the wanted serial, not null. That makes the reconnect match the right record with two boards plugged in.
- When the saber has no recorded serial, the reconnect runs as today. If the saber reached is not the installed one, the page says "Installed on <saber>. Reconnected to <other>, which is also plugged in."

**Rejected:**
- *Refusing whenever two boards are plugged in.* The owner chose targeting, and the `v3-verification` two-board step needs it.
- *Choosing the port in the renderer.* Web Serial gives the page only the vendor and product id.

### D7. Checks
**Hardware facts first (1.1).** They set the parsing and the port mapping:
- both boards' bootloader serials next to their running serials
- a `dfu-util -l` listing with two bootloaders
- Electron's `select-serial-port` port list with both boards running

**Unit tests:**
- `apps/desktop/test/flash.test.ts` (new): listing parsing, `boardForFlash`, serial from instance id, dfu-util arguments with `-S`
- `installFlow.test.ts`:
  - each D3, D4 and D6 refusal, with nothing written
  - the pairing recorded after a reboot
  - the pairing not recorded after a mistaken confirmation
  - the early refusal with no reboot
  - the built model recorded
  - the reconnect asking for the serial
- `draftModel.test.ts`:
  - BST-3 becomes a normal test ("suggests V3, chooses neither")
  - the board from each source
  - the corrected board
- `generate.test.ts`: the refusal without a board
- `library.test.ts`: `noteBootloader` validation
- `serialGate.test.ts`: choosing a port by serial

**Development run:** no board.

**Hardware:** on the V2.2 hote2 and the V3.9, by the owner.

## Risks / Trade-offs

- **[The bootloader's serial changes, or two boards report the same one]** → A duplicate serial looks like "another saber" or "never seen". Both stop or ask; neither writes silently.
- **[Electron gives no serial for a port, and the PnP parent lookup fails]** → The reconnect falls back to today's behaviour, and says which saber it reached. The install itself does not depend on the reconnect.
- **[An owner answers "Yes, it is <saber>" for the wrong board]** → The flash-size check still refuses a wrong board type. The same type gets the owner's firmware for that saber, as they asked, and the backup is taken first. The answer is never remembered as a pairing (D4).
- **[Older firmware records named the wrong board]** → A saber whose record says V2 but whose bootloader says V3 is corrected at the next install (D2). The install's check stops the write first.

## Migration Plan

- **Existing saved models:** each gets `boardFrom` when drafted (D2). Only a model with neither a firmware record nor a bootloader record asks the owner, once.
- **Existing records:** those without `bootloader` learn it at their next install.
- **Rollback:** an older build ignores the new record fields, and ignores `boardFrom` on the model.
