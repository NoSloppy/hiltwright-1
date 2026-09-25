import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MAX_LINE, openRunLog, runLogs } from '../src/main/log';
import { makeRedactor } from '../src/main/redact';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'hw-log-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const at = new Date(2026, 8, 25, 15, 4, 5, 67);
const redact = makeRedactor({ home: 'C:\\Users\\Al', user: 'Al', host: 'DESKTOP-SAM7' });

describe('the run log', () => {
  it('keeps the ten newest earlier runs and starts a new one', () => {
    for (let i = 1; i <= 12; i++) writeFileSync(join(dir, `hiltwright-202609${String(i).padStart(2, '0')}-120000.log`), 'x');
    writeFileSync(join(dir, 'notes.txt'), 'not a log');
    const log = openRunLog({ dir, now: () => at, redact });
    log.close();
    const logs = runLogs(dir);
    expect(logs).toHaveLength(11);
    expect(logs).not.toContain('hiltwright-20260901-120000.log');
    expect(logs).not.toContain('hiltwright-20260902-120000.log');
    expect(logs.at(-1)).toBe('hiltwright-20260925-150405.log');
    expect(readdirSync(dir)).toContain('notes.txt');
  });

  it('timestamps and redacts every line, with the level for warnings and errors', () => {
    const log = openRunLog({ dir, now: () => at, redact });
    log.write('[toolchain] saved C:\\Users\\Al\\AppData\\x.zip');
    log.write('[renderer] boom\n    at C:/Users/Al/app.js:1', 'error');
    log.close();
    const text = readFileSync(log.file, 'utf8');
    expect(text).toBe(
      '2026-09-25 15:04:05.067 [toolchain] saved %USERPROFILE%\\AppData\\x.zip\n'
      + '2026-09-25 15:04:05.067 ERROR [renderer] boom\n        at %USERPROFILE%/app.js:1\n',
    );
  });

  it('stops at the size cap with one note and nothing after it', () => {
    const log = openRunLog({ dir, now: () => at, redact, maxBytes: 600 });
    for (let i = 0; i < 50; i++) log.write(`line ${i} ${'x'.repeat(40)}`);
    log.close();
    const lines = readFileSync(log.file, 'utf8').trim().split('\n');
    expect(lines.filter((l) => l.includes('[log]'))).toHaveLength(1);
    expect(lines.at(-1)).toContain('[log]');
    expect(Buffer.byteLength(readFileSync(log.file))).toBeLessThanOrEqual(600);
  });

  it('cuts a very long line and says so', () => {
    const log = openRunLog({ dir, now: () => at, redact });
    log.write('y'.repeat(MAX_LINE + 500));
    log.close();
    const text = readFileSync(log.file, 'utf8');
    expect(text).toContain(`[cut, ${MAX_LINE + 500} characters]`);
    expect(text.length).toBeLessThan(MAX_LINE + 100);
  });
});
