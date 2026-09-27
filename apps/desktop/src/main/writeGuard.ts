// Main's own check before firmware is written (install-safety-nets, FW10): only the last successful build made for
// this saber in this run, from wiring the owner confirmed. The page has the same gate; this one does not depend on it.

import { resolve } from 'node:path';
import { wiringConfirmed, type SaberConfigModel } from '@hiltwright/core';

/** A build main made: where its firmware is, and the wiring (board and blades) it was made from, as a fingerprint. */
export interface KeptBuild { dfuPath: string; layout: string }

export const NOT_LAST_BUILD = 'This is not the build just made for this saber, so nothing was written. Build again, then install.';
export const WIRING_NOT_CONFIRMED = 'The wiring this build was made from has not been confirmed, so nothing was written. Confirm it on the Wiring page, then install.';

/** Paths arrive with whatever slashes the builder used; compare them resolved and case-folded (Windows). */
const norm = (p: string) => resolve(p).replace(/[\\/]+/g, '/').toLowerCase();

/**
 * Whether this firmware may be written for this saber: it is the saber's last build, and the saber's saved wiring is
 * confirmed for exactly the board and blades that build was made from.
 */
export function writeAllowed(last: KeptBuild | undefined, saved: SaberConfigModel | undefined, dfuPath: string): { ok: true } | { ok: false; text: string } {
  if (!last || norm(last.dfuPath) !== norm(dfuPath)) return { ok: false, text: NOT_LAST_BUILD };
  if (!saved || !wiringConfirmed(saved) || saved.wiringConfirmation?.layout !== last.layout) return { ok: false, text: WIRING_NOT_CONFIRMED };
  return { ok: true };
}
