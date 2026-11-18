// What the style editor's Save writes: the half (Simple or Full) the owner changed, never an untouched one just
// because its tab is showing. Pure, so it is tested under node (test/styleSave.test.ts).

export type EditorMode = 'simple' | 'tree';

export interface SaveTargetInput {
  /** The tab showing now. */
  showing: EditorMode;
  /** Each half differs from the last save (or, never saved, from how the editor opened). */
  docChanged: boolean;
  treeChanged: boolean;
  /** What the stored style is (or Simple for a new style): written when nothing changed. */
  originalMode: EditorMode;
  isNew: boolean;
}

export interface SaveTarget {
  write: EditorMode;
  /** Save would change something: the status says so and leaving asks first. */
  dirty: boolean;
  /** Both halves changed; saving keeps the one showing and drops the other's changes. */
  dropsOther: boolean;
}

export function saveTarget(i: SaveTargetInput): SaveTarget {
  const changed = (m: EditorMode) => (m === 'simple' ? i.docChanged : i.treeChanged);
  const other: EditorMode = i.showing === 'simple' ? 'tree' : 'simple';
  const write = changed(i.showing) ? i.showing : changed(other) ? other : i.originalMode;
  return { write, dirty: i.isNew || changed(write), dropsOther: changed(i.showing) && changed(other) };
}
