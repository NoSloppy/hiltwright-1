// Rules of the board session, kept apart from React and Web Serial so they can be tested under node
// (test/boardOps.test.ts). useBoard (board.ts) uses each.

/**
 * One connection attempt at a time. After a reflash, the install flow and the Web Serial 'connect' event both try to
 * open the port; one is enough. The check and the claim happen together, with no await between them.
 * Returns whether this attempt ran.
 */
export function connectGate(isOpen: () => boolean): (attempt: () => Promise<void>) => Promise<boolean> {
  let inFlight = false;
  return async (attempt) => {
    if (inFlight || isOpen()) return false;
    inFlight = true;
    try { await attempt(); } finally { inFlight = false; }
    return true;
  };
}

/** Board operations run one after another, in the order they were asked for. A failure does not stop the next one. */
export function serialQueue(): <T>(op: () => Promise<T>) => Promise<T> {
  let tail: Promise<unknown> = Promise.resolve();
  return (op) => {
    const next = tail.then(op);
    tail = next.then(() => undefined, () => undefined);
    return next;
  };
}

/** What the save status shows: nothing yet, an operation writing, the last one saved, or why it failed. */
export type SaveState = { kind: 'idle' } | { kind: 'writing'; what: string } | { kind: 'saved'; what: string; ms: number; at: number } | { kind: 'failed'; what: string; error: string };
export interface OpResult { ok: boolean; error?: string; ms?: number; note?: string }
export interface OpDeps<C> {
  /** The board client, or null when the saber is no longer connected. */
  client: () => C | null;
  setBusy: (busy: boolean) => void;
  setSave: (save: SaveState) => void;
  log: (kind: 'in' | 'out', text: string) => void;
  snapshot: (label: string) => Promise<void>;
}

/**
 * Run one board operation with busy state, snapshot and save-state bookkeeping. An operation whose turn comes after
 * the saber has gone (unplugged while it waited in the queue) is reported as not sent, never dropped silently.
 */
export async function runOperation<C>(deps: OpDeps<C>, label: string, op: (c: C) => Promise<OpResult>, withSnapshot: boolean): Promise<void> {
  const { setBusy, setSave, log, snapshot } = deps;
  const client = deps.client();
  if (!client) {
    setSave({ kind: 'failed', what: label, error: 'Not sent: the saber is not connected.' });
    log('out', `✗ ${label}: not sent, the saber is not connected`);
    console.log(`[board] NOT SENT: ${label} · the saber is not connected`);
    return;
  }
  setBusy(true);
  setSave({ kind: 'writing', what: label });
  const started = Date.now();
  try {
    if (withSnapshot) await snapshot(`Before: ${label}`);
    log('in', label);
    const r = await op(client);
    if (r.ok) {
      setSave({ kind: 'saved', what: r.note ? `${label} · ${r.note}` : label, ms: r.ms ?? Date.now() - started, at: Date.now() });
      log('out', `✓ ${label}`);
      console.log(`[board] ok: ${label} · ${r.ms ?? Date.now() - started} ms`);
    } else {
      setSave({ kind: 'failed', what: label, error: r.error ?? 'unknown' });
      log('out', `✗ ${label}: ${r.error}`);
      console.log(`[board] FAILED: ${label} · ${r.error}`);
    }
  } catch (err) {
    setSave({ kind: 'failed', what: label, error: String(err) });
    console.log(`[board] FAILED: ${label} · ${String(err)}`);
  } finally {
    setBusy(false);
  }
}
