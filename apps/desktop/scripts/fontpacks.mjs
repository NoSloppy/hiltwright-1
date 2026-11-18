#!/usr/bin/env node
// Packs the six free ProffieOS sound fonts into apps/desktop/resources/packs, with copy-to-card allowed.
//
//   node scripts/fontpacks.mjs <folder with the six font folders>      (or: npm run fontpacks -- <folder>)
//   node scripts/fontpacks.mjs --check                                  (exit 1 and say what to do if a pack is missing)
//
// The source folder is the ProffieOS default SD card download (see docs/font-packs.md). Each pack holds the font's
// complete folder, licence and readme included. Safe to repeat: a pack is rewritten each time.

import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'resources', 'packs');
const LICENCE = 'CC BY-SA 4.0';
const DEFAULTS = 'ProffieOS default sound fonts'; // their files name no author
const FONTS = [
  { folder: 'TeensySF', creator: 'KRSABERS.COM' },
  { folder: 'SmthJedi', creator: DEFAULTS },
  { folder: 'SmthGrey', creator: DEFAULTS },
  { folder: 'SmthFuzz', creator: DEFAULTS },
  { folder: 'RgueCmdr', creator: DEFAULTS },
  { folder: 'TthCrstl', creator: 'Dayad Jocen' },
];
const packFile = (folder) => join(outDir, `font-${folder.toLowerCase()}.hwpack`);

const arg = process.argv[2];
if (arg === '--check') {
  const missing = FONTS.filter((f) => !existsSync(packFile(f.folder)));
  if (missing.length) {
    console.error(`These font packs are missing from apps/desktop/resources/packs: ${missing.map((f) => f.folder).join(', ')}.`);
    console.error('Run "npm run fontpacks -- <folder of the ProffieOS default SD card>" first (see docs/font-packs.md), then build again.');
    process.exit(1);
  }
  console.log('All six free ProffieOS font packs are in place.');
  process.exit(0);
}

if (!arg) {
  console.error('Give the folder that holds TeensySF, SmthJedi, SmthGrey, SmthFuzz, RgueCmdr and TthCrstl (the ProffieOS default SD card).');
  console.error('Example: npm run fontpacks -- "C:\\Downloads\\ProffieOS_SD_Card"   (see docs/font-packs.md)');
  process.exit(2);
}
const source = resolve(arg);
const absent = FONTS.filter((f) => !existsSync(join(source, f.folder)));
if (absent.length) {
  console.error(`${source} does not hold: ${absent.map((f) => f.folder).join(', ')}. Nothing was packed.`);
  process.exit(2);
}
for (const f of FONTS) {
  execFileSync(process.execPath, [join(here, 'hwpack.ts'), 'font', join(source, f.folder), '--creator', f.creator, '--licence', LICENCE, '--copy', '--out', outDir], { stdio: 'inherit' });
}
