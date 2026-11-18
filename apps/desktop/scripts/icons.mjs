// Window and installer icons from the vector logo: `npm run icons` (runs under Electron, whose own Chromium draws the
// SVG exactly as the app would). Writes build/icon.ico (all Windows sizes, for electron-builder), build/icon.png
// (512, for other platforms) and resources/icon.png (256, the window icon while developing).
// Regenerate after changing design/brand/build-logo.mjs.

import { app, BrowserWindow } from 'electron';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DESKTOP = resolve(HERE, '..');
const SVG = readFileSync(resolve(DESKTOP, '..', '..', 'design', 'brand', 'hiltwright-icon.svg'));
const ICO_SIZES = [16, 20, 24, 32, 40, 48, 64, 128, 256];

app.disableHardwareAcceleration();

/**
 * One offscreen window, big enough for the largest size; the image is redrawn at each size (so Chromium renders the
 * SVG at that size, not a scaled copy) and just its square is captured. Transparency is kept.
 */
let win = null;
async function render(size) {
  if (!win) {
    win = new BrowserWindow({ width: 600, height: 600, show: false, frame: false, transparent: true, backgroundColor: '#00000000', useContentSize: true, webPreferences: { offscreen: true } });
    const src = `data:image/svg+xml;base64,${SVG.toString('base64')}`;
    await win.loadURL(`data:text/html,${encodeURIComponent(`<html><body style="margin:0;background:transparent;overflow:hidden"><img id="i" src="${src}" style="display:block"></body></html>`)}`);
  }
  await win.webContents.executeJavaScript(`(() => { const i = document.getElementById('i'); i.width = ${size}; i.height = ${size}; return i.decode().then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); })()`);
  let img = await win.webContents.capturePage({ x: 0, y: 0, width: size, height: size });
  if (img.getSize().width !== size) img = img.resize({ width: size, height: size, quality: 'best' });
  return img.toPNG();
}

/** An .ico holding PNG images (Windows Vista and later read these at every size). */
function ico(images) {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, png }, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, e); head.writeUInt8(size >= 256 ? 0 : size, e + 1);
    head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(png.length, e + 8); head.writeUInt32LE(offset, e + 12);
    offset += png.length;
  });
  return Buffer.concat([head, ...images.map((x) => x.png)]);
}

app.whenReady().then(async () => {
  try {
    const images = [];
    for (const size of ICO_SIZES) images.push({ size, png: await render(size) });
    mkdirSync(join(DESKTOP, 'build'), { recursive: true });
    writeFileSync(join(DESKTOP, 'build', 'icon.ico'), ico(images));
    writeFileSync(join(DESKTOP, 'build', 'icon.png'), await render(512));
    writeFileSync(join(DESKTOP, 'resources', 'icon.png'), images.find((x) => x.size === 256).png);
    win?.destroy();
    console.log(`icons: build/icon.ico (${ICO_SIZES.join(', ')}), build/icon.png (512), resources/icon.png (256)`);
  } catch (err) { console.error(err); process.exitCode = 1; }
  app.quit();
});
