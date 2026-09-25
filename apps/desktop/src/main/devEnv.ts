// Development switches (`HILTWRIGHT_*` environment variables) steer the app in development only. A packaged build
// removes them all before anything reads them. That works because every switch is read where it is used, never
// when a module loads: keep it that way when adding one.

export const DEV_PREFIX = 'HILTWRIGHT_';

/** Remove every development switch from `env` when the app is packaged. Returns the names removed. */
export function scrubDevEnv(env: Record<string, string | undefined>, packaged: boolean): string[] {
  if (!packaged) return [];
  const removed = Object.keys(env).filter((k) => k.startsWith(DEV_PREFIX));
  for (const k of removed) delete env[k];
  return removed;
}
