// card-safety 2.2: the card Fonts & SD shows is the saber's own when it shares it, the owner's choice, or the only one.

import { describe, expect, it } from 'vitest';
import { chooseCard } from '../src/renderer/src/cardChoice';
import type { CardInfo } from '../src/shared/api';

const card = (root: string, saberSerial: string | null = null, proffie = true): CardInfo => ({ root, label: null, freeBytes: null, totalBytes: null, proffie, hasPresetsIni: proffie, saberSerial });
const reader = card('E:\\');
const shared = card('H:\\', '209133815232');
const none = { sharedRoot: null, saberSerial: null, chosen: null };

describe('which card Fonts & SD shows (card-safety D3)', () => {
  it("the card the connected saber shares, found by its serial, is shown and marked as the saber's own", () => {
    const c = chooseCard([reader, shared], { ...none, saberSerial: '209133815232' });
    expect(c).toMatchObject({ card: shared, own: true, ask: false });
    expect(c.choices).toEqual([reader, shared]);
  });
  it('or found as the drive that appeared when the app asked it to share', () => {
    expect(chooseCard([reader, card('H:\\')], { ...none, sharedRoot: 'H:\\' })).toMatchObject({ card: { root: 'H:\\' }, own: true });
  });
  it("the saber's own card counts even before it has fonts on it", () => {
    const blank = card('H:\\', '209133815232', false);
    expect(chooseCard([reader, blank], { ...none, saberSerial: '209133815232' }).card).toBe(blank);
  });
  it("the owner's choice holds while that card is there, and is dropped once it is gone", () => {
    expect(chooseCard([reader, shared], { sharedRoot: null, saberSerial: '209133815232', chosen: 'E:\\' })).toMatchObject({ card: reader, own: false });
    expect(chooseCard([shared], { sharedRoot: null, saberSerial: '209133815232', chosen: 'E:\\' })).toMatchObject({ card: shared, own: true });
  });
  it('the only ProffieOS card is shown; a drive with no fonts is not a choice', () => {
    expect(chooseCard([reader, card('F:\\', null, false)], none)).toMatchObject({ card: reader, ask: false });
  });
  it('two cards and no saber sharing: ask, and show none', () => {
    expect(chooseCard([reader, card('F:\\')], none)).toMatchObject({ card: null, ask: true });
  });
  it('no card at all: nothing to show, nothing to ask', () => {
    expect(chooseCard([card('F:\\', null, false)], none)).toMatchObject({ card: null, ask: false, choices: [] });
  });
});
