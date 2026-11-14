import { describe, expect, it } from 'vitest';
import { saberCanReadFileSystem } from '../src/cardFileSystem';

describe('saberCanReadFileSystem', () => {
  it.each(['FAT', 'FAT12', 'FAT16', 'FAT32', 'fat32', ' FAT32 '])('%s is readable', (fs) => expect(saberCanReadFileSystem(fs)).toBe('yes'));
  it.each(['exFAT', 'EXFAT', 'NTFS', 'ReFS', 'UDF'])('%s is not readable', (fs) => expect(saberCanReadFileSystem(fs)).toBe('no'));
  it.each([null, undefined, '', '  ', 'RAW', 'CDFS'])('%s is unknown, so no warning', (fs) => expect(saberCanReadFileSystem(fs)).toBe('unknown'));
});
