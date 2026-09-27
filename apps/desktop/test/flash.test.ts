// Which board a bootloader is, and which one dfu-util talks to (install-target-safety, design D3 and D6). The listings
// are the ones taken from the owner's V2.2 hote2 and V3.9, both in their bootloaders together (task 1.1).

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const calls: string[][] = [];
let listing = '';
vi.mock('../src/main/toolchain', () => ({
  toolchainPaths: () => ({}),
  findDfuUtil: async () => 'dfu-util.exe',
  run: async (_exe: string, args: string[]) => {
    calls.push(args);
    if (args[0] === '-l') return { code: 0, stdout: listing, stderr: '', ms: 1 };
    const u = args.indexOf('-U');
    if (u >= 0) writeFileSync(args[u + 1], Buffer.alloc(16));
    return { code: 0, stdout: 'Download done.', stderr: '', ms: 1 };
  },
}));

const { backupFlash, backupSizeMismatch, boardForFlash, dfuDeviceArgs, flashTarget, newBootloaders, parseDfuList, pickDevice, restoreBackup, serialFromInstanceId, usbStateFrom, writeFirmware } = await import('../src/main/flash');

const HOTE2 = '209133815232';
const V3 = '207A349A5430';
const line = (devnum: number, path: string, alt: number, name: string, serial: string) => `Found DFU: [0483:df11] ver=2200, devnum=${devnum}, cfg=1, intf=0, path="${path}", alt=${alt}, name="${name}", serial="${serial}"`;
const board = (devnum: number, path: string, flash: string, serial: string) => [
  line(devnum, path, 3, '@Device Feature/0xFFFF0000/01*004 e', serial),
  line(devnum, path, 2, '@OTP Memory /0x1FFF7000/01*0001Ke', serial),
  line(devnum, path, 1, '@Option Bytes  /0x1FFF7800/01*040 e', serial),
  line(devnum, path, 0, `@Internal Flash  /0x08000000/${flash}`, serial),
];
const BOTH = ['dfu-util 0.9', '', ...board(56, '1-9.1', '0128*0002Kg', HOTE2), ...board(55, '1-9.2', '0256*0002Kg', V3)].join('\r\n');

describe('reading the bootloaders', () => {
  it('a listing with hote2 and the V3: one device each, with its serial and flash size', () => {
    expect(parseDfuList(BOTH)).toEqual([{ serial: HOTE2, flashBytes: 262144 }, { serial: V3, flashBytes: 524288 }]);
  });

  it('a bootloader that gives no serial is still one device, told apart by its USB path', () => {
    const noSerial = [...board(7, '1-3', '0128*0002Kg', ''), ...board(8, '1-4', '0256*0002Kg', '')].join('\n');
    expect(parseDfuList(noSerial)).toEqual([{ serial: null, flashBytes: 262144 }, { serial: null, flashBytes: 524288 }]);
  });

  it('the board for a flash size: 256 KB is a V2, 512 KB a V3, anything else unknown', () => {
    expect(boardForFlash(262144)).toBe('V2');
    expect(boardForFlash(524288)).toBe('V3');
    expect(boardForFlash(131072)).toBeNull();
    expect(boardForFlash(null)).toBeNull();
  });

  it('the serial in an instance id, and none in an id Windows made up', () => {
    expect(serialFromInstanceId(`USB\\VID_0483&PID_DF11\\${HOTE2}`)).toBe(HOTE2);
    expect(serialFromInstanceId('USB\\VID_0483&PID_DF11\\5&3A692CE1&0&9')).toBeNull();
  });

  it('the USB state lists each bootloader and running board once, leaving out their interfaces', () => {
    const s = usbStateFrom([
      { InstanceId: `USB\\VID_1209&PID_6668\\${HOTE2}`, Service: 'usbccgp', Problem: 0 },
      { InstanceId: 'USB\\VID_1209&PID_6668&MI_00\\7&380A8E11&0&0000', Service: 'usbser', Problem: 0 },
      { InstanceId: `USB\\VID_0483&PID_DF11\\${V3}`, Service: 'WinUSB', Problem: 0 },
      { InstanceId: 'USB\\VID_0483&PID_DF11\\5&3A692CE1&0&9', Service: null, Problem: 28 },
    ]);
    expect(s.runtimeSerials).toEqual([HOTE2]);
    expect(s.bootloaders).toEqual([{ serial: V3, driver: 'WinUSB', problem: 0 }, { serial: null, driver: null, problem: 28 }]);
    expect([s.runtimePresent, s.bootloaderPresent, s.bootloaderDriver]).toEqual([true, true, 'WinUSB']);
  });

  it('the bootloaders that appeared after a reboot are the ones not there before', () => {
    const s = usbStateFrom([{ InstanceId: `USB\\VID_0483&PID_DF11\\${V3}`, Service: 'WinUSB', Problem: 0 }, { InstanceId: `USB\\VID_0483&PID_DF11\\${HOTE2}`, Service: 'WinUSB', Problem: 0 }]);
    expect(newBootloaders(s, [V3]).map((b) => b.serial)).toEqual([HOTE2]);
    expect(newBootloaders(s, [])).toHaveLength(2);
  });

  it('the device for a serial is that one; with no serial, only a single bootloader is taken', () => {
    const devs = parseDfuList(BOTH);
    expect(pickDevice(devs, V3)).toEqual({ serial: V3, flashBytes: 524288 });
    expect(pickDevice(devs, 'NOPE')).toBeNull();
    expect(pickDevice(devs, null)).toBeNull();
    expect(pickDevice([devs[0]], null)).toEqual(devs[0]);
  });
});

