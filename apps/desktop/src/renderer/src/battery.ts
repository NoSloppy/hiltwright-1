// The battery chip and the no-battery note (usb-power-connect D6). A working Li-ion never reads below about 2.5 V;
// with nothing connected the battery pin floats well under that (hote2: 0.03 to 1.48 V).

export const NO_BATTERY_BELOW_V = 2;

/** True when a reading says no battery is connected. No reading at all is not "no battery". */
export function noBattery(volts: number | null): boolean {
  return volts != null && volts < NO_BATTERY_BELOW_V;
}

/** What the header shows for a battery reading. */
export function batteryLabel(volts: number | null): string {
  if (volts == null) return '—';
  return noBattery(volts) ? 'No battery' : `${volts.toFixed(2)} V`;
}
