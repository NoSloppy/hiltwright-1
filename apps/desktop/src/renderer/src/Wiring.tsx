// Wiring: the board, its buttons and prop, and every blade the saber drives. The one thing old firmware cannot tell
// us, so it is described here once and confirmed against the installer's notes. Everything is saved to the saber as
// it is changed; Build & Install compiles from it.

import { useEffect, useRef, useState } from 'react';
import { parseId, wiringConfirmed, withWiringConfirmation, type BladeVariant, type BoardModel, type ModelBlade, type Prop, type SaberConfigModel } from '@hiltwright/core';
import { HardwareEditor } from './Hardware';
import type { Board } from './board';
import { Icon } from './Icon';
import type { Workspace } from './workspace';
import { Select } from './Select';

export const PROPS: { value: Prop; label: string }[] = [
  { value: 'fett263', label: 'Fett263 · edit mode, gestures' }, { value: 'sa22c', label: 'SA22C' }, { value: 'bc', label: 'BC' }, { value: 'default', label: 'ProffieOS default' },
];

export function Wiring({ ws, board, go }: { ws: Workspace; board: Board; go: (page: 'presets' | 'armory') => void }) {
  const { saber, info, model, live } = ws;
  // Edits happen on a local copy and are saved a moment after the last change, so a slider drag is one write.
  const [draft, setDraft] = useState<SaberConfigModel | null>(model);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { setDraft(model); }, [saber?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (model && !draft) setDraft(model); }, [model, draft]);
  // A confirmation records the layout it was given for, so a board or blade change withdraws it by itself and
  // changing back restores it; nothing here has to clear it.
  const update = (fn: (d: SaberConfigModel) => SaberConfigModel) => {
    setDraft((d) => {
      if (!d) return d;
      const next = fn(d);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => { void ws.saveModel(next); }, 300);
      return next;
    });
  };
  const change = (patch: Partial<SaberConfigModel>) => update((d) => ({ ...d, ...patch }));
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  if (!saber || !info || !draft) {
    return <section className="panel"><div className="pb col" style={{ gap: 6 }}><h3>No saber to wire yet</h3><span className="dim small">Plug a saber in, or start one in the Armory, and describe its wiring here.</span> <button type="button" className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => go('armory')}><span className="b"><span className="i">Go to the Armory</span></span></button></div></section>;
  }

  const confirmed = wiringConfirmed(draft);
  // Confirmed or installed before confirmations recorded what they checked: ask once, and say why.
  const confirmOnce = !confirmed && !draft.wiringConfirmation && (!!saber.model?.wiringConfirmedAt || !!saber.firmware);
  const detected = info.pixelBlades;
  const measureBlocked = !live ? 'Connect the saber to measure a blade.' : !saber.firmware?.bladeId ? 'Turn this on, then build and install once; readings only count from firmware that scans with the blade powered.' : null;

  return (
    <div className="work" style={{ gridTemplateColumns: 'minmax(0,1fr) 340px' }}>
      <section className="panel fill" aria-label="Wiring">
        <div className="ph"><h2>Wiring of {saber.name}</h2>{saber.planned && <span className="hint">planned ahead; the hilt has not been connected yet</span>}</div>
        <div className="pb col scroll" style={{ gap: 14 }}>
          {!saber.planned && detected.length > 0 && !confirmed && (
            <div className="note"><Icon name="info" /><span>The saber reported {detected.length} pixel blade{detected.length === 1 ? '' : 's'} ({detected.join(', ')} px). That is a starting point, not the wiring: check each blade's data pin and power pins against what the installer wrote down.</span></div>
          )}
          <div className="row wrap" style={{ gap: 14 }}>
            <label className="field"><span className="label">Board</span>
              <div className="seg" role="radiogroup" aria-label="Proffieboard model" style={{ height: 32 }}>
                {(['V2', 'V3'] as BoardModel[]).map((b) => <button key={b} type="button" role="radio" aria-checked={draft.board === b} className={draft.board === b ? 'on' : ''} style={{ height: 30 }} onClick={() => change({ board: b })}>Proffieboard {b}</button>)}
              </div>
            </label>
            <label className="field"><span className="label">Buttons</span>
              <div className="seg" role="radiogroup" aria-label="How many buttons" style={{ height: 32 }}>
                {([1, 2, 3] as const).map((n) => <button key={n} type="button" role="radio" aria-checked={draft.buttons === n} className={draft.buttons === n ? 'on' : ''} style={{ height: 30 }} onClick={() => change({ buttons: n })}>{n}</button>)}
              </div>
            </label>
            <label className="field grow" style={{ minWidth: 260 }}><span className="label">Prop file (how the buttons behave)</span>
              <span className="input sans" style={{ height: 32 }}><span className="ellip">{PROPS.find((p) => p.value === draft.prop)?.label}</span><span className="caret"><Icon name="down" /></span>
                <Select value={draft.prop} aria-label="Prop file" onChange={(e) => change({ prop: e.target.value as Prop })}>{PROPS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</Select></span>
            </label>
          </div>
          <HardwareEditor blades={draft.blades} board={draft.board} detected={detected} locked={board.busy} onChange={(b: ModelBlade[]) => change({ blades: b })}
            swap={{
              variants: draft.bladeId?.variants ?? [],
              onVariants: (v: BladeVariant[]) => change(v.length ? { bladeId: { variants: v } } : { bladeId: undefined }),
              measureBlocked,
              measure: async () => { const r = await board.send('scanid', { idleMs: 1500 }); return parseId([...r.lines, ...r.events]); },
            }} />
        </div>
      </section>

      <aside className="rail" aria-label="Confirm">
        <div className={`stepc ${confirmed ? 'done' : 'now'}`}>
          <div className="head"><span className="nbox">{confirmed ? <Icon name="check" /> : 1}</span><b>Check it</b><span className="what">{draft.blades.length} blade{draft.blades.length === 1 ? '' : 's'}</span></div>
          <label className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <button type="button" className={`tog ${confirmed ? 'on' : ''}`} role="switch" aria-checked={confirmed} aria-label="I checked the wiring" onClick={() => update((d) => withWiringConfirmation(d, !confirmed))}><i /></button>
            <span className="small dim">I checked every data pin and power pin against the installer's wiring.</span>
          </label>
          {confirmOnce && <span className="note amber" style={{ padding: '6px 8px' }}><Icon name="warn" /><span>Hiltwright now records which wiring you checked. Check it once more to go on.</span></span>}
          <span className="hint">A wrong pin can leave a blade dark or drive one that is not there. This stays checked until the board or a blade changes.</span>
        </div>
        <div className="stepc">
          <div className="head"><span className="nbox">2</span><b>Next</b><span className="what">presets</span></div>
          <button type="button" className="btn pri full" disabled={!confirmed} onClick={() => go('presets')}><span className="b"><span className="i"><Icon name="presets" />Presets</span></span></button>
          <span className="hint">{confirmed ? 'The saber’s presets: fonts, tracks and a style for each blade.' : 'Confirm the wiring first.'}</span>
        </div>
      </aside>
    </div>
  );
}
