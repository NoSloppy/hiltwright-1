// A simulator for any look in the library: built looks from their saved layers, pasted looks by reading their code.

import type { LookDef } from './looks';
import { canSimulateLook, registerStyleSim } from './sim';
import { isStyleDoc, styleToSim } from './styleBuilder';
import { APPROXIMATE_WORDS, evaluateStyle, isTreeDoc, parseStyle, treeToSim, type EvalReport, type Node } from './styleTree';

/** The style a saved look runs, as a tree: a built tree as saved, a pasted one read from its code. Null otherwise. */
function lookTree(look: LookDef): Node | null {
  if (isTreeDoc(look.style)) return look.style.tree;
  if (look.source === 'pasted' && look.code) {
    // Pasted code is the slot expression; the alias define, when there is one, carries the style itself.
    const text = look.define ? look.define.replace(/^\s*using\s+\w+\s*=\s*/, '').replace(/;\s*$/, '') : look.code;
    return parseStyle(text);
  }
  return null;
}

/** Register a simulator for `look` if one can be made; true when the look can now be previewed and swung. */
export function registerLookSim(look: LookDef): boolean {
  if (canSimulateLook(look.id)) return true;
  try {
    if (isStyleDoc(look.style)) registerStyleSim(look.id, styleToSim(look.style));
    else if (isTreeDoc(look.style)) registerStyleSim(look.id, treeToSim(look.style));
    else { const tree = lookTree(look); if (!tree) return false; registerStyleSim(look.id, evaluateStyle(tree).make); }
    return true;
  } catch { return false; }
}

/**
 * What the preview of a pasted or built look leaves out (unsupported) or shows only roughly (approximate), as
 * evaluateStyle reports it. Null for looks with nothing to report on: Hiltwright's own styles and the beginner editor's
 * blocks, which are simulated by hand, and code that cannot be read (which previews as a flat bar).
 */
export function lookPreviewReport(look: LookDef): EvalReport | null {
  try { const tree = lookTree(look); return tree ? evaluateStyle(tree).report : null; } catch { return null; }
}

/** One approximate entry in plain words. */
export const approximateWords = (name: string): string => APPROXIMATE_WORDS[name] ?? name;
