import { describe, expect, it } from 'vitest';
import { copyAnywayQuestion, saberCanReadFileSystem, shouldAskBeforeCopy } from '../src/cardFileSystem';

describe('saberCanReadFileSystem', () => {
  it.each(['FAT', 'FAT12', 'FAT16', 'FAT32', 'fat32', ' FAT32 '])('%s is readable', (fs) => expect(saberCanReadFileSystem(fs)).toBe('yes'));
  it.each(['exFAT', 'EXFAT', 'NTFS', 'ReFS', 'UDF'])('%s is not readable', (fs) => expect(saberCanReadFileSystem(fs)).toBe('no'));
  it.each([null, undefined, '', '  ', 'RAW', 'CDFS'])('%s is unknown, so no warning', (fs) => expect(saberCanReadFileSystem(fs)).toBe('unknown'));
});

describe('asking before a copy', () => {
  it.each(['exFAT', 'NTFS'])('%s asks first', (fs) => expect(shouldAskBeforeCopy(fs)).toBe(true));
  it.each(['FAT32', 'FAT', '', null, undefined, 'RAW'])('%s does not ask', (fs) => expect(shouldAskBeforeCopy(fs)).toBe(false));
  it('words the question the same everywhere', () => {
    expect(copyAnywayQuestion('Kylo', 'E:/', 'exFAT')).toBe('Copy Kylo to E:/ anyway? The card is exFAT, so a saber will not see it until the card is formatted as FAT32.');
  });
});
