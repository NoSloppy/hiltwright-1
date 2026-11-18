// Main's half of keeping the guided tour away from the owner's data and boards (main/tourGuard.ts): while it runs,
// every page request that writes, copies, builds or flashes is refused before its handler runs.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { TOUR_ALLOWED, TOUR_BLOCKED, TOUR_REFUSAL, tourGuarded, tourRefusal, type TourState } from '../src/main/tourGuard';

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const preloadChannels = [...read('../src/preload/index.ts').matchAll(/ipcRenderer\.invoke\('([^']+)'/g)].map((m) => m[1]);
const ipcChannels = [...read('../src/main/ipc.ts').matchAll(/(?:^|\s)(?:handle|fontHandle)\('([^']+)'/gm)].map((m) => m[1]);

describe('every page request is placed: let through during the tour, or refused', () => {
  it('knows every request the page can make, and every one main answers', () => {
    expect(preloadChannels.length).toBeGreaterThan(80);
    for (const c of new Set([...preloadChannels, ...ipcChannels])) expect(TOUR_ALLOWED.has(c) || TOUR_BLOCKED.has(c), c).toBe(true);
    for (const c of TOUR_ALLOWED) expect(TOUR_BLOCKED.has(c), c).toBe(false);
  });

  it('refuses everything that writes to a board, a card, or the owner\'s sabers, styles, fonts and preset sets', () => {
    for (const c of ['flash:write', 'flash:backup', 'flash:restore', 'flash:target', 'flash:leave', 'flash:waitForBootloader', 'flash:installDriver', 'build:run',
      'sd:copyFont', 'sd:eject', 'fontlib:copyToCard', 'packs:copyFontToCard', 'import:xenoFont',
      'library:upsert', 'library:update', 'library:rename', 'library:plan', 'library:adopt', 'library:remove', 'library:noteBootloader',
      'looks:add', 'looks:update', 'looks:remove', 'banks:save', 'banks:remove', 'snapshots:save',
      'fontlib:setMeta', 'fontlib:remove', 'fontlib:addZip', 'fontlib:addFolder', 'usb:wantSerial', 'toolchain:install', 'support:save']) {
      expect(TOUR_BLOCKED.has(c), c).toBe(true);
    }
  });

  it('every request main answers goes through the tour guard', () => {
    const ipc = read('../src/main/ipc.ts');
    expect(ipc).toMatch(/ipcMain\.handle\(channel, logged\(channel, tourGuarded\(channel, fn, quietDuringTour\)\)\)/);
    // No handler is registered around it.
    expect((ipc.match(/ipcMain\.handle\(/g) ?? []).length).toBe(1);
  });
});

describe('while the tour runs', () => {
  it('a refused request never reaches its handler and fails with the plain message', async () => {
    const state: TourState = { active: true };
    const write = vi.fn(async () => 'written');
    const guarded = tourGuarded('flash:write', write, undefined, state);
    await expect(guarded()).rejects.toThrow(TOUR_REFUSAL);
    expect(write).not.toHaveBeenCalled();
    expect(tourRefusal('library:update', state)).toBe(TOUR_REFUSAL);
  });

  it('a request that only reads still runs', async () => {
    const state: TourState = { active: true };
    const list = vi.fn(async () => ['saber']);
    expect(await tourGuarded('library:list', list, undefined, state)()).toEqual(['saber']);
    expect(tourRefusal('sd:listFonts', state)).toBeNull();
  });

  it('a request a page makes by itself as it opens is answered without writing', async () => {
    const state: TourState = { active: true };
    const setRoom = vi.fn(async () => 'saved');
    const guarded = tourGuarded('hilts:setRoom', setRoom, () => 'the room as it is', state);
    expect(await guarded()).toBe('the room as it is');
    expect(setRoom).not.toHaveBeenCalled();
  });

  it('a request nobody listed is refused, so a new one cannot slip by', () => {
    expect(tourRefusal('something:new', { active: true })).toBe(TOUR_REFUSAL);
  });

  it('once it ends, everything runs again', async () => {
    const state: TourState = { active: false };
    const write = vi.fn(async () => 'written');
    expect(await tourGuarded('flash:write', write, undefined, state)()).toBe('written');
    expect(tourRefusal('library:update', state)).toBeNull();
  });
});
