// The guided tour's overlay: the window dimmed, the thing a step explains spotlit, and the step's card beside it.
// The order of steps and where the card goes are tourEngine.ts; the words are tourSteps.ts; App.tsx runs the tour
// (the example saber, the page each step is on, and ending it). Clicks and keys are held here while it runs, so
// nothing on the page underneath is pressed by accident.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { nextStep, placeCard, placementProblems, prevStep, skipChapter, spotlight, stepCounter, type Rect, type Size, type TourStep } from './tourEngine';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const CARD_WIDTH = 372;

/** The page's element for a `data-tour` name: the first one that is shown, outside the tour itself. */
function find(name: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${CSS.escape(name)}"]`)) {
    if (el.closest('.tour')) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}
async function waitFor(name: string, ms: number): Promise<HTMLElement | null> {
  const until = Date.now() + ms;
  for (;;) {
    const el = find(name);
    if (el || Date.now() > until) return el;
    await sleep(80);
  }
}
/**
 * Bring the target into view by scrolling the panels it is in, up or down only. Never sideways, and never a box that
 * hides its overflow: those are the window's own frame, and scrolling them would shift the whole app.
 */
function reveal(el: HTMLElement): void {
  for (let box = el.parentElement; box && box !== document.body; box = box.parentElement) {
    const oy = getComputedStyle(box).overflowY;
    if ((oy !== 'auto' && oy !== 'scroll') || box.scrollHeight <= box.clientHeight) continue;
    const b = box.getBoundingClientRect(); const r = el.getBoundingClientRect();
    if (r.top < b.top) box.scrollTop -= b.top - r.top + 8;
    else if (r.bottom > b.bottom) box.scrollTop += Math.min(r.bottom - b.bottom + 8, r.top - b.top - 8);
  }
}
const rectOf = (el: Element): Rect => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; };
const sameRect = (a: Rect | null, b: Rect | null) => (!a || !b ? a === b : Math.abs(a.left - b.left) < 1 && Math.abs(a.top - b.top) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1);

// Development aid: hiltwrightTour(n) waits for step n to be on screen and placed, for screenshots (scripts/shots.mjs).
const settled: { index: number; done: () => void }[] = [];
export function waitForStep(index: number, ms = 10000): Promise<string> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve('timed out'), ms);
    settled.push({ index, done: () => { clearTimeout(t); resolve('shown'); } });
  });
}

