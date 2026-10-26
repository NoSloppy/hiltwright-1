// usb-power-connect 4.1: the header's battery label and when the USB-power note shows.

import { describe, expect, it } from 'vitest';
import { batteryLabel, noBattery } from '../src/renderer/src/battery';

describe('the battery reading in the header', () => {
  it('under 2 V means no battery is connected', () => {
    expect(batteryLabel(0.03)).toBe('No battery');
    expect(batteryLabel(1.48)).toBe('No battery');
    expect(noBattery(0.03)).toBe(true);
  });
  it('2 V or more is shown in volts, with no note', () => {
    expect(batteryLabel(2.0)).toBe('2.00 V');
    expect(batteryLabel(3.9)).toBe('3.90 V');
    expect(noBattery(2.0)).toBe(false);
    expect(noBattery(3.9)).toBe(false);
  });
  it('no reading shows a dash and no note', () => {
    expect(batteryLabel(null)).toBe('—');
    expect(noBattery(null)).toBe(false);
  });
});
