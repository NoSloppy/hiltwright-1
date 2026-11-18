// Transport-agnostic board client. The renderer supplies a Transport over Web Serial; tests supply a replay.
//
// Two modes, chosen per board:
// - Untagged (OS 7.x): one command in flight; a response is complete when a shape predicate says so (VARIATION=
//   ends a preset block) or when the line stream has been idle for `idleMs`. Writes answer with nothing or with
//   chatter, so they complete by idle and are verified with a read-back.
// - Tagged (OS 8.x, `tag| command` with a space after the pipe): the board prefixes every line the command prints
//   with `n,len,tag|`. The client tags each command uniquely and follows it with a sentinel command that the board
//   rejects (`tagx| hw_end` → `Whut? :tagx|`), so a response is complete exactly when the sentinel's rejection
//   arrives. No idle guessing, and a late answer to an earlier command is recognised by its tag and dropped
//   instead of being mistaken for the current one. That matters on a busy board: with a heavy style and the blade
//   on, a V2 answers seconds late.
// - Unsolicited status lines are delivered to `onEvent` and never counted as response lines.

import { LineBuffer, isNoise } from './lines';

export interface Transport {
  write(text: string): Promise<void> | void;
  /** Register a data callback. Returns an unsubscribe function. */
  onData(cb: (chunk: string) => void): () => void;
}

export interface SendOptions {
  /** Return true when the line completes the response. */
  until?: (line: string, all: string[]) => boolean;
  /** Complete after this many ms with no new lines (untagged mode only). */
  idleMs?: number;
  /** Give up after this many ms in total. */
  timeoutMs?: number;
  /** The board is expected to go quiet (RebootDFU): a silent ending is not reported through `onSilent`. */
  expectSilence?: boolean;
  /**
   * This command's own silence limit, in place of the client's `silentMs`. For the few commands a healthy board is
   * known to be quiet through (`sd 1`, `sd 0`: the saber lets go of its card, or takes it back, before it answers).
   */
  silentMs?: number;
}

export interface Response {
  command: string;
  lines: string[];
  /** Lines the board printed on its own during this command. */
  events: string[];
  ms: number;
  timedOut: boolean;
  /** True when at least one line carried this command's tag (OS 8 framing in effect). */
  tagged: boolean;
  /**
   * Timed out because the board said nothing: not a byte since the command was written, or nothing for `silentMs`.
   * A board that keeps printing, answered or not, is never silent.
   */
  silent: boolean;
}

export interface ClientOptions {
  idleMs?: number;
  timeoutMs?: number;
  /**
   * Tagged mode: if nothing for the current tag has arrived after this long, send a kick line. A board that has
   * fallen behind releases one earlier answer per line it receives, so kicks push the real answer out.
   */
  kickMs?: number;
  maxKicks?: number;
  /** Total timeout used in tagged mode, where the sentinel ends the response and only a dead board is left to wait for. */
  taggedTimeoutMs?: number;
  /**
   * A tagged command ends early when the board has sent nothing at all, kicks unanswered, for this long: a live
   * ProffieOS 8 board answers a kick at once, so only a dead one stays quiet. Default 10 s.
   */
  silentMs?: number;
  /** Called for each command that timed out silent (see Response.silent), unless it expected silence. */
  onSilent?: (response: Response) => void;
  /**
   * The number of the first tag (`h<n>`) and kick (`k<n>`) this client sends. A client made for a port opened again
   * carries on from the old one's `lastSeq` and `lastKick`, so a stale answer still on its way never matches a new tag.
   */
  firstSeq?: number;
  firstKick?: number;
  onEvent?: (line: string) => void;
  /** Every line written to the board ('sent', kicks and sentinels included) and every line it sends ('heard'), raw. */
  onTraffic?: (direction: 'sent' | 'heard', text: string) => void;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

const TAGGED = /^(\d+),(\d+),([A-Za-z0-9_]+)\|(.*)$/;
const REJECTED_TAG = /^Whut\? :([A-Za-z0-9_]+)\|\s*$/;

interface Pending {
  command: string;
  tag: string | null;
  sentinel: string | null;
  lines: string[];
  events: string[];
  sawTag: boolean;
  opts: Required<Pick<SendOptions, 'idleMs' | 'timeoutMs'>> & SendOptions;
  resolve: (done: boolean) => void;
  touch: () => void;
}

export class BoardClient {
  private lines = new LineBuffer();
  private queue: Promise<unknown> = Promise.resolve();
  private current: Pending | null = null;
  private seq = 0;
  private tagged = false;
  private closed = false;
  private readonly idleMs: number;
  private readonly timeoutMs: number;
  private readonly taggedTimeoutMs: number;
  private readonly kickMs: number;
  private readonly maxKicks: number;
  private readonly silentMs: number;
  private readonly onSilent: (response: Response) => void;
  /** Chunks received so far: a command that sees none arrive heard nothing at all. */
  private chunks = 0;
  private kicks = 0;
  /** When the board last sent anything at all. A board that is talking is not stuck, however long the command runs. */
  private lastHeard = 0;
  private readonly onEvent: (line: string) => void;
  private readonly onTraffic: ((direction: 'sent' | 'heard', text: string) => void) | null;
  private readonly now: () => number;
  private readonly setTimer: (fn: () => void, ms: number) => unknown;
  private readonly clearTimer: (handle: unknown) => void;
  private unsubscribe: () => void;

