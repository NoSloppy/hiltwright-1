// Which serial devices the page may reach. Main is the only gate: the page can open a port only if this allows it.

const PROFFIE_VID = 0x1209;
const PROFFIE_PID = 0x6668;

/** Electron reports ids as decimal strings on select-serial-port ("4617") and as numbers to the device handler. */
function idMatches(value: unknown, expected: number): boolean {
  if (typeof value === 'number') return value === expected;
  if (typeof value !== 'string' || !value) return false;
  return parseInt(value, 10) === expected || parseInt(value, 16) === expected;
}

export function isProffie(vendorId: unknown, productId: unknown): boolean {
  return idMatches(vendorId, PROFFIE_VID) && idMatches(productId, PROFFIE_PID);
}

/**
 * Whether the page may use this serial device. On Windows a serial device arrives as
 * { device_instance_id: "USB\\VID_1209&PID_6668&MI_00\\...", name } with no vendorId/productId; other platforms
 * report ids. With `noBoard` (the HILTWRIGHT_NO_BOARD development switch) nothing is allowed.
 */
export function serialAllowed(device: unknown, noBoard: boolean): boolean {
  if (noBoard) return false;
  const d = (device ?? {}) as { vendorId?: unknown; productId?: unknown; device_instance_id?: string };
  return isProffie(d.vendorId, d.productId) || /VID_1209&PID_6668/i.test(d.device_instance_id ?? '');
}
