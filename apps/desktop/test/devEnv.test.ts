import { describe, expect, it } from 'vitest';
import { scrubDevEnv } from '../src/main/devEnv';

const env = () => ({ HILTWRIGHT_E2E: 'stress', HILTWRIGHT_PACKS: 'C:/x', HILTWRIGHT_SD_ROOT: 'D:/', HILTWRIGHT_TOOLCHAIN_DIR: 'C:/tc', PATH: 'C:/Windows', APPDATA: 'C:/Users/x/AppData/Roaming' });

describe('development switches', () => {
  it('a packaged build removes every HILTWRIGHT_ switch and nothing else', () => {
    const e = env();
    expect(scrubDevEnv(e, true).sort()).toEqual(['HILTWRIGHT_E2E', 'HILTWRIGHT_PACKS', 'HILTWRIGHT_SD_ROOT', 'HILTWRIGHT_TOOLCHAIN_DIR']);
    expect(e).toEqual({ PATH: 'C:/Windows', APPDATA: 'C:/Users/x/AppData/Roaming' });
  });

  it('a development build keeps them all', () => {
    const e = env();
    expect(scrubDevEnv(e, false)).toEqual([]);
    expect(e).toEqual(env());
  });
});