describe('talking to one board', () => {
  let dir: string;
  beforeEach(() => { calls.length = 0; listing = BOTH; dir = mkdtempSync(join(tmpdir(), 'hw-flash-')); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('dfu-util is given the running and bootloader ids, and the serial when there is one', () => {
    expect(dfuDeviceArgs(V3)).toEqual(['-d', '1209:6668,0483:df11', '-S', V3]);
    expect(dfuDeviceArgs(null)).toEqual(['-d', '1209:6668,0483:df11']);
  });

  it('the target for the V3 is its 512 KB and board type', async () => {
    expect(await flashTarget(dir, V3)).toEqual({ serial: V3, flashBytes: 524288, board: 'V3', found: true });
    expect((await flashTarget(dir, null)).found).toBe(false);
  });

  it('a backup reads the whole flash of the board named, and only that board', async () => {
    const r = await backupFlash(dir, join(dir, 'backups'), 'before-install', () => undefined, null, HOTE2);
    expect(r.ok).toBe(true);
    const read = calls.find((a) => a.includes('-U'))!;
    expect(read.slice(0, 4)).toEqual(['-d', '1209:6668,0483:df11', '-S', HOTE2]);
    expect(read).toContain('0x08000000:262144');
  });

  it('a backup with two bootloaders and no serial reads nothing', async () => {
    const r = await backupFlash(dir, join(dir, 'backups'), 'before-install', () => undefined, null, null);
    expect(r.ok).toBe(false);
    expect(calls.some((a) => a.includes('-U'))).toBe(false);
  });

  it('a write goes to the board named', async () => {
    const f = join(dir, 'fw.dfu'); writeFileSync(f, Buffer.alloc(100));
    await writeFirmware(dir, f, () => undefined, V3);
    expect(calls.at(-1)!.slice(0, 4)).toEqual(['-d', '1209:6668,0483:df11', '-S', V3]);
  });

  it('a 256 KB backup is not put back on a board with 512 KB of flash', async () => {
    const img = Buffer.alloc(262144); img[3] = 0x20; img[7] = 0x08;
    const f = join(dir, 'b.bin'); writeFileSync(f, img);
    const r = await restoreBackup(dir, f, () => undefined, V3, 524288);
    expect(r).toEqual({ ok: false, ms: 0, detail: 'This backup is from a Proffieboard V2 (256 KB); this saber is a Proffieboard V3 (512 KB). Nothing was written.' });
    expect(calls).toHaveLength(0);
    expect(backupSizeMismatch(524288, 262144)).toBe('This backup is from a Proffieboard V3 (512 KB); this saber is a Proffieboard V2 (256 KB). Nothing was written.');
  });
});
