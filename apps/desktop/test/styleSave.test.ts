// style-editor "The editor has a simple and a full mode" (style-save-integrity ST29, ST31).

import { describe, expect, it } from 'vitest';
import { saveTarget } from '../src/renderer/src/styleSave';

const base = { docChanged: false, treeChanged: false, originalMode: 'tree' as const, isNew: false };

describe('what Save writes', () => {
  it('writes the showing half when it was changed', () => {
    expect(saveTarget({ ...base, showing: 'simple', docChanged: true })).toEqual({ write: 'simple', dirty: true, dropsOther: false });
  });

  it('writes the changed half even when the other tab is showing', () => {
    expect(saveTarget({ ...base, showing: 'simple', treeChanged: true })).toEqual({ write: 'tree', dirty: true, dropsOther: false });
  });

  it('writes the stored kind, and is not dirty, when nothing changed: looking at a tab is not an edit', () => {
    expect(saveTarget({ ...base, showing: 'simple' })).toEqual({ write: 'tree', dirty: false, dropsOther: false });
    expect(saveTarget({ ...base, showing: 'tree', originalMode: 'simple' })).toEqual({ write: 'simple', dirty: false, dropsOther: false });
  });

  it('keeps the showing half and says the other is dropped when both changed', () => {
    expect(saveTarget({ ...base, showing: 'tree', docChanged: true, treeChanged: true })).toEqual({ write: 'tree', dirty: true, dropsOther: true });
  });

  it('counts a new style as unsaved until it is saved', () => {
    expect(saveTarget({ ...base, showing: 'simple', originalMode: 'simple', isNew: true })).toEqual({ write: 'simple', dirty: true, dropsOther: false });
  });
});
