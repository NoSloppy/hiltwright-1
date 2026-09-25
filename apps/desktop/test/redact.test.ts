import { describe, expect, it } from 'vitest';
import { makeRedactor } from '../src/main/redact';

const r = makeRedactor({ home: 'C:\\Users\\Al', user: 'Al', host: 'DESKTOP-SAM7' });

describe('keeping personal details out', () => {
  it('replaces the user folder in either slash direction and keeps the rest of the path', () => {
    expect(r('saved C:\\Users\\Al\\AppData\\Local\\Hiltwright\\tc\\x.zip')).toBe('saved %USERPROFILE%\\AppData\\Local\\Hiltwright\\tc\\x.zip');
    expect(r('file:///C:/Users/Al/AppData/x.js:1')).toBe('file:///%USERPROFILE%/AppData/x.js:1');
    expect(r('c:\\users\\al\\x')).toBe('%USERPROFILE%\\x');
  });

  it('replaces the user name and computer name in any case', () => {
    expect(r('user AL on desktop-sam7')).toBe('user <user> on <computer>');
    expect(r('\\\\DESKTOP-SAM7\\share')).toBe('\\\\<computer>\\share');
  });

  it('leaves a name alone inside another word', () => {
    expect(r('Alert: Almost done')).toBe('Alert: Almost done');
    expect(r('C:\\Users\\Alice\\x')).toBe('C:\\Users\\Alice\\x');
  });

  it('leaves other text unchanged', () => {
    const s = '[board] > hwt| version ProffieOS v8.10 COM8 1209:6668';
    expect(r(s)).toBe(s);
  });
});
