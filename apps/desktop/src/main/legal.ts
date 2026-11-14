// LICENSE and THIRD-PARTY-NOTICES.md: shipped beside the app (resources/ in a build), read from the repo root in development.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { LegalTexts } from '../shared/about';

/** Reads the two files from a folder; a file that cannot be read comes back as null rather than failing the page. */
export async function readLegal(dir: string): Promise<LegalTexts> {
  const read = async (name: string) => { try { return (await readFile(join(dir, name), 'utf8')).replace(/\r\n/g, '\n'); } catch { return null; } };
  const [licence, notices] = await Promise.all([read('LICENSE'), read('THIRD-PARTY-NOTICES.md')]);
  return { licence, notices };
}

/** Where they are: process.resourcesPath when packaged, the repository root (two levels above apps/desktop) in development. */
export function legalDir(packaged: boolean, resourcesPath: string, appPath: string): string {
  return packaged ? resourcesPath : join(appPath, '..', '..');
}
