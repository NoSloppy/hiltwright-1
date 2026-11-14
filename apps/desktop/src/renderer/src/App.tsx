// The shell, and the flow through it. One saber at a time is being worked on (the plugged-in one, or the one chosen
// in the Armory); the steps down the left take it from wiring to an installed board. Looks are made and tried in
// the Workshop, off to the side, and picked from the Presets step.

import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { registerLookSim, wiringConfirmed, type LookDef } from '@hiltwright/core';
import { useBoard } from './board';
import { Icon } from './Icon';
import logoIcon from './assets/hiltwright-icon.svg';
import logoWordmark from './assets/hiltwright-wordmark.svg';
import { Presets } from './Presets';
import { Fonts } from './Fonts';
import { Build } from './Build';
import { Looks } from './Looks';
import { Wiring } from './Wiring';
import { ErrorBoundary } from './ErrorBoundary';
import { SaveDiagnostics } from './SaveDiagnostics';
import { SaberControls } from './Controls';
import { guessBlades, infoFromRecord, queuedLookIds } from './saberModel';
import { usePendingLookColours } from './pendingColours';
import { StyleEditor } from './StyleEditor';
import { FontLibrary } from './FontLibrary';
import { Contributors } from './Contributors';
import { flowStatus, nextStep, useWorkspace, type Workspace } from './workspace';
import type { SaberRecord } from '../../shared/api';
import { batteryLabel, noBattery } from './battery';
// three.js is only needed in the demo room, so it loads when that page is first opened.
const Demo = lazy(() => import('./Demo').then((m) => ({ default: m.Demo })));

type Page = 'armory' | 'wiring' | 'presets' | 'fonts' | 'build' | 'looks' | 'editor' | 'library' | 'contributors' | 'demo' | 'diag';
const NAV: { section: string; pages: { id: Page; title: string; icon: Parameters<typeof Icon>[0]['name']; step?: number }[] }[] = [
  { section: 'Saber', pages: [
    { id: 'armory', title: 'Armory', icon: 'armory' },
    { id: 'wiring', title: 'Wiring', icon: 'blade', step: 1 },
    { id: 'presets', title: 'Presets', icon: 'presets', step: 2 },
    { id: 'fonts', title: 'Fonts & SD', icon: 'fonts', step: 3 },
    { id: 'build', title: 'Build & Install', icon: 'build', step: 4 },
  ] },
  { section: 'Workshop', pages: [
    { id: 'looks', title: 'Styles', icon: 'looks' },
    { id: 'editor', title: 'Style editor', icon: 'gear' },
    { id: 'library', title: 'Font library', icon: 'fonts' },
    { id: 'contributors', title: 'Contributors', icon: 'people' },
    { id: 'demo', title: 'Demo room', icon: 'play' },
  ] },
  { section: 'Tools', pages: [{ id: 'diag', title: 'Diagnostics', icon: 'diag' }] },
];
const PAGES = NAV.flatMap((g) => g.pages);
const TITLE: Record<Page, string> = { armory: 'Armory', wiring: 'Wiring', presets: 'Presets', fonts: 'Fonts & SD', build: 'Build & Install', looks: 'Styles', editor: 'Style editor', library: 'Font library', contributors: 'Contributors', demo: 'Demo room', diag: 'Diagnostics' };