  constructor(private transport: Transport, opts: ClientOptions = {}) {
    this.idleMs = opts.idleMs ?? 400;
    this.timeoutMs = opts.timeoutMs ?? 8000;
    this.taggedTimeoutMs = opts.taggedTimeoutMs ?? 30000;
    this.kickMs = opts.kickMs ?? 800;
    this.maxKicks = opts.maxKicks ?? 30;
    this.silentMs = opts.silentMs ?? 10000;
    this.onSilent = opts.onSilent ?? (() => {});
    this.seq = Math.max(0, (opts.firstSeq ?? 1) - 1);
    this.kicks = Math.max(0, (opts.firstKick ?? 1) - 1);
    this.onEvent = opts.onEvent ?? (() => {});
    this.onTraffic = opts.onTraffic ?? null;
    this.now = opts.now ?? (() => Date.now());
    this.setTimer = opts.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = opts.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
    this.unsubscribe = transport.onData((chunk) => this.receive(chunk));
  }

  /** Stop listening and end any command in flight (its kicks included) as timed out. */
  close(): void {
    this.unsubscribe();
    this.closed = true;
    this.current?.resolve(false);
  }

  /** Write to the transport; a failure (port gone) ends the current command instead of surfacing as an unhandled rejection. */
  private out(text: string): void {
    if (this.closed) return;
    if (this.onTraffic) for (const l of text.split('\n')) if (l) this.onTraffic('sent', l);
    Promise.resolve()
      .then(() => this.transport.write(text))
      .catch((err) => { this.onEvent(`(write failed: ${String(err)})`); this.current?.resolve(false); });
  }

  /** The number of the last tag and the last kick sent (0 before the first). */
  get lastSeq(): number {
    return this.seq;
  }
  get lastKick(): number {
    return this.kicks;
  }

  /** Whether commands are being tagged (OS 8 framing). */
  get isTagged(): boolean {
    return this.tagged;
  }

  /**
   * Find out whether the board understands `tag| command`. Sends a tagged `version`; OS 7 answers `Whut?`, OS 8
   * answers with tagged lines. Leaves the client in the matching mode and returns it.
   */
  async detectTagging(): Promise<boolean> {
    this.tagged = false;
    const r = await this.send('hwt| version', { idleMs: 700, timeoutMs: 6000 });
    this.tagged = r.tagged;
    return this.tagged;
  }

  private receive(chunk: string): void {
    this.lastHeard = this.now();
    this.chunks++;
    for (const raw of this.lines.push(chunk)) {
      this.onTraffic?.('heard', raw);
      const cur = this.current;
      const m = TAGGED.exec(raw);
      if (m) {
        // A tagged line belongs to the command with that tag; anything else is a late answer to an earlier one.
        if (cur?.tag && m[3] === cur.tag) {
          cur.sawTag = true;
          this.acceptLine(cur, m[4]);
        } else {
          this.onEvent(`(late ${m[3]}) ${m[4]}`);
        }
        continue;
      }
      const rej = REJECTED_TAG.exec(raw);
      if (rej) {
        if (cur?.sentinel && rej[1] === cur.sentinel) { cur.resolve(true); continue; }
        if (/^k\d+$/.test(rej[1])) { this.onEvent(`(late) ${raw}`); continue; } // a kick's own rejection
        // The real command was unknown: the board names the tag, so restore the command for the callers' parsers.
        if (cur?.tag && rej[1] === cur.tag) { this.acceptLine(cur, `Whut? :${cur.command}`); continue; }
        this.onEvent(`(late) ${raw}`);
        continue;
      }
      if (isNoise(raw)) {
        this.onEvent(raw);
        if (cur) cur.events.push(raw);
        continue;
      }
      if (!cur) {
        if (raw.trim()) this.onEvent(raw);
        continue;
      }
      if (cur.tag) {
        // Tagged mode: an untagged, non-noise line while a command runs is still an event (STDERR output is not tagged).
        this.onEvent(raw);
        cur.events.push(raw);
        continue;
      }
      this.acceptLine(cur, raw);
    }
  }

