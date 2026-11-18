/// <reference types="w3c-web-serial" />
// connection-robustness F1: however the port goes, the transport's owner hears about it, once.

import { afterEach, describe, expect, it } from 'vitest';
import { WebSerialTransport } from '../src/renderer/src/serial';

/** A port whose read stream sends `chunks` and then ends (done), or fails with `error`. */
function fakePort(chunks: string[], end: 'done' | { error: string } | 'open' = 'done') {
  let ctrl!: ReadableStreamDefaultController<Uint8Array>;
  const readable = new ReadableStream<Uint8Array>({
    start(c) {
      ctrl = c;
      for (const t of chunks) c.enqueue(new TextEncoder().encode(t));
      if (end === 'done') c.close();
      else if (end !== 'open') c.error(new Error(end.error));
    },
  });
  let open = true;
  const port = {
    open: async () => undefined,
    setSignals: async () => undefined,
    get readable() { return open ? readable : null; },
    writable: new WritableStream<Uint8Array>(),
    close: async () => { open = false; },
    getInfo: () => ({ usbVendorId: 0x1209, usbProductId: 0x6668 }),
  };
  return { port: port as unknown as SerialPort, end: () => ctrl.close() };
}

afterEach(() => { WebSerialTransport.muted = false; });

describe('WebSerialTransport', () => {
  it('a read that ends quietly tells the owner once', async () => {
    const closes: string[] = [];
    const { port } = fakePort(['Battery voltage: 3.9\n']);
    const t = new WebSerialTransport(port, (r) => closes.push(r));
    const heard: string[] = [];
    t.onData((c) => heard.push(c));
    await t.open();
    expect(closes).toEqual(['the serial read ended']);
    t.lost('the device was removed');
    expect(closes).toHaveLength(1);
  });

  it('a read error tells the owner once', async () => {
    const closes: string[] = [];
    const { port } = fakePort([], { error: 'NetworkError: The device has been lost.' });
    await new WebSerialTransport(port, (r) => closes.push(r)).open();
    expect(closes).toEqual(['Error: NetworkError: The device has been lost.']);
  });

  it('closing on purpose does not report a loss', async () => {
    const closes: string[] = [];
    const { port } = fakePort([], 'open');
    const t = new WebSerialTransport(port, (r) => closes.push(r));
    await t.open();
    await t.close();
    t.lost('late disconnect event');
    await new Promise((r) => setTimeout(r, 20));
    expect(closes).toEqual([]);
  });

  it('muted, the board is read but nothing is passed on', async () => {
    WebSerialTransport.muted = true;
    const { port, end } = fakePort(['0,5,hwt|v8.10\n'], 'open');
    const t = new WebSerialTransport(port, () => undefined);
    const heard: string[] = [];
    t.onData((c) => heard.push(c));
    await t.open();
    end();
    await new Promise((r) => setTimeout(r, 20));
    expect(heard).toEqual([]);
  });
});