export function App() {
  const real = useBoard();
  usePendingLookColours(real);
  // Dev aid: hiltwrightGoto('fake:presets') shows the connected pages from the remembered saber, with no board, for
  // layout screenshots; 'fake-shared:presets' does the same with its card shared (card-safety 3.4). Nothing is sent
  // anywhere; never available in a packaged app.
  const [fake, setFake] = useState<false | 'plain' | 'shared'>(false);
  const lib0 = real.library[0];
  const board: typeof real = fake && import.meta.env.DEV && lib0 ? { ...real, status: 'connected', portName: 'FAKE', saber: lib0, info: { ...infoFromRecord(lib0), currentPreset: 0, battery: 3.91, volume: 1800 }, card: { shared: fake === 'shared', root: fake === 'shared' ? 'H:\\' : null } } : real;
  const ws = useWorkspace(board);
  const [page, setPageNow] = useState<Page>('armory');
  // A page with unsaved work (the Style editor) can hold navigation: it gets a proceed callback, and calls it once the
  // owner has saved or chosen to leave. Every page change goes through here.
  const leaveGuard = useRef<((proceed: () => void) => void) | null>(null);
  const pageRef = useRef(page); pageRef.current = page;
  const setPage = (p: Page, then?: () => void) => {
    const move = () => { then?.(); setPageNow(p); };
    if (p !== pageRef.current && leaveGuard.current) leaveGuard.current(move); else move();
  };
  const setPageRef = useRef(setPage); setPageRef.current = setPage;
  const [demoLook, setDemoLook] = useState<string | null>(null);
  const [demoFont, setDemoFont] = useState<string | null>(null);
  // The Styles page opened from the Contributors page shows that person's styles.
  const [styleCreator, setStyleCreator] = useState<string | null>(null);
  const [editingLook, setEditingLook] = useState<LookDef | null>(null);
  // Bumped each time Styles opens the editor on a style (or a new one); saving never remounts the editor.
  const [editorOpen, setEditorOpen] = useState(0);
  // Saved looks get a simulator at startup (built ones from their layers, pasted ones from their code), so they preview like library looks.
  useEffect(() => { void window.hiltwright.looks.list().then((ls) => { for (const l of ls) registerLookSim(l); }); }, []);
  const { status, info } = board;
  const connected = status === 'connected';
  const configName = info?.version?.config?.replace(/^config\//, '').replace(/\.h$/, '') ?? null;
  // Dev aid: lets main switch pages for screenshots.
  useEffect(() => { if (!import.meta.env.DEV) return; (window as unknown as { hiltwrightGoto?: (p: string) => void }).hiltwrightGoto = (p) => { setFake(p.startsWith('fake-shared:') ? 'shared' : p.startsWith('fake:') ? 'plain' : false); setPage(p.replace(/^fake(-shared)?:/, '') as Page); }; }, []);
  // Dev aid: hiltwrightFault() makes the current page throw while rendering, to check the fault screen and its log line.
  // The fault belongs to the page it was raised on, so moving to another page shows that page normally.
  const [faultPage, setFaultPage] = useState<Page | null>(null);
  useEffect(() => { if (!import.meta.env.DEV) return; (window as unknown as { hiltwrightFault?: () => void }).hiltwrightFault = () => setFaultPage(pageRef.current); }, []);
  // Ctrl+1..9 switch pages, in the order shown.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (!e.ctrlKey || e.altKey || e.shiftKey) return; const p = PAGES[Number(e.key) - 1]; if (p) { e.preventDefault(); setPageRef.current(p.id); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const queued = queuedLookIds(ws.model ?? undefined, ws.saber?.firmware).length;
  const go = (p: Page) => setPage(p);

  return (
    <div className="app">
      <aside className="side" aria-label="Primary">
        <div className="brand"><img src={logoIcon} alt="" width={28} height={28} /><img src={logoWordmark} alt="Hiltwright" className="wordmark" /></div>
        <nav className="nav" aria-label="Sections">
          {NAV.map((g) => (
            <div key={g.section} className="col" style={{ gap: 2 }}>
              <span className="sec">{g.section}</span>
              {g.pages.map((p) => (
                <a key={p.id} href="#" className={page === p.id ? 'on' : ''} aria-current={page === p.id ? 'page' : undefined} title={`Ctrl+${PAGES.indexOf(p) + 1}`} onClick={(e) => { e.preventDefault(); setPage(p.id, () => setStyleCreator(null)); }}>
                  {p.step ? <span className="stepn">{p.step}</span> : <Icon name={p.icon} />}<span>{p.title}</span>
                  {p.id === 'presets' && ws.live && !ws.model?.presetsFrom && <span className="tier">live</span>}
                  {p.id === 'build' && (queued > 0 ? <span className="badge" title="Styles waiting for a build">{queued} queued</span> : null)}
                </a>
              ))}
            </div>
          ))}
        </nav>
        {ws.saber && <div className="col" style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', gap: 2 }}><span className="sec" style={{ padding: 0 }}>Working on</span><b className="ellip" style={{ fontWeight: 600, fontSize: 13 }}>{ws.saber.name}</b><span className="hint">{ws.live ? 'plugged in' : ws.saber.planned ? 'planned, not seen yet' : 'not plugged in'}</span></div>}
        <div className="mono mute" style={{ marginTop: 'auto', padding: '14px 20px', borderTop: '1px solid var(--line)', fontSize: 11 }}>Hiltwright {window.hiltwright?.appVersion ?? '?'} alpha</div>
      </aside>

      <header className="top">
        <div className="row" style={{ gap: 0, minWidth: 0 }}>
          <h1>{TITLE[page]}</h1>
          <div className="ident">
            <b className="ellip">{ws.saber?.name ?? configName ?? 'No saber yet'}</b>
            <span className="hint ellip">{info?.version ? `ProffieOS ${info.version.version}, ${info.version.prop ?? 'unknown prop'}, ${info.presets.length} presets` : ws.saber ? (ws.saber.planned ? 'planned ahead' : 'not plugged in') : 'plug one in, or plan one in the Armory'}</span>
          </div>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <StatusChip status={status} port={board.portName} />
          <span className="chip" title={noBattery(info?.battery ?? null) ? 'The battery reads under 2 V: none is connected, and the saber runs on USB power.' : undefined}><Icon name="battery" />{batteryLabel(info?.battery ?? null)}</span>
          {connected
            ? <button type="button" className="btn sm" onClick={() => void board.disconnect()}><span className="b"><span className="i">Disconnect</span></span></button>
            : <button type="button" className="btn sm pri" onClick={() => void board.connect(true)} disabled={status === 'connecting' || status === 'reading'}><span className="b"><span className="i"><Icon name="usb" />Connect</span></span></button>}
        </div>
      </header>

      <main className="main">
        <ErrorBoundary key={page} what={`the ${TITLE[page]} page`}>
          {faultPage === page && <FaultForDev />}
          {page === 'armory' ? <Armory board={board} ws={ws} go={go} />
            : page === 'wiring' ? <Wiring ws={ws} board={board} go={go} />
            : page === 'presets' ? <Presets ws={ws} board={board} go={go} />
            : page === 'fonts' ? <Fonts board={board} ws={ws} go={go} />
            : page === 'build' ? <Build ws={ws} board={board} go={go} />
            : page === 'looks' ? <Looks ws={ws} board={board} initialCreator={styleCreator} onPresets={() => setPage('presets')} onBuild={() => setPage('build')} onDemo={(id) => { setDemoLook(id); setPage('demo'); }} onEdit={(l) => { setEditingLook(l); setEditorOpen((n) => n + 1); setPage('editor'); }} onNew={() => { setEditingLook(null); setEditorOpen((n) => n + 1); setPage('editor'); }} />
            : page === 'editor' ? <EditorLoader key={editorOpen} lookId={editingLook?.id ?? null}>{(fresh) => (
                <StyleEditor key={fresh?.id ?? 'new'} editing={fresh} onSaved={(look) => { setEditingLook(look); void board.refreshLibrary(); }} onDemo={(id) => setPage('demo', () => setDemoLook(id))} onLeaveGuard={(g) => { leaveGuard.current = g; }} />
              )}</EditorLoader>
            : page === 'library' ? <FontLibrary onDemo={(folder) => { setDemoFont(folder); setPage('demo'); }} />
            : page === 'contributors' ? <Contributors onFonts={() => setPage('library')} onLooks={(name) => { setStyleCreator(name); setPage('looks'); }} onDemo={() => setPage('demo')} />
            : page === 'demo' ? <Suspense fallback={<span className="hint">Opening the demo room…</span>}><Demo initialLook={demoLook} initialFont={demoFont} board={board} /></Suspense>
            : <Diagnostics board={board} />}
        </ErrorBoundary>
      </main>
    </div>
  );
}

function StatusChip({ status, port }: { status: ReturnType<typeof useBoard>['status']; port: string | null }) {
  switch (status) {
    case 'connected': return <span className="chip live"><span className="dot" />Connected · {port}</span>;
    case 'connecting': return <span className="chip warn"><span className="dot" />Opening port…</span>;
    case 'reading': return <span className="chip warn"><span className="dot" />Reading the saber…</span>;
    case 'error': return <span className="chip err"><Icon name="x" />Error</span>;
    case 'no-port': return <span className="chip"><span className="dot" />No saber found</span>;
    default: return <span className="chip"><span className="dot" />Not connected</span>;
  }
}

/** The Armory: the sabers this computer knows, which one is being worked on, and how far along it is. */
function Armory({ board, ws, go }: { board: ReturnType<typeof useBoard>; ws: Workspace; go: (p: Page) => void }) {
  const { status, error } = board;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [planning, setPlanning] = useState(false);
  const [planName, setPlanName] = useState('');
  // A plan made while a saber is plugged in: the plugged-in saber stays the working one, and this says so.
  const [plannedAside, setPlannedAside] = useState<string | null>(null);
  const plan = async () => {
    const name = planName.trim() || `Saber ${board.library.length + 1}`;
    const rec = await board.planSaber(name, { name: `hiltwright_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'saber'}`, board: 'V2', buttons: 2, prop: 'fett263', blades: guessBlades([132]), presets: [], looks: [], generator: `hiltwright ${window.hiltwright.appVersion}` });
    setPlanning(false); setPlanName('');
    if (ws.live) { setPlannedAside(rec.name); return; }
    ws.choose(rec.id); go('wiring');
  };
  // Stores that could not be read at start were kept aside (jsonStore.ts); say so until dismissed.
  const [problems, setProblems] = useState<Awaited<ReturnType<typeof window.hiltwright.app.storeProblems>>>([]);
  useEffect(() => { void window.hiltwright.app.storeProblems().then(setProblems, () => setProblems([])); }, []);
  const openFolder = async (place: 'data' | 'fonts') => {
    try { if (place === 'fonts') await window.hiltwright.fontLibrary.open(); else await window.hiltwright.app.openPath(await window.hiltwright.app.userDataPath()); } catch { /* nothing to open */ }
  };
  // Adoption asks first: which plan the owner said this saber is.
  const [adopting, setAdopting] = useState<SaberRecord | null>(null);
  const steps = flowStatus(ws);
  const next = nextStep(ws);
  const stepPage: Record<string, Page> = { wiring: 'wiring', presets: 'presets', fonts: 'fonts', build: 'build' };
  const stepTitle: Record<string, string> = { wiring: 'Wiring', presets: 'Presets', fonts: 'Fonts & SD', build: 'Build & Install' };
  const cur = ws.saber;
  const plans = ws.plans;
  const adoptable = ws.live && cur && !cur.firmware && !cur.planned && plans.length > 0;

  return (
    <div className="work" style={{ gridTemplateColumns: 'minmax(0,1fr) 420px' }}>
      <div className="col" style={{ gap: 16, minHeight: 0 }}>
        {problems.map((p) => (
          <div key={p.keptAs} className="note amber" role="alert"><Icon name="warn" /><span className="col" style={{ gap: 8 }}>
            <span>Your {p.store} could not be read. It was kept as <b className="mono">{p.keptAs}</b> in {p.place === 'fonts' ? 'the font library folder' : "Hiltwright's data folder"}, and Hiltwright started {p.startedFrom === 'backup' ? 'from its backup copy' : p.startedFrom === 'readable records' ? 'with the entries it could read' : 'with an empty one'}.</span>
            <span className="row" style={{ gap: 8 }}><button type="button" className="btn sm" onClick={() => void openFolder(p.place)}><span className="b"><span className="i">Open folder</span></span></button><button type="button" className="btn sm ghost" onClick={() => setProblems((ps) => ps.filter((x) => x !== p))}><span className="b"><span className="i">Dismiss</span></span></button></span>
          </span></div>
        ))}
        <section className="panel" aria-label="Connection">
          <div className="row" style={{ padding: '16px 18px', gap: 18 }}>
            <span style={{ color: ws.live ? 'var(--holo)' : 'var(--mute)', display: 'flex', width: 28, height: 28 }}><Icon name="usb" /></span>
            <div className="col grow" style={{ gap: 3 }}>
              <h3>{ws.live ? `${cur?.name ?? 'A saber'} is plugged in` : status === 'connecting' ? 'Opening the port…' : status === 'reading' ? 'Reading the saber…' : status === 'error' ? 'Something went wrong' : 'Nothing plugged in'}</h3>
              <div className="dim small">{ws.live && board.info?.version ? `ProffieOS ${board.info.version.version}, ${board.info.version.prop ?? 'unknown prop'}, ${board.info.version.buttons ?? '?'} buttons. Installed ${board.info.version.installed ?? '?'}.` : error ?? (status === 'no-port' ? 'No Proffieboard is granted to this app yet. Plug one in over a data cable and press Connect. Or set a saber up ahead and install when it arrives.' : 'Plug a saber in over a data cable and press Connect, or work on a remembered one below.')}</div>
            </div>
            {!ws.live && (status === 'no-port' || status === 'error' || status === 'idle') && <button type="button" className="btn pri" onClick={() => void board.connect(true)}><span className="b"><span className="i"><Icon name="usb" />Connect</span></span></button>}
            {ws.live && <button type="button" className="btn sm ghost" onClick={() => void board.identify()}><span className="b"><span className="i"><Icon name="undo" />Read again</span></span></button>}
          </div>
          {ws.live && board.info && noBattery(board.info.battery) && <div className="note amber" style={{ margin: '0 18px 16px' }}><Icon name="battery" /><span>No battery detected: {cur?.name ?? 'this saber'} is running on USB power alone. It may pause for a moment when it plays sound or reads its card. If it does, Hiltwright reconnects to it on its own.</span></div>}
          {ws.live && board.info && board.info.rejected.length > 0 && <div className="note amber" style={{ margin: '0 18px 16px' }}><Icon name="warn" /><span>This firmware does not know {board.info.rejected.join(', ')}. Hiltwright adapts to what the board supports.</span></div>}
          {adoptable && !adopting && (
            <div className="note amber" style={{ margin: '0 18px 16px' }}><Icon name="info" /><span>Is this a saber you set up ahead? {plans.map((p) => <button key={p.id} type="button" className="holo" style={{ marginRight: 10 }} onClick={() => setAdopting(p)}>It is "{p.name}"</button>)}Its wiring, presets and styles move onto this saber, ready to install.</span></div>
          )}
          {adoptable && adopting && cur && (
            <div className="note amber" role="alertdialog" aria-label="Adopt a planned saber" style={{ margin: '0 18px 16px' }}><Icon name="warn" /><span className="col" style={{ gap: 8 }}>
              <span>Adopting "{adopting.name}" moves its wiring, prop, presets and styles onto {cur.name}. The next install replaces the styles compiled into {cur.name}'s current firmware, and the presets on its card will then be the plan's.</span>
              {cur.model && <span>{cur.name} already has wiring and presets set up in Hiltwright. They will be replaced by the plan's.</span>}
              <span className="row" style={{ gap: 8 }}>
                <button type="button" className="btn sm pri" onClick={() => { const id = adopting.id; setAdopting(null); void board.adoptPlan(id); }}><span className="b"><span className="i">Adopt</span></span></button>
                <button type="button" className="btn sm ghost" onClick={() => setAdopting(null)}><span className="b"><span className="i">Not now</span></span></button>
              </span>
            </span></div>
          )}
        </section>

        <section className="panel" aria-label="Your sabers" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="ph"><h2>Your sabers</h2>
            {planning
              ? <form className="row" style={{ gap: 6 }} onSubmit={(e) => { e.preventDefault(); void plan(); }}><span className="input sans" style={{ height: 30, width: 200 }}><input type="text" value={planName} autoFocus placeholder="Name the saber" aria-label="Name for the new saber" onChange={(e) => setPlanName(e.target.value)} /></span><button type="submit" className="btn sm pri"><span className="b"><span className="i">Start</span></span></button><button type="button" className="chip" onClick={() => setPlanning(false)}><Icon name="x" /></button></form>
              : <button type="button" className="btn sm pri" title="Set a saber up before it is plugged in: wiring, presets and styles, ready to install when it arrives" onClick={() => setPlanning(true)}><span className="b"><span className="i"><Icon name="plus" />New saber</span></span></button>}
          </div>
          {plannedAside && cur && (
            <div className="note" role="status" style={{ margin: '12px 18px 0' }}><Icon name="info" /><span className="col" style={{ gap: 8 }}>
              <span>{plannedAside} is set up. {cur.name} is plugged in, so it stays the saber you are working on. Unplug it to work on {plannedAside}.</span>
              <span><button type="button" className="btn sm ghost" onClick={() => setPlannedAside(null)}><span className="b"><span className="i">OK</span></span></button></span>
            </span></div>
          )}
          <div className="list" style={{ overflow: 'auto' }}>
            {board.library.length === 0 && <div className="li hint" style={{ minHeight: 44 }}>No sabers yet. Plug one in and it is remembered, or start a new one to set up ahead.</div>}
            {board.library.map((s) => {
              const isCur = s.id === cur?.id; const plugged = ws.live && isCur;
              return (
                <div key={s.id} className={`li ${isCur ? 'on' : ''}`} style={{ gap: 14, minHeight: 50 }}>
                  <span style={{ color: plugged ? 'var(--holo)' : 'var(--mute)', display: 'flex', width: 18 }}><Icon name={plugged ? 'usb' : s.planned ? 'gear' : 'blade'} /></span>
                  {editing && isCur
                    ? <form className="row grow" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); void board.renameSaber(draft); setEditing(false); }}>
                        <span className="input sans grow" style={{ height: 32 }}><input type="text" value={draft} autoFocus onChange={(e) => setDraft(e.target.value)} aria-label="Saber name" /></span>
                        <button type="submit" className="btn sm pri"><span className="b"><span className="i">Save</span></span></button>
                        <button type="button" className="btn sm ghost" onClick={() => setEditing(false)}><span className="b"><span className="i">Cancel</span></span></button>
                      </form>
                    : <>
                        <span className="col grow" style={{ gap: 0 }} title={s.identity.configName ? `${s.identity.configName}, USB serial ${s.identity.usbSerial ?? 'unknown'}` : undefined}>
                          <b className="ellip" style={{ fontWeight: 600 }}>{s.name}</b>
                          <span className="hint ellip">{plugged ? 'plugged in' : s.planned ? `set up ahead · ${s.model?.presets.length ?? 0} presets · not seen yet` : `${s.identity.configName ?? '?'} · ${s.presets.length} presets · last seen ${new Date(s.lastSeen).toLocaleDateString()}`}</span>
                        </span>
                        {isCur ? <span className="chip live"><span className="dot" />Working on it</span> : <button type="button" className="btn sm" disabled={ws.live} title={ws.live ? 'Unplug the connected saber to work on another' : undefined} onClick={() => ws.choose(s.id)}><span className="b"><span className="i">Work on it</span></span></button>}
                        {isCur && plugged && <button type="button" className="chip" onClick={() => { setDraft(s.name); setEditing(true); }}>Rename</button>}
                        {s.planned && !isCur && <button type="button" className="chip" title="Drop this plan" aria-label={`Drop the plan ${s.name}`} onClick={() => void window.hiltwright.library.remove(s.id).then(() => board.refreshLibrary())}><Icon name="trash" /></button>}
                      </>}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <aside className="rail" aria-label="Progress">
        {!cur ? (
          <div className="stepc now"><div className="head"><b>Start here</b></div><span className="small dim">Plug a saber in, or press New saber to set one up ahead. Then the steps down the left take it from wiring to an installed board.</span></div>
        ) : (
          <>
            <div className="row between" style={{ minHeight: 24 }}><b style={{ fontWeight: 600 }} className="ellip">{cur.name}</b><span className="hint">{ws.live ? 'plugged in' : cur.planned ? 'set up ahead' : 'unplugged'}</span></div>
            {steps.map((st, i) => {
              const done = (st.step === 'wiring' && wiringConfirmed(ws.model)) || (st.step === 'presets' && !!ws.model?.presets.length) || (st.step === 'build' && !!cur.firmware && !queuedLookIds(ws.model ?? undefined, cur.firmware).length && !ws.model?.presetsFrom);
              const now = st.step === next;
              return (
                <button key={st.step} type="button" className={`stepc ${done ? 'done' : now ? 'now' : ''}`} style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => go(stepPage[st.step])}>
                  <div className="head"><span className="nbox">{done ? <Icon name="check" /> : i + 1}</span><b>{stepTitle[st.step]}</b><span className="what">{st.label}</span></div>
                </button>
              );
            })}
            <button type="button" className="btn pri full" onClick={() => go(stepPage[next])}><span className="b"><span className="i"><Icon name="chev" />Continue with {stepTitle[next]}</span></span></button>
            <span className="hint">Styles are chosen on the Presets step; make and try new ones in the Workshop.</span>
          </>
        )}
      </aside>
    </div>
  );
}

/**
 * The style editor always opens the stored, current version of a style: fetched each time the page is entered, from
 * Styles or from the sidebar, never a copy held since Styles last opened it. A style removed meanwhile opens a new one.
 */
function EditorLoader({ lookId, children }: { lookId: string | null; children: (look: LookDef | null) => React.ReactNode }) {
  const [state, setState] = useState<{ look: LookDef | null; gone: boolean } | null>(lookId ? null : { look: null, gone: false });
  useEffect(() => {
    if (!lookId) return;
    let live = true;
    void window.hiltwright.looks.list().then((all) => { const look = all.find((l) => l.id === lookId) ?? null; if (live) setState({ look, gone: !look }); }, () => { if (live) setState({ look: null, gone: true }); });
    return () => { live = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return <div className="pb hint">Loading the style…</div>;
  return <>{state.gone && <div className="note amber" style={{ margin: '0 0 12px' }}><Icon name="warn" /><span>That style is no longer in your Styles, so the editor starts a new one.</span></div>}{children(state.look)}</>;
}

function FaultForDev(): never {
  throw new Error('A fault forced by hiltwrightFault() (development only)');
}

function Diagnostics({ board }: { board: ReturnType<typeof useBoard> }) {
  const [cmd, setCmd] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [board.lines]);
  const quick = ['version', 'battery', 'get_volume', 'get_preset', 'show_current_preset', 'list_fonts', 'list_tracks', 'id', 'scanid'];
  const connected = board.status === 'connected';
  return (
    <>
      <div className="work" style={{ gridTemplateColumns: '380px minmax(0,1fr)' }}>
      <SaberControls board={board} />
      <section className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="ph"><h2>Console</h2><div className="row wrap" style={{ gap: 6 }}>{quick.map((q) => <button key={q} type="button" className="chip" disabled={!connected} onClick={() => void board.send(q, q === 'show_current_preset' ? { until: board.isPresetBlockEnd } : { idleMs: 700 })}>{q}</button>)}</div></div>
        <div className="row" style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)' }}><SaveDiagnostics small /></div>
        <div className="console grow" style={{ border: 0, minHeight: 0 }}>
          {board.lines.length === 0 && <span className="mute">Connect a saber, then type a command. Events the board prints on its own show in amber.</span>}
          {board.lines.map((l, i) => <div key={i} className={l.kind}>{l.text}</div>)}
          <div ref={end} />
        </div>
        <form className="row" style={{ padding: 12, borderTop: '1px solid var(--line)', gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (cmd.trim()) { void board.send(cmd.trim(), { idleMs: 700 }); setCmd(''); } }}>
          <span className="input grow"><input type="text" value={cmd} onChange={(e) => setCmd(e.target.value)} aria-label="Serial command" placeholder="Type a command" disabled={!connected} /></span>
          <button type="submit" className="btn sm pri" disabled={!connected}><span className="b"><span className="i">Send</span></span></button>
        </form>
      </section>
      </div>
    </>
  );
}