  private acceptLine(cur: Pending, line: string): void {
    cur.lines.push(line);
    cur.touch();
    if (cur.opts.until?.(line, cur.lines)) cur.resolve(true);
  }

  /** Send one command and collect its response. Commands queue; the promise resolves in order. */
  send(command: string, options: SendOptions = {}): Promise<Response> {
    const run = () => new Promise<Response>((resolveOuter) => {
      // A caller may tag a command itself (the detection probe does); its lines are accepted under that tag but the
      // response still ends by idle, since no sentinel follows.
      const explicit = /^([A-Za-z0-9_]+)\| /.exec(command)?.[1] ?? null;
      const useTags = this.tagged && !explicit;
      const opts = { idleMs: options.idleMs ?? this.idleMs, timeoutMs: options.timeoutMs ?? (useTags ? this.taggedTimeoutMs : this.timeoutMs), ...options };
      const silentMs = options.silentMs ?? this.silentMs;
      const started = this.now();
      const chunksAtStart = this.chunks;
      let idleHandle: unknown = null;
      let timeoutHandle: unknown = null;
      let kickHandle: unknown = null;
      let settled = false;
      const finish = (timedOut: boolean) => {
        if (settled) return;
        settled = true;
        if (idleHandle !== null) this.clearTimer(idleHandle);
        if (timeoutHandle !== null) this.clearTimer(timeoutHandle);
        if (kickHandle !== null) this.clearTimer(kickHandle);
        const cur = this.current!;
        this.current = null;
        const quietFor = this.now() - Math.max(this.lastHeard, started);
        const silent = timedOut && (this.chunks === chunksAtStart || quietFor >= silentMs);
        const response: Response = { command, lines: cur.lines, events: cur.events, ms: this.now() - started, timedOut, tagged: cur.sawTag, silent };
        if (silent && !opts.expectSilence && !this.closed) this.onSilent(response);
        resolveOuter(response);
      };
      const touch = () => {
        if (useTags) return; // the sentinel ends a tagged response; idle means nothing on a busy board
        // An explicitly tagged command (the probe) must not end on idle before anything has arrived: a board
        // running behind answers only after kicks, and the total timeout bounds the wait.
        if (explicit && !this.current?.lines.length) return;
        if (idleHandle !== null) this.clearTimer(idleHandle);
        idleHandle = this.setTimer(() => finish(false), opts.idleMs);
      };
      const tag = useTags ? `h${++this.seq}` : explicit;
      this.current = { command, tag, sentinel: useTags ? `${tag}x` : null, lines: [], events: [], sawTag: false, opts, resolve: (done) => finish(!done), touch };
      timeoutHandle = this.setTimer(() => finish(true), opts.timeoutMs);
      touch();
      // Kicks: while a tagged command has produced nothing (explicit tag) or no sentinel yet (auto tag), and the board
      // has been silent for kickMs, send a harmless rejected line. A board running N lines behind needs N of them; a healthy one none.
      if (tag) {
        let sent = 0;
        const kick = () => {
          if (settled) return;
          const need = useTags || !this.current?.sawTag;
          // Nothing at all for silentMs, kicks included: the board is not going to answer. Stop waiting for the ceiling.
          if (need && this.now() - Math.max(this.lastHeard, started) >= silentMs) { finish(true); return; }
          // Only a silent board gets kicked. Long commands (font scans, listings) keep printing and need no help.
          const silent = this.now() - Math.max(this.lastHeard, started) >= this.kickMs;
          if (need && silent && sent < this.maxKicks) {
            sent++;
            this.out(`k${++this.kicks}| hw_end\n`);
            this.onEvent(`(kick ${sent} for ${tag})`);
          }
          if (need) kickHandle = this.setTimer(kick, this.kickMs);
        };
        kickHandle = this.setTimer(kick, this.kickMs);
      }
      if (this.closed) { finish(true); return; }
      this.out(useTags ? `${tag}| ${command}\n${tag}x| hw_end\n` : `${command}\n`);
    });
    const next = this.queue.then(run, run);
    this.queue = next.then(() => undefined, () => undefined);
    return next;
  }
}
