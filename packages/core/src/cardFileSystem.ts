// Which card file systems a saber can read. ProffieOS reads cards through a FAT driver that knows FAT12, FAT16 and
// FAT32 only; a card formatted exFAT or NTFS shows the saber no fonts and no presets, with no hint why.

export type CardReadable = 'yes' | 'no' | 'unknown';

/** Whether a saber can read a card formatted with `fileSystem` (as Windows names it). Empty or unrecognised is unknown, never guessed. */
export function saberCanReadFileSystem(fileSystem: string | null | undefined): CardReadable {
  const fs = (fileSystem ?? '').trim().toUpperCase();
  if (!fs) return 'unknown';
  if (/^FAT(12|16|32)?$/.test(fs)) return 'yes';
  if (/^(EXFAT|NTFS|REFS|UDF)$/.test(fs)) return 'no';
  return 'unknown';
}

/** Whether copying onto a card formatted `fileSystem` must first ask "Copy anyway?": only when a saber cannot read it. */
export function shouldAskBeforeCopy(fileSystem: string | null | undefined): boolean {
  return saberCanReadFileSystem(fileSystem) === 'no';
}

/** The question shown before copying onto a card a saber cannot read (Fonts & SD and the Font library share it). */
export function copyAnywayQuestion(what: string, root: string, fileSystem: string | null): string {
  return `Copy ${what} to ${root} anyway? The card is ${fileSystem}, so a saber will not see it until the card is formatted as FAT32.`;
}
