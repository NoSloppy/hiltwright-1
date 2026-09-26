// Font library: the sound fonts the owner has bought or downloaded, added once and then used everywhere (Presets'
// font list, the demo room, copying onto a card). Each font gets a name, a maker and notes; what it supports
// (polyphonic or not, SmoothSwing, special effects, tracks) is read from its files. Any sound or track can be
// played here. Fonts can be grouped by maker (each with a logo) or by bundle, the sets makers release together.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CardInfo, FontLibraryStatus, FontSound, ImportResult, LibraryFont, LibraryFontDetail } from '../../shared/api';
import { Icon } from './Icon';
import { ContributorLogo, useContributors } from './credits';

const api = () => window.hiltwright;

export function mb(bytes: number | null | undefined): string {
  if (bytes == null) return '—';
  return bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : bytes >= 1e6 ? `${(bytes / 1e6).toFixed(0)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}
const secs = (s: number | null) => (s == null ? '' : s >= 60 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : `${s.toFixed(1)} s`);
const TYPE: Record<LibraryFont['support']['type'], string> = { polyphonic: 'Polyphonic', monophonic: 'Monophonic', mixed: 'Mixed', unknown: 'Unknown' };
const cleanErr = (err: unknown) => String(err).replace(/^Error: (Error invoking remote method '[^']+': Error: )?/, '');

type GroupBy = 'none' | 'maker' | 'bundle';
const NO_MAKER = 'No maker given';
const NO_BUNDLE = 'Not in a bundle';

/** Plays one sound at a time from a library font. */
export function useSoundPlayer() {
  const ctx = useRef<AudioContext | null>(null);
  const cur = useRef<{ src: AudioBufferSourceNode; key: string } | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const stop = useCallback(() => { const c = cur.current; cur.current = null; setPlaying(null); try { c?.src.stop(); } catch { /* already ended */ } }, []);
  const play = useCallback(async (folder: string, path: string) => {
    const key = `${folder}/${path}`;
    if (cur.current?.key === key) { stop(); return; }
    stop();
    setLoadingKey(key);
    try {
      ctx.current ??= new AudioContext();
      const bytes = await api().fontLibrary.readSound(folder, path);
      const buf = await ctx.current.decodeAudioData(bytes);
      const src = ctx.current.createBufferSource();
      const gain = ctx.current.createGain(); gain.gain.value = 0.8;
      src.buffer = buf; src.connect(gain).connect(ctx.current.destination);
      src.onended = () => { if (cur.current?.src === src) { cur.current = null; setPlaying(null); } };
      cur.current = { src, key }; setPlaying(key);
      src.start();
    } finally { setLoadingKey(null); }
  }, [stop]);
  useEffect(() => () => { stop(); void ctx.current?.close(); }, [stop]);
  return { play, stop, playing, loadingKey };
}

export function FontLibrary({ onDemo }: { onDemo: (folder: string) => void }) {
  const [status, setStatus] = useState<FontLibraryStatus | null>(null);
  const [fonts, setFonts] = useState<LibraryFont[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<LibraryFontDetail | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<{ poly?: boolean; smooth?: boolean; tracks?: boolean }>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: 'green' | 'amber' | 'red'; text: string } | null>(null);
  // A details file that could not be read was kept aside (jsonStore.ts); said here as well as on the Armory.
  const [problems, setProblems] = useState<Awaited<ReturnType<typeof window.hiltwright.app.storeProblems>>>([]);
  const [card, setCard] = useState<CardInfo | null>(null);
  const people = useContributors();
  const [groupBy, setGroupBy] = useState<GroupBy>(() => { try { const g = localStorage.getItem('hiltwright.fontlib.group'); return g === 'maker' || g === 'bundle' ? g : 'none'; } catch { return 'none'; } });
  useEffect(() => { try { localStorage.setItem('hiltwright.fontlib.group', groupBy); } catch { /* private mode */ } }, [groupBy]);
  const [folded, setFolded] = useState<Set<string>>(new Set());
  const [bundleMaker, setBundleMaker] = useState<{ bundle: string; draft: string } | null>(null);
  const player = useSoundPlayer();

  const refresh = useCallback(async () => {
    let st: FontLibraryStatus; let list: LibraryFont[];
    try { [st, list] = await Promise.all([api().fontLibrary.status(), api().fontLibrary.list()]); }
    catch (err) { setLoaded(true); setNote({ tone: 'red', text: `Could not read the font library: ${cleanErr(err)}` }); return; }
    setStatus(st); setFonts(list); setLoaded(true);
    void api().app.storeProblems().then((ps) => setProblems(ps.filter((x) => x.place === 'fonts')), () => undefined);
    setSelected((s) => (s && list.some((f) => f.folder === s) ? s : list[0]?.folder ?? null));
  }, []);
  useEffect(() => { void refresh(); void api().sd.locate().then((cs) => setCard(cs.find((c) => c.proffie) ?? null)).catch(() => undefined); }, [refresh]);
  useEffect(() => api().fontLibrary.onProgress(setProgress), []);
  useEffect(() => {
    setDetail(null);
    if (!selected) return;
    let live = true;
    void api().fontLibrary.detail(selected).then((d) => { if (live) setDetail(d); }).catch(() => undefined);
    return () => { live = false; };
  }, [selected]);

  const run = async (what: () => Promise<ImportResult | null>) => {
    setBusy(true); setNote(null); setProgress(null);
    try {
      const r = await what();
      if (!r) return;
      await refresh();
      if (r.added.length) setSelected(r.added[0]);
      const skipped = r.skipped.map((s) => `${s.name}: ${s.why}`).join(' ');
      setNote(r.added.length
        ? { tone: r.skipped.length ? 'amber' : 'green', text: `Added ${r.added.join(', ')}.${skipped ? ` Not added: ${skipped}` : ' Give each a name and maker on the right.'}` }
        : { tone: 'red', text: skipped || 'Nothing was added.' });
    } catch (err) { setNote({ tone: 'red', text: cleanErr(err) }); }
    finally { setBusy(false); setProgress(null); }
  };
  const moveLibrary = async (reset: boolean) => {
    setBusy(true); setNote(null);
    try { setStatus(await (reset ? api().fontLibrary.resetRoot() : api().fontLibrary.chooseRoot())); await refresh(); }
    catch (err) { setNote({ tone: 'red', text: cleanErr(err) }); }
    finally { setBusy(false); setProgress(null); }
  };

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return fonts.filter((f) => (!needle || `${f.meta.name} ${f.meta.maker} ${f.meta.bundle ?? ''} ${f.folder} ${f.meta.notes}`.toLowerCase().includes(needle))
      && (!filter.poly || f.support.type === 'polyphonic') && (!filter.smooth || f.support.smoothSwing) && (!filter.tracks || f.support.tracks > 0));
  }, [fonts, q, filter]);
  const sel = fonts.find((f) => f.folder === selected) ?? null;
  const toggle = (k: keyof typeof filter) => setFilter((f) => ({ ...f, [k]: !f[k] }));
  // Groups in name order, with the fonts that have no maker or bundle last. Makers match regardless of case.
  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: '', fonts: visible }];
    const m = new Map<string, { key: string; fonts: LibraryFont[] }>();
    for (const f of visible) {
      const raw = (groupBy === 'maker' ? f.meta.maker : f.meta.bundle ?? '').trim();
      const label = raw || (groupBy === 'maker' ? NO_MAKER : NO_BUNDLE);
      const g = m.get(label.toLowerCase()) ?? { key: label, fonts: [] };
      g.fonts.push(f); m.set(label.toLowerCase(), g);
    }
    const none = groupBy === 'maker' ? NO_MAKER : NO_BUNDLE;
    return [...m.values()].sort((a, b) => (a.key === none ? 1 : 0) - (b.key === none ? 1 : 0) || a.key.localeCompare(b.key));
  }, [visible, groupBy]);
  const bundles = useMemo(() => [...new Set(fonts.map((f) => f.meta.bundle?.trim()).filter((b): b is string => !!b))].sort(), [fonts]);
  const onChanged = (f: LibraryFont) => { setFonts((all) => all.map((x) => (x.folder === f.folder ? f : x))); };
  const setLogo = async (maker: string) => { try { await people.setLogo(maker); } catch (err) { setNote({ tone: 'red', text: cleanErr(err) }); } };
  const clearLogo = async (maker: string) => { await people.clearLogo(maker); };
  // Makers to suggest: those on fonts here, and anyone credited elsewhere (a look author may make fonts too).
  const makerNames = [...new Map([...fonts.map((f) => f.meta.maker.trim()), ...people.list.map((p) => p.name)].filter(Boolean).map((n) => [n.toLowerCase(), n])).values()].sort((a, b) => a.localeCompare(b));
  /** Put one maker on every font of a bundle: bundles usually come from one maker. */
  const makerForBundle = async (list: LibraryFont[], maker: string) => {
    setBundleMaker(null);
    const out: LibraryFont[] = [];
    try { for (const f of list) out.push(await api().fontLibrary.setMeta(f.folder, { maker: maker.trim() })); } catch (err) { setNote({ tone: 'red', text: cleanErr(err) }); }
    setFonts((all) => all.map((x) => out.find((o) => o.folder === x.folder) ?? x));
  };
  const row = (f: LibraryFont) => (
    <tr key={f.folder} className={f.folder === selected ? 'on' : ''} onClick={() => setSelected(f.folder)} style={{ cursor: 'pointer' }}>
      <td><span className="col" style={{ gap: 0 }}><span style={{ fontWeight: 600 }}>{f.meta.name}</span>{(f.meta.name !== f.folder || (groupBy !== 'bundle' && f.meta.bundle)) && <span className="hint ellip" style={{ fontSize: 11, maxWidth: 190 }} title={f.meta.bundle}>{f.meta.name !== f.folder && <span className="mono">{f.folder}</span>}{f.meta.name !== f.folder && groupBy !== 'bundle' && f.meta.bundle ? ' · ' : ''}{groupBy !== 'bundle' && f.meta.bundle}</span>}</span></td>
      <td className="dim">{f.meta.maker ? <span className="row" style={{ gap: 8 }}><ContributorLogo name={f.meta.maker} logo={people.logoFor(f.meta.maker)} size={20} /><span>{f.meta.maker}</span></span> : <span className="mute">—</span>}</td>
      <td className="dim">{TYPE[f.support.type]}</td>
      <td className="dim small">{[f.support.smoothSwing ? 'SmoothSwing' : null, f.support.special.length ? `${f.support.special.length} special` : null].filter(Boolean).join(' · ') || '—'}</td>
      <td className="mono dim small">{f.support.tracks || '—'}</td>
      <td className="mono dim small nowrap">{mb(f.bytes)}</td>
      <td>{f.report.issues.length ? <span className={`chip ${f.report.issues.some((i) => i.kind === 'mixed' || i.kind === 'missing-hum') ? 'err' : 'warn'}`}><Icon name="warn" />{f.report.issues.length} issue{f.report.issues.length > 1 ? 's' : ''}</span> : <span className="chip ok"><Icon name="check" />Ready</span>}</td>
    </tr>
  );
  const groupHead = (g: { key: string; fonts: LibraryFont[] }) => {
    const shut = folded.has(g.key);
    const isNone = g.key === NO_MAKER || g.key === NO_BUNDLE;
    // A bundle shows its maker (and logo) when every font in it names the same one.
    const bundleMakers = [...new Set(g.fonts.map((f) => f.meta.maker.trim()).filter(Boolean))];
    const unnamed = g.fonts.filter((f) => !f.meta.maker.trim()).length;
    const shared = bundleMakers.length === 1 && !unnamed ? bundleMakers[0] : null;
    const logoName = groupBy === 'maker' ? g.key : shared;
    const byLine = shared ? `by ${shared}` : bundleMakers.length ? `by ${bundleMakers.join(', ')}; ${unnamed ? `${unnamed} without a maker` : 'more than one maker'}` : 'no maker given';
    return (
      <tr key={`g:${g.key}`} className="grp">
        <td colSpan={7}>
          <div className="row" style={{ gap: 10 }}>
            <button type="button" className="row grow" style={{ gap: 10, textAlign: 'left', minWidth: 0 }} aria-expanded={!shut} onClick={() => setFolded((s) => { const n = new Set(s); if (n.has(g.key)) n.delete(g.key); else n.add(g.key); return n; })}>
              <Icon name={shut ? 'chev' : 'down'} style={{ width: 14, height: 14, color: 'var(--mute)', flex: 'none' }} />
              {!isNone && logoName ? <ContributorLogo name={logoName} logo={people.logoFor(logoName)} size={28} /> : null}
              <span className="col" style={{ gap: 0, minWidth: 0 }}>
                <b className="ellip" style={{ fontWeight: 600, color: isNone ? 'var(--dim)' : 'var(--text)' }}>{g.key}</b>
                <span className="hint ellip">{g.fonts.length} font{g.fonts.length === 1 ? '' : 's'} · {mb(g.fonts.reduce((a, f) => a + f.bytes, 0))}{groupBy === 'bundle' && !isNone ? ` · ${byLine}` : ''}</span>
              </span>
            </button>
            {groupBy === 'maker' && !isNone && (
              <>
                <button type="button" className="chip" onClick={() => void setLogo(g.key)}>{people.logoFor(g.key) ? 'Change logo' : 'Add logo'}</button>
                {people.ownLogoFor(g.key) && <button type="button" className="chip" aria-label={`Remove ${g.key}'s logo`} title="Remove the logo" onClick={() => void clearLogo(g.key)}><Icon name="x" /></button>}
              </>
            )}
            {groupBy === 'bundle' && !isNone && (bundleMaker?.bundle === g.key
              ? <form className="row" style={{ gap: 6 }} onSubmit={(e) => { e.preventDefault(); void makerForBundle(g.fonts, bundleMaker.draft); }}>
                  <span className="input sans" style={{ height: 28, width: 170 }}><input type="text" autoFocus list="hw-makers" value={bundleMaker.draft} placeholder="Maker" aria-label={`Maker for every font in ${g.key}`} onChange={(e) => setBundleMaker({ bundle: g.key, draft: e.target.value })} /></span>
                  <button type="submit" className="btn sm pri"><span className="b"><span className="i">Set</span></span></button>
                  <button type="button" className="chip" aria-label="Cancel" onClick={() => setBundleMaker(null)}><Icon name="x" /></button>
                </form>
              : <button type="button" className="chip" title="Give every font in this bundle the same maker" onClick={() => setBundleMaker({ bundle: g.key, draft: bundleMakers[0] ?? '' })}>Set maker for all</button>)}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="work" style={{ gridTemplateColumns: 'minmax(0,1fr) 440px' }}>
      <div className="col" style={{ gap: 12, minHeight: 0 }}>
        <div className="toolbar">
          <label className="input sans" style={{ width: 200, height: 32 }}><Icon name="search" /><input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fonts" aria-label="Search fonts" style={{ position: 'static', color: 'var(--text)' }} /></label>
          <button type="button" className={`chip ${filter.poly ? 'sel' : ''}`} aria-pressed={!!filter.poly} onClick={() => toggle('poly')}>Polyphonic</button>
          <button type="button" className={`chip ${filter.smooth ? 'sel' : ''}`} aria-pressed={!!filter.smooth} onClick={() => toggle('smooth')}>SmoothSwing</button>
          <button type="button" className={`chip ${filter.tracks ? 'sel' : ''}`} aria-pressed={!!filter.tracks} onClick={() => toggle('tracks')}>Has tracks</button>
          <div className="seg" role="group" aria-label="Group fonts by">
            {(['none', 'maker', 'bundle'] as GroupBy[]).map((g) => <button key={g} type="button" className={groupBy === g ? 'on' : ''} aria-pressed={groupBy === g} style={{ height: 30 }} onClick={() => setGroupBy(g)}>{g === 'none' ? 'All' : g === 'maker' ? 'By maker' : 'By bundle'}</button>)}
          </div>
          <button type="button" className="btn sm pri" style={{ marginLeft: 'auto' }} disabled={busy} title="A font package as you downloaded it. Fonts for other boards in the same package are left out." onClick={() => void run(() => api().fontLibrary.addZip())}><span className="b"><span className="i"><Icon name="import" />Add package (.zip)</span></span></button>
          <button type="button" className="btn sm" disabled={busy} title="A font folder, or a folder holding several fonts" onClick={() => void run(() => api().fontLibrary.addFolder())}><span className="b"><span className="i"><Icon name="plus" />Add folder</span></span></button>
        </div>

        {status?.legacyBank && (
          <div className="note"><Icon name="info" /><span>You pointed Hiltwright at <span className="mono">{status.legacyBank}</span> as a font bank before. <button type="button" className="holo" disabled={busy} onClick={() => void run(() => api().fontLibrary.importLegacy())}>Add its fonts to the library</button> (copied; the folder is left as it is) or <button type="button" className="holo" onClick={() => void api().fontLibrary.dismissLegacy().then(setStatus)}>don't ask again</button>.</span></div>
        )}
        {status?.missing && (
          <div className="note red" role="alert"><Icon name="warn" /><span className="col" style={{ gap: 8 }}>
            <span>The font library folder cannot be found: <span className="mono">{status.root}</span>. If it is on a drive that is not plugged in, plug it in and look again. Nothing was created in its place.</span>
            <span className="row wrap" style={{ gap: 8 }}>
              <button type="button" className="btn sm" disabled={busy} onClick={() => void refresh()}><span className="b"><span className="i">Look again</span></span></button>
              <button type="button" className="btn sm" disabled={busy} onClick={() => void moveLibrary(false)}><span className="b"><span className="i">Choose where it is</span></span></button>
              <button type="button" className="btn sm ghost" disabled={busy} onClick={() => void moveLibrary(true)}><span className="b"><span className="i">Use the default folder</span></span></button>
            </span>
          </span></div>
        )}
        {problems.map((p) => (
          <div key={p.keptAs} className="note amber"><Icon name="warn" /><span>The font details (names, makers, notes) could not be read. The file was kept as <b className="mono">{p.keptAs}</b> in the library folder, and Hiltwright started {p.startedFrom === 'backup' ? 'from its backup copy' : p.startedFrom === 'readable records' ? 'with the entries it could read' : 'with none'}. <button type="button" className="holo" onClick={() => void api().fontLibrary.open()}>Open the folder</button></span></div>
        ))}
        {(busy || progress) && <div className="note"><span className="spinner on" style={{ width: 16, height: 16 }}><Icon name="spin" /></span><span>{progress ?? 'Working…'}</span></div>}
        {note && <div className={`note ${note.tone}`}><Icon name={note.tone === 'green' ? 'check' : note.tone === 'red' ? 'x' : 'warn'} /><span>{note.text}</span></div>}

        <section className="panel fill" aria-label="Fonts in the library">
          <div className="scroll grow">
            <table>
              <thead><tr><th>Font</th><th>Maker</th><th>Type</th><th>Supports</th><th>Tracks</th><th>Size</th><th>Status</th></tr></thead>
              <tbody>
                {groups.map((g) => (groupBy === 'none' ? g.fonts.map(row) : [groupHead(g), ...(folded.has(g.key) ? [] : g.fonts.map(row))]))}
                {!loaded && <tr><td colSpan={7} className="hint" style={{ padding: 24 }}><span className="row" style={{ gap: 10 }}><span className="spinner on" style={{ width: 16, height: 16 }}><Icon name="spin" /></span>Reading your fonts… the first look at a big library takes a few seconds.</span></td></tr>}
                {loaded && fonts.length === 0 && !status?.missing && <tr><td colSpan={7} className="hint" style={{ padding: 24 }}>No fonts yet. Add a font package as you downloaded it (.zip), or a font folder. They are copied into the library; your originals are left alone.</td></tr>}
                {fonts.length > 0 && visible.length === 0 && <tr><td colSpan={7} className="hint">No fonts match. Clear a filter.</td></tr>}
              </tbody>
            </table>
            <datalist id="hw-makers">{makerNames.map((m) => <option key={m} value={m} />)}</datalist>
            <datalist id="hw-bundles">{bundles.map((b) => <option key={b} value={b} />)}</datalist>
          </div>
          <div className="row" style={{ gap: 10, padding: '10px 14px', borderTop: '1px solid var(--line)', background: '#0d131a' }}>
            <span className="small dim nowrap">Library folder</span>
            <span className="mono small ellip grow" title={status?.root}>{status?.root ?? '…'}</span>
            <span className="hint nowrap">{fonts.length} font{fonts.length === 1 ? '' : 's'} · {mb(fonts.reduce((a, f) => a + f.bytes, 0))}</span>
            <button type="button" className="chip" onClick={() => void api().fontLibrary.open()}>Open</button>
            <button type="button" className="chip" disabled={busy} onClick={() => void moveLibrary(false)}>Change…</button>
            {status && !status.isDefault && <button type="button" className="chip" disabled={busy} title="Use the default folder again. Fonts in the current folder stay there." onClick={() => void moveLibrary(true)}>Default</button>}
          </div>
        </section>
      </div>

      {sel ? <FontDetail key={sel.folder} font={sel} detail={detail} card={card} player={player} onSetLogo={(m) => void setLogo(m)} onClearLogo={(m) => void clearLogo(m)} onDemo={onDemo} onChanged={onChanged} onRemoved={() => { player.stop(); void refresh(); }} />
        : <section className="panel"><div className="pb hint">Pick a font to see and hear what is in it.</div></section>}
    </div>
  );
}

