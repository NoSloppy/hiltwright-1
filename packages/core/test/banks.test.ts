import { describe, expect, it } from 'vitest';
import { STARTER_LOOKS, bankFromSaber, bankLoadCheck, bankProblems, bankToModel, generateConfig, isBank, newBank, newBankPreset, validateModel, type FirmwareManifest, type LookDef, type PresetRecord, type SaberConfigModel } from '../src';

const model: SaberConfigModel = {
  name: 'hw_test', board: 'V2', boardFrom: 'owner', buttons: 2, prop: 'fett263',
  blades: [
    { id: 'main', role: 'main', type: 'pixel', pixels: 132, order: 'GRB', extra: [], leds: [], parallel: 1, wiring: { kind: 'own', dataPin: 'bladePin', powerPins: ['bladePowerPin2'] } },
    { id: 'crystal', role: 'crystal', type: 'pixel', pixels: 1, order: 'GRB', extra: [], leds: [], parallel: 1, wiring: { kind: 'own', dataPin: 'blade2Pin', powerPins: ['bladePowerPin4'] } },
  ],
  presets: [{ font: 'Old;common', track: '', name: 'Old' }],
};
const pasted: LookDef = { id: 'lk_paste', name: 'Pasted', source: 'pasted', by: 'someone', code: 'StylePtr<Layers<Red, InOutTrL<TrWipe<300>, TrWipeIn<500>>>>()', header: null, roles: ['main'], args: [], preview: '#ff0000', description: '' };

describe('preset banks', () => {
  it('maps roles onto a saber\'s blades and carries the looks it needs', () => {
    const bank = newBank('Duel');
    bank.presets = [
      { name: 'Guardian', font: 'Sentinel;common', track: 'tracks/one.wav', looks: { main: 'hw_pulse', crystal: 'hw_accent' }, lookArgs: { main: '1,0,0,65535' } },
      { name: 'Ember', font: 'Fire', track: '', looks: { main: 'lk_paste', side: 'hw_blade' } },
    ];
    const m = bankToModel(bank, model, [pasted]);
    expect(m.presets).toHaveLength(2);
    expect(m.presets[0]).toMatchObject({ name: 'Guardian', font: 'Sentinel;common', looks: ['hw_pulse', 'hw_accent'], lookArgs: ['1,0,0,65535', null] });
    expect(m.presets[1].looks).toEqual(['lk_paste', null]); // the side blade is not on this saber
    expect(m.looks?.map((l) => l.id)).toEqual(['lk_paste']);
    expect(m.presetsFrom?.bank).toBe(bank.id);
    const g = generateConfig(m);
    expect(g.text).toContain('Sentinel;common');
    expect(g.manifest.presets.map((p) => p.name)).toEqual(['Guardian', 'Ember']);
  });

  it('seeds a bank from a saber\'s presets and firmware', () => {
    const presets: PresetRecord[] = [{ font: 'Jedi;common', track: 'tracks/a.wav', styles: ['builtin 0 1 1,0,0,65535', 'builtin 0 2'], name: 'One', variation: 0 }];
    const firmware: FirmwareManifest = { hash: 'x', os: '8.10', at: '', looks: [{ id: 'hw_pulse', name: 'Pulsing', args: [1] }, { id: 'hw_accent', name: 'Accent', args: [] }], presets: [{ name: 'One', looks: ['hw_pulse', 'hw_accent'] }] };
    const bank = bankFromSaber('From hote2', presets, model.blades, firmware);
    expect(isBank(bank)).toBe(true);
    expect(bank.presets[0]).toEqual({ name: 'One', font: 'Jedi;common', track: 'tracks/a.wav', looks: { main: 'hw_pulse', crystal: 'hw_accent' }, lookArgs: { main: '1,0,0,65535' } });
    const vendor = bankFromSaber('Vendor', presets, model.blades, null);
    expect(vendor.presets[0].looks).toEqual({});
  });

  it('HW-2026-09-24d: a set naming a style since deleted from the style library loads without an error', () => {
    const bank = newBank('Old set');
    bank.presets = [{ name: 'Ghost', font: 'Ghost;common', track: '', looks: { main: 'lk_deleted', crystal: 'hw_accent' }, lookArgs: { main: '1,0,0,65535' } }];
    let m: SaberConfigModel | null = null;
    expect(() => { m = bankToModel(bank, model, [pasted]); }).not.toThrow();
    // The loaded model is one the build accepts: no style it does not know.
    expect(validateModel(m!).filter((e) => /unknown style/.test(e))).toEqual([]);
    expect(() => generateConfig(m!)).not.toThrow();
    // The blade whose style is gone gets the saber's default, without the missing style's colours; the rest is kept.
    expect(m!.presets[0]).toMatchObject({ name: 'Ghost', looks: [null, 'hw_accent'] });
    expect(m!.presets[0].lookArgs).toBeUndefined();
  });

  it('names the problems a bank has for a saber, and what each affected preset gets instead', () => {
    const bank = newBank('Odd');
    bank.presets = [{ ...newBankPreset('Ghost'), looks: { main: 'gone', side: STARTER_LOOKS[0].id }, lookArgs: { main: '1,0,0' } }, { ...newBankPreset(''), font: '' }];
    const problems = bankProblems(bank, model.blades, []);
    expect(problems).toEqual([
      `"Ghost", main blade: its style "gone" is not in the style library any more, so it gets the saber's default style for that blade (${STARTER_LOOKS.find((l) => l.roles.includes('main'))!.name}) instead, and the colours chosen for the missing style are left out.`,
      '"Ghost" sets a style for a side blade, which this saber does not have, so that style is left out.',
      'Preset 2 has no name, so it is named "Preset 2".',
      'Preset 2 has no font, so it gets the "common" folder as its font.',
    ]);
    expect(bankProblems(newBank(), model.blades, [])).toEqual(['The set has no presets, so there is nothing to load.']);
    // What it says is what loading does.
    const m = bankToModel(bank, model, []);
    expect(m.presets.map((p) => [p.name, p.font, p.looks ?? null])).toEqual([['Ghost', 'common', null], ['Preset 2', 'common', null]]);
    // A style the saber's model already carries is not a problem, even when the library no longer has it.
    const carried = bankProblems({ ...bank, presets: [{ ...newBankPreset('Kept'), looks: { main: pasted.id } }] }, model.blades, [], [pasted]);
    expect(carried).toEqual([]);
  });

  it('says before loading what a load does, and asks first when it replaces staged edits (F35)', () => {
    const bank = newBank('Clean');
    bank.presets = [{ ...newBankPreset('One'), looks: { main: 'hw_pulse' } }];
    expect(bankLoadCheck(bank, model, [])).toEqual({ canLoad: true, problems: [], replacesStaged: null, needsConfirm: false });
    const staged: SaberConfigModel = { ...model, presets: [model.presets[0], model.presets[0]], presetsFrom: { name: 'edits made here', at: '2026-11-14T00:00:00.000Z' } };
    expect(bankLoadCheck(bank, staged, [])).toEqual({ canLoad: true, problems: [], replacesStaged: 'Loading it replaces the 2 presets staged here (edits made here), which are not on the saber yet.', needsConfirm: true });
    const broken = { ...bank, presets: [{ ...newBankPreset('Two'), looks: { main: 'lk_deleted' } }] };
    expect(bankLoadCheck(broken, model, [])).toMatchObject({ canLoad: true, needsConfirm: true, problems: [expect.stringMatching(/"lk_deleted" is not in the style library any more/)] });
    expect(bankLoadCheck(newBank(), model, [])).toMatchObject({ canLoad: false, needsConfirm: true });
  });
});
