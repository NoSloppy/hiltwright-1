// Sharing the saber's card with this computer, and giving it back: the waiting and deciding, kept apart from React,
// Web Serial and PowerShell so it can be tested under node (test/cardShare.test.ts). Fonts.tsx wires it up.
//
// What the Proffieboard V3 showed on 2026-11-18:
// - `sd 1` can be quiet for more than 10 s while the saber lets go of its card (boardOps `sendOptionsFor`);
// - Windows can take minutes to open the card over the saber's full-speed USB link, and the drive list itself can
//   time out meanwhile. So the wait is by the clock, a look Windows did not answer is not "no drive", and a wait
//   that runs out never takes the card back by itself: the card stays shared until the owner gives it back.

import type { CardInfo, DriveLook } from '../../shared/api';
import { parseSdAccess } from './boardOps';

/** How long to wait for Windows to show the saber's card as a drive before asking the owner what to do. */
export const DRIVE_WAIT_MS = 3 * 60_000;
/** The pause between one look for drives and the next. A look itself can take up to 15 s while Windows is busy. */
export const LOOK_EVERY_MS = 1000;

export interface SendResult { lines: string[]; silent?: boolean }

export interface WaitProgress {
  /** When the wait started (by `now`), so the page can show a running time between looks. */
  startedAt: number;
  waitedMs: number;
  looks: number;
  /** Looks Windows did not answer. */
  unanswered: number;
  /** What the latest look found: nothing yet, no new drive, or that Windows did not answer it. */
  last: 'none' | 'no-drive' | 'no-answer';
  /** The latest look's answer took this long. */
  lastMs: number;
}

export interface WaitDeps {
  look: () => Promise<DriveLook>;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  /** The connected saber's USB serial, when known: its own drive carries it (card-safety D3). */
  saberSerial: string | null;
  /** The owner pressed Cancel: give the card back. */
  cancelled?: () => boolean;
  /** Stop waiting without sending anything (the saber went away, or the page closed). */
  stopped?: () => boolean;
  onProgress?: (p: WaitProgress) => void;
  log?: (line: string) => void;
}

export interface ShareDeps extends WaitDeps {
  /** Send a command to the saber in its turn. `sd 1` and `sd 0` get their own long silence limit there. */
  send: (command: string) => Promise<SendResult>;
  eject: (root: string) => Promise<{ ok: boolean; detail: string }>;
  /** The saber said its card is shared, before any drive is known: the write guard starts refusing now. */
  onShared?: () => void;
  /** Called once the saber has said its card access is on, when the wait for the drive begins. */
  onWaiting?: () => void;
}

/** The drives seen before the saber shared its card, or null when there is no such list to compare with. */
export type Baseline = ReadonlySet<string> | null;

/**
 * Which drive is the saber's own card:
 * 1. the one Windows says belongs to the saber's USB connection (its serial), wherever and whenever it appeared;
 * 2. otherwise the one drive that was not there before, leaving out a drive that belongs to another saber;
 * 3. two or more such drives: `several`, so the owner chooses.
 */
export function pickSaberDrive(cards: CardInfo[], opts: { saberSerial: string | null; before: Baseline }): { card: CardInfo; by: 'serial' | 'new' } | { several: CardInfo[] } | null {
  if (opts.saberSerial) {
    const mine = cards.find((c) => c.saberSerial === opts.saberSerial);
    if (mine) return { card: mine, by: 'serial' };
  }
  if (!opts.before) return null;
  const before = opts.before;
  const fresh = cards.filter((c) => !before.has(c.root) && (c.saberSerial === null || c.saberSerial === opts.saberSerial));
  if (fresh.length === 1) return { card: fresh[0], by: 'new' };
  return fresh.length > 1 ? { several: fresh } : null;
}

export type WaitOutcome =
  | { kind: 'found'; card: CardInfo; by: 'serial' | 'new'; waitedMs: number }
  | { kind: 'several'; cards: CardInfo[]; waitedMs: number }
  | { kind: 'timeout'; waitedMs: number; looks: number; unanswered: number }
  | { kind: 'cancelled'; waitedMs: number; lastCards: CardInfo[] }
  | { kind: 'stopped'; waitedMs: number };

