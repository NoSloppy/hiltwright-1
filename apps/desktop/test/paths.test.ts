import { describe, expect, it } from 'vitest';
import { insideFolder } from '../src/main/paths';

const data = 'C:\\Users\\x\\AppData\\Roaming\\@hiltwright\\desktop';

describe('opening a folder from the app', () => {
  it('allows the data folder and anything inside it', () => {
    expect(insideFolder(data, data)).toBe(true);
    expect(insideFolder(data, `${data}\\sabers\\abc\\backups`)).toBe(true);
  });

  it('refuses a sibling whose name only starts the same', () => {
    expect(insideFolder(data, `${data}-evil`)).toBe(false);
    expect(insideFolder(data, `${data}evil\\x`)).toBe(false);
  });

  it('refuses climbing out and other drives', () => {
    expect(insideFolder(data, `${data}\\..\\other`)).toBe(false);
    expect(insideFolder(data, 'D:\\anything')).toBe(false);
  });
});
