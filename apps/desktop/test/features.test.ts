import { describe, expect, it } from 'vitest';
import { FEATURES } from '../src/renderer/src/features';

describe('Beta 1 feature switches', () => {
  it('keep Blade ID and the Xenopixel import hidden', () => {
    expect(FEATURES).toEqual({ bladeId: false, xenopixelImport: false });
  });
});
