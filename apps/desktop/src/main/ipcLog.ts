// A page request that fails in main is written to the run log before the page sees the error, so the log shows
// which request failed and why even when the page only shows a short message (or none).

type Handler = (...args: never[]) => unknown;

export function logged<F extends Handler>(channel: string, fn: F, log: (line: string) => void = (l) => console.log(l)): F {
  const wrapped = async (...args: Parameters<F>) => {
    try {
      return await fn(...args);
    } catch (err) {
      log(`[ipc] ${channel} failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  };
  return wrapped as unknown as F;
}
