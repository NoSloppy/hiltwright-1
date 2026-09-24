// Undo and redo for the style editor, as a small state machine over snapshots of the whole document.
//
// Each edit moves the editor to a new snapshot and puts the old one on the undo stack. Edits that come in a quick
// burst (a slider being dragged, a name being typed) join one open step instead of making one each; the step closes
// when the burst pauses, or at once for an edit that is a single deliberate act (pasting a style, adding a layer).
// Undo and redo move between snapshots and always close the open step. Changing which editor is showing is not a
// step of its own, but each snapshot remembers it, so undoing jumps back to where the change was made.

import { useCallback, useMemo, useReducer } from 'react';

/** Edits closer together than this join one step. */
export const MERGE_MS = 600;
/** Steps kept to undo. */
export const LIMIT = 200;

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  /** The snapshot last saved, or null for a style never saved. */
  saved: T | null;
  /** Whether the latest step is still gathering a burst of edits, and when its last edit came. */
  open: boolean;
  at: number;
}

export type HistoryEvent<T> =
  /** Change the document. `step` makes it a step of its own, never joined with the edits around it. */
  | { type: 'edit'; fn: (s: T) => T; at: number; step?: boolean }
  /** Change the present without making a step: which editor is showing. */
  | { type: 'view'; fn: (s: T) => T }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'saved' };

export const initialHistory = <T,>(present: T, saved: boolean): History<T> => ({ past: [], present, future: [], saved: saved ? present : null, open: false, at: 0 });

export function historyReducer<T>(h: History<T>, e: HistoryEvent<T>): History<T> {
  switch (e.type) {
    case 'edit': {
      const next = e.fn(h.present);
      if (next === h.present) return h;
      if (h.open && !e.step && e.at - h.at < MERGE_MS) return { ...h, present: next, at: e.at, future: [] }; // same burst: same step
      return { ...h, past: [...h.past, h.present].slice(-LIMIT), present: next, future: [], open: !e.step, at: e.at };
    }
    case 'view': {
      const next = e.fn(h.present);
      return next === h.present ? h : { ...h, present: next, open: false };
    }
    case 'undo': {
      if (!h.past.length) return h;
      return { ...h, past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future], open: false };
    }
    case 'redo': {
      if (!h.future.length) return h;
      return { ...h, past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1), open: false };
    }
    case 'saved':
      return { ...h, saved: h.present, open: false };
  }
}

/** The history as a hook: the present snapshot, and the moves that change it. */
export function useHistory<T>(init: () => T, saved: boolean) {
  const [h, dispatch] = useReducer(historyReducer<T>, undefined, () => initialHistory(init(), saved));
  const edit = useCallback((fn: (s: T) => T, step = false) => dispatch({ type: 'edit', fn, at: Date.now(), step }), []);
  const view = useCallback((fn: (s: T) => T) => dispatch({ type: 'view', fn }), []);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);
  const markSaved = useCallback(() => dispatch({ type: 'saved' }), []);
  return useMemo(() => ({ present: h.present, saved: h.saved, canUndo: h.past.length > 0, canRedo: h.future.length > 0, steps: h.past.length, edit, view, undo, redo, markSaved }), [h, edit, view, undo, redo, markSaved]);
}
