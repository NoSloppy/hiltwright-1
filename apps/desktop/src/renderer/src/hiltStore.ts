// The room's hilts, kept by the app in its data folder (main/hilts.ts) so every build of the app sees the same ones.
//
// Earlier versions kept them in this page's own database and the scene settings in localStorage, which belong to
// the page's origin: development and installed builds each had their own. The first time a page here asks for the
// hilts, whatever its origin kept is handed to the app to bring over (never replacing anything), and the old storage
// is left as it was, as a backup.

import type { HiltInfo, HiltMergeResult, LegacyHilts, PackInfo } from '../../shared/api';
import type { StoredHilt } from './hiltModel';

const api = () => window.hiltwright;
const DB = 'hiltwright-demo'; const STORE = 'hilts';
const MOVED = 'hiltwright.demo.movedToData';

/** What this origin's page database holds; nothing (and no new database) if it was never made. */
async function readLegacyHilts(): Promise<StoredHilt[]> {
  try {
    const dbs = typeof indexedDB.databases === 'function' ? await indexedDB.databases() : null;
    if (dbs && !dbs.some((d) => d.name === DB)) return [];
  } catch { /* cannot list: try to open */ }
  return new Promise<StoredHilt[]>((resolve, reject) => {
    const req = indexedDB.open(DB);
    // Being asked to create it means it was never there: back out without making it.
    req.onupgradeneeded = () => { req.transaction?.abort(); };
    req.onerror = () => { if (req.error?.name === 'AbortError') resolve([]); else reject(req.error); };
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) { db.close(); resolve([]); return; }
      const all = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      all.onsuccess = () => { db.close(); resolve(all.result as StoredHilt[]); };
      all.onerror = () => { db.close(); reject(all.error); };
    };
  });
}

const local = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };

let adopting: Promise<HiltMergeResult | null> | null = null;

/**
 * Bring this origin's earlier hilts, pack fit adjustments, chosen hilt and scene settings over, once. `packs` names
 * the pack hilts, so a chosen pack hilt is carried by its id. Resolves null when there was nothing to do; throws if
 * the move failed, and the next call tries again.
 */
export function adoptOnce(packs: PackInfo[]): Promise<HiltMergeResult | null> {
  if (local(MOVED) === '1') return Promise.resolve(null);
  adopting ??= (async () => {
    // The app's own record is the one that counts: the page's note of it can be lost if the app is killed.
    const origin = location.origin;
    if ((await api().hilts.room()).adopted.includes(origin)) { try { localStorage.setItem(MOVED, '1'); } catch { /* private mode */ } return null; }
    const old = await readLegacyHilts();
    const sceneRaw = local('hiltwright.demo.scene');
    const chosenName = local('hiltwright.demo.hilt') ?? '';
    let scene: unknown;
    try { scene = sceneRaw ? JSON.parse(sceneRaw) : undefined; } catch { scene = undefined; }
    // The old room listed the owner's hilts before pack hilts, so a name both share meant the owner's own.
    const own = old.some((h) => !h.packId && h.name === chosenName);
    const pack = own ? undefined : packs.find((p) => p.kind === 'hilt' && p.name === chosenName);
    const legacy: LegacyHilts = {
      origin,
      hilts: old.map((h) => h.packId
        ? { name: h.name, format: 'stl' as const, data: new Uint8Array(0), sideFiles: [], fit: h.fit, packId: h.packId }
        : { name: h.name, format: h.format as 'glb' | 'obj' | 'stl', data: h.data, sideFiles: h.sideFiles ?? [], fit: h.fit, ...(h.creator ? { creator: h.creator } : {}) }),
      ...(scene !== undefined ? { scene } : {}),
      ...(chosenName && chosenName !== 'Built-in' ? { chosen: pack ? `pack:${pack.id}` : `name:${chosenName}` } : {}),
    };
    const r = await api().hilts.adopt(legacy);
    try { localStorage.setItem(MOVED, '1'); } catch { /* private mode: it runs again, and adds nothing */ }
    return r.added || r.fits ? r : null;
  })().finally(() => { adopting = null; });
  return adopting;
}

/** The owner's hilts, after bringing over any this page's origin kept. */
export async function listHilts(packs: PackInfo[]): Promise<HiltInfo[]> {
  await adoptOnce(packs);
  return api().hilts.list();
}

/** Model bytes as three.js wants them. */
export const asArrayBuffer = (d: ArrayBuffer | Uint8Array): ArrayBuffer => (d instanceof Uint8Array ? d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength) as ArrayBuffer : d);
