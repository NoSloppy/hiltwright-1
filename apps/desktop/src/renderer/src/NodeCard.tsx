// One template and its parameters as a tree of controls: the full editor's fallback for anything the layer cards do
// not lay out as What / Where / When, and the way into a single slot that holds a whole template of its own.

import { useMemo, useState } from 'react';
import { CATALOGUE, EFFECT_VALUES, LOCKUP_VALUES, cloneNode, defaultFor, kindOf, newNode, numView, numberUnit, paramFor, type Kind, type Node, type NumberUnit } from '@hiltwright/core';
import { AngleGauge, NumberBox } from './NumControl';
import { Icon } from './Icon';
import { COLOR_ARGS, byColourGroup, choicesFor, describe, friendly, friendlyDefault, friendlyEnum, hexOf, summarise } from './treeWords';
import { Select } from './Select';

const PARAM_WORDS: Record<string, string> = { TR1: 'Begin', TR2: 'End', BEGINTR: 'Begin', ENDTR: 'End', BEGIN_TR: 'Begin', END_TR: 'End', OUTTR: 'Ignition', INTR: 'Retraction', OUT_TR: 'Ignition', IN_TR: 'Retraction', MILLIS: 'Milliseconds', MS: 'Milliseconds', RPM: 'Speed (rpm)', COLOR: 'Colour', BASE: 'Underneath', LAYER: 'Layer', F: 'Function', N: 'Number', OFF: 'Off colour', OFF_COLOR: 'Off colour', EFFECT: 'On which effect', LOCKUP_TYPE: 'Lockup type', CONDITION: 'Only when', TOP: 'Top limit', BOTTOM: 'Bottom limit', SIZE: 'Size', SIZE1: 'Size at rest', SIZE2: 'Size when twisted', LOCATION: 'Where', FADEOUT_MS: 'Fade out (ms)', WAVE_SIZE: 'Wave size', WAVE_MS: 'Wave speed (ms)', FADE: 'Fade (ms)', GRADE: 'Grade', SPEED: 'Speed', PERCENT: 'Percent', WIDTH: 'Width', MIN: 'Minimum', MAX: 'Maximum', DELAY_MS: 'Delay (ms)', PULSE_MILLIS: 'Pulse (ms)', SPARK_COLOR: 'Spark colour', SPARK_SIZE: 'Spark size', ARG: 'Setting', DEFAULT_COLOR: 'Starting colour', STRIPE_WIDTH: 'Stripe width', STRIPE_SPEED: 'Stripe speed', BLINK_MILLIS: 'Blink (ms)', BLINK_PROMILLE: 'On fraction (‰)', SPARK_CHANCE_PROMILLE: 'Spark chance (‰)', SPARK_INTENSITY: 'Spark intensity', HUMP_WIDTH: 'Hump width', ALPHA: 'Opacity', SPEED_MIN: 'Speed at least', SPEED_MAX: 'Speed at most' };
export const friendlyParam = (p: string): string => PARAM_WORDS[p.toUpperCase()] ?? p.toLowerCase().replace(/_/g, ' ').replace(/\bms\b/, 'ms').replace(/^./, (c) => c.toUpperCase());

