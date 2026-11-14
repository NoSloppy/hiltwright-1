// Which card Fonts & SD shows and copies to (card-safety D3). Kept apart from React so it can be tested under node.

import type { CardInfo } from '../../shared/api';

export interface CardChoice {
  /** The card to show, or null while there is none, or while the owner must choose. */
  card: CardInfo | null;
  /** The card is the connected saber's own, shared over USB. */
  own: boolean;
  /** Several ProffieOS cards and none of them the saber's: the owner chooses, and nothing is copied meanwhile. */
  ask: boolean;
  /** Every card the owner could switch to. */
  choices: CardInfo[];
}

/**
 * - the owner's own choice, while that card is still there (they switched, or answered "which card")
 * - the card the connected saber is sharing: its drive belongs to that saber's USB serial, or it is the drive that
 *   appeared when the app asked the saber to share
 * - the only ProffieOS card
 * - otherwise ask
 */
export function chooseCard(cards: CardInfo[], opts: { sharedRoot: string | null; saberSerial: string | null; chosen: string | null }): CardChoice {
  const isOwn = (c: CardInfo) => (!!opts.saberSerial && c.saberSerial === opts.saberSerial) || (!!opts.sharedRoot && c.root === opts.sharedRoot);
  const choices = cards.filter((c) => c.proffie || isOwn(c));
  const pick = (card: CardInfo | null, ask = false): CardChoice => ({ card, own: !!card && isOwn(card), ask, choices });
  const chosen = opts.chosen ? choices.find((c) => c.root === opts.chosen) : undefined;
  if (chosen) return pick(chosen);
  const own = choices.find(isOwn);
  if (own) return pick(own);
  if (choices.length === 1) return pick(choices[0]);
  return pick(null, choices.length > 1);
}

/**
 * The card the owner picked on Fonts & SD, kept for this run so the font library copies to the same one. Not saved:
 * drive letters change from one day to the next.
 */
let remembered: string | null = null;
export function rememberCardChoice(root: string | null): void { remembered = root; }
export function rememberedCardChoice(): string | null { return remembered; }
