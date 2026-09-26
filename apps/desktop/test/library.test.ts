// saber-library scenarios from the baseline audit (baseline-board 1.1, 1.2, 1.4-1.7, 1.18, 1.20), against the real
// store on a temporary folder. A new Library on the same file stands for a restart of the app.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { SaberConfigModel } from '@hiltwright/core';
import { Library, defaultName } from '../src/main/library';
import type { SaberIdentity } from '../src/shared/api';

let dir = '';
let file = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'hw-library-')); file = join(dir, 'library.json'); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const hote2: SaberIdentity = {
  usbSerial: '209133815232', configName: 'config/hiltwright_hote2.h', version: 'v8.10 hiltwright ce12a06', prop: 'SaberFett263Buttons',
  buttons: 2, installed: 'Sep 24 2026 18:48:49', pixelBlades: [132, 1, 2], bladeConfig: 0,
};
const noSerial = (over: Partial<SaberIdentity> = {}): SaberIdentity => ({ ...hote2, usbSerial: null, ...over });
const preset = (name: string, font = 'GeneralPrincess;common') => ({ font, track: 'tracks/General.wav', styles: ['builtin 0 1'], name, variation: 0 });
const connect = (lib: Library, identity: SaberIdentity, names = ['Preset: 1']) =>
  lib.upsert({ identity, presets: names.map((n) => preset(n)), fonts: ['GeneralPrincess'], tracks: ['tracks/General.wav'] });
const model = { name: 'kylo', board: 'V2', buttons: 2, prop: 'fett263', blades: [], presets: [] } as unknown as SaberConfigModel;

describe('saber library', () => {
  it('1.1 a connected saber is still listed after a restart', async () => {
    await connect(new Library(file), hote2, ['Mara Jade Skywalker', 'Valkyrie']);
    const [s, ...rest] = await new Library(file).list();
    expect(rest).toEqual([]);
    expect(s.name).toBe('hote2');
    expect(s.identity.configName).toBe('config/hiltwright_hote2.h');
    expect(s.presets.map((p) => p.name)).toEqual(['Mara Jade Skywalker', 'Valkyrie']);
    expect(Date.parse(s.lastSeen)).not.toBeNaN();
  });

  it('1.2 an unreadable store starts with no sabers instead of failing', async () => {
    writeFileSync(file, '{ this is not json');
    expect(await new Library(file).list()).toEqual([]);
    writeFileSync(file, JSON.stringify({ version: 7, sabers: [{ id: 'x' }] }));
    expect(await new Library(file).list()).toEqual([]);
    writeFileSync(file, JSON.stringify({ version: 1, sabers: 'nope' }));
    expect(await new Library(file).list()).toEqual([]);
  });

  // Owner: library-integrity (BST-1). Records of the wrong shape make list() and upsert() throw today.
  it.fails('1.2 a store whose records have the wrong shape reads as no sabers', async () => {
    writeFileSync(file, JSON.stringify({ version: 1, sabers: [{ id: 'a' }, { id: 'b' }] }));
    const lib = new Library(file);
    expect(await lib.list()).toEqual([]);
    await connect(lib, hote2);
    expect((await lib.list()).map((s) => s.name)).toEqual(['hote2']);
  });

  it('1.4 with no serial, a board is matched only when config, install stamp and blade layout all agree', async () => {
    const lib = new Library(file);
    const first = await connect(lib, noSerial());
    expect((await connect(lib, noSerial())).id).toBe(first.id);
    // Today a reflash (new install stamp) without a serial makes a new record; library-integrity F15 changes that.
    for (const differs of [{ configName: 'config/other.h' }, { installed: 'Sep 25 2026 09:00:00' }, { pixelBlades: [144] }]) {
      expect((await connect(lib, noSerial(differs))).id).not.toBe(first.id);
    }
  });

  it('1.5 a plan is never mistaken for a board', async () => {
    const lib = new Library(file);
    const plan = await lib.plan('hote2', model);
    const board = await connect(lib, noSerial());
    expect(board.id).not.toBe(plan.id);
    expect(board.planned).toBeUndefined();
    const all = await lib.list();
    expect(all.find((s) => s.id === plan.id)?.planned).toBe(true);
    expect(all).toHaveLength(2);
  });

  it('1.6 presets changed on the saber itself replace the record\'s, and the name is kept', async () => {
    const lib = new Library(file);
    const first = await connect(lib, hote2, ['Preset: 1', 'Preset: 2']);
    await lib.rename(first.id, 'Ahsoka');
    const again = await connect(new Library(file), hote2, ['Preset: 2', 'Preset: 1', 'Preset: 3']);
    expect(again.id).toBe(first.id);
    expect(again.name).toBe('Ahsoka');
    expect(again.presets.map((p) => p.name)).toEqual(['Preset: 2', 'Preset: 1', 'Preset: 3']);
  });

  it('1.7 a saber is named from its config', async () => {
    expect((await connect(new Library(file), hote2)).name).toBe('hote2');
    expect(defaultName({ ...hote2, configName: 'config/hote2.h' })).toBe('hote2');
    expect(defaultName({ ...hote2, configName: 'config/proffieboard_v2_config.h', prop: 'SaberFett263Buttons' })).toBe('SaberFett263Buttons saber');
    expect(defaultName({ ...hote2, configName: null, prop: null })).toBe('Proffie saber');
  });

  it('1.18 dropping a plan removes it and leaves the rest', async () => {
    const lib = new Library(file);
    const plan = await lib.plan('Kylo', model);
    const board = await connect(lib, hote2);
    await lib.remove(plan.id);
    expect((await new Library(file).list()).map((s) => s.id)).toEqual([board.id]);
  });

  it('1.20 a new name is kept after reconnecting, and a blank name keeps the old one', async () => {
    const lib = new Library(file);
    const s = await connect(lib, hote2);
    expect((await lib.rename(s.id, '  Ahsoka ')).name).toBe('Ahsoka');
    expect((await lib.rename(s.id, '   ')).name).toBe('Ahsoka');
    expect((await connect(new Library(file), hote2)).name).toBe('Ahsoka');
    await expect(lib.rename('nope', 'x')).rejects.toThrow('Unknown saber');
  });
});
