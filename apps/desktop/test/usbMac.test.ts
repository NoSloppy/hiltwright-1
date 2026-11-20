// macOS: the USB state read from the system's device registry (flash.ts usbStateFromIoreg). The sample is the shape
// `ioreg -r -c IOUSBHostDevice -l` prints: one block per device, properties as "key" = value, ids in decimal.

import { describe, expect, it } from 'vitest';
import { NATIVE_DRIVER, backAfter, describeBootloader, driverUsable, newBootloaders, usbStateFromIoreg } from '../src/main/flash';

const device = (name: string, vid: number, pid: number, serial: string | null, depth = '') => [
  `${depth}+-o ${name}@01100000  <class IOUSBHostDevice, id 0x100000a01, registered, matched, active, busy 0 (5 ms), retain 20>`,
  `${depth}  | {`,
  `${depth}  |   "sessionID" = 1234567890`,
  `${depth}  |   "idProduct" = ${pid}`,
  `${depth}  |   "USB Product Name" = "${name}"`,
  ...(serial ? [`${depth}  |   "USB Serial Number" = "${serial}"`, `${depth}  |   "kUSBSerialNumberString" = "${serial}"`] : []),
  `${depth}  |   "idVendor" = ${vid}`,
  `${depth}  | }`,
  `${depth}  | `,
].join('\n');

const HUB = device('USB3.0 Hub', 0x05e3, 0x0612, null);
const RUNNING = device('Proffieboard', 0x1209, 0x6668, '357A38753532');
const BOOT = device('STM32  BOOTLOADER', 0x0483, 0xdf11, '357A38753532', '  ');

describe('USB state on macOS', () => {
  it('sees nothing in an empty listing or one with only other devices', () => {
    expect(usbStateFromIoreg('')).toMatchObject({ runtimePresent: false, bootloaderPresent: false, bootloaders: [], runtimeSerials: [] });
    expect(usbStateFromIoreg(HUB)).toMatchObject({ runtimePresent: false, bootloaderPresent: false });
  });

  it('finds a running board and its serial', () => {
    const s = usbStateFromIoreg(`${HUB}\n${RUNNING}`);
    expect(s).toMatchObject({ runtimePresent: true, bootloaderPresent: false, runtimeSerials: ['357A38753532'], runtimeNoSerial: 0 });
  });

  it('finds a board in its bootloader, under a hub, ready with no driver step', () => {
    const s = usbStateFromIoreg(`${HUB}\n${BOOT}`);
    expect(s.bootloaders).toEqual([{ serial: '357A38753532', driver: NATIVE_DRIVER, problem: null }]);
    expect(s).toMatchObject({ runtimePresent: false, bootloaderPresent: true, bootloaderDriver: NATIVE_DRIVER });
    expect(describeBootloader(s)).toEqual({ ok: true, text: 'Bootloader ready.' });
    expect(driverUsable(s.bootloaderDriver)).toBe(true);
  });

  it('counts a running board that gave no serial, as Windows does', () => {
    const s = usbStateFromIoreg(device('Proffieboard', 0x1209, 0x6668, null));
    expect(s).toMatchObject({ runtimePresent: true, runtimeSerials: [], runtimeNoSerial: 1 });
  });

  it('follows one saber through a reboot into the bootloader and back', () => {
    const before = usbStateFromIoreg(RUNNING);
    const inBoot = usbStateFromIoreg(BOOT);
    expect(newBootloaders(inBoot, before.bootloaders.map((b) => b.serial)).map((b) => b.serial)).toEqual(['357A38753532']);
    expect(backAfter(inBoot, '357A38753532', 0)).toBe(false);
    expect(backAfter(usbStateFromIoreg(RUNNING), '357A38753532', 0)).toBe(true);
  });

  it('still asks Windows for WinUSB, and takes nothing else as a driver', () => {
    expect(driverUsable('WinUSB')).toBe(true);
    expect(driverUsable(null)).toBe(false);
    expect(driverUsable('usbccgp')).toBe(false);
  });
});
