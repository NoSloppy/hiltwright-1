// The run log: one file per run in <userData>/logs, so a problem can be diagnosed from what the app saw. Main's
// console is teed into it; the page's console reaches main through the console-message handler, so it lands here too.
// Lines are written synchronously: a crash must not lose the lines just before it.

import { closeSync, mkdirSync, openSync, readdirSync, unlinkSync, writeSync } from 'node:fs';
import { join } from 'node:path';
import { format } from 'node:util';
import { redact as redactThisComputer } from './redact';

export const KEEP_RUNS = 10;
export const MAX_LOG_BYTES = 5 * 1024 * 1024;
export const MAX_LINE = 4000;
const NAME = /^hiltwright-\d{8}-\d{6}(-\d+)?\.log$/;

export interface RunLogOptions {
  dir: string;
  now?: () => Date;
  redact?: (text: string) => string;
  maxBytes?: number;
  keep?: number;
}

export interface RunLog {
  file: string;
  write(text: string, level?: 'warn' | 'error'): void;
  close(): void;
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');
const stamp = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const clock = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;

/** Run logs in the folder, oldest first (names sort by start time). */
export function runLogs(dir: string): string[] {
  try { return readdirSync(dir).filter((n) => NAME.test(n)).sort(); } catch { return []; }
}

/** Keep the newest `keep` run logs already in the folder, delete the rest, then start this run's log. */
export function openRunLog(opts: RunLogOptions): RunLog {
  const { dir, now = () => new Date(), redact = redactThisComputer, maxBytes = MAX_LOG_BYTES, keep = KEEP_RUNS } = opts;
  mkdirSync(dir, { recursive: true });
  const old = runLogs(dir);
  for (const n of old.slice(0, Math.max(0, old.length - keep))) { try { unlinkSync(join(dir, n)); } catch { /* in use; next run */ } }
  let name = `hiltwright-${stamp(now())}.log`;
  for (let i = 2; runLogs(dir).includes(name); i++) name = `hiltwright-${stamp(now())}-${i}.log`;
  const file = join(dir, name);
  let fd: number | null = openSync(file, 'a');
  let bytes = 0;
  let full = false;
  const put = (line: string) => { if (fd == null) return; try { writeSync(fd, line); } catch { /* disk gone; keep running */ } bytes += Buffer.byteLength(line); };
  return {
    file,
    write(text, level) {
      if (fd == null || full) return;
      let body = redact(text);
      if (body.length > MAX_LINE) body = `${body.slice(0, MAX_LINE)} … [cut, ${body.length} characters]`;
      const line = `${clock(now())} ${level ? `${level.toUpperCase()} ` : ''}${body.replace(/\r?\n/g, '\n    ')}\n`;
      const note = `${clock(now())} [log] This run's log reached ${Math.round(maxBytes / 1048576)} MB; later lines are not kept. Restart the app to start a new log.\n`;
      if (bytes + Buffer.byteLength(line) + Buffer.byteLength(note) > maxBytes) { put(note); full = true; return; }
      put(line);
    },
    close() { if (fd != null) { try { closeSync(fd); } catch { /* already closed */ } fd = null; } },
  };
}

let current: RunLog | null = null;

/** The log of this run, if started. */
export function runLog(): RunLog | null {
  return current;
}

/** Start this run's log and tee main's console into it. Call once, after the data folder is final. */
export function startLog(userData: string): RunLog | null {
  if (current) return current;
  try { current = openRunLog({ dir: join(userData, 'logs') }); } catch (err) { console.error('[log] could not start the run log', err); return null; }
  const log = current;
  const tee = (method: 'log' | 'warn' | 'error', level?: 'warn' | 'error') => {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => { original(...args); log.write(format(...args), level); };
  };
  tee('log'); tee('warn', 'warn'); tee('error', 'error');
  return log;
}
