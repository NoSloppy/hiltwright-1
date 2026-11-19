// In-app updates, main's half. electron-updater asks GitHub's release list for a newer version (the GitHub provider,
// configured at build time in apps/desktop/package.json "publish"; the packaged app reads it from app-update.yml).
// It never downloads or installs by itself: autoDownload and autoInstallOnAppQuit are off, and the page asks for each
// step. The decisions (states, what is refused and why) are in shared/updates.ts; this file only runs them.
//
// electron-updater stays behind UpdaterLike, so tests never load it or touch the network (test/updates.test.ts).

import type { OutgoingHttpHeaders } from 'node:http';
import { SHARED_STAGING_ID, initialState, nextState, pretendState, restartRefusal, type BusyFacts, type UpdateEvent, type UpdateState, type WorkKind } from '../shared/updates';

/** The few parts of electron-updater's autoUpdater used here. */
export interface UpdaterLike {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  allowPrerelease: boolean;
  allowDowngrade: boolean;
  requestHeaders: OutgoingHttpHeaders | null;
  logger: unknown;
  checkForUpdates(): Promise<{ isUpdateAvailable?: boolean; updateInfo: { version: string } } | null>;
  downloadUpdate(): Promise<unknown>;
  quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void;
  on(event: 'download-progress', cb: (p: { percent: number }) => void): unknown;
  on(event: 'error', cb: (err: Error) => void): unknown;
}

/** What the updates need from the system, so a test can stand in for each. The default is the real thing. */
export interface UpdatesSys {
  /** An installed copy: only then is anything checked. */
  packaged: boolean;
  version: string;
  /** electron-updater, loaded on first use (never in a development run). */
  load: () => Promise<UpdaterLike>;
  /** Tell the page the state changed. */
  emit: (s: UpdateState) => void;
  /** The long jobs main is running now (requests not yet answered). */
  workInMain: () => WorkKind[];
  log: (line: string) => void;
  now: () => Date;
  /** Dev aid (HILTWRIGHT_UPDATE_STATE): start in this state, and pretend each step instead of reaching GitHub. */
  pretend?: string;
}

/**
 * electron-updater's autoUpdater, from the module as an ES import gives it. The package is CommonJS and defines
 * autoUpdater with a getter, which Node cannot see as a named export: it is only on the default export. Reading
 * it straight off the module gave undefined in 0.2.0-beta.2, and every check failed.
 */
export function pickAutoUpdater(mod: unknown): UpdaterLike {
  const m = mod as { autoUpdater?: UpdaterLike; default?: { autoUpdater?: UpdaterLike } } | null;
  const found = m?.autoUpdater ?? m?.default?.autoUpdater;
  if (!found) throw new Error('electron-updater did not give an autoUpdater');
  return found;
}

/** Configure electron-updater the one way Hiltwright uses it. Exported so a test can check every setting. */
export function configure(u: UpdaterLike, log: (line: string) => void): void {
  u.autoDownload = false; // the owner presses Download
  u.autoInstallOnAppQuit = false; // and Restart to update; quitting never installs anything
  // Every Hiltwright release so far is a GitHub pre-release. electron-updater already allows pre-releases when the
  // running version has a pre-release part (0.2.0-beta.1), but without this a stable copy would ask GitHub for its
  // "latest" release, which a pre-release-only repository does not have. Revisit when there are stable releases.
  u.allowPrerelease = true;
  u.allowDowngrade = false;
  // Not electron-updater's random per-install ID: the same value from every copy (shared/updates.ts).
  u.requestHeaders = { 'x-user-staging-id': SHARED_STAGING_ID };
  u.logger = { info: (m: unknown) => log(`[updates] ${String(m)}`), warn: (m: unknown) => log(`[updates] ${String(m)}`), error: (m: unknown) => log(`[updates] ${String(m)}`), debug: () => undefined };
}

export class Updates {
  private s: UpdateState;
  private updater: Promise<UpdaterLike> | null = null;

  constructor(private readonly sys: UpdatesSys) {
    const pretend = sys.pretend ? pretendState(sys.pretend, sys.version) : null;
    this.s = pretend ?? initialState(sys.version, sys.packaged);
    if (pretend) sys.log(`[updates] pretending: ${sys.pretend} (development only, nothing is checked)`);
  }

  state(): UpdateState { return this.s; }

  private set(e: UpdateEvent): void {
    const before = this.s;
    this.s = nextState(this.s, e);
    if (this.s !== before) this.sys.emit(this.s);
  }

  private get pretending(): boolean { return !!this.sys.pretend; }

