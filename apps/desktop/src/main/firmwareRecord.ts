// Checking a firmware record (what an install compiled in) before it is stored on a saber. Kept apart from ipc.ts
// so it can be tested without Electron.

import type { FirmwareManifest, ModelBlade } from '@hiltwright/core';

function str(v: unknown, max = 200): string {
  if (typeof v !== 'string' || v.length > max) throw new Error('Expected a short string');
  return v;
}

/** Colour defaults by argument number: only `#rrggbb` values under numeric keys survive. */
export function hexMap(v: unknown): Record<number, string> {
  const out: Record<number, string> = {};
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (/^\d+$/.test(k) && /^#[0-9a-fA-F]{6}$/.test(String(x))) out[Number(k)] = String(x);
  return out;
}

const MAX_BLADES = 16;
const MAX_WIRING_BYTES = 64 * 1024;

/** The board and blade layout the firmware was built for; refused when it is not one. */
function wiring(v: unknown): NonNullable<FirmwareManifest['wiring']> {
  const w = v as { board?: unknown; blades?: unknown };
  if (!w || typeof w !== 'object' || (w.board !== 'V2' && w.board !== 'V3') || !Array.isArray(w.blades) || w.blades.length > MAX_BLADES) throw new Error('Expected the installed board and blades');
  if (!w.blades.every((b) => b && typeof b === 'object' && typeof (b as { id?: unknown }).id === 'string')) throw new Error('Expected the installed board and blades');
  if (JSON.stringify(w).length > MAX_WIRING_BYTES) throw new Error('The installed blade layout is too large');
  return { board: w.board, blades: w.blades as ModelBlade[] };
}

export function cleanFirmware(v: unknown): FirmwareManifest {
  const f = v as FirmwareManifest;
  if (!f || typeof f !== 'object' || typeof f.hash !== 'string' || !Array.isArray(f.looks) || !Array.isArray(f.presets)) throw new Error('Expected a firmware manifest');
  return {
    hash: str(f.hash, 40), bladeId: f.bladeId === true, os: str(f.os ?? '', 40), at: str(f.at ?? new Date().toISOString(), 40),
    looks: f.looks.map((l) => ({ id: str(l.id, 80), name: str(l.name, 120), args: Array.isArray(l.args) ? l.args.map(Number).filter(Number.isFinite) : [], ...(l.defaults ? { defaults: hexMap(l.defaults) } : {}), ...(typeof l.hash === 'string' && /^[0-9a-f]{1,32}$/.test(l.hash) ? { hash: l.hash } : {}) })),
    presets: f.presets.map((x) => ({ name: str(x.name, 200), looks: Array.isArray(x.looks) ? x.looks.map((s) => str(s, 80)) : [] })),
    ...(f.wiring !== undefined ? { wiring: wiring(f.wiring) } : {}),
  };
}