export const rgbNode = (hex: string): Node => { const v = parseInt(hex.slice(1), 16); return { name: 'Rgb', args: [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((x) => ({ name: String(x), args: [] })) }; };

/** Swap a node for another template, keeping arguments whose kinds still fit their new slots. */
export function retarget(old: Node, name: string): Node {
  const next = newNode(name);
  const e = CATALOGUE[name];
  if (!e) return next;
  for (let i = 0; i < next.args.length; i++) {
    const p = paramFor(e, i); const prev = old.args[i];
    if (p && prev && kindOf(prev) === p.kind) next.args[i] = cloneNode(prev);
  }
  return next;
}

/** One template and its parameters. Leaves (plain colours, numbers, enums) get a direct control; the rest nest. */
export function NodeCard({ node, kind, label, hint, index, depth, onChange, onMove, onRemove, canUp, canDown, unit }: {
  node: Node; kind: Kind; label: string; hint?: string; index?: number; depth: number;
  onChange: (n: Node) => void; onMove?: (dir: -1 | 1) => void; onRemove?: () => void; canUp?: boolean; canDown?: boolean;
  /** What a plain number in this slot means (ms, a share of full, a tilt), from the template it belongs to. */
  unit?: NumberUnit | null;
}) {
  const [open, setOpen] = useState(depth < 2);
  const entry = CATALOGUE[node.name];
  const choices = useMemo(() => choicesFor(kind, node.name), [kind, node.name]);
  const hex = kind === 'COLOR' ? hexOf(node) : null;
  const isArg = node.name === 'RgbArg';
  const isNumber = /^-?\d+$/.test(node.name);
  const isInt = node.name === 'Int' && node.args.length === 1 && /^-?\d+$/.test(node.args[0]?.name ?? '');
  const isEnum = kind === 'EFFECT' || kind === 'LOCKUP_TYPE';
  const leaf = isNumber || isInt || isEnum || (hex != null && !isArg);
  const setArg = (i: number, n: Node) => { const c = cloneNode(node); c.args[i] = n; onChange(c); };

  // Which slots to show: every declared parameter, plus any extra arguments the pasted style supplied.
  const slots: { i: number; name: string; kind: Kind; doc: string; def: string | null }[] = [];
  if (entry) {
    const fixed = entry.variadic ? entry.params.length - 1 : entry.params.length;
    const count = Math.max(fixed, node.args.length);
    for (let i = 0; i < count; i++) { const p = paramFor(entry, i); if (p) slots.push({ i, name: p.name, kind: p.kind, doc: p.doc, def: p.default }); else slots.push({ i, name: `Argument ${i + 1}`, kind: kindOf(node.args[i] ?? { name: '', args: [] }), doc: '', def: null }); }
  } else for (let i = 0; i < node.args.length; i++) slots.push({ i, name: `Argument ${i + 1}`, kind: kindOf(node.args[i]), doc: '', def: null });

  const picker = (
    <span className="input sans" style={{ height: 28, minWidth: 0, width: depth === 0 ? 280 : 220 }} title={entry?.doc}>
      <span className="ellip">{isNumber || isInt ? 'Number' : friendly(node.name)}</span><span className="caret"><Icon name="down" /></span>
      <Select value={isNumber || isInt ? '#' : node.name} aria-label={`${label} template`} onChange={(e) => { const v = e.target.value; const cur = isInt ? node.args[0].name : isNumber ? node.name : '300'; onChange(v === '#' ? (kind === 'INTEGER' ? { name: cur, args: [] } : { name: 'Int', args: [{ name: cur, args: [] }] }) : v === 'Rgb' ? rgbNode('#ffffff') : retarget(node, v)); }}>
        {(kind === 'INTEGER' || kind === 'FUNCTION') && <option value="#">Number</option>}
        {kind === 'COLOR'
          ? byColourGroup(choices.filter((c) => c.name !== 'Rgb'), node.name).map(([g, list]) => (
            <optgroup key={g} label={g}>
              {g === 'Colours' && <option value="Rgb">Custom colour</option>}
              {list.map((c) => <option key={c.name} value={c.name} title={c.doc}>{c.name === 'Rgb16' ? 'Custom colour (16-bit)' : friendly(c.name)}</option>)}
            </optgroup>
          ))
          : choices.filter((c) => c.name !== 'Int').map((c) => <option key={c.name} value={c.name} title={c.doc}>{friendly(c.name)}</option>)}
        {!isNumber && !isInt && !choices.some((c) => c.name === node.name) && <optgroup label="As written"><option value={node.name}>{node.name}</option></optgroup>}
      </Select>
    </span>
  );

  const leafControl = (
    <>
      {isNumber && <NumberBox value={Number(node.name)} unit={unit} label={label} onChange={(v) => onChange({ name: String(v), args: [] })} />}
      {isInt && <NumberBox value={Number(node.args[0].name)} unit={unit} label={label} onChange={(v) => setArg(0, { name: String(v), args: [] })} />}
      {hex != null && !isArg && <label className="swatch" style={{ width: 'auto', height: 28, padding: '0 8px', gap: 8 }} title={hint}><span className="sq" style={{ width: 14, height: 14, background: hex, boxShadow: `0 0 8px ${hex}` }} /><span className="mono mute" style={{ fontSize: 11 }}>{hex}</span><input type="color" value={hex} aria-label={label} onChange={(e) => onChange(rgbNode(e.target.value))} /></label>}
    </>
  );

  // ---- leaves ----
  if (leaf && depth > 0) {
    return (
      <div className="row" style={{ gap: 8, alignItems: 'center', minWidth: 0, flexWrap: 'wrap', rowGap: 6 }}>
        <span className="small dim nowrap" style={{ width: 120 }} title={hint}>{label}</span>
        {leafControl}
        {isEnum && (
          <span className="input sans" style={{ height: 28, width: 220 }}><span className="ellip">{friendlyEnum(node.name)}</span><span className="caret"><Icon name="down" /></span>
            <Select value={node.name} aria-label={label} onChange={(e) => onChange({ name: e.target.value, args: [] })}>{(kind === 'EFFECT' ? EFFECT_VALUES : LOCKUP_VALUES).map((v) => <option key={v} value={v}>{friendlyEnum(v)}</option>)}{![...EFFECT_VALUES, ...LOCKUP_VALUES].includes(node.name) && <option value={node.name}>{node.name}</option>}</Select></span>
        )}
        {(kind === 'COLOR' || kind === 'FUNCTION' || kind === 'TRANSITION') && !isEnum && <span style={{ marginLeft: 'auto' }}>{picker}</span>}
      </div>
    );
  }

  // ---- branches ----
  // A blade angle with plain numbers reads better as the tilt it covers: the same half-circle gauge the cards use.
  const angle = /^BladeAngleX?$/.test(node.name) ? numView(node) : null;
  const gauge = angle?.mode === 'follow' && angle.window ? (
    <div className="row" style={{ gap: 14, alignItems: 'center' }}>
      <AngleGauge window={angle.window} onChange={([lo, hi]) => onChange(node.name === 'BladeAngleX' ? { name: 'BladeAngleX', args: [lo, hi].map((v) => ({ name: 'Int', args: [{ name: String(v), args: [] }] })) } : lo === 0 && hi === 32768 ? { name: 'BladeAngle', args: [] } : { name: 'BladeAngle', args: [lo, hi].map((v) => ({ name: String(v), args: [] })) })} />
      <span className="hint" style={{ maxWidth: 260 }}>Reads 0 when the blade points down and full when it points up. Drag the marks to make it change over a narrower stretch of tilt: past them it holds 0 or full.</span>
    </div>
  ) : null;
  const body = gauge ?? (
    <div className="col" style={{ gap: 6 }}>
      {isArg && (
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <span className="small dim nowrap" style={{ width: 120 }}>Live setting</span>
          <span className="input sans" style={{ height: 28, width: 220 }}><span className="ellip">{COLOR_ARGS.find(([a]) => a === node.args[0]?.name)?.[1] ?? node.args[0]?.name}</span><span className="caret"><Icon name="down" /></span>
            <Select value={node.args[0]?.name ?? 'BASE_COLOR_ARG'} aria-label="Which live colour setting" onChange={(e) => setArg(0, { name: e.target.value, args: [] })}>{COLOR_ARGS.map(([a, n]) => <option key={a} value={a}>{n}</option>)}</Select></span>
          <span className="hint">Changed on Presets without a rebuild; the colour below is its starting value.</span>
        </div>
      )}
      {slots.filter((s) => !(isArg && s.i === 0)).map((s) => {
        const child = node.args[s.i];
        if (!child) return (
          <div key={s.i} className="row" style={{ gap: 8, alignItems: 'center' }}>
            <span className="small dim nowrap" style={{ width: 120 }} title={s.doc}>{friendlyParam(s.name)}</span>
            <span className="hint ellip" style={{ flex: 1 }}>Default: {friendlyDefault(s.def)}</span>
            <button type="button" className="chip" onClick={() => { const c = cloneNode(node); while (c.args.length < s.i) c.args.push(defaultFor(paramFor(entry!, c.args.length)?.kind ?? 'FUNCTION', paramFor(entry!, c.args.length)?.default)); c.args[s.i] = defaultFor(s.kind, s.def); onChange(c); }}>Set</button>
          </div>
        );
        const hintText = s.doc || (s.def ? `Default ${friendlyDefault(s.def)}` : undefined);
        return <NodeCard key={s.i} node={child} kind={s.kind} label={friendlyParam(s.name)} hint={hintText} depth={depth + 1} unit={numberUnit(node.name, s.name, s.kind)} onChange={(n) => setArg(s.i, n)}
          onRemove={entry?.variadic && s.i >= entry.params.length - 1 ? () => { const c = cloneNode(node); c.args.splice(s.i, 1); onChange(c); } : (s.i >= (entry ? (entry.variadic ? entry.params.length - 1 : entry.params.length) : 0) || s.def) && s.i === node.args.length - 1 ? () => { const c = cloneNode(node); c.args.pop(); onChange(c); } : undefined} />;
      })}
      {entry?.variadic && <button type="button" className="chip" style={{ alignSelf: 'flex-start' }} onClick={() => { const c = cloneNode(node); c.args.push(defaultFor(entry.params[entry.params.length - 1].kind, entry.params[entry.params.length - 1].default)); onChange(c); }}><Icon name="plus" />{friendlyParam(entry.params[entry.params.length - 1].name)}</button>}
    </div>
  );

  if (depth === 0) {
    return (
      <div className="bcard col" style={{ gap: 10, padding: 12 }}>
        <div className="row" style={{ gap: 10 }}>
          {index != null && <span className="nbox">{index + 1}</span>}
          <div className="col grow" style={{ gap: 4, minWidth: 0 }}>
            <div className="row" style={{ gap: 10 }}>{index == null && <b style={{ fontWeight: 600, fontSize: 13.5 }}>{label}:</b>}{picker}{leafControl}</div>
            <span className="hint" title={entry?.doc || undefined}>{describe(entry) || hint || (entry ? '' : 'Not in this ProffieOS version’s catalogue; kept as written.')}</span>
          </div>
          {/* -1 is toward the top of the stack (later in Layers<>), +1 toward the blade underneath. */}
          {onMove && <button type="button" className="chip" disabled={!canUp} aria-label="Move up the stack" onClick={() => onMove(-1)}><Icon name="up" /></button>}
          {onMove && <button type="button" className="chip" disabled={!canDown} aria-label="Move down the stack" onClick={() => onMove(1)}><Icon name="down" /></button>}
          {onRemove && <button type="button" className="chip" aria-label={`Remove ${label}`} onClick={onRemove}><Icon name="trash" /></button>}
        </div>
        {slots.length > 0 && body}
      </div>
    );
  }
  return (
    <div className="col" style={{ gap: 6, borderLeft: '1px solid var(--line2)', paddingLeft: 10 }}>
      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
        <button type="button" className="chip" style={{ padding: '0 4px' }} aria-label={open ? 'Collapse' : 'Expand'} onClick={() => setOpen((o) => !o)}><Icon name={open ? 'down' : 'chev'} /></button>
        <span className="small dim nowrap" style={{ width: 104 }} title={hint}>{label}</span>
        {picker}
        {isArg && hexOf(node.args[1] ?? { name: '', args: [] }) && <span className="sq" style={{ width: 14, height: 14, background: hexOf(node.args[1]) ?? '#000', boxShadow: `0 0 8px ${hexOf(node.args[1])}` }} />}
        {!open && (() => { const words = summarise(node); return <span className="hint ellip" style={{ flex: 1, minWidth: 0 }} title={words}>{words}</span>; })()}
        {onRemove && <button type="button" className="chip" style={{ marginLeft: 'auto' }} aria-label={`Remove ${label}`} onClick={onRemove}><Icon name="x" /></button>}
      </div>
      {open && slots.length > 0 && <div style={{ paddingLeft: 26 }}>{body}</div>}
    </div>
  );
}
