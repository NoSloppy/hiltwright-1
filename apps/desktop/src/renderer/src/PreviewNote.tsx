// What the preview of a pasted or built style leaves out, or shows only roughly (preview-honesty ST20). One note,
// shown wherever such a style previews: the full editor, the Styles page, Presets and the demo room.

import { useMemo } from 'react';
import { approximateWords, lookPreviewReport, type EvalReport, type LookDef } from '@hiltwright/core';
import { Icon } from './Icon';
import { friendly } from './treeWords';

/** The note's words, or null when the preview is the whole story. */
export function previewNoteText(report: EvalReport | null): { missing: string | null; rough: string | null } | null {
  if (!report || (!report.unsupported.length && !report.approximate.length)) return null;
  return {
    missing: report.unsupported.length ? `The preview cannot show ${report.unsupported.map(friendly).join(', ')} yet, so they are left out of it. They are kept as written, but only a build shows whether the saber accepts them.` : null,
    rough: report.approximate.length ? `The preview is only approximate for ${report.approximate.map(approximateWords).join(', ')}.` : null,
  };
}

/** The note itself. `compact` shows a small chip with the words on hover, for tight rows. */
export function PreviewNote({ report, compact }: { report: EvalReport | null; compact?: boolean }) {
  const text = previewNoteText(report);
  if (!text) return null;
  if (compact) {
    const title = [text.missing, text.rough].filter(Boolean).join('\n');
    return <span className="chip warn" title={title} aria-label={title} style={{ flex: 'none' }}><Icon name="warn" />{text.missing ? 'Preview incomplete' : 'Preview approximate'}</span>;
  }
  return (
    <>
      {text.missing && <div className="note amber"><Icon name="warn" /><span>{text.missing}</span></div>}
      {text.rough && <span className="hint">{text.rough}</span>}
    </>
  );
}

/** The note for a saved style. Nothing for Hiltwright's own styles, which preview from their own simulation. */
export function LookPreviewNote({ look, compact }: { look: LookDef | null | undefined; compact?: boolean }) {
  const report = useMemo(() => (look ? lookPreviewReport(look) : null), [look]);
  return <PreviewNote report={report} compact={compact} />;
}