/**
 * Look for the saber's drive until it appears, by the clock: up to `limitMs`. A look Windows did not answer counts
 * as no answer, never as an empty list. With no `before` list, the first look Windows answers becomes it, so a drive
 * already there is found only by its serial. Nothing is sent to the saber here.
 */
export async function waitForDrive(d: WaitDeps, opts: { before: Baseline; limitMs?: number }): Promise<WaitOutcome> {
  const limit = opts.limitMs ?? DRIVE_WAIT_MS;
  const startedAt = d.now();
  const log = d.log ?? (() => {});
  let before = opts.before;
  let looks = 0, unanswered = 0, lastCards: CardInfo[] = [];
  let lastReport = 0;
  const waited = () => d.now() - startedAt;
  log(`waiting up to ${Math.round(limit / 1000)} s for the saber's drive${d.saberSerial ? ` (serial ${d.saberSerial})` : ', no USB serial to know it by'}`);
  for (;;) {
    if (d.stopped?.()) { log(`stopped waiting after ${Math.round(waited() / 1000)} s`); return { kind: 'stopped', waitedMs: waited() }; }
    if (d.cancelled?.()) { log(`cancelled after ${Math.round(waited() / 1000)} s`); return { kind: 'cancelled', waitedMs: waited(), lastCards }; }
    const look = await d.look();
    looks++;
    if (d.stopped?.()) return { kind: 'stopped', waitedMs: waited() };
    if (d.cancelled?.()) { log(`cancelled after ${Math.round(waited() / 1000)} s`); return { kind: 'cancelled', waitedMs: waited(), lastCards }; }
    if (!look.answered) {
      unanswered++;
      log(`look ${looks}: Windows did not answer (${look.detail}, ${look.ms} ms); not counted as "no drive"`);
    } else {
      lastCards = look.cards;
      const pick = pickSaberDrive(look.cards, { saberSerial: d.saberSerial, before });
      if (pick && 'card' in pick) {
        log(`found ${pick.card.root} after ${Math.round(waited() / 1000)} s, ${pick.by === 'serial' ? 'by its USB serial' : 'as the one new drive'} (${looks} looks, ${unanswered} not answered)`);
        return { kind: 'found', card: pick.card, by: pick.by, waitedMs: waited() };
      }
      if (pick) {
        log(`${pick.several.length} new drives (${pick.several.map((c) => c.root).join(', ')}) and none known by the saber's serial: the owner chooses`);
        return { kind: 'several', cards: pick.several, waitedMs: waited() };
      }
      if (!before) before = new Set(look.cards.map((c) => c.root));
    }
    d.onProgress?.({ startedAt, waitedMs: waited(), looks, unanswered, last: look.answered ? 'no-drive' : 'no-answer', lastMs: look.ms });
    if (waited() - lastReport >= 30_000) { lastReport = waited(); log(`still waiting: ${Math.round(waited() / 1000)} s, ${looks} looks, ${unanswered} not answered by Windows`); }
    if (waited() >= limit) {
      log(`no drive after ${Math.round(waited() / 1000)} s (${looks} looks, ${unanswered} not answered by Windows); the card stays shared`);
      return { kind: 'timeout', waitedMs: waited(), looks, unanswered };
    }
    await d.sleep(Math.min(LOOK_EVERY_MS, Math.max(0, limit - waited())));
  }
}

/** What the saber says about its card: `sd` asked on its own, after a pause or when the answer was unclear. */
export async function askCardAccess(send: ShareDeps['send']): Promise<boolean | null> {
  try { return parseSdAccess((await send('sd')).lines); } catch { return null; }
}

export type GiveBackOutcome =
  | { kind: 'given-back' }
  | { kind: 'eject-failed'; detail: string }
  | { kind: 'not-confirmed'; access: boolean | null };

