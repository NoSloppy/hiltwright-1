// Fonts & SD: a ProffieOS card in a card reader. Lists fonts with the checks that catch the classic failures,
// lists tracks, and copies a font folder from this computer onto the card after checking it.

import { useCallback, useEffect, useRef, useState } from 'react';
import { saberCanReadFileSystem, type VoicePackStatus } from '@hiltwright/core';
import type { CardInfo, FontEntry, LibraryFont } from '../../shared/api';
import type { Workspace } from './workspace';
import type { Board } from './board';
import { XenoImport } from './XenoImport';
import { fontsForPresets } from './fontNeeds';
import { FEATURES } from './features';
import { Icon } from './Icon';
import { cardKind, chooseCard, rememberCardChoice, rememberedCardChoice } from './cardChoice';
import { Select } from './Select';
import { parseSdAccess } from './boardOps';

const api = () => window.hiltwright;

function mb(bytes: number | null): string {
  if (bytes == null) return '—';
  return bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${(bytes / 1e6).toFixed(0)} MB`;
}

export function Fonts({ board, ws, go }: { board: Board; ws: Workspace; go: (page: 'library') => void }) {
  const [cards, setCards] = useState<CardInfo[]>([]);
  const [card, setCard] = useState<CardInfo | null>(null);
  const [fonts, setFonts] = useState<FontEntry[]>([]);
  const [tracks, setTracks] = useState<{ name: string; size: number }[]>([]);
  const [picked, setPicked] = useState<FontEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: '' | 'green' | 'amber' | 'red'; text: string } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [voice, setVoice] = useState<VoicePackStatus | null>(null);
  const [library, setLibrary] = useState<LibraryFont[]>([]);
  const [copyingNeeded, setCopyingNeeded] = useState<string | null>(null);
  useEffect(() => { void api().fontLibrary.list().then(setLibrary).catch(() => setLibrary([])); }, []);
  // The saber's own card over USB. Hiltwright firmware carries a mass-storage interface, but ProffieOS only hands
  // the card over when asked ('sd 1'): the blade goes off, idle sounds stop, the card is released and Windows
  // mounts it as a drive. 'sd 0' takes it back. While the host has it, the saber cannot play from it.
  const live = board.status === 'connected' && !!board.info;
  // Whether the card is shared lives with the board session, so every page knows (card-safety D1); this page only
  // tracks the share or give-back under way.
  const [usb, setUsb] = useState<'idle' | 'mounting' | 'ejecting' | 'unsupported'>('idle');
  const [usbNote, setUsbNote] = useState<string | null>(null);
  const shared = live && board.card.shared;
  const usbRoot = shared ? board.card.root : null;
  // A shared card whose drive the app cannot name: the owner ejects it in Windows, then confirms (design D4).
  const [ownerEjects, setOwnerEjects] = useState(false);
  useEffect(() => { if (!live) { setUsb('idle'); setOwnerEjects(false); } }, [live]);
  // Files copied so far, while a copy is under way (D5).
  const [progress, setProgress] = useState<{ name: string; done: number; total: number } | null>(null);
  useEffect(() => api().sd.onCopyProgress(setProgress), []);
  // Replace takes two clicks (D6).
  const [confirmReplace, setConfirmReplace] = useState(false);
  // Which card is shown and copied to (card-safety D3): the owner's pick, the saber's own while it shares it, or the
  // only one. Read through refs so a scan started before a render uses the latest of each.
  const [chosen, setChosenNow] = useState<string | null>(rememberedCardChoice);
  const setChosen = (root: string | null) => { rememberCardChoice(root); setChosenNow(root); };
  const serial = live ? board.saber?.identity.usbSerial ?? null : null;
  const pickRef = useRef({ sharedRoot: usbRoot, saberSerial: serial, chosen });
  pickRef.current = { sharedRoot: usbRoot, saberSerial: serial, chosen };
  const choice = chooseCard(cards, { sharedRoot: usbRoot, saberSerial: serial, chosen });
  const isOwnCard = (c: CardInfo) => (!!serial && c.saberSerial === serial) || c.root === usbRoot;
  const cardName = (c: CardInfo) => `${c.root}${c.label ? ` ${c.label}` : ''}${isOwnCard(c) ? ` (${board.saber?.name ?? 'saber'}'s own)` : cardKind(c) === 'empty' ? ' (empty)' : cardKind(c) === 'other' ? ' (not a saber card)' : ''}`;
  const kind = card ? cardKind(card) : null;
  // A card the saber cannot read (exFAT, NTFS): it would find no fonts or presets on it. Copying asks first.
  const unreadable = !!card && saberCanReadFileSystem(card.fileSystem) === 'no';
  const [askFs, setAskFs] = useState<{ what: string; run: () => void } | null>(null);
  useEffect(() => { setAskFs(null); }, [card?.root]);
  const mountUsb = async () => {
    setUsb('mounting'); setUsbNote(null);
    const before = new Set((await api().sd.locate()).map((c) => c.root));
    let r;
    try { r = await board.send('sd 1', { idleMs: 700 }); } catch (err) { setUsb('idle'); setUsbNote(String(err)); return; }
    if (r.lines.some((l) => /^Whut\? :/.test(l))) { setUsb('unsupported'); setUsbNote('This firmware cannot share its card over USB. Hiltwright firmware can: build and install it, or put the card in a reader.'); return; }
    if (!r.lines.some((l) => /SD Access ON/.test(l))) { setUsb('idle'); setUsbNote(`The saber answered "${r.lines.join(' ').trim() || 'nothing'}" instead of turning card access on.`); return; }
    // The card is released once audio goes quiet, then Windows takes a moment to mount it.
    for (let i = 0; i < 40; i++) {
      await new Promise((res) => setTimeout(res, 500));
      const now = (await api().sd.locate()).find((c) => !before.has(c.root));
      if (now) { board.cardShared(now.root); pickRef.current = { ...pickRef.current, sharedRoot: now.root, chosen: null }; setChosen(null); setUsb('idle'); await scan(); return; }
    }
    setUsb('idle'); setUsbNote('The saber said yes but no drive appeared in 20 seconds. If the blade was on or a sound was playing, wait for it to go quiet and try again.');
    // It said yes, so it counts as shared until it says it has the card back.
    board.cardShared(null);
    try { if (parseSdAccess((await board.send('sd 0', { idleMs: 500 })).lines) === false) board.cardGivenBack(); } catch { /* best effort */ }
  };
  const ejectUsb = async () => {
    setUsbNote(null);
    scanGen.current++; setScanning(false);
    // The drive comes first: Windows lets go of it, then the saber takes its card back (D4).
    let root = usbRoot;
    if (!root) {
      const mine = serial ? (await api().sd.locate()).find((c) => c.saberSerial === serial) : undefined;
      root = mine?.root ?? null;
    }
    if (!root && !ownerEjects) {
      setOwnerEjects(true);
      setUsbNote(`Hiltwright cannot tell which drive is ${board.saber?.name ?? 'the saber'}'s card. Use Safely Remove in Windows for it, then press Give the card back again.`);
      return;
    }
    setUsb('ejecting');
    if (root) {
      const e = await api().sd.eject(root);
      console.log(`[sd] eject ${root}: ${e.ok ? e.detail : `not released (${e.detail})`}`);
      if (!e.ok) { setUsb('idle'); setUsbNote(e.detail); return; }
    }
    let access: boolean | null = null;
    try { access = parseSdAccess((await board.send('sd 0', { idleMs: 700 })).lines); } catch { /* the saber may have dropped serial briefly */ }
    console.log(`[sd] gave the card back: the saber says ${access === false ? 'SD Access OFF' : access === true ? 'SD Access ON' : 'nothing about its card'}`);
    setUsb('idle'); setOwnerEjects(false);
    if (access === false) board.cardGivenBack();
    else setUsbNote('The saber did not confirm it took its card back. Try again, or unplug it and plug it back in.');
    await scan();
  };

  // Reading a card's fonts over USB can take minutes. It must never stop the owner giving the card back, so it is
  // tracked apart from `busy` (a copy, which must not be cut short), and a scan overtaken by a newer one, or by the
  // card being given back, drops its results (card-safety 4.1, 2026-11-14).
  const [scanning, setScanning] = useState(false);
  const scanGen = useRef(0);
  const scan = useCallback(async () => {
    const gen = ++scanGen.current;
    const current = () => gen === scanGen.current;
    setScanning(true);
    try {
      const found = await api().sd.locate();
      if (!current()) return;
      setCards(found);
      const best = chooseCard(found, pickRef.current).card;
      setCard(best);
      if (best) {
        setFonts([]); setTracks([]); setVoice(null);
        const [f, t, vp] = await Promise.all([api().sd.listFonts(best.root), api().sd.listTracks(best.root), api().sd.voicePack(best.root)]);
        if (!current()) { console.log(`[sd] reading ${best.root} finished after it was no longer wanted; dropped`); return; }
        setVoice(vp);
        setFonts(f);
        setTracks(t);
        console.log(`[sd] card ${best.root} fonts=${f.length} tracks=${t.length} issues=${f.reduce((a, x) => a + x.report.issues.length, 0)}`);
      } else {
        setFonts([]);
        setTracks([]);
        setVoice(null);
        const proffie = found.filter((c) => c.proffie).length;
        console.log(proffie > 1 ? `[sd] ${proffie} ProffieOS cards and none the saber's: asking which` : `[sd] no ProffieOS card among ${found.length} removable volume(s)`);
      }
    } catch (err) {
      if (current()) console.log(`[sd] reading the card failed: ${String(err)}`);
    } finally { if (current()) setScanning(false); }
  }, []);

  useEffect(() => { void scan(); }, [scan]);
  const usbBusy = usb === 'mounting' || usb === 'ejecting';
  // A copy or a scan under way: everything but giving the card back waits for it.
  const working = busy || scanning;

  const pick = async () => {
    const entry = await api().sd.pickFont();
    if (entry) { setPicked(entry); setMessage(null); setConfirmReplace(false); }
  };

  const copy = async (replace: boolean, sure = false) => {
    if (!picked || !card) return;
    if (replace && !confirmReplace) { setConfirmReplace(true); return; }
    if (unreadable && !sure) { setAskFs({ what: picked.name, run: () => void copy(replace, true) }); return; }
    setAskFs(null);
    setConfirmReplace(false);
    setBusy(true); setProgress(null);
    try {
      const entry = await api().sd.copyFont(picked.path, card.root, replace);
      setMessage({ tone: 'green', text: `${entry.name} copied to the card (${entry.report.files} files).` });
      setPicked(null);
      await scan();
    } catch (err) {
      const text = String(err).replace(/^Error: /, '');
      setMessage({ tone: /already on the card/.test(text) ? 'amber' : 'red', text });
    } finally { setBusy(false); setProgress(null); }
  };

  // The fonts this saber's presets name, and where each one is: on the card, in the library ready to copy, or nowhere.
  const { needed, onCard, inLibrary, copyable } = fontsForPresets(ws.model?.presets ?? [], fonts, library);
  const copyNeeded = async (list: string[], sure = false) => {
    if (!card) return;
    if (unreadable && !sure) { setAskFs({ what: list.length === 1 ? list[0] : `${list.length} fonts`, run: () => void copyNeeded(list, true) }); return; }
    setAskFs(null);
    setBusy(true); setMessage(null);
    const done: string[] = []; const failed: string[] = [];
    try {
      for (const f of list) {
        const lib = inLibrary(f); if (!lib) continue;
        setCopyingNeeded(f);
        setProgress(null);
        try { await api().fontLibrary.copyToCard(lib.folder, card.root, false); done.push(f); } catch (err) { failed.push(`${f}: ${String(err).replace(/^Error: (Error invoking remote method '[^']+': Error: )?/, '')}`); }
      }
      setMessage(failed.length ? { tone: done.length ? 'amber' : 'red', text: `${done.length ? `Copied ${done.join(', ')}. ` : ''}Not copied: ${failed.join('; ')}` } : { tone: 'green', text: `Copied ${done.join(', ')} from the font library to the card.` });
      await scan();
    } finally { setCopyingNeeded(null); setBusy(false); setProgress(null); }
  };

  const issues = fonts.flatMap((f) => f.report.issues.map((i) => ({ font: f.name, ...i })));
  const sel = fonts.find((f) => f.name === selected) ?? null;

  return (
    <>
      <section className="panel" aria-label="SD card status">
        <div className="row" style={{ padding: '12px 18px', gap: 16 }}>
          <span style={{ color: card ? 'var(--holo)' : 'var(--mute)', display: 'flex', width: 26, height: 26 }}><Icon name="sd" /></span>
          <div className="col grow" style={{ gap: 2 }}>
            <h3>{card ? `${kind === 'empty' ? 'Empty card' : kind === 'other' ? 'Not a saber card' : 'ProffieOS card'} at ${card.root}${card.label ? ` (${card.label})` : ''}${choice.own && card.root === choice.card?.root ? `: ${board.saber?.name ?? 'the saber'}'s own card` : ''}` : scanning ? 'Looking for a card…' : choice.ask ? (choice.choices.some((c) => c.proffie) ? `${choice.choices.length} cards found. Which one is this saber's?` : 'No ProffieOS card found. Choose a card to use') : 'No ProffieOS card found'}</h3>
            <div className="dim small">
              {card ? `${mb(card.freeBytes)} free of ${mb(card.totalBytes)} · ${scanning ? 'reading the fonts…' : `${fonts.length} fonts · ${tracks.length} tracks`} · presets.ini ${card.hasPresetsIni ? 'present' : 'not present'} · ${card.fileSystem ? `formatted ${card.fileSystem}` : 'format not reported'} · voice pack ${voice?.ini || voice?.menuSounds ? `version ${voice.version ?? 1}${voice.menuSounds ? '' : ', menu sounds missing'}` : 'not found'}`
                : choice.ask ? 'Choose the card in the list. Nothing is copied until you do.'
                : cards.length ? `${cards.length} removable volume${cards.length > 1 ? 's' : ''} seen, none with fonts on it. Put the saber's card in a reader.`
                : live ? 'Put the card in a reader, or let the saber share it over USB: it stops playing while it does.' : 'Put the saber\'s SD card in a card reader, or plug the saber in and share its card over USB.'}
            </div>
          </div>
          {shared
            ? <button type="button" className="btn sm warn" disabled={busy || usbBusy} title={busy ? 'Wait for the copy to finish' : undefined} onClick={() => void ejectUsb()}><span className="b"><span className="i"><Icon name="eject" />{usb === 'ejecting' ? 'Giving it back…' : 'Give the card back'}</span></span></button>
            : <button type="button" className="btn sm pri" disabled={!live || busy || usbBusy || usb === 'unsupported'} title={live ? 'The saber releases its card and it appears as a drive. The blade goes off and sound stops until you give it back.' : 'Plug the saber in first'} onClick={() => void mountUsb()}><span className="b"><span className="i"><Icon name="usb" />{usb === 'mounting' ? 'Waiting for the drive…' : usb === 'ejecting' ? 'Giving it back…' : 'Share the saber\u2019s card'}</span></span></button>}
          {(choice.choices.length > 1 || choice.ask) && (
            <label className="field" style={{ minWidth: 200 }}><span className="label">Card</span>
              <span className="input sans"><span className="ellip">{card ? cardName(card) : 'Choose a card…'}</span><span className="caret"><Icon name="down" /></span><Select aria-label="Card" value={card?.root ?? ''} disabled={busy} onChange={(e) => { const root = e.target.value || null; pickRef.current = { ...pickRef.current, chosen: root }; setChosen(root); /* the choice shows at once; its fonts follow (owner, 2026-11-14) */ setCard(cards.find((c) => c.root === root) ?? null); setFonts([]); setTracks([]); setVoice(null); void scan(); }}>
                {!card && <option value="">Choose a card…</option>}
                {choice.choices.map((c) => <option key={c.root} value={c.root}>{cardName(c)}</option>)}
              </Select></span>
            </label>
          )}
          <button type="button" className="btn sm" disabled={working} onClick={() => void scan()}><span className="b"><span className="i"><Icon name="undo" />Look again</span></span></button>
        </div>
        {card && unreadable && !scanning && <div style={{ padding: '0 18px 12px' }}><div className="note red"><Icon name="warn" /><span><b style={{ fontWeight: 600 }}>A saber cannot read this card.</b> It is formatted {card.fileSystem}, and a saber reads only FAT32 cards. With fonts on it the saber will still find no fonts or presets. To use this card, back up anything you need from it, then format it as FAT32. Windows{'’'} own format only offers FAT32 for cards up to 32 GB; a larger card needs a FAT32 formatting tool. Formatting erases everything on the card.</span></div></div>}
        {askFs && card && <div style={{ padding: '0 18px 12px' }}><div className="note amber"><Icon name="warn" /><span>Copy {askFs.what} to {card.root} anyway? The card is {card.fileSystem}, so a saber will not see it until the card is formatted as FAT32.</span><span className="row" style={{ gap: 8, marginLeft: 'auto' }}><button type="button" className="btn sm warn" onClick={askFs.run}><span className="b"><span className="i">Copy anyway</span></span></button><button type="button" className="btn sm ghost" onClick={() => setAskFs(null)}><span className="b"><span className="i">Cancel</span></span></button></span></div></div>}
        {card && kind === 'empty' && !scanning && <div style={{ padding: '0 18px 12px' }}><div className="note"><Icon name="sd" /><span>This card is empty. Copy the fonts the presets use, or add a font, to start a saber card on it. A saber also needs its <span className="mono">common</span> folder and voice pack, which Hiltwright does not put on the card yet.</span></div></div>}
        {card && kind === 'other' && !scanning && <div style={{ padding: '0 18px 12px' }}><div className="note amber"><Icon name="warn" /><span>This drive has other files on it and no fonts or <span className="mono">presets.ini</span>, so it is not a saber card. Copying a font adds its folder beside those files and changes nothing else.</span></div></div>}
        {shared && <div style={{ padding: '0 18px 12px' }}><div className="note amber"><Icon name="warn" /><span>The saber has handed its card to this computer{usbRoot ? ` (${usbRoot})` : ''}. It cannot play until you give the card back; do that here rather than unplugging, so nothing is left half written. Copying is slow this way, a big font can take minutes.</span></div></div>}
        {!live && board.cardLostWhileShared && <div style={{ padding: '0 18px 12px' }}><div className="note amber"><Icon name="warn" /><span>The connection went while the saber was sharing its card. The saber may still be holding its card. Reconnect it to give the card back.</span></div></div>}
        {progress && busy && <div style={{ padding: '0 18px 12px' }}><div className="note"><Icon name="sd" /><span>Copying {progress.name}: {progress.done} of {progress.total} files</span></div></div>}
        {usbNote && <div style={{ padding: '0 18px 12px' }}><div className="note"><Icon name="info" /><span>{usbNote}</span></div></div>}
        {message && <div style={{ padding: '0 18px 16px' }}><div className={`note ${message.tone}`}><Icon name={message.tone === 'green' ? 'check' : message.tone === 'red' ? 'x' : 'warn'} /><span>{message.text}</span></div></div>}
      </section>

      <div className="work" style={{ gridTemplateColumns: 'minmax(0,1fr) 400px' }}>
        <section className="panel fill" aria-label="Fonts on the card">
          <div className="scroll">
          <table>
            <thead><tr><th>Font</th><th>Type</th><th>Files</th><th>Size</th><th>Status</th></tr></thead>
            <tbody>
              {fonts.map((f) => (
                <tr key={f.name} className={f.name === selected ? 'on' : ''} onClick={() => setSelected(f.name)} style={{ cursor: 'pointer' }}>
                  <td><span className="nowrap" style={{ fontWeight: 600 }}>{f.name}</span></td>
                  <td className="dim">{f.report.type}</td>
                  <td className="mono dim small">{f.report.files}</td>
                  <td className="mono dim small">{mb(f.report.bytes)}</td>
                  <td>{f.report.issues.length ? <span className={`chip ${f.report.issues.some((i) => i.kind === 'mixed' || i.kind === 'missing-hum') ? 'err' : 'warn'}`}><Icon name="warn" />{f.report.issues.length} issue{f.report.issues.length > 1 ? 's' : ''}</span> : <span className="chip ok"><Icon name="check" />Ready</span>}</td>
                </tr>
              ))}
              {fonts.length === 0 && <tr><td colSpan={5} className="hint">{card ? 'No font folders on this card.' : 'Nothing to show without a card.'}</td></tr>}
            </tbody>
          </table>
          {issues.length > 0 && (
            <div className="col" style={{ padding: '16px 18px', gap: 10, borderTop: '1px solid var(--line)' }}>
              {issues.slice(0, 8).map((i, k) => (
                <div key={k} className={`note ${i.kind === 'mixed' || i.kind === 'missing-hum' ? 'red' : 'amber'}`}><Icon name={i.kind === 'mixed' ? 'x' : 'warn'} /><span><b style={{ fontWeight: 600 }}>{i.font}:</b> {i.text}</span></div>
              ))}
              {issues.length > 8 && <span className="hint">{issues.length - 8} more…</span>}
            </div>
          )}
          </div>
        </section>

        <aside className="col" style={{ gap: 20, minHeight: 0, overflow: 'auto' }}>
          {needed.length > 0 && (
            <section className="panel" aria-label="Fonts the presets use">
              <div className="ph"><h2>Fonts the presets use</h2>{card && copyable.length > 1 && <button type="button" className="btn sm pri" disabled={working} onClick={() => void copyNeeded(copyable)}><span className="b"><span className="i"><Icon name="sd" />Copy all {copyable.length}</span></span></button>}</div>
              <div className="list" style={{ maxHeight: 260, overflow: 'auto' }}>
                {needed.map((f) => {
                  const lib = inLibrary(f);
                  return (
                    <div key={f} className="li" style={{ minHeight: 38 }}>
                      <span className="col grow" style={{ gap: 0 }}><span className="small ellip" style={{ fontWeight: 600 }}>{f}</span>{lib && lib.meta.name !== lib.folder && <span className="hint ellip" style={{ fontSize: 11.5 }}>{lib.meta.name}{lib.meta.maker ? `, ${lib.meta.maker}` : ''}</span>}</span>
                      {!card ? (lib ? <span className="chip ok"><Icon name="check" />In library</span> : <span className="chip" title="Put the card in to see whether it is there">Card not checked</span>)
                        : onCard(f) ? <span className="chip ok"><Icon name="check" />On the card</span>
                        : lib ? <button type="button" className="btn sm" disabled={working} onClick={() => void copyNeeded([f])}><span className="b"><span className="i">{copyingNeeded === f ? 'Copying…' : 'Copy from library'}</span></span></button>
                        : <span className="chip err" title="Not on the card and not in the font library"><Icon name="x" />Missing</span>}
                    </div>
                  );
                })}
              </div>
              {card && needed.some((f) => !inLibrary(f) && !onCard(f)) && <div className="pb hint" style={{ paddingTop: 10 }}>A font marked missing has to reach the card before the saber can play that preset. <button type="button" className="holo" onClick={() => go('library')}>Add it to the Font library</button>, then copy it from here.</div>}
            </section>
          )}
          <section className="panel" aria-label="Add a font">
            <div className="ph"><h2>Add a font</h2>{picked && (picked.report.issues.length ? <span className="chip warn"><Icon name="warn" />{picked.report.issues.length} issue{picked.report.issues.length > 1 ? 's' : ''}</span> : <span className="chip ok"><Icon name="check" />Looks good</span>)}</div>
            <div className="pb col" style={{ gap: 12 }}>
              {picked ? (
                <>
                  <div className="col" style={{ gap: 2 }}><b style={{ fontWeight: 600 }}>{picked.name}</b><span className="hint mono" style={{ fontSize: 11 }}>{picked.path}</span></div>
                  <div className="row wrap" style={{ gap: 8 }}><span className="chip">{picked.report.type}</span><span className="chip">{picked.report.files} files</span><span className="chip">{mb(picked.report.bytes)}</span></div>
                  {picked.report.issues.map((i, k) => <div key={k} className={`note ${i.kind === 'mixed' || i.kind === 'missing-hum' ? 'red' : 'amber'}`}><Icon name="warn" /><span>{i.text}</span></div>)}
                  <div className="row" style={{ gap: 8 }}>
                    <button type="button" className="btn sm pri" disabled={working || !card} onClick={() => void copy(false)}><span className="b"><span className="i"><Icon name="check" />Copy to card</span></span></button>
                    {fonts.some((f) => f.name.toLowerCase() === picked.name.toLowerCase()) && <button type="button" className="btn sm warn" disabled={working || !card} onClick={() => void copy(true)}><span className="b"><span className="i">{confirmReplace ? `Really replace ${picked.name}?` : 'Replace on card'}</span></span></button>}
                    <button type="button" className="btn sm ghost" onClick={() => { setPicked(null); setConfirmReplace(false); }}><span className="b"><span className="i">Cancel</span></span></button>
                  </div>
                </>
              ) : (
                <>
                  <p className="hint">Choose a font folder on this computer. Hiltwright checks the files before anything is copied. Your originals are never changed. Fonts you keep in the <button type="button" className="holo" onClick={() => go('library')}>Font library</button> can be copied from there.</p>
                  <button type="button" className="btn" disabled={working || !card} onClick={() => void pick()}><span className="b"><span className="i"><Icon name="import" />Choose folder</span></span></button>
                </>
              )}
            </div>
          </section>

          {FEATURES.xenopixelImport && <XenoImport card={card} board={board} onChanged={() => void scan()} />}

          <section className="panel" aria-label="Font detail" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="ph"><h2>{sel ? sel.name : 'Tracks'}</h2><span className="hint">{sel ? `${sel.report.type} · ${sel.report.files} files` : `${tracks.length} on the card`}</span></div>
            <div className="list" style={{ overflow: 'auto' }}>
              {sel
                ? Object.entries(sel.report.effects).sort().map(([effect, v]) => (
                    <div key={effect} className="li" style={{ minHeight: 34 }}><span className="grow small">{effect}</span><span className="mono mute" style={{ fontSize: 11.5 }}>{v.poly ? `${v.poly} poly` : ''}{v.poly && v.mono ? ' · ' : ''}{v.mono ? `${v.mono} mono` : ''}</span></div>
                  ))
                : tracks.map((t) => <div key={t.name} className="li" style={{ minHeight: 34 }}><span className="grow mono small">{t.name}</span><span className="mono mute" style={{ fontSize: 11.5 }}>{mb(t.size)}</span></div>)}
              {!sel && tracks.length === 0 && <div className="li hint" style={{ minHeight: 34 }}>No tracks folder.</div>}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