  private real(): Promise<UpdaterLike> {
    if (!this.updater) {
      this.updater = this.sys.load().then((u) => {
        configure(u, this.sys.log);
        u.on('download-progress', (p) => this.set({ type: 'progress', percent: p.percent }));
        // Errors are also thrown by the calls below, which is where they are handled; this keeps them off the console.
        u.on('error', (err) => this.sys.log(`[updates] ${err?.message ?? String(err)}`));
        return u;
      });
      this.updater.catch(() => { this.updater = null; });
    }
    return this.updater;
  }

  /** Ask GitHub for a newer version. `asked`: the owner pressed Check now, so a failure is shown. */
  async check(asked: boolean): Promise<UpdateState> {
    if (this.s.phase === 'off') return this.s;
    // A check already running answers this one too; asking marks it as asked, so its result is shown.
    if (this.s.phase === 'checking') { if (asked) this.set({ type: 'check', asked }); return this.s; }
    this.set({ type: 'check', asked });
    if (this.state().phase !== 'checking') return this.s;
    const at = () => this.sys.now().toISOString();
    if (this.pretending) { this.set({ type: 'none', at: at() }); return this.s; }
    try {
      const r = await (await this.real()).checkForUpdates();
      const v = r?.updateInfo?.version;
      if (r && v && r.isUpdateAvailable !== false && v !== this.sys.version) {
        this.sys.log(`[updates] version ${v} is available (this is ${this.sys.version})`);
        this.set({ type: 'found', version: v, at: at() });
      } else {
        this.sys.log(`[updates] no newer version (newest ${v ?? 'unknown'}, this is ${this.sys.version})`);
        this.set({ type: 'none', at: at() });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.sys.log(`[updates] check failed${asked ? '' : ' (quietly)'}: ${message.split('\n')[0]}`);
      this.set({ type: 'error', message, at: at() });
    }
    return this.s;
  }

  /** Download the version found. Progress arrives as states. */
  async download(): Promise<UpdateState> {
    this.set({ type: 'download' });
    if (this.state().phase !== 'downloading') return this.s;
    if (this.pretending) { this.set({ type: 'downloaded', version: this.s.version ?? '' }); return this.s; }
    try {
      await (await this.real()).downloadUpdate();
      this.sys.log(`[updates] version ${this.s.version} downloaded`);
      this.set({ type: 'downloaded', version: this.s.version ?? '' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.sys.log(`[updates] download failed: ${message.split('\n')[0]}`);
      this.set({ type: 'error', message });
    }
    return this.s;
  }

  /**
   * Close Hiltwright and run the downloaded installer, which opens Hiltwright again when it is done. Refused, with
   * what to wait for, while a build, an install, a restore, a copy or card sharing is running.
   */
  async install(fromPage: BusyFacts): Promise<{ ok: boolean; text: string }> {
    if (this.s.phase !== 'ready' && !(this.s.phase === 'failed' && this.s.failedAt === 'install')) return { ok: false, text: 'No update is downloaded yet.' };
    const refused = restartRefusal({ work: [...fromPage.work, ...this.sys.workInMain()], cardShared: fromPage.cardShared });
    if (refused) { this.sys.log(`[updates] restart refused: ${refused}`); return { ok: false, text: refused }; }
    if (this.pretending) { this.sys.log('[updates] pretending: would restart to update now'); return { ok: true, text: 'Restarting to update.' }; }
    try {
      const u = await this.real();
      this.sys.log(`[updates] restarting to install version ${this.s.version}`);
      // Not silent: the installer shows its small progress window, then opens Hiltwright again.
      u.quitAndInstall(false, true);
      return { ok: true, text: 'Restarting to update.' };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.set({ type: 'error', message });
      return { ok: false, text: `Could not start the update: ${this.s.error ?? message}` };
    }
  }
}

/** Counts main's long jobs as they run: each request in WORK_CHANNELS, from its start until it is answered. */
export class WorkCounter {
  private running = new Map<WorkKind, number>();
  wrap<F extends (...args: never[]) => unknown>(kind: WorkKind | undefined, fn: F): F {
    if (!kind) return fn;
    const wrapped = async (...args: Parameters<F>) => {
      this.running.set(kind, (this.running.get(kind) ?? 0) + 1);
      try { return await fn(...args); } finally {
        const n = (this.running.get(kind) ?? 1) - 1;
        if (n > 0) this.running.set(kind, n); else this.running.delete(kind);
      }
    };
    return wrapped as unknown as F;
  }
  now(): WorkKind[] { return [...this.running.keys()]; }
}
