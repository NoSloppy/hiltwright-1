import { describe, expect, it } from 'vitest';
import { logged } from '../src/main/ipcLog';

describe('page requests that fail in main', () => {
  it('are logged with their channel and still reject with the same error', async () => {
    const lines: string[] = [];
    const boom = new Error('ENOENT: no such file');
    const h = logged('library:update', (_e: unknown, id: string) => { throw Object.assign(boom, { id }); }, (l) => lines.push(l));
    await expect(h(null, 'abc')).rejects.toBe(boom);
    expect(lines).toEqual(['[ipc] library:update failed: ENOENT: no such file']);
  });

  it('log async failures too, and nothing for a request that succeeds', async () => {
    const lines: string[] = [];
    const fails = logged('build:run', async () => { throw new Error('toolchain missing'); }, (l) => lines.push(l));
    const works = logged('library:list', async () => [1, 2], (l) => lines.push(l));
    await expect(fails()).rejects.toThrow('toolchain missing');
    expect(await works()).toEqual([1, 2]);
    expect(lines).toEqual(['[ipc] build:run failed: toolchain missing']);
  });
});
