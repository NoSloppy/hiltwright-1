// The demo room's scene settings and hilt fits: their shapes, defaults, and the checks every stored copy goes through.
// Shared by the main process (which keeps them, main/hilts.ts) and the room (which draws with them), so both hold
// the same ranges: the ranges are the panel's own controls. No three.js here, so main can import it.

export const BLADE_DIAMETERS = { '1': 0.0254, '7/8': 0.022225 } as const;
export type BladeDiameter = keyof typeof BLADE_DIAMETERS;
/** LED strips come in a few densities; 144 per metre is the usual saber strip. */
export const STRIP_DENSITIES = [60, 100, 120, 144] as const;

/** How the room is lit and drawn. Every value is a plain number the page can put on a slider. */
export interface SceneSettings {
  /** Strength of the glow around the blade, and how far it spreads (0 to 1). */
  glow: number; glowSpread: number;
  /** How far past white the blade itself is drawn. Higher is hotter and paler; lower keeps more colour in the core. */
  bladeBrightness: number;
  /** How strongly the blade lights the floor and hilt. */
  bladeLight: number;
  /** The room's own lighting, a multiplier on its lamps. 0 leaves only the blade. */
  roomLight: number;
  /** Haze in the air: how quickly things fade with distance. */
  haze: number;
  grid: boolean;
  /** The blade itself: length in inches and tube diameter. */
  bladeInches: number;
  bladeDiameter: BladeDiameter;
  ledsPerMetre: number;
  /** A second blade out of the pommel, as on a staff. It shows the same LEDs as the first: a staff preset drives both blades alike. */
  staff: boolean;
  /** Show the unlit polycarbonate tube when the saber is off. Off, the blade only exists while it is lit. */
  bladeWhenOff: boolean;
}
export const DEFAULT_SCENE: SceneSettings = { glow: 1.2, glowSpread: 0.5, bladeBrightness: 1.2, bladeLight: 1, roomLight: 1, haze: 0.09, grid: true, bladeInches: 36, bladeDiameter: '1', ledsPerMetre: 144, staff: false, bladeWhenOff: true };

export interface HiltFit {
  flip: boolean;
  rollDeg: number;
  /** Overall length in centimetres; null keeps the guess from the file. */
  lengthCm: number | null;
  /** Sideways shift of the model so the blade sits in its bore, in millimetres of finished hilt, in the hilt's own frame (before the turn). */
  offsetXmm?: number;
  offsetZmm?: number;
  /**
   * How much deeper the blade sits in the hilt than the model's top, in millimetres. An emitter with a long shroud,
   * a curved one, or a flared one that extends past the socket needs the blade to start below the model's highest point.
   */
  seatMm?: number;
  /**
   * Tilt of the hilt relative to the blade, in degrees, about the point where the blade enters it: for a curved hilt
   * whose longest dimension does not run along the bore, so standing it up by that dimension leans the emitter.
   * tiltX leans it toward or away from the front (the control side after the turn), tiltZ to the sides.
   */
  tiltXDeg?: number;
  tiltZDeg?: number;
  /** For a staff: how deep the second blade sits in the pommel, in millimetres. */
  staffSeatMm?: number;
  /**
   * Where the blade's axis is in the file. 'origin': the model was drawn around the bore, so the file's own axis is
   * the blade's. 'box': the middle of the model's bounding box. 'auto' (the default) uses the origin when it runs
   * through the model, and the box otherwise (a file modelled off in space).
   */
  axis?: 'auto' | 'origin' | 'box';
}
export const DEFAULT_FIT: HiltFit = { flip: false, rollDeg: 0, lengthCm: null, offsetXmm: 0, offsetZmm: 0, seatMm: 0, tiltXDeg: 0, tiltZDeg: 0, staffSeatMm: 0, axis: 'auto' };

const obj = (raw: unknown): Record<string, unknown> => (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {});
const num = (v: unknown, min: number, max: number, dflt: number): number => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : dflt);
const bool = (v: unknown, dflt: boolean): boolean => (typeof v === 'boolean' ? v : dflt);

/** Stored scene settings, each checked against its control's range; anything missing or wrong takes its default. */
export function cleanScene(raw: unknown): SceneSettings {
  const s = obj(raw); const d = DEFAULT_SCENE;
  return {
    glow: num(s.glow, 0, 3, d.glow),
    glowSpread: num(s.glowSpread, 0, 1, d.glowSpread),
    bladeBrightness: num(s.bladeBrightness, 0.7, 2.5, d.bladeBrightness),
    bladeLight: num(s.bladeLight, 0, 3, d.bladeLight),
    roomLight: num(s.roomLight, 0, 2.5, d.roomLight),
    haze: num(s.haze, 0, 0.3, d.haze),
    grid: bool(s.grid, d.grid),
    bladeInches: num(s.bladeInches, 20, 40, d.bladeInches),
    bladeDiameter: typeof s.bladeDiameter === 'string' && Object.hasOwn(BLADE_DIAMETERS, s.bladeDiameter) ? s.bladeDiameter as BladeDiameter : d.bladeDiameter,
    ledsPerMetre: (STRIP_DENSITIES as readonly number[]).includes(s.ledsPerMetre as number) ? s.ledsPerMetre as number : d.ledsPerMetre,
    staff: bool(s.staff, d.staff),
    bladeWhenOff: bool(s.bladeWhenOff, d.bladeWhenOff),
  };
}

/** A stored hilt fit, each value checked against its slider in the Hilt panel; anything missing or wrong takes its default. */
export function cleanFit(raw: unknown): HiltFit {
  const f = obj(raw);
  return {
    flip: bool(f.flip, false),
    rollDeg: num(f.rollDeg, -180, 180, 0),
    lengthCm: f.lengthCm === null ? null : num(f.lengthCm, 15, 45, NaN) || null,
    offsetXmm: num(f.offsetXmm, -30, 30, 0),
    offsetZmm: num(f.offsetZmm, -30, 30, 0),
    seatMm: num(f.seatMm, -40, 120, 0),
    tiltXDeg: num(f.tiltXDeg, -45, 45, 0),
    tiltZDeg: num(f.tiltZDeg, -45, 45, 0),
    staffSeatMm: num(f.staffSeatMm, -40, 120, 0),
    axis: f.axis === 'origin' || f.axis === 'box' || f.axis === 'auto' ? f.axis : 'auto',
  };
}
