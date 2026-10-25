// Save diagnostics: one readable file for whoever is helping the owner (see main/supportBundle.ts). The page's part is
// the connection and the saber being worked on, kept here by board.ts and workspace.ts so any page can save, including
// the fault screen, which has no board handle.

import type { ConnectionSnapshot } from '../../shared/api';

let connection: Omit<ConnectionSnapshot, 'saberId'> = { status: 'idle', error: null, port: null, board: null, pauses: 0 };
let workingSaberId: string | null = null;

export function setConnectionSnapshot(next: Omit<ConnectionSnapshot, 'saberId'>): void {
  connection = next;
}

export function setWorkingSaber(id: string | null): void {
  workingSaberId = id;
}

/** Write the file, open its folder with it selected, and return its name. */
export async function saveDiagnostics(): Promise<string> {
  const r = await window.hiltwright.support.save({ ...connection, saberId: workingSaberId });
  return r.file;
}
