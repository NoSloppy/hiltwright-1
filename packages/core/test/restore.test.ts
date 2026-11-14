// preset-history-restore (F33): what restoring a snapshot changes, and where, worked out before anything is sent.
import { describe, expect, it } from 'vitest';
import { listAfterStep, patchWords, planRestore, sameList, singleWords, type PresetRecord } from '../src';

const mk = (name: string, font = `${name};common`): PresetRecord => ({ name, font, track: `tracks/${name}.wav`, styles: [`builtin 0 1 ${name}`, 'builtin 0 2'], variation: 0 });
const base = () => [mk('Alpha'), mk('Bravo'), mk('Charlie'), mk('Delta')];
const replay = (start: PresetRecord[], plan: ReturnType<typeof planRestore>) => plan.steps.reduce(listAfterStep, start);

describe('planRestore', () => {
  it('nothing to do when the saber already matches the snapshot', () => {
    expect(planRestore(base(), base())).toMatchObject({ same: true, single: null, steps: [] });
  });

  it('an edit in place: that preset alone, at its own position', () => {
    const now = base(); now[2] = { ...now[2], font: 'TeensySF;common' };
    const plan = planRestore(base(), now);
    expect(plan.single).toMatchObject({ at: 2, snapshotAt: 2, patch: { font: 'Charlie;common' } });
    expect(singleWords(plan.single!)).toBe('Preset 3, "Charlie": set font to "Charlie;common". Nothing else changes.');
    expect(plan.changes).toEqual(['Preset 3, "Charlie": set font to "Charlie;common".']);
    expect(sameList(replay(now, plan), base())).toBe(true);
  });

  it('an edited preset since moved: found where it is now, and the preset now in its old place is left alone', () => {
    const edited = { ...mk('Charlie'), font: 'TeensySF;common' };
    const now = [edited, mk('Alpha'), mk('Bravo'), mk('Delta')];
    const plan = planRestore(base(), now);
    expect(plan.single).toMatchObject({ at: 0, snapshotAt: 2, name: 'Charlie', patch: { font: 'Charlie;common' } });
    expect(plan.single!.expected[2]).toEqual(mk('Bravo'));
    // The whole list moves it back too.
    expect(plan.steps[0]).toEqual({ op: 'move', from: 0, to: 2 });
    expect(plan.changes[0]).toBe('Move "Charlie" from position 1 to position 3.');
    expect(sameList(replay(now, plan), base())).toBe(true);
  });

  it('refuses one preset when it cannot tell which preset the values belong to', () => {
    // Alpha was duplicated and both copies given a new font: either one could be the original.
    const snap = [mk('Alpha')];
    const now = [{ ...mk('Alpha'), font: 'X' }, { ...mk('Alpha'), font: 'Y' }];
    const plan = planRestore(snap, now);
    expect(plan.single).toBeNull();
    expect(plan.singleRefused).toMatch(/not certain which preset/);
    expect(plan.wholeRefused).toBeNull();
    expect(sameList(replay(now, plan), snap)).toBe(true);
  });

  it('identical presets do not make it uncertain when every reading names the same preset', () => {
    const snap = [mk('Twin'), mk('Other'), mk('Twin')];
    const now = [mk('Other'), mk('Twin'), { ...mk('Twin'), font: 'X' }];
    expect(planRestore(snap, now).single).toMatchObject({ at: 2, patch: { font: 'Twin;common' } });
  });

  it('refuses one preset when several differ, and offers the whole list', () => {
    const now = base(); now[0] = { ...now[0], name: 'A2' }; now[3] = { ...now[3], track: '' };
    const plan = planRestore(base(), now);
    expect(plan.single).toBeNull();
    expect(plan.singleRefused).toMatch(/^2 presets differ/);
    expect(plan.changes).toEqual(['Preset 1, "A2": set name to "Alpha".', 'Preset 4, "Delta": set track to "tracks/Delta.wav".']);
    expect(sameList(replay(now, plan), base())).toBe(true);
  });

  it('a list too different to line up: no single preset, the whole list position by position', () => {
    const snap = base();
    const now = [mk('Zulu'), mk('Yankee')];
    const plan = planRestore(snap, now);
    expect(plan.single).toBeNull();
    expect(plan.singleRefused).toMatch(/too different/);
    expect(plan.steps.slice(0, 2)).toEqual([{ op: 'duplicate', from: 1, to: 2 }, { op: 'duplicate', from: 2, to: 3 }]);
    expect(sameList(replay(now, plan), snap)).toBe(true);
    const shorter = planRestore([mk('Alpha')], base());
    expect(shorter.steps.filter((s) => s.op === 'delete')).toEqual([{ op: 'delete', at: 3 }, { op: 'delete', at: 2 }, { op: 'delete', at: 1 }]);
    expect(sameList(replay(base(), shorter), [mk('Alpha')])).toBe(true);
  });

  it('an empty snapshot, or a saber with no presets, cannot be restored', () => {
    expect(planRestore([], base()).wholeRefused).toMatch(/no presets/);
    expect(planRestore(base(), []).wholeRefused).toMatch(/no presets/);
  });

  it('says plainly which fields change', () => {
    expect(patchWords({ name: 'A\nB', font: 'F', track: '', styles: { 2: 'x', 1: 'y' } })).toBe('name to "A B", font to "F", no track, the style on blades 1, 2');
  });
});
