// In-app updates, the page's half: the state main reports, the checks made by themselves (when the owner leaves that
// on), the small chip in the sidebar and the Updates panel on the About page. The decisions are in
// shared/updates.ts; main runs electron-updater (main/updates.ts). Nothing here shows or runs during the tour.

import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { workNow } from './work';
import { CHECK_ON_START_KEY, NETWORK_NOTE, actionLabel, actionsFor, checksOnStart, chipText, initialState, nextCheckIn, statusText, type UpdateAction, type UpdateState } from '../../shared/updates';

export interface UpdatesView {
  state: UpdateState;
  /** Check by itself when Hiltwright starts, and every few hours after. */
  auto: boolean;
  setAuto(on: boolean): void;
  run(a: UpdateAction): void;
  /** Why the last Restart to update was refused, as a plain sentence. */
  refused: string | null;
}

/**
 * The update state and its buttons. `tourOn`: nothing is checked by itself while the guided tour runs. `beforeRestart`
 * gives a page with unsaved work (the Style editor) its say first. `cardShared`: a saber's card is shared now.
 */
export function useUpdates(opts: { tourOn: boolean; cardShared: boolean; beforeRestart: (proceed: () => void) => void }): UpdatesView {
  const api = window.hiltwright?.updates;
  const [state, setState] = useState<UpdateState>(() => initialState(window.hiltwright?.appVersion ?? '?', false));
  const [auto, setAutoNow] = useState(() => { try { return checksOnStart(localStorage.getItem(CHECK_ON_START_KEY)); } catch { return true; } });
  const [refused, setRefused] = useState<string | null>(null);
  // Checks made by themselves so far in this run: after the first, the next waits a few hours.
  const [tries, setTries] = useState(0);
  const optsRef = useRef(opts); optsRef.current = opts;

  useEffect(() => {
    if (!api) return;
    void api.state().then(setState, () => undefined);
    return api.onChange(setState);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!api || opts.tourOn) return;
    const wait = nextCheckIn({ on: auto, phase: state.phase, checkedBefore: tries > 0 || !!state.checkedAt });
    if (wait === null) return;
    const t = setTimeout(() => { setTries((n) => n + 1); void api.check(false).then(setState, () => undefined); }, wait);
    return () => clearTimeout(t);
  }, [auto, state.phase, state.checkedAt, tries, opts.tourOn]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (state.phase !== 'ready') setRefused(null); }, [state.phase]);

  const setAuto = (on: boolean) => {
    setAutoNow(on);
    try { localStorage.setItem(CHECK_ON_START_KEY, on ? '1' : '0'); } catch { /* private mode */ }
  };
  const run = (a: UpdateAction) => {
    if (!api || optsRef.current.tourOn) return;
    setRefused(null);
    if (a === 'check') { void api.check(true).then(setState, () => undefined); return; }
    if (a === 'download') { void api.download().then(setState, () => undefined); return; }
    optsRef.current.beforeRestart(() => {
      void api.install({ work: workNow(), cardShared: optsRef.current.cardShared }).then((r) => { if (!r.ok) setRefused(r.text); }, (err) => setRefused(String(err).replace(/^Error: (Error invoking remote method '[^']+': Error: )?/, '')));
    });
  };
  return { state, auto, setAuto, run, refused };
}

/** Beside the version in the sidebar: shown only when there is something to press. Opens the About page. */
export function UpdateChip({ view, onOpen }: { view: UpdatesView; onOpen: () => void }) {
  const text = chipText(view.state);
  if (!text) return null;
  const tone = view.state.phase === 'failed' ? 'warn' : view.state.phase === 'ready' ? 'ok' : 'live';
  return (
    <button type="button" className={`chip ${tone} updchip`} title="Open About to update" onClick={onOpen}>
      <span className="dot" /><span>{text}</span>
    </button>
  );
}

/** The Updates panel on the About page. */
export function UpdatesPanel({ view }: { view: UpdatesView }) {
  const { state, auto, setAuto, run, refused } = view;
  const actions = actionsFor(state);
  const tone = state.phase === 'failed' ? 'red' : state.phase === 'available' || state.phase === 'ready' ? 'green' : '';
  return (
    <section className="panel" aria-label="Updates">
      <div className="ph"><h2>Updates</h2></div>
      <div className="pb col" style={{ gap: 14 }}>
        <div className="col" style={{ gap: 8 }}>
          <div className={tone ? `note ${tone}` : 'note'} role="status">
            <Icon name={state.phase === 'failed' ? 'warn' : state.phase === 'checking' || state.phase === 'downloading' ? 'clock' : state.phase === 'latest' || state.phase === 'ready' ? 'check' : 'info'} />
            <span>{statusText(state)}</span>
          </div>
          {state.phase === 'downloading' && (
            <div className="col" style={{ gap: 5 }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.percent} aria-label="Download progress">
              <div style={{ height: 8, background: '#1b2836' }}><div style={{ height: '100%', width: `${state.percent}%`, background: 'var(--holo)', transition: 'width .3s linear' }} /></div>
              <span className="hint">You can keep working while it downloads. Nothing is installed until you press Restart to update.</span>
            </div>
          )}
          {state.phase === 'ready' && <span className="hint">Hiltwright closes, the installer runs, and Hiltwright opens again. Your sabers, styles and fonts are kept.</span>}
          {refused && <div className="note amber" role="alert"><Icon name="warn" /><span>{refused}</span></div>}
          {actions.length > 0 && (
            <span className="row wrap" style={{ gap: 8 }}>
              {actions.map((a, i) => (
                <button key={a} type="button" className={`btn sm ${i === 0 && a !== 'check' ? 'pri' : ''}`} onClick={() => run(a)}>
                  <span className="b"><span className="i"><Icon name={a === 'check' ? 'undo' : a === 'download' ? 'import' : 'power'} />{actionLabel(a, state)}</span></span>
                </button>
              ))}
            </span>
          )}
        </div>
        <div className="col" style={{ gap: 6 }}>
          <label className="row" style={{ gap: 10, fontSize: 13, alignItems: 'center' }}>
            <button type="button" className={`tog ${auto ? 'on' : ''}`} role="switch" aria-checked={auto} aria-label="Check for updates when Hiltwright starts" onClick={() => setAuto(!auto)}><i /></button>
            Check for updates when Hiltwright starts
          </label>
          <span className="hint">{NETWORK_NOTE}</span>
        </div>
      </div>
    </section>
  );
}
