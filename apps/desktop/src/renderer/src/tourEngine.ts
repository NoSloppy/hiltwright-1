// The guided tour's rules, apart from React and the DOM so they are tested directly (test/tour.test.ts): the order of
// the steps across chapters and pages, and where the step's card goes so it never covers what it points at and never
// leaves the window. The words live in tourSteps.ts; the overlay that shows them is Tour.tsx.

/** One step as written in tourSteps.ts. */
export interface TourStepDef {
  title: string;
  /** Two or three short sentences, one paragraph each. */
  text: string[];
  /** The `data-tour` value of the thing to spotlight. None: the card sits in the middle of the window. */
  target?: string;
  /** `data-tour` values to click first, in order, so what the step explains is on screen (a tab, the first row). */
  before?: string[];
}

/** A chapter: one page of the app, or the welcome. */
export interface TourChapter {
  id: string;
  /** What the card shows as the chapter. */
  name: string;
  /** The page every step of the chapter is on. */
  page: string;
  steps: TourStepDef[];
}

/** A step with its place in the whole tour. */
export interface TourStep extends TourStepDef {
  index: number;
  chapter: string;
  chapterName: string;
  page: string;
  /** Its number within its chapter, from 1, and the chapter's length. */
  inChapter: number;
  chapterSize: number;
}

export function flattenTour(chapters: readonly TourChapter[]): TourStep[] {
  const out: TourStep[] = [];
  for (const c of chapters) {
    c.steps.forEach((s, k) => out.push({ ...s, index: out.length, chapter: c.id, chapterName: c.name, page: c.page, inChapter: k + 1, chapterSize: c.steps.length }));
  }
  return out;
}

/** The step after `i`, or null when `i` is the last: Next on the last step ends the tour. */
export function nextStep(steps: readonly TourStep[], i: number): number | null {
  return i + 1 < steps.length ? i + 1 : null;
}

/** The step before `i`; the first step stays where it is. */
export function prevStep(_steps: readonly TourStep[], i: number): number {
  return Math.max(0, i - 1);
}

/** The first step of the chapter after the one `i` is in, or null when it is the last chapter. */
export function skipChapter(steps: readonly TourStep[], i: number): number | null {
  const here = steps[i]?.chapter;
  const next = steps.findIndex((s, k) => k > i && s.chapter !== here);
  return next >= 0 ? next : null;
}

/** Where "Show me this page" starts: the first step of the chapter about `page`, else the start of the tour. */
export function startForPage(steps: readonly TourStep[], page: string): number {
  const first = steps.findIndex((s) => s.page === page && s.chapter !== steps[0]?.chapter);
  return first >= 0 ? first : 0;
}

/** "Step 4 of 48". */
export function stepCounter(steps: readonly TourStep[], i: number): string {
  return `Step ${i + 1} of ${steps.length}`;
}

// ---------------- where the card goes ----------------

export interface Rect { left: number; top: number; width: number; height: number }
export interface Size { width: number; height: number }
export type Side = 'right' | 'left' | 'below' | 'above' | 'center' | 'overlap';
export interface Placement { left: number; top: number; side: Side }

/** Space kept between the card and the window's edge, and between the card and its target. */
export const EDGE = 12;
export const GAP = 14;
/** The spotlight's outline sits this far outside the target. */
export const HALO = 6;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
const right = (r: Rect) => r.left + r.width;
const bottom = (r: Rect) => r.top + r.height;

/** The part of `r` inside the window, or null when none of it is. */
export function visiblePart(r: Rect, view: Size): Rect | null {
  const left = Math.max(0, r.left); const top = Math.max(0, r.top);
  const w = Math.min(view.width, right(r)) - left; const h = Math.min(view.height, bottom(r)) - top;
  return w > 0 && h > 0 ? { left, top, width: w, height: h } : null;
}

/** The spotlight around a target: the target grown by HALO, kept inside the window. */
export function spotlight(target: Rect, view: Size): Rect | null {
  const grown = { left: target.left - HALO, top: target.top - HALO, width: target.width + 2 * HALO, height: target.height + 2 * HALO };
  return visiblePart(grown, view);
}

function overlap(a: Rect, b: Rect): number {
  const w = Math.min(right(a), right(b)) - Math.max(a.left, b.left);
  const h = Math.min(bottom(a), bottom(b)) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * Where the card goes. With no target (or one outside the window) it is centred. Otherwise beside the target on the
 * side with the most room where the card fits whole, lined up with the target's middle as far as the window allows.
 * When no side has room (a target nearly as big as the window) it goes where it covers the least of the target.
 * The card is always inside the window, EDGE from its sides, as long as it is smaller than the window.
 */
export function placeCard(target: Rect | null, card: Size, view: Size): Placement {
  const maxLeft = view.width - EDGE - card.width;
  const maxTop = view.height - EDGE - card.height;
  const centred = (): Placement => ({ left: clamp((view.width - card.width) / 2, EDGE, maxLeft), top: clamp((view.height - card.height) / 2, EDGE, maxTop), side: 'center' });
  const t = target ? visiblePart(target, view) : null;
  if (!t) return centred();

  const midY = clamp(t.top + t.height / 2 - card.height / 2, EDGE, maxTop);
  const midX = clamp(t.left + t.width / 2 - card.width / 2, EDGE, maxLeft);
  const sides: { side: Side; room: number; need: number; at: () => Placement }[] = [
    { side: 'right', room: view.width - EDGE - (right(t) + GAP), need: card.width, at: () => ({ left: right(t) + GAP, top: midY, side: 'right' }) },
    { side: 'left', room: t.left - GAP - EDGE, need: card.width, at: () => ({ left: t.left - GAP - card.width, top: midY, side: 'left' }) },
    { side: 'below', room: view.height - EDGE - (bottom(t) + GAP), need: card.height, at: () => ({ left: midX, top: bottom(t) + GAP, side: 'below' }) },
    { side: 'above', room: t.top - GAP - EDGE, need: card.height, at: () => ({ left: midX, top: t.top - GAP - card.height, side: 'above' }) },
  ];
  // The most room left over once the card is in, so a card beside a tall panel does not squeeze in under a short one.
  const fitting = sides.filter((s) => s.room >= s.need).sort((a, b) => (b.room - b.need) - (a.room - a.need));
  if (fitting.length) return fitting[0].at();

  // Nowhere beside it: the place inside the window that covers least of it, trying the corners and the side midpoints.
  const xs = [EDGE, midX, maxLeft]; const ys = [EDGE, midY, maxTop];
  let best: Placement = { left: clamp(xs[2], EDGE, maxLeft), top: clamp(ys[2], EDGE, maxTop), side: 'overlap' };
  let least = Infinity;
  for (const y of ys) for (const x of xs) {
    const left = clamp(x, EDGE, maxLeft); const top = clamp(y, EDGE, maxTop);
    const o = overlap({ left, top, width: card.width, height: card.height }, t);
    if (o < least) { least = o; best = { left, top, side: o === 0 ? 'center' : 'overlap' }; }
  }
  return best;
}

/** Whether a card placed at `p` stays inside the window and clear of `target`: what the screenshots are checked for. */
export function placementProblems(p: Placement, card: Size, view: Size, target: Rect | null): string[] {
  const out: string[] = [];
  if (p.left < 0 || p.top < 0 || p.left + card.width > view.width || p.top + card.height > view.height) out.push('leaves the window');
  const t = target ? visiblePart(target, view) : null;
  if (t && overlap({ left: p.left, top: p.top, width: card.width, height: card.height }, t) > 0) out.push('covers its target');
  return out;
}
