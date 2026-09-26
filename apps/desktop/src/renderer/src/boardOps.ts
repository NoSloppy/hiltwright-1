// Two rules of the board session, kept apart from React and Web Serial so they can be tested under node
// (test/boardOps.test.ts). useBoard (board.ts) holds one of each.

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
