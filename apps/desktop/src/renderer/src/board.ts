// Board session for the renderer: connect, identify, remember the saber, read and edit presets with verification.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BoardClient, deleteCurrentPreset, diffPreset, duplicateCurrentPreset, editCurrentPreset, formatBuiltin, isEmptyPatch, isPresetBlockEnd, listPresets, parseBuiltin,
  moveCurrentPreset, parseBattery, parseInteger, parseList, parsePresetBlocks, parseScanId, parseVersion, presetCommands, selectPreset, wasRejected,
  type ListResult, type PresetPatch, type PresetRecord, type Response, type VersionInfo,
  type SaberConfigModel,
} from '@hiltwright/core';
import type { SaberIdentity, SaberPatch, SaberRecord, SnapshotMeta } from '../../shared/api';
import { PROFFIE_FILTER, WebSerialTransport, describePort, grantedProffiePorts } from './serial';
import { setConnectionSnapshot } from './support';
import { connectGate, runOperation, serialQueue, type SaveState } from './boardOps';

export interface BoardInfo {
  version: VersionInfo | null;
  battery: number | null;
  volume: number | null;
  currentPreset: number | null;
  presets: PresetRecord[];
  fonts: string[];
  tracks: string[];
  pixelBlades: number[];
  bladeConfig: number | null;
  rejected: string[];
  timings: Record<string, number>;
}

export interface ConsoleLine { kind: 'in' | 'out' | 'event'; text: string; at: number }
export type Status = 'idle' | 'no-port' | 'connecting' | 'reading' | 'connected' | 'error';
export type { SaveState } from './boardOps';

/** A saber that answered nothing at all while it was being read (connection-robustness). */
class NotAnswering extends Error {}
const NOT_ANSWERING = 'The saber is not answering. Unplug it and plug it back in.';
const STOPPED_ANSWERING = 'The saber stopped answering. Unplug it and plug it back in.';

const api = () => window.hiltwright;