export function Tour({ steps, index, page, onIndex, onEnd }: { steps: TourStep[]; index: number; page: string; onIndex: (i: number) => void; onEnd: () => void }) {
  // The step on screen: the one asked for, once its page is showing and its target found. Until then the last one stays.
  const [shown, setShown] = useState<{ index: number; target: HTMLElement | null } | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [view, setView] = useState<Size>({ width: window.innerWidth, height: window.innerHeight });
  const [card, setCard] = useState<Size>({ width: CARD_WIDTH, height: 240 });
  const cardRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const step = steps[index];

  // Each step: wait for its page, click what it needs open, then find what it points at. A target that is not there
  // does not stop the tour: the card is centred and the tour carries on.
  useEffect(() => {
    if (!step || page !== step.page) return;
    let live = true;
    void (async () => {
      await frame();
      for (const name of step.before ?? []) {
        const el = await waitFor(name, 1500);
        if (!live) return;
        if (el) { el.click(); await sleep(250); } else console.log(`[tour] step ${index + 1}: "${name}" to click first is not on the page`);
      }
      const el = step.target ? await waitFor(step.target, 2000) : null;
      if (!live) return;
      if (step.target && !el) console.log(`[tour] step ${index + 1}: "${step.target}" is not on the page, so the card is centred`);
      if (el) reveal(el);
      await frame();
      if (!live) return;
      setRect(el ? rectOf(el) : null);
      setShown({ index, target: el });
    })();
    return () => { live = false; };
  }, [index, page]); // eslint-disable-line react-hooks/exhaustive-deps

  // The target can move as its page settles (a list loads, a panel opens): follow it.
  useEffect(() => {
    const onResize = () => setView({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    const t = setInterval(() => {
      if (!shown?.target) return;
      let el: HTMLElement | null = shown.target;
      if (!el.isConnected) { const name = steps[shown.index]?.target; el = name ? find(name) : null; if (el) setShown((s) => (s ? { ...s, target: el } : s)); }
      const r = el ? rectOf(el) : null;
      setRect((old) => (sameRect(old, r) ? old : r));
    }, 200);
    return () => { window.removeEventListener('resize', onResize); clearInterval(t); };
  }, [shown, steps]);

  const at = shown ? steps[shown.index] : null;
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const size = { width: el.offsetWidth, height: el.offsetHeight };
    setCard((c) => (c.width === size.width && c.height === size.height ? c : size));
  }, [at, view]);

  const spot = rect ? spotlight(rect, view) : null;
  const place = placeCard(spot, card, view);

  // Once a step is on screen and placed: say so in the run log, with anything wrong with where the card ended up.
  useEffect(() => {
    if (!shown || !at) return;
    const id = requestAnimationFrame(() => {
      const el = bodyRef.current;
      const cut = el && el.scrollHeight > el.clientHeight + 1 ? ['text cut off'] : [];
      const problems = [...placementProblems(place, card, view, spot), ...cut, ...(at.target && !shown.target ? ['target missing'] : [])];
      console.log(`[tour] step ${shown.index + 1} "${at.title}" ${view.width}x${view.height}: card ${place.side}${problems.length ? `, ${problems.join(', ')}` : ''}`);
      for (const w of settled.splice(0)) if (w.index === shown.index) w.done(); else settled.push(w);
    });
    return () => cancelAnimationFrame(id);
  }, [shown, card, view]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus goes into the card when the tour starts, and back where it was when it ends.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    return () => { if (before?.isConnected) before.focus(); };
  }, []);
  useEffect(() => {
    if (!shown) return;
    if (!cardRef.current?.contains(document.activeElement)) nextRef.current?.focus();
  }, [shown]);

  const go = (i: number | null) => (i === null ? onEnd() : onIndex(i));
  const shownIndex = shown?.index ?? index;
  const next = () => go(nextStep(steps, shownIndex));
  const back = () => go(prevStep(steps, shownIndex));
  const skip = skipChapter(steps, shownIndex);
  const last = nextStep(steps, shownIndex) === null;

  // Keys: Right or Enter for the next step, Left for the one before, Escape ends the tour. Tab stays inside the card.
  // Nothing else reaches the page underneath while the tour runs.
  const keys = useRef({ next, back, onEnd });
  keys.current = { next, back, onEnd };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const box = cardRef.current;
      const t = e.target as HTMLElement | null;
      const inCard = !!box && t instanceof Node && box.contains(t);
      const onButton = inCard && t?.tagName === 'BUTTON';
      if (e.type === 'keydown') {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); keys.current.onEnd(); return; }
        if (e.key === 'ArrowRight' || (e.key === 'Enter' && !onButton)) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) keys.current.next(); return; }
        if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); if (!e.repeat) keys.current.back(); return; }
        if (e.key === 'Tab' && box) {
          const all = [...box.querySelectorAll<HTMLElement>('button:not(:disabled)')];
          const first = all[0]; const lastEl = all[all.length - 1];
          if (!inCard || (e.shiftKey && t === first) || (!e.shiftKey && t === lastEl)) { e.preventDefault(); (e.shiftKey ? lastEl : first)?.focus(); }
          e.stopPropagation();
          return;
        }
      }
      if (!inCard) e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKey, true); };
  }, []);

  const announce = at ? `${stepCounter(steps, at.index)}, ${at.chapterName}. ${at.title}. ${at.text.join(' ')}` : '';
  const hold = (e: React.SyntheticEvent) => { if (!cardRef.current?.contains(e.target as Node)) { e.preventDefault(); e.stopPropagation(); } };

  return (
    <div className="tour" onMouseDown={hold} onClick={hold} onContextMenu={hold} onWheel={(e) => e.stopPropagation()}>
      {spot ? <div className="tourspot" style={{ left: spot.left, top: spot.top, width: spot.width, height: spot.height }} /> : <div className="tourdim" />}
      <div className="sr" aria-live="polite">{announce}</div>
      {at && (
        <section ref={cardRef} className="panel tourcard" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-text" style={{ left: place.left, top: place.top, width: Math.min(CARD_WIDTH, view.width - 24) }}>
          <div ref={bodyRef} className="tourbody">
          <div className="row between" style={{ gap: 10 }}>
            <b className="ellip" style={{ fontWeight: 600, fontSize: 12.5 }}>{at.chapterName}</b>
            <span className="row" style={{ gap: 12, flex: 'none' }}>
              {skip !== null && at.chapterSize > 1 && <button type="button" className="holo nowrap" style={{ fontSize: 11.5 }} onClick={() => go(skip)}>Skip chapter</button>}
              <span className="mono mute nowrap" style={{ fontSize: 11 }}>{stepCounter(steps, at.index)}</span>
            </span>
          </div>
          <h3 id="tour-title">{at.title}</h3>
          <div id="tour-text" className="col" style={{ gap: 8 }}>{at.text.map((p) => <p key={p} className="dim" style={{ fontSize: 13.5 }}>{p}</p>)}</div>
          <div className="tournote"><Icon name="info" /><span>Example saber: nothing is sent to a real saber or saved during the tour.</span></div>
          </div>
          <div className="row between" style={{ gap: 8 }}>
            <button type="button" className="holo small" onClick={onEnd}>End the tour</button>
            <span className="row" style={{ gap: 8 }}>
              <button type="button" className="btn sm ghost" disabled={at.index === 0} onClick={back}><span className="b"><span className="i">Back</span></span></button>
              <button ref={nextRef} type="button" className="btn sm pri" onClick={next}><span className="b"><span className="i">{last ? 'Finish' : 'Next'}<Icon name="chev" /></span></span></button>
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
