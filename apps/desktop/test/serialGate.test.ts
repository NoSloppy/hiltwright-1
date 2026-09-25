import { describe, expect, it } from 'vitest';
import { serialAllowed } from '../src/main/serialGate';

const byIds = { vendorId: 0x1209, productId: 0x6668 };
const byIdStrings = { vendorId: '4617', productId: '26216' };
const byInstance = { device_instance_id: 'USB\\VID_1209&PID_6668&MI_00\\7&380A8E11&0&0000', name: 'USB Serial Device (COM8)' };
const other = { vendorId: 0x2341, productId: 0x0043 };

describe('which serial devices the page may use', () => {
  it('allows a Proffieboard however it is described, and nothing else', () => {
    expect(serialAllowed(byIds, false)).toBe(true);
    expect(serialAllowed(byIdStrings, false)).toBe(true);
    expect(serialAllowed(byInstance, false)).toBe(true);
    expect(serialAllowed(other, false)).toBe(false);
    expect(serialAllowed(undefined, false)).toBe(false);
  });

  it('allows nothing in a no-board run', () => {
    expect(serialAllowed(byIds, true)).toBe(false);
    expect(serialAllowed(byInstance, true)).toBe(false);
  });
});
