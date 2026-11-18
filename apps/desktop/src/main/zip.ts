// Just enough zip to write an export: deflated entries with CRC-32 and UTF-8 names, one entry in memory at a time.
// Read back by unzip.ts (and by any zip tool). No zip64: an export of hilt models stays well under 4 GB.

import { open, readFile, rename, rm } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { crc32, deflateRawSync } from 'node:zlib';

/** One file in the zip: its name inside (forward slashes), and its bytes or the file on disk to take them from. */
export interface ZipInput { name: string; data?: Buffer | string; from?: string }

/** DOS date and time for "now", as zip headers carry them. */
function dosTime(d: Date): { time: number; date: number } {
  return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() };
}

/** Write `entries` to `file`, through a temp file renamed into place, so a failed export never leaves half a zip. */
export async function writeZip(file: string, entries: ZipInput[], now = new Date()): Promise<void> {
  const tmp = `${file}.${randomBytes(4).toString('hex')}.tmp`;
  const { time, date } = dosTime(now);
  const central: Buffer[] = [];
  let offset = 0;
  const fh = await open(tmp, 'w');
  try {
    for (const e of entries) {
      const data = e.from ? await readFile(e.from) : Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data ?? '', 'utf8');
      const packed = deflateRawSync(data);
      const name = Buffer.from(e.name.replace(/\\/g, '/'), 'utf8');
      const crc = crc32(data);
      if (offset + 30 + name.length + packed.length > 0xfffffffe || data.length > 0xfffffffe) throw new Error('This export is too large for a zip file (over 4 GB).');
      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6); local.writeUInt16LE(8, 8);
      local.writeUInt16LE(time, 10); local.writeUInt16LE(date, 12); local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(packed.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28);
      await fh.write(local); await fh.write(name); await fh.write(packed);
      const cd = Buffer.alloc(46);
      cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(0x800, 8); cd.writeUInt16LE(8, 10);
      cd.writeUInt16LE(time, 12); cd.writeUInt16LE(date, 14); cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(packed.length, 20); cd.writeUInt32LE(data.length, 24);
      cd.writeUInt16LE(name.length, 28); cd.writeUInt32LE(offset, 42);
      central.push(cd, name);
      offset += 30 + name.length + packed.length;
    }
    const cdBytes = Buffer.concat(central);
    if (entries.length > 0xfffe || offset + cdBytes.length > 0xfffffffe) throw new Error('This export is too large for a zip file.');
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(cdBytes.length, 12); end.writeUInt32LE(offset, 16);
    await fh.write(cdBytes); await fh.write(end);
    await fh.sync();
  } catch (err) {
    await fh.close().catch(() => undefined); await rm(tmp, { force: true }); throw err;
  }
  await fh.close();
  try { await rename(tmp, file); } catch (err) { await rm(tmp, { force: true }); throw err; }
}
