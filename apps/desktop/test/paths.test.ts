import { join, parse, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { insideFolder } from '../src/main/paths';

// A data folder as this system writes paths: C:\Users\x\... on Windows, /Users/x/... elsewhere. (Written with
// Windows separators only, the cases below mean nothing on macOS or Linux, where `\` is an ordinary character.)
const root = parse(process.cwd()).root;
const data = join(root, 'Users', 'x', 'AppData', 'Roaming', '@hiltwright', 'desktop');
const other = process.platform === 'win32' ? 'D:\\anything' : '/Volumes/other/anything';

describe('opening a folder from the app', () => {
  it('allows the data folder and anything inside it', () => {
    expect(insideFolder(data, data)).toBe(true);
    expect(insideFolder(data, join(data, 'sabers', 'abc', 'backups'))).toBe(true);
  });

  it('refuses a sibling whose name only starts the same', () => {
    expect(insideFolder(data, `${data}-evil`)).toBe(false);
    expect(insideFolder(data, `${data}evil${sep}x`)).toBe(false);
  });

  it('refuses climbing out and other drives', () => {
    expect(insideFolder(data, `${data}${sep}..${sep}other`)).toBe(false);
    expect(insideFolder(data, other)).toBe(false);
  });
});
