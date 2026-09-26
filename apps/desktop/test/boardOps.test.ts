// board-connection 3.3 and 3.14 (baseline audit), on the rules useBoard uses.

import { describe, expect, it } from 'vitest';
import { connectGate, serialQueue } from '../src/renderer/src/boardOps';

const later = () => { let done!: () => void; const p = new Promise<void>((r) => { done = r; }); return { p, done }; };

describe('one connection attempt at a time', () => {
  it('3.3 a plug-in event during a reconnect opens nothing more: the second attempt is skipped', async () => {
    const gate = connectGate(() => false);
    const opening = later();
    let opened = 0;
    const first = gate(async () => { opened++; await opening.p; });
    const second = gate(async () => { opened++; });
    expect(await second).toBe(false);
    opening.done();
    expect(await first).toBe(true);
    expect(opened).toBe(1);
  });

  it('3.3 an attempt while a port is already open is skipped', async () => {
    let open = true;
    const gate = connectGate(() => open);
    expect(await gate(async () => {})).toBe(false);
    open = false;
    expect(await gate(async () => {})).toBe(true);
  });

  it('3.3 the gate opens again after an attempt fails', async () => {
    const gate = connectGate(() => false);
    await expect(gate(async () => { throw new Error('port busy'); })).rejects.toThrow('port busy');
    expect(await gate(async () => {})).toBe(true);
  });
});

describe('board operations queued in order', () => {
  it('3.14 two quick edits both run, in the order they were made, the second after the first finishes', async () => {
    const enqueue = serialQueue();
    const log: string[] = [];
    const slow = later();
    const a = enqueue(async () => { log.push('edit 1 start'); await slow.p; log.push('edit 1 done'); return 1; });
    const b = enqueue(async () => { log.push('edit 2 start'); return 2; });
    await Promise.resolve();
    expect(log).toEqual(['edit 1 start']);
    slow.done();
    expect(await Promise.all([a, b])).toEqual([1, 2]);
    expect(log).toEqual(['edit 1 start', 'edit 1 done', 'edit 2 start']);
  });

  it('3.14 a failed operation does not stop the ones after it', async () => {
    const enqueue = serialQueue();
    const failed = enqueue(async () => { throw new Error('no answer'); });
    const next = enqueue(async () => 'written');
    await expect(failed).rejects.toThrow('no answer');
    expect(await next).toBe('written');
  });
});