function FontDetail({ font, detail, card, player, onSetLogo, onClearLogo, onDemo, onChanged, onRemoved }: {
  font: LibraryFont; detail: LibraryFontDetail | null; card: CardInfo | null; player: ReturnType<typeof useSoundPlayer>;
  onSetLogo: (maker: string) => void; onClearLogo: (maker: string) => void;
  onDemo: (folder: string) => void; onChanged: (f: LibraryFont) => void; onRemoved: () => void;
}) {
  const [name, setName] = useState(font.meta.name);
  const [maker, setMaker] = useState(font.meta.maker);
  const [notes, setNotes] = useState(font.meta.notes);
  const [bundle, setBundle] = useState(font.meta.bundle ?? '');
  const people = useContributors();
  const [open, setOpen] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [note, setNote] = useState<{ tone: 'green' | 'amber' | 'red'; text: string; replace?: boolean } | null>(null);
  const [copying, setCopying] = useState(false);
  const save = async (patch: { name?: string; maker?: string; notes?: string; bundle?: string }) => {
    const same = (patch.name ?? font.meta.name) === font.meta.name && (patch.maker ?? font.meta.maker) === font.meta.maker && (patch.notes ?? font.meta.notes) === font.meta.notes && (patch.bundle ?? font.meta.bundle ?? '') === (font.meta.bundle ?? '');
    if (same) return;
    try { onChanged(await api().fontLibrary.setMeta(font.folder, patch)); } catch (err) { setNote({ tone: 'red', text: cleanErr(err) }); }
  };
  const groups = useMemo(() => {
    const m = new Map<string, FontSound[]>();
    for (const s of detail?.sounds ?? []) { const g = m.get(s.effect) ?? []; g.push(s); m.set(s.effect, g); }
    const order = ['font name', 'boot', 'ignition', 'hum', 'retraction', 'swing', 'smoothswing', 'clash'];
    return [...m.entries()].sort(([a], [b]) => { const ia = order.indexOf(a); const ib = order.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b); });
  }, [detail]);
  const copy = async (replace: boolean) => {
    if (!card) return;
    setCopying(true); setNote(null);
    try { const e = await api().fontLibrary.copyToCard(font.folder, card.root, replace); setNote({ tone: 'green', text: `Copied to the card at ${card.root} as ${e.name} (${e.report.files} sounds).` }); }
    catch (err) { const t = cleanErr(err); setNote({ tone: /already on the card/.test(t) ? 'amber' : 'red', text: t, replace: /already on the card/.test(t) }); }
    finally { setCopying(false); }
  };
  const playBtn = (s: FontSound, label: string) => {
    const key = `${font.folder}/${s.path}`;
    const on = player.playing === key; const wait = player.loadingKey === key;
    return (
      <button key={s.path} type="button" className={`chip ${on ? 'live' : ''}`} title={`${s.path}${s.seconds != null ? `, ${secs(s.seconds)}` : ''}`} aria-label={`${on ? 'Stop' : 'Play'} ${s.path}`} onClick={() => void player.play(font.folder, s.path).catch((err) => setNote({ tone: 'red', text: `Could not play ${s.path}: ${cleanErr(err)}` }))}>
        <Icon name={on ? 'x' : wait ? 'clock' : 'play'} />{label}
      </button>
    );
  };
  const sp = font.support;

  return (
    <section className="panel fill" aria-label="Selected font">
      <div className="ph">
        <div className="row" style={{ gap: 12, minWidth: 0 }}>
          {font.meta.maker && <ContributorLogo name={font.meta.maker} logo={people.logoFor(font.meta.maker)} size={36} />}
          <div className="col" style={{ gap: 2, minWidth: 0 }}><h2 className="ellip">{font.meta.name}</h2><span className="hint ellip">{font.meta.maker ? `by ${font.meta.maker} · ` : ''}{font.meta.bundle ? `${font.meta.bundle} · ` : ''}folder <span className="mono">{font.folder}</span></span></div>
        </div>
        <button type="button" className="chip" title="Hear it on a saber in the demo room" onClick={() => onDemo(font.folder)}><Icon name="play" />Demo room</button>
      </div>
      <div className="pb col scroll" style={{ gap: 14, overflowX: 'hidden' }}>
        <div className="grid2" style={{ gap: 10 }}>
          <label className="field"><span className="label">Name</span><span className="input sans"><input type="text" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => void save({ name })} aria-label="Font name" /></span></label>
          <label className="field"><span className="label">Maker</span><span className="input sans"><input type="text" list="hw-makers" value={maker} placeholder="Who made it" onChange={(e) => setMaker(e.target.value)} onBlur={() => void save({ maker })} aria-label="Font maker" /></span></label>
          <label className="field"><span className="label">Bundle</span><span className="input sans"><input type="text" list="hw-bundles" value={bundle} placeholder="A set it came in" onChange={(e) => setBundle(e.target.value)} onBlur={() => void save({ bundle: bundle.trim() })} aria-label="Bundle the font came in" /></span></label>
          <div className="field"><span className="label">Maker's logo</span>
            {font.meta.maker.trim()
              ? <div className="row" style={{ gap: 8, minHeight: 38 }}>
                  <ContributorLogo name={font.meta.maker} logo={people.logoFor(font.meta.maker)} size={32} />
                  <button type="button" className="holo small" onClick={() => onSetLogo(font.meta.maker)}>{people.logoFor(font.meta.maker) ? 'Change' : 'Add a logo'}</button>
                  {people.ownLogoFor(font.meta.maker) && <button type="button" className="holo small" onClick={() => onClearLogo(font.meta.maker)}>Remove</button>}
                </div>
              : <span className="hint" style={{ minHeight: 38, display: 'flex', alignItems: 'center' }}>Name the maker first.</span>}
          </div>
        </div>
        <label className="field"><span className="label">Notes</span>
          <textarea className="textarea" rows={3} value={notes} placeholder="Where it came from, licence, which saber it suits…" onChange={(e) => setNotes(e.target.value)} onBlur={() => void save({ notes })} aria-label="Notes about the font" />
        </label>
        <span className="hint" style={{ marginTop: -8 }}>The saber knows it by its folder name, <span className="mono">{font.folder}</span>; the name here is for you.{font.meta.from ? ` Added from ${font.meta.from}.` : ''}</span>

        <div className="col" style={{ gap: 8 }}>
          <span className="small" style={{ fontWeight: 600 }}>What it supports</span>
          <div className="row wrap" style={{ gap: 6 }}>
            <span className={`chip ${sp.type === 'polyphonic' ? 'ok' : sp.type === 'mixed' ? 'warn' : ''}`} title={sp.type === 'polyphonic' ? 'Sounds can overlap (clsh01.wav style names)' : sp.type === 'monophonic' ? 'One sound at a time (clash1.wav style names)' : undefined}>{TYPE[sp.type]}</span>
            <span className={`chip ${sp.smoothSwing ? 'ok' : ''}`}>{sp.smoothSwing ? <Icon name="check" /> : <Icon name="minus" />}SmoothSwing</span>
            <span className={`chip ${sp.tracks ? 'ok' : ''}`}>{sp.tracks} track{sp.tracks === 1 ? '' : 's'}</span>
            <span className="chip">{font.report.files} sounds · {mb(font.bytes)}</span>
          </div>
          <span className="small dim">{sp.special.length ? <>Special effects: {sp.special.join(', ')}.</> : 'No special effects beyond hum, ignition, retraction, swing and clash.'}</span>
        </div>
        {font.report.issues.map((i, k) => <div key={k} className={`note ${i.kind === 'mixed' || i.kind === 'missing-hum' ? 'red' : 'amber'}`}><Icon name="warn" /><span>{i.text}</span></div>)}

        <div className="col" style={{ gap: 0 }}>
          <div className="row between" style={{ marginBottom: 6 }}><span className="small" style={{ fontWeight: 600 }}>Sounds</span>{player.playing?.startsWith(`${font.folder}/`) && <button type="button" className="holo small" onClick={player.stop}>Stop</button>}</div>
          {!detail && <span className="hint">Reading the font…</span>}
          <div className="list" style={{ border: '1px solid var(--line)' }}>
            {groups.map(([effect, list]) => (
              <div key={effect} className="col" style={{ gap: 0, borderBottom: '1px solid var(--line)' }}>
                <div className="li" style={{ minHeight: 36, borderBottom: 0, gap: 8 }}>
                  <button type="button" className="row grow" style={{ gap: 8, textAlign: 'left' }} aria-expanded={open === effect} onClick={() => setOpen(open === effect ? null : effect)}>
                    <Icon name={open === effect ? 'down' : 'chev'} style={{ width: 14, height: 14, color: 'var(--mute)' }} />
                    <span className="small grow">{effect}</span>
                    <span className="mono mute" style={{ fontSize: 11.5 }}>{list.length}</span>
                  </button>
                  {(() => {
                    // One of the effect's sounds at random, as the saber would pick; pressing again stops it.
                    const on = list.some((s) => player.playing === `${font.folder}/${s.path}`);
                    const pick = () => (on ? player.stop() : void player.play(font.folder, list[Math.floor(Math.random() * list.length)].path).catch((err) => setNote({ tone: 'red', text: `Could not play: ${cleanErr(err)}` })));
                    return <button type="button" className={`chip ${on ? 'live' : ''}`} aria-label={`${on ? 'Stop' : 'Play a'} ${effect} sound`} onClick={pick}><Icon name={on ? 'x' : 'play'} />{on ? 'Stop' : 'Play'}</button>;
                  })()}
                </div>
                {open === effect && <div className="row wrap" style={{ gap: 6, padding: '2px 14px 12px 36px' }}>{list.map((s) => playBtn(s, s.path.split('/').pop()!.replace(/\.wav$/i, '')))}</div>}
              </div>
            ))}
          </div>
        </div>

        {detail && detail.tracks.length > 0 && (
          <div className="col" style={{ gap: 6 }}>
            <span className="small" style={{ fontWeight: 600 }}>Tracks</span>
            <div className="list" style={{ border: '1px solid var(--line)' }}>
              {detail.tracks.map((t) => {
                const key = `${font.folder}/${t.path}`; const on = player.playing === key;
                return (
                  <div key={t.path} className="li" style={{ minHeight: 36 }}>
                    <button type="button" className={`chip ${on ? 'live' : ''}`} aria-label={`${on ? 'Stop' : 'Play'} ${t.path}`} onClick={() => void player.play(font.folder, t.path).catch((err) => setNote({ tone: 'red', text: `Could not play ${t.path}: ${cleanErr(err)}` }))}><Icon name={on ? 'x' : player.loadingKey === key ? 'clock' : 'play'} /></button>
                    <span className="mono small grow ellip" title={`${font.folder}/${t.path}`}>{t.path.split('/').pop()}</span>
                    <span className="mono mute" style={{ fontSize: 11.5 }}>{secs(t.seconds)}</span>
                  </div>
                );
              })}
            </div>
            <span className="hint">On the card a preset names these as <span className="mono">{font.folder}/{detail.tracks[0].path}</span>.</span>
          </div>
        )}
      </div>
      <div className="col" style={{ gap: 8, padding: '12px 18px 14px', borderTop: '1px solid var(--line)', background: '#0d131a', flex: 'none' }}>
        {note && <div className={`note ${note.tone}`}><Icon name={note.tone === 'green' ? 'check' : note.tone === 'red' ? 'x' : 'warn'} /><span>{note.text}{note.replace && <> <button type="button" className="holo" disabled={copying} onClick={() => void copy(true)}>Replace it</button></>}</span></div>}
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn sm pri" disabled={!card || copying} title={card ? `Copy this font's folder onto the card at ${card.root}` : 'No ProffieOS card found. Put one in a reader, or share the saber’s card on Fonts & SD.'} onClick={() => void copy(false)}><span className="b"><span className="i"><Icon name="sd" />{copying ? 'Copying…' : card ? `Copy to card ${card.root}` : 'No card'}</span></span></button>
          <button type="button" className="btn sm ghost" onClick={() => void api().fontLibrary.open(font.folder)}><span className="b"><span className="i">Show files</span></span></button>
          {confirmRemove
            ? <button type="button" className="btn sm danger" style={{ marginLeft: 'auto' }} onClick={() => void api().fontLibrary.remove(font.folder).then(onRemoved, (err) => setNote({ tone: 'red', text: cleanErr(err) }))}><span className="b"><span className="i"><Icon name="trash" />Yes, remove</span></span></button>
            : <button type="button" className="btn sm ghost" style={{ marginLeft: 'auto' }} title="Moves the font's folder to the recycle bin" onClick={() => setConfirmRemove(true)}><span className="b"><span className="i"><Icon name="trash" />Remove</span></span></button>}
        </div>
      </div>
    </section>
  );
}
