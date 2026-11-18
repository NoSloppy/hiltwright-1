import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { STYLE_STATEMENT, sourceUrl } from '../src/shared/about';
import { legalDir, readLegal } from '../src/main/legal';

describe('sourceUrl', () => {
  it('points at the tag for a release', () => {
    expect(sourceUrl('0.1.0')).toBe('https://github.com/safwyls/hiltwright/tree/v0.1.0');
  });
  it('keeps a prerelease in the tag', () => {
    expect(sourceUrl('0.2.0-beta.1')).toBe('https://github.com/safwyls/hiltwright/tree/v0.2.0-beta.1');
  });
  it('accepts a version that already has the v', () => {
    expect(sourceUrl('v1.2.3')).toBe('https://github.com/safwyls/hiltwright/tree/v1.2.3');
  });
  it('gives no link for something that is not a version', () => {
    for (const bad of ['', '?', '1.2', '1.2.3/../../x', '1.2.3 evil', 'latest']) expect(sourceUrl(bad)).toBeNull();
  });
});

describe('the About text', () => {
  it('states how the styles were made, word for word', () => {
    expect(STYLE_STATEMENT).toBe("Hiltwright's own styles were composed from ProffieOS building blocks, taking ideas only from public style descriptions.");
  });
});

describe('legal files', () => {
  it('reads them from the folder, with LF endings, and reports a missing one as null', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'hw-legal-'));
    try {
      writeFileSync(join(dir, 'LICENSE'), 'GNU\r\nGENERAL\r\n');
      const got = await readLegal(dir);
      expect(got.licence).toBe('GNU\nGENERAL\n');
      expect(got.notices).toBeNull();
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it('looks in resources when packaged and at the repository root in development', () => {
    expect(legalDir(true, '/r/resources', '/r/app')).toBe('/r/resources');
    expect(legalDir(false, '/r/resources', join('/repo', 'apps', 'desktop'))).toBe(join('/repo'));
  });
});

describe('THIRD-PARTY-NOTICES.md', () => {
  it('is up to date with the notices header and the installed packages', () => {
    const script = fileURLToPath(new URL('../scripts/notices.mjs', import.meta.url));
    const r = spawnSync(process.execPath, [script, '--check'], { encoding: 'utf8' });
    expect(r.stderr + r.stdout).toContain('up to date');
    expect(r.status).toBe(0);
  });
});
