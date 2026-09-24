// The app's dropdown, in place of the browser's own. Written like a <select> (value, onChange reading e.target.value,
// <option> and <optgroup> children) so any select in the app can switch to it by name alone.
//
// Inside an .input field it covers the field, which keeps showing the choice and its caret; on its own it draws the
// same field itself. The list opens under it in the app's own colours, with a search box when it is long (the full
// editor's template lists run to hundreds), and works from the keyboard: arrows, Home and End, Enter, Esc, and typing
// to jump or search.

import { Children, Fragment, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

interface Opt { value: string; label: string; disabled: boolean; title?: string; group?: string }

/** The text of an option's children: <option>{i + 1}. {name}</option> is several pieces. */
const textOf = (n: ReactNode): string => (n == null || typeof n === 'boolean' ? '' : typeof n === 'string' || typeof n === 'number' ? String(n) : Array.isArray(n) ? n.map(textOf).join('') : isValidElement(n) ? textOf((n.props as { children?: ReactNode }).children) : '');

function collect(children: ReactNode, group?: string, out: Opt[] = []): Opt[] {
  Children.forEach(children, (c) => {
    if (!isValidElement(c)) return;
    const p = c.props as { value?: string | number; children?: ReactNode; disabled?: boolean; title?: string; label?: string };
    if (c.type === 'option') { const label = textOf(p.children); out.push({ value: String(p.value ?? label), label, disabled: !!p.disabled, title: p.title, group }); }
    else if (c.type === 'optgroup') collect(p.children, p.label, out);
    else if (c.type === Fragment) collect(p.children, group, out);
  });
  return out;
}

/** Lists longer than this get a search box. */
const SEARCH_FROM = 12;

export interface SelectProps {
  value: string | number;
  onChange: (e: { target: { value: string }; currentTarget: { value: string } }) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
  'aria-label'?: string;
}

export function Select({ value, onChange, children, className, disabled, title, 'aria-label': ariaLabel }: SelectProps) {
  const opts = useMemo(() => collect(children), [children]);
  const current = String(value);
  const chosen = opts.find((o) => o.value === current);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState<{ left: number; top?: number; bottom?: number; width: number; maxHeight: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const listId = useId();
  const typed = useRef({ text: '', at: 0 });

  const searchable = opts.length > SEARCH_FROM;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return opts;
    // Names first; a group's name only when no name matches ("live" finds the live colours, "flicker" just the flickers).
    const named = opts.filter((o) => o.label.toLowerCase().includes(q));
    return named.length ? named : opts.filter((o) => (o.group ?? '').toLowerCase().includes(q));
  }, [opts, query]);

  const close = (refocus = true) => { setOpen(false); setQuery(''); if (refocus) btn.current?.focus(); };
  const choose = (o: Opt | undefined) => {
    if (!o || o.disabled) return;
    close();
    if (o.value !== current) onChange({ target: { value: o.value }, currentTarget: { value: o.value } });
  };
  const openList = () => {
    if (disabled) return;
    setActive(Math.max(0, opts.findIndex((o) => o.value === current)));
    setOpen(true);
  };
  const step = (from: number, by: number): number => {
    for (let i = from + by, n = 0; n < shown.length; i += by, n++) {
      const k = Math.max(0, Math.min(shown.length - 1, i));
      if (!shown[k].disabled) return k;
      if (k === 0 || k === shown.length - 1) break;
    }
    return from;
  };

  // Under the field, or above it when there is more room there; at least as wide as the field.
  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 8; const above = r.top - 8;
    const up = below < 220 && above > below;
    setPlace({ left: Math.min(r.left, window.innerWidth - Math.max(r.width, 200) - 8), width: Math.max(r.width, 200), maxHeight: Math.min(360, up ? above : below), ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }) });
  }, [open]);

  // Clicks elsewhere, and scrolling or resizing anything but the list itself, close it.
  useEffect(() => {
    if (!open) return;
    const outside = (e: Event) => { const t = e.target as Node; if (!pop.current?.contains(t) && !btn.current?.contains(t)) close(false); };
    const scrolled = (e: Event) => { if (!pop.current?.contains(e.target as Node)) close(false); };
    const resized = () => close(false);
    document.addEventListener('pointerdown', outside, true);
    window.addEventListener('scroll', scrolled, true);
    window.addEventListener('resize', resized);
    return () => { document.removeEventListener('pointerdown', outside, true); window.removeEventListener('scroll', scrolled, true); window.removeEventListener('resize', resized); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { pop.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active, open, place]);
  useEffect(() => { setActive((a) => (a < shown.length ? a : 0)); }, [shown.length]);

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); e.stopPropagation(); openList(); }
      return;
    }
    e.stopPropagation(); // an open list has the keyboard: page shortcuts (the demo room's C for clash) wait
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => step(a, 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => step(a, -1)); }
    else if (e.key === 'PageDown') { e.preventDefault(); setActive((a) => step(Math.min(shown.length - 1, a + 7), 1)); }
    else if (e.key === 'PageUp') { e.preventDefault(); setActive((a) => step(Math.max(0, a - 7), -1)); }
    else if (e.key === 'Home' && !searchable) { e.preventDefault(); setActive(step(-1, 1)); }
    else if (e.key === 'End' && !searchable) { e.preventDefault(); setActive(step(shown.length, -1)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(shown[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'Tab') close(false);
    else if (!searchable && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      // Short lists: type the start of a choice to jump to it.
      const now = Date.now(); const t = typed.current;
      t.text = (now - t.at > 700 ? '' : t.text) + e.key.toLowerCase(); t.at = now;
      const k = shown.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(t.text));
      if (k >= 0) setActive(k);
    }
  };

  const optId = (k: number) => `${listId}-o${k}`;
  const counts = useMemo(() => { const m = new Map<string, number>(); for (const o of shown) if (o.group) m.set(o.group, (m.get(o.group) ?? 0) + 1); return m; }, [shown]);
  let lastGroup: string | undefined;
  return (
    <>
      <button ref={btn} type="button" className={`selbtn ${className ?? ''}`} role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
        aria-label={ariaLabel} title={title} disabled={disabled} onClick={() => (open ? close() : openList())} onKeyDown={onKey}>
        <span className="ellip">{chosen?.label ?? ''}</span><Icon name="down" />
      </button>
      {open && place && createPortal(
        <div ref={pop} className="selpop" style={{ left: place.left, top: place.top, bottom: place.bottom, minWidth: place.width, maxHeight: place.maxHeight }} onKeyDown={onKey}>
          {searchable && (
            <span className="selsearch"><Icon name="search" />
              <input type="text" autoFocus value={query} placeholder="Type to search" aria-label={`Search ${ariaLabel ?? 'choices'}`} aria-controls={listId} aria-activedescendant={shown[active] ? optId(active) : undefined}
                onChange={(e) => { setQuery(e.target.value); setActive(0); }} />
            </span>
          )}
          <div id={listId} role="listbox" aria-label={ariaLabel} className="sellist" tabIndex={searchable ? -1 : 0} ref={(el) => { if (el && !searchable && document.activeElement !== el) el.focus(); }} aria-activedescendant={!searchable && shown[active] ? optId(active) : undefined}>
            {shown.map((o, k) => {
              // A heading at the start of each group (kept in view while its group scrolls), with how many are in it.
              const head = o.group && o.group !== lastGroup ? <div key={`g${k}`} className="selgroup" role="presentation">{o.group}<span className="count">{counts.get(o.group)}</span></div> : null;
              lastGroup = o.group;
              return (
                <Fragment key={`${o.value}:${k}`}>
                  {head}
                  <div id={optId(k)} role="option" aria-selected={o.value === current} aria-disabled={o.disabled || undefined} title={o.title}
                    className={`selopt${o.value === current ? ' sel' : ''}${o.disabled ? ' dis' : ''}${o.group ? ' ingroup' : ''}`} data-active={k === active}
                    onPointerMove={() => { if (k !== active && !o.disabled) setActive(k); }} onPointerDown={(e) => e.preventDefault()} onClick={() => choose(o)}>
                    <span className="ellip">{o.label}</span>{o.value === current && <Icon name="check" />}
                  </div>
                </Fragment>
              );
            })}
            {!shown.length && <div className="selnone">Nothing matches.</div>}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
