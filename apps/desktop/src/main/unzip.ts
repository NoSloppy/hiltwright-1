// Just enough zip to unpack a sound font package: stored and deflated entries, read one at a time from disk so a
// 300 MB package never sits in memory whole. No encryption, no zip64 (font packages stay well under 4 GB).

import { open, mkdir, writeFile } from 'node:fs/promises';
import { crc32, inflateRawSync } from 'node:zlib';
import { dirname, resolve, sep } from 'node:path';

export interface ZipEntry { name: string; method: number; compressed: number; size: number; localOffset: number; flags: number; /** CRC-32 of the unpacked bytes, from the central directory. */ crc: number }

export async function listZip(file: string): Promise<ZipEntry[]> {
  const fh = await open(file, 'r');
  try {
    const { size } = await fh.stat();
    // The end-of-central-directory record sits in the last 22 bytes plus up to 64 KB of comment.
    const tailLen = Math.min(size, 22 + 0xffff);
    const tail = Buffer.alloc(tailLen);
    await fh.read(tail, 0, tailLen, size - tailLen);
    let eocd = -1;
    for (let i = tailLen - 22; i >= 0; i--) if (tail.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('Not a zip file');
    const count = tail.readUInt16LE(eocd + 10);
    const cdSize = tail.readUInt32LE(eocd + 12);
    const cdOffset = tail.readUInt32LE(eocd + 16);
    if (cdOffset === 0xffffffff || count === 0xffff) throw new Error('This zip is too large to open here (zip64). Unpack it first, then add the folder.');
    const cd = Buffer.alloc(cdSize);
    await fh.read(cd, 0, cdSize, cdOffset);
    const out: ZipEntry[] = [];
    let p = 0;
    for (let n = 0; n < count && p + 46 <= cd.length; n++) {
      if (cd.readUInt32LE(p) !== 0x02014b50) throw new Error('The zip file is damaged');
      const flags = cd.readUInt16LE(p + 8);
      const method = cd.readUInt16LE(p + 10);
      const crc = cd.readUInt32LE(p + 16);
      const compressed = cd.readUInt32LE(p + 20);
      const usize = cd.readUInt32LE(p + 24);
      const nameLen = cd.readUInt16LE(p + 28);
      const extraLen = cd.readUInt16LE(p + 30);
      const commentLen = cd.readUInt16LE(p + 32);
      const localOffset = cd.readUInt32LE(p + 42);
      // Bit 11: the name is UTF-8. Otherwise it is CP437, which for font packages is plain ASCII in practice.
      const raw = cd.subarray(p + 46, p + 46 + nameLen);
      const name = (flags & 0x800 ? raw.toString('utf8') : raw.toString('latin1')).replace(/\\/g, '/');
      out.push({ name, method, compressed, size: usize, localOffset, flags, crc });
      p += 46 + nameLen + extraLen + commentLen;
    }
    return out;
  } finally { await fh.close(); }
}

/**
 * Unpack the entries `keep` accepts into `dest`. A package with any name that would land outside `dest` (`../`,
 * absolute paths) is refused outright, whether or not `keep` wants that entry. Every unpacked file must match the
 * CRC-32 and size the package records for it. Returns the number of files written.
 */
export async function extractZip(file: string, dest: string, keep: (name: string) => boolean = () => true, onFile?: (name: string, done: number, total: number) => void): Promise<number> {
  const all = (await listZip(file)).filter((e) => !e.name.endsWith('/'));
  const root = resolve(dest);
  for (const e of all) {
    if (!resolve(root, e.name).startsWith(root + sep)) throw new Error(`The zip holds a file outside its own folder (${e.name}); not unpacking it.`);
  }
  const entries = all.filter((e) => keep(e.name));
  const fh = await open(file, 'r');
  let done = 0;
  try {
    for (const e of entries) {
      if (e.flags & 0x1) throw new Error('This zip is password protected. Unpack it with its password first, then add the folder.');
      const target = resolve(root, e.name);
      const head = Buffer.alloc(30);
      await fh.read(head, 0, 30, e.localOffset);
      if (head.readUInt32LE(0) !== 0x04034b50) throw new Error('The zip file is damaged');
      const start = e.localOffset + 30 + head.readUInt16LE(26) + head.readUInt16LE(28);
      const body = Buffer.alloc(e.compressed);
      await fh.read(body, 0, e.compressed, start);
      let data: Buffer;
      if (e.method === 0) data = body;
      else if (e.method === 8) data = inflateRawSync(body);
      else throw new Error(`${e.name} is packed with a method this app cannot read (${e.method}). Unpack the zip first, then add the folder.`);
      if (data.length !== e.size || crc32(data) !== e.crc) throw new Error(`This package is damaged (${e.name} does not match its checksum). Download it again.`);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, data);
      done++;
      onFile?.(e.name, done, entries.length);
    }
  } finally { await fh.close(); }
  return done;
}