/**
 * Give the card back (card-safety D4): Windows lets go of the drive first, when there is one, then the saber is told
 * `sd 0`. Only an `SD Access OFF` counts. A saber that went quiet meanwhile is asked again with `sd`.
 */
export async function giveCardBack(d: Pick<ShareDeps, 'send' | 'eject' | 'log'>, root: string | null): Promise<GiveBackOutcome> {
  const log = d.log ?? (() => {});
  if (root) {
    const e = await d.eject(root);
    log(`eject ${root}: ${e.ok ? e.detail : `not released (${e.detail})`}`);
    if (!e.ok) return { kind: 'eject-failed', detail: e.detail };
  }
  let access: boolean | null = null;
  try { access = parseSdAccess((await d.send('sd 0')).lines); } catch { /* the saber may have dropped serial briefly */ }
  if (access === null) access = await askCardAccess(d.send);
  log(`gave the card back: the saber says ${access === false ? 'SD Access OFF' : access === true ? 'SD Access ON' : 'nothing about its card'}`);
  return access === false ? { kind: 'given-back' } : { kind: 'not-confirmed', access };
}

export type ShareOutcome =
  | { kind: 'unsupported' }
  | { kind: 'refused'; answer: string }
  | { kind: 'failed'; detail: string }
  | (WaitOutcome & { kind: 'found' | 'several' | 'timeout' | 'stopped'; before: Baseline; alreadyShared: boolean })
  | { kind: 'cancelled'; waitedMs: number; giveBack: GiveBackOutcome };

/**
 * Share the saber's card, from wherever it stands:
 * 1. Ask the saber (`sd`) whether its card is already shared. If it is (after a wait that ran out, or a reconnect to a
 *    saber still sharing), nothing more is sent and the drive is looked for, one already there included.
 * 2. Otherwise note the drives there now, send `sd 1`, and read the answer. A pause or an unclear answer is followed
 *    by asking `sd` again, never by assuming.
 * 3. Wait for the drive by the clock. A wait that runs out sends nothing: the card stays shared and the owner chooses.
 *    Cancel gives the card back the same way "Give the card back" does.
 */
export async function shareCard(d: ShareDeps, opts: { limitMs?: number; before?: Baseline } = {}): Promise<ShareOutcome> {
  const log = d.log ?? (() => {});
  // Keep waiting: the drives noted before this share began still tell a new drive apart.
  let before: Baseline = opts.before ?? null;
  const already = await askCardAccess(d.send);
  if (already !== true) {
    // The drives there before the saber shares its card: one that appears after is a candidate for its card.
    before = null;
    const first = await d.look();
    if (first.answered) before = new Set(first.cards.map((c) => c.root));
    else log(`Windows did not answer the look before sharing (${first.detail}); the saber's drive will be known by its serial, or by the first answer`);
    let r: SendResult;
    try { r = await d.send('sd 1'); } catch (err) { return { kind: 'failed', detail: String(err) }; }
    if (r.lines.some((l) => /^Whut\? :/.test(l))) return { kind: 'unsupported' };
    let access = parseSdAccess(r.lines);
    if (access === null) {
      log(`no clear answer to sd 1${r.silent ? ' (the link paused)' : ''}: asking the saber`);
      access = await askCardAccess(d.send);
    }
    if (access !== true) return { kind: 'refused', answer: r.lines.join(' ').trim() || 'nothing' };
  } else log('the saber already shares its card: looking for its drive');
  d.onShared?.();
  d.onWaiting?.();
  const w = await waitForDrive(d, { before, limitMs: opts.limitMs });
  if (w.kind === 'cancelled') {
    const pick = pickSaberDrive(w.lastCards, { saberSerial: d.saberSerial, before });
    const root = pick && 'card' in pick ? pick.card.root : null;
    return { kind: 'cancelled', waitedMs: w.waitedMs, giveBack: await giveCardBack(d, root) };
  }
  return { ...w, before, alreadyShared: already === true };
}

/** "1 min 20 s", "45 s": a wait in plain words. */
export function plainDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60} s` : ''}`;
}