export function useBoard() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [portName, setPortName] = useState<string | null>(null);
  const [info, setInfo] = useState<BoardInfo | null>(null);
  const [saber, setSaber] = useState<SaberRecord | null>(null);
  const [library, setLibrary] = useState<SaberRecord[]>([]);
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [save, setSave] = useState<SaveState>({ kind: 'idle' });
  const [busy, setBusyState] = useState(false);
  const busyRef = useRef(false);
  const setBusy = (v: boolean) => { busyRef.current = v; setBusyState(v); };
  const client = useRef<BoardClient | null>(null);
  const transport = useRef<WebSerialTransport | null>(null);
  // One connection attempt at a time (boardOps.ts): a second one while connecting, or while a port is open, is skipped.
  const [gate] = useState(() => connectGate(() => !!transport.current));
  const infoRef = useRef<BoardInfo | null>(null);
  // Everything that talks to the board takes its turn here: preset edits, the console, page checks and polls.
  // Writes are serialised, never dropped: a click that lands while the board is busy waits its turn.
  const [enqueue] = useState(serialQueue);
  // While the saber is first read, silence ends the reading (NotAnswering) instead of letting the saber go.
  const identifying = useRef(false);
  const silentWhileIdentifying = useRef(false);
  // The saber just installed and the config its new firmware reports: an identify matches it even without a USB serial
  // (two boards plugged in). Forgotten once it has matched, or after 5 minutes.
  const expected = useRef<{ id: string; configName: string; until: number } | null>(null);
  const saberRef = useRef<SaberRecord | null>(null);
  // The one board to reach next, by USB serial: the saber an install or restore is bringing back. Main lets only that
  // board through meanwhile, so the port opened is it, and the saber read is known by that serial.
  const wanted = useRef<string | null>(null);
  infoRef.current = info;
  saberRef.current = saber;

  const log = useCallback((kind: ConsoleLine['kind'], text: string) => {
    setLines((ls) => [...ls, { kind, text, at: Date.now() }].slice(-400));
  }, []);

  // Every connection state and its error go into the run log, and into what a diagnostics file reports.
  useEffect(() => {
    console.log(`[board] status ${status}${error ? `: ${error}` : ''}`);
  }, [status, error]);
  useEffect(() => {
    const v = info?.version ?? null;
    setConnectionSnapshot({
      status, error, port: portName,
      board: info ? {
        version: v?.version ?? null, config: v?.config ?? null, prop: v?.prop ?? null, buttons: v?.buttons ?? null,
        battery: info.battery, volume: info.volume, presets: info.presets.length, fonts: info.fonts.length, tracks: info.tracks.length, blades: info.pixelBlades,
      } : null,
    });
  }, [status, error, portName, info]);

  // The connected saber's own record is refreshed too: main may have changed it (a saved style reaching its plan), and
  // every page works from `saber` while it is plugged in.
  const refreshLibrary = useCallback(async () => {
    try {
      const list = await api().library.list();
      setLibrary(list);
      const fresh = saberRef.current && list.find((s) => s.id === saberRef.current!.id);
      if (fresh) { saberRef.current = fresh; setSaber(fresh); }
    } catch (err) { console.log(`[library] list failed: ${String(err)}`); }
  }, []);

  const refreshSnapshots = useCallback(async (saberId: string) => {
    try { setSnapshots(await api().snapshots.list(saberId)); } catch (err) { console.log(`[snapshots] list failed: ${String(err)}`); }
  }, []);

  const disconnect = useCallback(async (reason?: string) => {
    client.current?.close();
    client.current = null;
    // Let go of the transport before waiting on it, so anything still running sees at once that it is gone.
    const t = transport.current;
    transport.current = null;
    await t?.close();
    setStatus(reason ? 'error' : 'idle');
    // A plain disconnect or unplug leaves no stale reason behind.
    setError(reason ?? null);
    setInfo(null);
    setPortName(null);
  }, []);

  /** The port went away (unplugged, or the read ended): back to "Not connected", not an error. */
  const lost = useCallback((reason: string) => {
    console.log(`[board] port lost: ${reason}`);
    void disconnect();
  }, [disconnect]);

  /**
   * Put the board into its DFU bootloader and let go of the port so dfu-util can have the device.
   * Tries the firmware's own RebootDFU command first, then the Arduino 1200-baud touch. Either way the port
   * is closed afterwards; the caller reconnects when the new firmware is up.
   */
  const rebootToBootloader = useCallback(async (): Promise<boolean> => {
    const t = transport.current;
    if (!t) return false;
    const port = t.port;
    try { log('in', 'RebootDFU'); await client.current?.send('RebootDFU', { idleMs: 400, expectSilence: true }); } catch { /* the port may vanish mid-reply; that is success */ }
    client.current?.close();
    client.current = null;
    transport.current = null;
    await t.close();
    setStatus('idle');
    setPortName(null);
    // 1200-baud touch as a fallback for firmware that ignored RebootDFU.
    await new Promise((r) => setTimeout(r, 800));
    try {
      await port.open({ baudRate: 1200 });
      await port.setSignals({ dataTerminalReady: false });
      await port.close();
      console.log('[board] 1200-baud touch sent');
    } catch (err) {
      console.log(`[board] 1200-baud touch not needed, the port is already gone (RebootDFU worked): ${String(err)}`);
    }
    return true;
  }, [log]);

  /**
   * Restart the saber's firmware (ProffieOS `reset`) and let go of the port: it comes back reading its presets files
   * afresh, as after an install. False when there is no saber to send it to. The caller waits and reconnects.
   */
  const restartSaber = useCallback(async (): Promise<boolean> => {
    const t = transport.current;
    if (!t) return false;
    try { log('in', 'reset'); await client.current?.send('reset', { idleMs: 400, expectSilence: true }); } catch { /* the port vanishes as it restarts; that is success */ }
    client.current?.close();
    client.current = null;
    transport.current = null;
    await t.close();
    setStatus('idle');
    setPortName(null);
    return true;
  }, [log]);
  /** The presets the saber reported at its last reading (read after a connect, before React has re-rendered). */
  const currentPresets = useCallback(() => infoRef.current?.presets ?? null, []);

  /** Send now, outside the queue: only while the saber is first read, before anything else can be queued. */
  const sendNow = useCallback(async (command: string, opts?: Parameters<BoardClient['send']>[1]): Promise<Response> => {
    if (!client.current) throw new Error('Not connected');
    log('in', command);
    const r = await client.current.send(command, opts);
    for (const l of r.lines) log('out', l);
    return r;
  }, [log]);
  /** Send a command in its turn, after any edit already under way (the console, Try it, page checks). */
  const send = useCallback((command: string, opts?: Parameters<BoardClient['send']>[1]): Promise<Response> => enqueue(() => sendNow(command, opts)), [enqueue, sendNow]);

  /** Read everything the board can tell us, then match or create the saber in the library. */
  const identify = useCallback(async () => {
    setStatus('reading');
    const timings: Record<string, number> = {};
    const rejected: string[] = [];
    const time = async (cmd: string, opts?: Parameters<BoardClient['send']>[1]) => {
      const r = await sendNow(cmd, opts);
      if (silentWhileIdentifying.current) throw new NotAnswering(`no answer to ${cmd}`);
      timings[cmd] = r.ms;
      if (wasRejected(r.lines)) rejected.push(cmd);
      return r;
    };
    // OS 8 boards frame answers per command (`tag| command`); once detected every later command uses it.
    const t0 = Date.now();
    const tagged = await client.current!.detectTagging();
    timings.tagging = Date.now() - t0;
    if (silentWhileIdentifying.current) throw new NotAnswering('no answer to the tag probe');
    log('event', tagged ? 'Tagged responses: yes (OS 8 framing)' : 'Tagged responses: no (untagged, idle-terminated)');
    console.log(`[board] tagged=${tagged} probe=${timings.tagging} ms`);
    const v = await time('version', { until: (l) => /^installed:/.test(l) });
    const b = await time('battery', { until: (l) => /^Battery voltage:/.test(l) });
    const vol = await time('get_volume', { until: (l) => /^-?\d+$/.test(l.trim()) });
    const cur = await time(presetCommands.getCurrent(), { until: (l) => /^-?\d+$/.test(l.trim()) });
    const lp = await time(presetCommands.list(), { idleMs: 700, timeoutMs: 15000 });
    const fonts = await time('list_fonts', { idleMs: 700, timeoutMs: 15000 });
    const tracks = await time('list_tracks', { idleMs: 700, timeoutMs: 15000 });
    const scan = await time('scanid', { idleMs: 1200, timeoutMs: 15000 });
    const scanInfo = parseScanId([...scan.lines, ...scan.events]);
    const next: BoardInfo = {
      version: parseVersion(v.lines),
      battery: parseBattery(b.lines),
      volume: parseInteger(vol.lines),
      currentPreset: parseInteger(cur.lines),
      presets: parsePresetBlocks(lp.lines).presets,
      fonts: parseList(fonts.lines),
      tracks: parseList(tracks.lines),
      pixelBlades: scanInfo.pixelBlades,
      bladeConfig: scanInfo.bladeConfig,
      rejected,
      timings,
    };
    infoRef.current = next; setInfo(next);
    setStatus('connected');
    // A new connection starts with a clean save status: a failure from before an unplug no longer describes this saber.
    setSave({ kind: 'idle' });
    console.log(`[board] version=${next.version?.version ?? '?'} config=${next.version?.config ?? '?'} prop=${next.version?.prop ?? '?'} buttons=${next.version?.buttons ?? '?'} battery=${next.battery ?? '?'} volume=${next.volume ?? '?'} current=${next.currentPreset ?? '?'} presets=${next.presets.length} fonts=${next.fonts.length} tracks=${next.tracks.length} blades=${JSON.stringify(next.pixelBlades)} timings=${JSON.stringify(timings)}`);

    // Remember the saber.
    let usbSerial: string | null = null;
    try { const serials = await api().usb.proffieSerials(); usbSerial = wanted.current && serials.includes(wanted.current) ? wanted.current : serials.length === 1 ? serials[0] : null; } catch { /* not available on this platform */ }
    const identity: SaberIdentity = {
      usbSerial, configName: next.version?.config ?? null, version: next.version?.version ?? null, prop: next.version?.prop ?? null,
      buttons: next.version?.buttons ?? null, installed: next.version?.installed ?? null, pixelBlades: next.pixelBlades, bladeConfig: next.bladeConfig,
    };
    try {
      if (expected.current && expected.current.until <= Date.now()) expected.current = null;
      const ex = expected.current ? { id: expected.current.id, configName: expected.current.configName } : null;
      const rec = await api().library.upsert({ identity, presets: next.presets, fonts: next.fonts, tracks: next.tracks, expect: ex });
      // Kept until the saber installed comes back: with two boards plugged in, the other one may reconnect first.
      if (ex && rec.id === ex.id) expected.current = null;
      if (ex) console.log(`[library] expected ${ex.id} (${ex.configName}) after the install; matched ${rec.id}${rec.id === ex.id ? '' : ' instead, still expecting it'}`);
      saberRef.current = rec; setSaber(rec);
      console.log(`[library] saber ${rec.id} "${rec.name}" serial=${rec.identity.usbSerial ?? 'none'} firstSeen=${rec.firstSeen}`);
      // The saber wanted has been reached and read: every board may be reached again.
      if (wanted.current) { wanted.current = null; void api().usb.wantSerial(null); }
      await api().snapshots.save(rec.id, 'Connected', next.presets);
      await refreshSnapshots(rec.id);
      await refreshLibrary();
    } catch (err) {
      console.log(`[library] upsert failed: ${String(err)}`);
    }
    return next;
  }, [sendNow, refreshLibrary, refreshSnapshots]);

  const connectTo = useCallback(async (port: SerialPort) => {
    setError(null);
    setStatus('connecting');
    const t = new WebSerialTransport(port, lost);
    try {
      await t.open();
    } catch (err) {
      console.log(`[board] open failed: ${String(err)}`);
      setStatus('error');
      setError(`Could not open the port: ${String(err)}`);
      return;
    }
    transport.current = t;
    // The run log gets the whole conversation, including the probe, polls and helper commands the console leaves out.
    client.current = new BoardClient(t, {
      onEvent: (l) => log('event', l), onTraffic: (d, text) => console.log(`[board] ${d === 'sent' ? '>' : '<'} ${text}`),
      // Nothing at all back, nudges included: while being read the reading stops; once connected, the saber is let go.
      onSilent: (r) => {
        console.log(`[board] silent: ${r.command} (${r.ms} ms, nothing heard)`);
        if (identifying.current) { silentWhileIdentifying.current = true; return; }
        void disconnect(STOPPED_ANSWERING);
      },
    });
    setPortName(describePort(port));
    console.log('[board] port opened', describePort(port));
    identifying.current = true;
    silentWhileIdentifying.current = false;
    try {
      await identify();
    } catch (err) {
      console.log(`[board] reading stopped: ${String(err)}`);
      // Unplugged while being read: the port is already gone and the state already says "Not connected".
      if (transport.current !== t) return;
      await disconnect(err instanceof NotAnswering ? NOT_ANSWERING : `Board did not answer: ${String(err)}`);
    } finally {
      identifying.current = false;
    }
  }, [disconnect, identify, log, lost]);

  const connectOnce = useCallback(async (interactive: boolean) => {
    let ports = await grantedProffiePorts();
    console.log(`[board] granted ports: ${ports.length} (all: ${(await navigator.serial.getPorts()).map(describePort).join(', ') || 'none'})`);
    if (!ports.length) {
      try { ports = [await navigator.serial.requestPort({ filters: [PROFFIE_FILTER] })]; } catch (err) {
        console.log(`[board] requestPort ${interactive ? '(click)' : '(auto)'} failed: ${String(err)}`);
        ports = [];
      }
    }
    if (!ports.length) { setStatus('no-port'); console.log('[board] no Proffieboard port granted'); return; }
    await connectTo(ports[0]);
  }, [connectTo]);

  /**
   * Reach only the board with this USB serial next (null: any board again). Returns whether main found that board.
   * `hold`: keep waiting for it even when it is not there yet (it is still in its bootloader). Without it, a board that
   * cannot be found is given up on: reaching any board beats reaching none, and the page then says which one it was.
   */
  const reachNext = useCallback(async (serial: string | null, hold = true): Promise<boolean> => {
    wanted.current = serial;
    const found = (await api().usb.wantSerial(serial)) > 0;
    if (serial && !found && !hold) { wanted.current = null; await api().usb.wantSerial(null); }
    return found;
  }, []);

  /** Connect. `serial`: the saber an install is bringing back; only that board is opened, when main can tell which it is. */
  const connect = useCallback(async (interactive = false, opts: { serial?: string | null } = {}) => {
    if (!('serial' in navigator)) { setStatus('error'); setError('Web Serial is not available in this window.'); return; }
    if (!(await api().app.boardAccess())) { setStatus('error'); setError('Board access is off for this run (HILTWRIGHT_NO_BOARD).'); return; }
    // The owner's own Connect reaches whichever board is there.
    if (interactive && wanted.current) await reachNext(null);
    if (opts.serial) {
      // Already reached (the Web Serial connect event came first, through main's filter): nothing more to open.
      if (client.current) { if (wanted.current) await reachNext(null); return; }
      await reachNext(opts.serial, false);
    }
    // After a reflash both the install flow and the Web Serial 'connect' event try to open the port; one is enough.
    if (!(await gate(() => connectOnce(interactive)))) console.log('[board] connect skipped: already connecting');
  }, [connectOnce, gate, reachNext]);
  /** The saber on the other end right now (read after a connect, before React has re-rendered). */
  const currentSaber = useCallback(() => saberRef.current, []);

  useEffect(() => {
    void refreshLibrary();
    (window as unknown as { hiltwrightAutoConnect?: () => Promise<string> }).hiltwrightAutoConnect = async () => {
      if (client.current) return 'already connected';
      await connect(true);
      return 'attempted';
    };
    const onConnect = () => { if (!client.current) void connect(false); };
    // The system says a port went away: if it is ours, the saber was unplugged.
    const onDisconnect = (e: Event) => { const t = transport.current; if (t && e.target === t.port) t.lost('the saber was unplugged'); };
    navigator.serial?.addEventListener('connect', onConnect);
    navigator.serial?.addEventListener('disconnect', onDisconnect);
    // Development aid: hiltwrightMuteBoard() makes the app hear nothing from the saber, to check the silent-saber handling.
    if (import.meta.env.DEV) (window as unknown as { hiltwrightMuteBoard?: (on?: boolean) => string }).hiltwrightMuteBoard = (on = true) => { WebSerialTransport.muted = on; console.log(`[board] muted: ${on}`); return on ? 'muted' : 'unmuted'; };
    return () => { navigator.serial?.removeEventListener('connect', onConnect); navigator.serial?.removeEventListener('disconnect', onDisconnect); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Presets ----------

  // The ref is updated in the same breath as the state: queued writes that follow each other (duplicate, then edit)
  // read it between renders, and editPreset must act on the preset the board has just made current.
  const applyList = useCallback((r: ListResult) => {
    if (infoRef.current) infoRef.current = { ...infoRef.current, presets: r.presets, currentPreset: r.current };
    setInfo((i) => (i ? { ...i, presets: r.presets, currentPreset: r.current } : i));
  }, []);

  const replacePreset = useCallback((index: number, preset: PresetRecord) => {
    if (infoRef.current) infoRef.current = { ...infoRef.current, presets: infoRef.current.presets.map((p, k) => (k === index ? preset : p)) };
    setInfo((i) => (i ? { ...i, presets: i.presets.map((p, k) => (k === index ? preset : p)) } : i));
  }, []);

  const snapshot = useCallback(async (label: string) => {
    const i = infoRef.current;
    const s = saberRef.current;
    if (!i || !s) return;
    try { await api().snapshots.save(s.id, label, i.presets); await refreshSnapshots(s.id); } catch (err) { console.log(`[snapshots] save failed: ${String(err)}`); }
  }, [refreshSnapshots]);

  /** Run a board operation in its turn, with busy state, snapshot and save-state bookkeeping (boardOps.ts). */
  const run = useCallback((label: string, op: (c: BoardClient) => Promise<{ ok: boolean; error?: string; ms?: number; note?: string }>, withSnapshot = true): Promise<void> => {
    return enqueue(() => runOperation({ client: () => client.current, setBusy, setSave, log, snapshot }, label, op, withSnapshot));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choosePreset = useCallback((index: number) => run(`Select preset ${index + 1}`, async (c) => {
    const r = await selectPreset(c, index);
    if (infoRef.current) infoRef.current = { ...infoRef.current, currentPreset: r.index ?? index };
    setInfo((i) => (i ? { ...i, currentPreset: r.index ?? index } : i));
    if (r.preset && r.index != null) replacePreset(r.index, r.preset);
    return { ok: r.preset !== null, error: r.preset ? undefined : 'No read-back after selecting.' };
  }, false), [run, replacePreset]);

  // A style write made while the blade was on is applied (preset re-selected) once the blade is off, so the owner
  // never has to switch presets to see a colour. Polled every 3 s while something is pending.
  const [pendingApply, setPendingApply] = useState<number | null>(null);
  useEffect(() => {
    if (pendingApply == null || status !== 'connected') return;
    const t = setInterval(() => {
      if (!client.current || busyRef.current) return;
      void send('get_on', { idleMs: 400, timeoutMs: 6000 }).then((r) => {
        if (!r.lines.some((l) => l.trim() === '0')) return;
        const index = pendingApply;
        setPendingApply(null);
        void run('Apply colours', async (cl) => { const s = await selectPreset(cl, index); return { ok: s.preset !== null, error: s.preset ? undefined : 'No read-back after re-selecting.' }; }, false);
      });
    }, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingApply, status]);

  const editPreset = useCallback((patch: PresetPatch, label: string) => {
    const i = infoRef.current;
    if (!i || i.currentPreset == null || isEmptyPatch(patch)) return Promise.resolve();
    const index = i.currentPreset;
    return run(label, async (c) => {
      // Style writes are re-applied by re-selecting the preset, otherwise the blade keeps the old colours until
      // the next preset change.
      const r = await editCurrentPreset(c, patch, undefined, patch.styles ? { applyIndex: index } : {});
      if (r.preset) replacePreset(index, r.preset);
      if (r.applied === false) setPendingApply(index);
      return { ...r, note: r.applied === false ? 'applies when you retract the blade' : undefined };
    });
  }, [run, replacePreset]);

  const movePreset = useCallback((to: number) => run(`Move to position ${to + 1}`, async (c) => { applyList(await moveCurrentPreset(c, to)); return { ok: true }; }), [run, applyList]);
  const duplicatePreset = useCallback(() => {
    const i = infoRef.current;
    const pos = (i?.currentPreset ?? 0) + 1;
    return run('Duplicate preset', async (c) => { applyList(await duplicateCurrentPreset(c, pos)); return { ok: true }; });
  }, [run, applyList]);
  const deletePreset = useCallback(() => run('Delete preset', async (c) => { applyList(await deleteCurrentPreset(c)); return { ok: true }; }), [run, applyList]);

  /** Put the current preset back the way a snapshot had it, with the fewest commands. */
  const restoreSnapshot = useCallback(async (meta: SnapshotMeta) => {
    const i = infoRef.current;
    const s = saberRef.current;
    if (!i || !s || i.currentPreset == null) return;
    const index = i.currentPreset;
    let saved: PresetRecord[];
    try { saved = await api().snapshots.read(s.id, meta.file); } catch (err) { setSave({ kind: 'failed', what: 'Restore', error: String(err) }); return; }
    const from = i.presets[index];
    const to = saved[index];
    if (!from || !to) { setSave({ kind: 'failed', what: 'Restore', error: 'That snapshot has no preset at this position.' }); return; }
    const patch = diffPreset(from, to);
    if (isEmptyPatch(patch)) { setSave({ kind: 'saved', what: 'Nothing to restore', ms: 0, at: Date.now() }); return; }
    await editPreset(patch, `Restore "${meta.label}"`);
  }, [editPreset]);

  /** The current preset as of this instant (state in closures can be a render behind after a queued write). */
  /** Write blade styles to preset `index`, selecting it first when it is not the current one. Resolves to whether the saber confirmed. */
  const setPresetStyles = useCallback((index: number, styles: Record<number, string>, label: string): Promise<boolean> => {
    let confirmed = false;
    return run(label, async (c) => {
      if (infoRef.current?.currentPreset !== index) {
        const s = await selectPreset(c, index);
        if (!s.preset) return { ok: false, error: 'The saber did not switch to that preset.' };
        if (infoRef.current) infoRef.current = { ...infoRef.current, currentPreset: s.index ?? index };
        setInfo((i) => (i ? { ...i, currentPreset: s.index ?? index } : i));
      }
      const r = await editCurrentPreset(c, { styles }, undefined, { applyIndex: index });
      if (r.preset) replacePreset(index, r.preset);
      if (r.applied === false) setPendingApply(index);
      confirmed = r.ok;
      return { ...r, note: r.applied === false ? 'applies when you retract the blade' : undefined };
    }).then(() => confirmed);
  }, [run, replacePreset]);

  const currentPresetNow = useCallback((): PresetRecord | null => {
    const i = infoRef.current;
    return i && i.currentPreset != null ? i.presets[i.currentPreset] ?? null : null;
  }, []);

  /** Store the build model and/or firmware manifest on the current saber's record. */
  /** A saber set up ahead of its hilt. */
  const planSaber = useCallback(async (name: string, model: SaberConfigModel): Promise<SaberRecord> => {
    const rec = await api().library.plan(name, model);
    await refreshLibrary();
    return rec;
  }, [refreshLibrary]);
  /** The connected saber takes over a plan. */
  const adoptPlan = useCallback(async (plannedId: string): Promise<SaberRecord | null> => {
    const s = saberRef.current;
    if (!s) return null;
    const rec = await api().library.adopt(plannedId, s.id);
    saberRef.current = rec; setSaber(rec);
    await refreshLibrary();
    return rec;
  }, [refreshLibrary]);
  /** Say which saber is being installed and the config its new firmware will report (see `expected`). */
  const expectAfterInstall = useCallback((id: string, configName: string) => {
    expected.current = { id, configName, until: Date.now() + 5 * 60_000 };
  }, []);
  const updateSaber = useCallback(async (patch: SaberPatch, id?: string) => {
    const target = id ?? saberRef.current?.id;
    if (!target) return;
    const rec = await api().library.update(target, patch);
    if (saberRef.current?.id === target) setSaber(rec);
    await refreshLibrary();
  }, [refreshLibrary]);

  const renameSaber = useCallback(async (name: string) => {
    const s = saberRef.current;
    if (!s) return;
    const rec = await api().library.rename(s.id, name);
    setSaber(rec);
    await refreshLibrary();
  }, [refreshLibrary]);

  // Dev-only end-to-end check (HILTWRIGHT_E2E=1): edit a preset's font on the real board, verify, restore.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { hiltwrightE2E?: (mode?: string) => Promise<string> }).hiltwrightE2E = async (mode?: string) => {
      // A board running behind can take half a minute to identify; wait for it.
      for (let n = 0; n < 180 && !(client.current && infoRef.current); n++) await new Promise((r) => setTimeout(r, 500));
      const c = client.current;
      const i = infoRef.current;
      if (!c || !i) return 'not connected';
      const steps: string[] = [];
      const stressCount = /^stress(?:-on)?-(\d+)$/.exec(mode ?? '')?.[1];
      if (stressCount) mode = mode!.startsWith('stress-on') ? 'stress-on' : 'stress';
      if (mode === 'stress' || mode === 'stress-on') {
        // Twelve colour writes in a row on the Ember preset, each re-applied, logging what the board says when one fails.
        // "stress-on" does it with the blade ignited, which is how an owner actually tries colours.
        const sel0 = await selectPreset(c, 2);
        const style0 = sel0.preset?.styles[0] ?? 'builtin 2 1';
        const b0 = parseBuiltin(style0)!;
        if (mode === 'stress-on') { await c.send('on', { idleMs: 1500, timeoutMs: 8000 }); steps.push('blade on'); }
        for (let n = 0; n < (stressCount ? Number(stressCount) : 12); n++) {
          const hue = (n * 30) % 360;
          const rgb = [Math.round(65535 * (0.5 + 0.5 * Math.cos((hue * Math.PI) / 180))), Math.round(65535 * (0.5 + 0.5 * Math.cos(((hue - 120) * Math.PI) / 180))), Math.round(65535 * (0.5 + 0.5 * Math.cos(((hue - 240) * Math.PI) / 180)))].join(',');
          const style = formatBuiltin({ preset: b0.preset, blade: b0.blade, args: rgb });
          const t0 = Date.now();
          const e = await editCurrentPreset(c, { styles: { 1: style } }, undefined, { applyIndex: 2 });
          steps.push(`#${n + 1} ${rgb} → ${e.ok ? 'ok' : 'FAIL'} readbacks=${e.readbacks} ms=${Date.now() - t0}${e.ok ? '' : ` err=${e.error} got=${e.preset?.styles[0] ?? 'null'}`}`);
          console.log(`[stress] ${steps[steps.length - 1]}`);
        }
        await editCurrentPreset(c, { styles: { 1: style0 } }, undefined, { applyIndex: 2 });
        if (mode === 'stress-on') await c.send('off', { idleMs: 1500, timeoutMs: 8000 });
        return steps.join(' | ');
      }
      const original = i.currentPreset ?? 0;
      const sel = await selectPreset(c, 2);
      steps.push(`select 2 → index ${sel.index}, font ${sel.preset?.font}`);
      const before = sel.preset?.font ?? '';
      const e1 = await editCurrentPreset(c, { font: 'TeensySF;common' });
      steps.push(`set_font TeensySF;common → ok=${e1.ok} readbacks=${e1.readbacks} ms=${e1.ms} font=${e1.preset?.font}`);
      const e2 = await editCurrentPreset(c, { font: before });
      steps.push(`restore ${before} → ok=${e2.ok} readbacks=${e2.readbacks} ms=${e2.ms} font=${e2.preset?.font}`);
      // Live colour argument on blade 1: base colour red, then back to the compiled default.
      const style0 = sel.preset?.styles[0] ?? '';
      const b0 = parseBuiltin(style0);
      if (b0) {
        const red = formatBuiltin({ preset: b0.preset, blade: b0.blade, args: '65535,0,0' });
        const e3 = await editCurrentPreset(c, { styles: { 1: red } }, undefined, { applyIndex: 2 });
        steps.push(`set_style1 "${red}" → ok=${e3.ok} readback style1=${e3.preset?.styles[0]} (re-applied with set_preset 2)`);
        const e4 = await editCurrentPreset(c, { styles: { 1: style0 } }, undefined, { applyIndex: 2 });
        steps.push(`restore style1 "${style0}" → ok=${e4.ok} readback style1=${e4.preset?.styles[0]}`);
      } else steps.push(`blade 1 style "${style0}" is not a builtin slot; colour test skipped`);
      const back = await selectPreset(c, original);
      steps.push(`select ${original} → index ${back.index}`);
      const all = await listPresets(c);
      steps.push(`list_presets → ${all.length} presets, preset 3 font ${all[2]?.font}`);
      setInfo((cur) => (cur ? { ...cur, presets: all, currentPreset: back.index ?? original } : cur));
      const lib = await api().library.list();
      const snaps = saberRef.current ? await api().snapshots.list(saberRef.current.id) : [];
      steps.push(`library ${lib.length} saber(s), ${snaps.length} snapshot(s) on disk`);
      return steps.join(' | ');
    };
  }, []);

  return { status, error, portName, info, saber, library, lines, snapshots, save, busy, connect, disconnect, send, identify, choosePreset, editPreset, setPresetStyles, movePreset, duplicatePreset, deletePreset, restoreSnapshot, renameSaber, updateSaber, expectAfterInstall, reachNext, currentSaber, restartSaber, currentPresets, planSaber, adoptPlan, currentPresetNow, refreshLibrary, isPresetBlockEnd, rebootToBootloader };
}

export type Board = ReturnType<typeof useBoard>;
