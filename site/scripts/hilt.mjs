// Takes the picture of the hilt for the live blade on the home page: the demo room's built-in hilt (Punk Saber),
// side on, with nothing behind it. Writes site/assets/hilt.png.
//
//   npm run hilt      (in site/; needs the workspace installed at the repo root)
//
// It runs the app in development mode, hidden, with board access off and made-up empty folders, opens the demo room,
// and draws the room's own model twice (on black and on white) to work out which pixels are hilt and how see-through.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const site = resolve(here, '..');
const root = resolve(site, '..');
const desktop = join(root, 'apps/desktop');
const out = join(site, 'assets/hilt.png');

const js = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(5000); // the hilt model loads after the room opens
  const room = window.hiltwrightDemoScene;
  if (!room) { document.body.textContent = 'ERROR no demo room'; return; }
  cancelAnimationFrame(room.raf);
  const r = room.renderer, scene = room.scene, cam = room.camera;
  const W = 1600, H = 400;
  r.setPixelRatio(1); r.setSize(W, H, false);
  scene.background = null; scene.fog = null;
  for (const o of scene.children) if (o !== room.saber && !o.isLight) o.visible = false;
  for (const o of [room.tube, room.tipMesh, room.staff]) if (o) o.visible = false;
  room.saber.rotation.set(0, 0, -Math.PI / 2); // emitter to the right
  room.roll.rotation.set(0, 0.5, 0);
  room.saber.updateMatrixWorld(true);
  const L = room.hiltLength || 0.3;
  cam.fov = 8; cam.aspect = W / H;
  const dist = (L * 1.6) / (2 * Math.tan((4 * Math.PI) / 180) * cam.aspect);
  cam.position.set(room.saber.position.x, room.saber.position.y, room.saber.position.z + dist);
  cam.lookAt(room.saber.position); cam.near = 0.05; cam.far = dist * 3; cam.updateProjectionMatrix();
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const shot = (colour) => { r.setClearColor(colour, 1); r.render(scene, cam); ctx.clearRect(0, 0, W, H); ctx.drawImage(r.domElement, 0, 0, W, H); return ctx.getImageData(0, 0, W, H); };
  const b = shot(0x000000), w = shot(0xffffff);
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let i = 0; i < W * H; i++) {
    const k = i * 4;
    const a = 255 - Math.max(w.data[k] - b.data[k], w.data[k + 1] - b.data[k + 1], w.data[k + 2] - b.data[k + 2]);
    if (a > 0) for (let ch = 0; ch < 3; ch++) b.data[k + ch] = Math.min(255, Math.round((b.data[k + ch] * 255) / a));
    b.data[k + 3] = Math.max(0, a);
    if (a > 12) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 <= x0) { document.body.textContent = 'ERROR nothing drawn'; return; }
  ctx.putImageData(b, 0, 0);
  const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
  o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
  document.body.textContent = o.toDataURL('image/png');
})()`;

const base = mkdtempSync(join(tmpdir(), 'hiltwright-hilt-'));
for (const d of ['userData', 'fontlibrary', 'card']) mkdirSync(join(base, d), { recursive: true });
const dump = join(base, 'hilt.txt');
const env = { ...process.env, HILTWRIGHT_NO_BOARD: '1', HILTWRIGHT_OFFSCREEN: '1', HILTWRIGHT_USER_DATA: join(base, 'userData'), HILTWRIGHT_FONT_LIBRARY: join(base, 'fontlibrary'), HILTWRIGHT_SD_ROOT: join(base, 'card'), HILTWRIGHT_W: '1480', HILTWRIGHT_H: '980', HILTWRIGHT_PAGE: 'demo', HILTWRIGHT_DUMP: dump, HILTWRIGHT_DUMP_JS: js };
delete env.ELECTRON_RUN_AS_NODE;
if (env.HILTWRIGHT_NO_BOARD !== '1') { console.error('Could not set HILTWRIGHT_NO_BOARD. Not starting the app.'); process.exit(1); }

const child = spawn(process.execPath, [join(root, 'node_modules/electron-vite/bin/electron-vite.js'), 'dev'], { cwd: desktop, env });
let log = ''; let finished = false;
const finish = () => {
  if (finished) return; finished = true;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); else child.kill('SIGKILL');
  const text = existsSync(dump) ? readFileSync(dump, 'utf8').trim() : '';
  try { rmSync(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch { /* the app may still hold its data folder for a moment; the OS clears temp folders */ }
  const ok = text.startsWith('data:image/png;base64,');
  if (ok) { writeFileSync(out, Buffer.from(text.slice(22), 'base64')); console.log(`hilt: ${out}`); }
  else console.error(`FAILED: ${text.slice(0, 200) || 'no output'}\n${log.split('\n').slice(-12).join('\n')}`);
  setTimeout(() => process.exit(ok ? 0 : 1), 1200);
};
const onData = (d) => { log += d; if (/\[main\] dump(ed| failed)/.test(log)) finish(); };
child.stdout.on('data', onData); child.stderr.on('data', onData);
child.on('exit', finish);
setTimeout(finish, 120000);
