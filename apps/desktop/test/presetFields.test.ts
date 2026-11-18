// A preset's font field keeps every folder (preset-editor-fixes design D3, F41).
import { describe, expect, it } from 'vitest';
import { joinFont, splitFont } from '../src/renderer/src/presetFields';

describe('the font field', () => {
  it('F41 changing the first folder keeps the others', () => {
    const f = splitFont('Mara;Extra;common');
    expect(f).toEqual({ folder: 'Mara', extra: ['Extra'], common: true });
    expect(joinFont({ ...f, folder: 'Grey' })).toBe('Grey;Extra;common');
  });

  it('the common switch changes only common', () => {
    const f = splitFont('Mara;Extra;common');
    expect(joinFont({ ...f, common: false })).toBe('Mara;Extra');
    expect(joinFont({ ...splitFont('Mara;Extra'), common: true })).toBe('Mara;Extra;common');
  });

  it('a single folder, common alone, and an empty font', () => {
    expect(splitFont('Mara')).toEqual({ folder: 'Mara', extra: [], common: false });
    expect(splitFont('common')).toEqual({ folder: '', extra: [], common: true });
    expect(joinFont(splitFont(''))).toBe('');
    expect(joinFont({ folder: 'Mara', extra: [], common: true })).toBe('Mara;common');
  });
});
