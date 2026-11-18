// Web Serial transport for @hiltwright/core's BoardClient. Runs in the renderer; main grants the port.

import type { Transport } from '@hiltwright/core';

export const PROFFIE_FILTER = { usbVendorId: 0x1209, usbProductId: 0x6668 };

export class WebSerialTransport implements Transport {
  private listeners = new Set<(chunk: string) => void>();
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private decoder = new TextDecoder('latin1');
  private encoder = new TextEncoder();
  private closed = false;
  /** Development aid (hiltwrightMuteBoard): read as usual but hand nothing on, so the app meets a silent saber. */
  static muted = false;
  /** Development aid (hiltwrightStallBoard): like `muted`, but only until a port is opened again, as a stalled link is. */
  static stalled = false;
  private readonly onClose: (reason: string) => void;

  constructor(readonly port: SerialPort, onClose: (reason: string) => void = () => {}) {
    // However the port goes (a read error, a read that just ends, the system's disconnect event), the owner of this
    // transport hears about it once.
    let told = false;
    this.onClose = (reason) => { if (told || this.closed) return; told = true; onClose(reason); };
  }

  /** The port is gone (the system reported the device removed): tell the owner, as a failed read would. */
  lost(reason: string): void { this.onClose(reason); }

  async open(baudRate = 115200): Promise<void> {
    const attempts: SerialOptions[] = [
      { baudRate },
      { baudRate, flowControl: 'none', dataBits: 8, stopBits: 1, parity: 'none', bufferSize: 4096 },
      { baudRate: 9600 },
    ];
    let lastErr: unknown = null;
    for (const opts of attempts) {
      try {
        await this.port.open(opts);
        console.log(`[serial] opened with ${JSON.stringify(opts)}`);
        lastErr = null;
        break;
      } catch (err) {
        console.log(`[serial] open ${JSON.stringify(opts)} failed: ${String(err)} (readable=${!!this.port.readable})`);
        lastErr = err;
        if (this.port.readable) { try { await this.port.close(); } catch { /* ignore */ } }
      }
    }
    if (lastErr) throw lastErr;
    WebSerialTransport.stalled = false;
    // ProffieOS treats a console with DTR asserted as attached; the spike used the same signals.
    await this.port.setSignals({ dataTerminalReady: true, requestToSend: true });
    this.writer = this.port.writable!.getWriter();
    void this.readLoop();
    // Drop whatever the OS buffered before we opened (a previous session's replies, a battery line printed on DTR).
    // Nothing is listening yet, so the read loop discards it. Seen once: a stale "installed:" line satisfied `version`.
    await new Promise((r) => setTimeout(r, 250));
  }

  private async readLoop(): Promise<void> {
    // A read error that is not fatal gives the port a fresh stream, so the loop takes a new reader. A read that ends
    // (`done`) is the end of the stream: the loop stops rather than asking a finished stream again.
    let ended = false;
    while (!ended && !this.closed && this.port.readable) {
      const reader = this.port.readable.getReader();
      this.reader = reader;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) { ended = true; break; }
          if (value?.length && !WebSerialTransport.muted && !WebSerialTransport.stalled) {
            const text = this.decoder.decode(value, { stream: true });
            for (const l of this.listeners) l(text);
          }
        }
      } catch (err) {
        this.onClose(String(err));
        return;
      } finally {
        reader.releaseLock();
      }
    }
    // The stream ended without an error: when the device goes away quietly, this is all there is to notice it by.
    this.onClose('the serial read ended');
  }

  async write(text: string): Promise<void> {
    if (!this.writer || this.closed) throw new Error('Port closed');
    await this.writer.write(this.encoder.encode(text));
  }

  onData(cb: (chunk: string) => void): () => void {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }

  async close(): Promise<void> {
    this.closed = true;
    try { await this.reader?.cancel(); } catch { /* already closed */ }
    try { this.writer?.releaseLock(); } catch { /* already released */ }
    this.writer = null;
    try { await this.port.close(); } catch { /* already closed */ }
  }
}

/** Already-granted Proffieboard ports. Main's device permission handler grants them without a prompt. */
export async function grantedProffiePorts(): Promise<SerialPort[]> {
  if (!('serial' in navigator)) return [];
  const ports = await navigator.serial.getPorts();
  return ports.filter((p) => {
    const info = p.getInfo();
    return info.usbVendorId === PROFFIE_FILTER.usbVendorId && info.usbProductId === PROFFIE_FILTER.usbProductId;
  });
}

export function describePort(p: SerialPort): string {
  const info = p.getInfo();
  return `${(info.usbVendorId ?? 0).toString(16).padStart(4, '0')}:${(info.usbProductId ?? 0).toString(16).padStart(4, '0')}`;
}
