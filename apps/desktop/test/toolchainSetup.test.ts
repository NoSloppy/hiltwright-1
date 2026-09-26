// Baseline audit (baseline-firmware toolchain 2.3, 2.4, 2.6): when the setup refuses to start, and how it recovers
// from a download that failed part-way. The system calls are stood in for (installToolchain's `sys`); `download` itself
// is tested against a stubbed fetch.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { download, installToolchain, type ToolchainStatus, type ToolchainSys } from '../src/main/toolchain';
import { toolchainBlockers } from '../src/shared/toolchainChecks';

const status = (root: string, over: Partial<ToolchainStatus> = {}): ToolchainStatus => ({
  root, cli: true, cliVersion: '1.3.1', core: true, gcc: true, dfuUtil: 'dfu-util.exe', proffieOS: false, proffieOSVersion: null,
  ready: false, freeBytes: 100 * 1073741824, pathTooLong: false, ...over,
});
/** A setup where arduino-cli and the core are in place and only ProffieOS is missing; downloads fail as `fail` says. */
function fakeSys(root: string, fail: (url: string, n: number) => boolean) {
  const downloads: string[] = [];
  const sys: ToolchainSys = {
    run: vi.fn(async () => ({ code: 0, stdout: '', stderr: '', ms: 0 })),
    download: async (url, dest) => { downloads.push(url); if (fail(url, downloads.length)) throw new Error('Download failed: the network dropped'); await writeFile(dest, 'zip'); },
    extract: async (_zip, into) => { await mkdir(join(into, 'ProffieOS-8.10'), { recursive: true }); await writeFile(join(into, 'ProffieOS-8.10', 'ProffieOS.ino'), '//'); },
    status: async (r) => { const os = existsSync(join(r, 'ProffieOS', 'ProffieOS.ino')); return status(r, { proffieOS: os, ready: os }); },
  };
  return { sys, downloads };
}

describe('toolchain audit', () => {
  it('2.3 a folder path that is too long: the setup refuses before downloading anything, and says the length', async () => {
    const root = await mkdtemp(join(tmpdir(), 'hw-tc-'));
    const long = 'C:\\Users\\a-rather-long-user-name\\AppData\\Local\\Hiltwright\\tc';
    const { sys, downloads } = fakeSys(root, () => false);
    sys.status = async () => status(long, { pathTooLong: true });
    await expect(installToolchain(root, () => undefined, sys)).rejects.toThrow(`(${long.length} characters, at most 40)`);
    expect(downloads).toEqual([]);
    expect(toolchainBlockers(status(long, { pathTooLong: true })).pathTooLong).not.toBeNull();
  });

  // FST-2 (toolchain-integrity): the panel must give the path's length and not send the owner to a development switch.
  it.fails('2.3 the panel says the path is too long in plain words with its length', () => {
    const long = 'C:\\Users\\a-rather-long-user-name\\AppData\\Local\\Hiltwright\\tc';
    const panel = toolchainBlockers(status(long, { pathTooLong: true })).pathTooLong!.panel;
    expect(panel).toContain(String(long.length));
    expect(panel).not.toMatch(/HILTWRIGHT_/);
  });

  it('2.4 low disk space: the setup refuses before downloading anything, and the panel disables the button', async () => {
    const root = await mkdtemp(join(tmpdir(), 'hw-tc-'));
    const { sys, downloads } = fakeSys(root, () => false);
    sys.status = async (r) => status(r, { freeBytes: 1073741824 });
    await expect(installToolchain(root, () => undefined, sys)).rejects.toThrow('Not enough free space: 1.0 GB free');
    expect(downloads).toEqual([]);
    expect(toolchainBlockers(status(root, { freeBytes: 1073741824 })).lowSpace?.panel).toMatch(/Not enough free space/);
    // A finished toolchain needs no space, so nothing blocks it.
    expect(toolchainBlockers(status(root, { freeBytes: 1073741824, ready: true })).lowSpace).toBeNull();
  });

  it('2.6 the network drops mid-install: a retry installs only what is missing, and a finished setup changes nothing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'hw-tc-'));
    const { sys, downloads } = fakeSys(root, (_url, n) => n === 1);
    await expect(installToolchain(root, () => undefined, sys)).rejects.toThrow(/network dropped/);
    expect(existsSync(join(root, 'ProffieOS'))).toBe(false);
    const after = await installToolchain(root, () => undefined, sys);
    expect(after.ready).toBe(true);
    expect(downloads).toHaveLength(2);
    expect(downloads.every((u) => /ProffieOS/.test(u))).toBe(true);
    expect(sys.run).not.toHaveBeenCalled();
    await installToolchain(root, () => undefined, sys);
    expect(downloads).toHaveLength(2);
  });
});

describe('download', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('never leaves a partial file under the real name', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hw-dl-'));
    const dest = join(dir, 'ProffieOS-v8.10.zip');
    let n = 0;
    vi.stubGlobal('fetch', async () => new Response(new ReadableStream({
      pull(c) { if (n++ === 0) c.enqueue(new Uint8Array(500)); else c.error(new Error('connection reset')); },
    }), { headers: { 'content-length': '1000' } }));
    await expect(download('https://example.invalid/p.zip', dest, () => undefined)).rejects.toThrow();
    expect(existsSync(dest)).toBe(false);
    vi.stubGlobal('fetch', async () => new Response(new Uint8Array(1000), { headers: { 'content-length': '1000' } }));
    await download('https://example.invalid/p.zip', dest, () => undefined);
    expect(existsSync(dest)).toBe(true);
    expect(await readdir(dir)).toEqual(['ProffieOS-v8.10.zip']);
  });
});
