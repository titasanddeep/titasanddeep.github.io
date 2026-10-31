/**
 * The camera of each set. A camera is the set point at the centre of the frame and a zoom; a set's camera is a list of
 * SHOTS (scene-local beats), each easing from the previous shot's framing (or its own `from`, a cut) to its `to`.
 * The view never leaves the painted set. In reduced motion every shot holds its final framing: no pans or pushes,
 * only cuts.
 */
import { easeInOut, lerp, progress, type Range } from "./anim";
import { OPENING, SET } from "./layout";
import { BEATS } from "./timeline";

export interface Cam {
  /** Set point at the frame centre (set px). */
  x: number;
  y: number;
  /** Zoom (1 = the set fills the frame). */
  z: number;
}

export interface Shot {
  at: Range;
  to: Cam;
  /** Where the shot starts (a cut). Without it the shot continues from the previous shot's framing. */
  from?: Cam;
}

/** Keeps the view inside the set: for zoom ≥ 1 the visible rectangle never shows past the painted edges. */
export const clampCam = (c: Cam): Cam => {
  const z = Math.max(1, c.z);
  const hw = SET.w / 2 / z;
  const hh = SET.h / 2 / z;
  return { x: Math.min(SET.w - hw, Math.max(hw, c.x)), y: Math.min(SET.h - hh, Math.max(hh, c.y)), z };
};

/** The camera along a list of shots at a scene-local beat. */
export const cameraAlong = (shots: readonly Shot[], beat: number, reduced: boolean): Cam => {
  let prev = shots[0].from ?? shots[0].to;
  let current = prev;
  for (const shot of shots) {
    if (beat < shot.at[0]) break;
    const start = shot.from ?? prev;
    // a shot with no length is a cut straight to its framing
    const p = shot.at[1] > shot.at[0] ? progress(beat, shot.at, easeInOut) : 1;
    current = reduced ? shot.to : lerpCam(start, shot.to, p);
    prev = shot.to;
  }
  return clampCam(current);
};

const lerpCam = (a: Cam, b: Cam, t: number): Cam => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) });

/** `translate(frame centre) · scale(z) · translate(-camera point)`, as a matrix. */
export const cameraMatrix = (c: Cam): readonly [number, number, number, number, number, number] => [
  c.z,
  0,
  0,
  c.z,
  SET.w / 2 - c.x * c.z,
  SET.h / 2 - c.y * c.z,
];

const HO = BEATS.holud;
const WE = BEATS.wedding;

/**
 * The turn of the day: the holud's camera rises to the verandah garlands and holds there while the evening comes; the
 * wedding's starts on the same framing, high in the ছাদনাতলা's night sky, and comes down to Deep.
 */
const HIGH: Cam = { x: 540, y: 440, z: 2.2 };

/** The gaye holud: close on the bowl as the sun comes in, wide for the names, closer on mother and daughter, then up. */
export const COURTYARD_HOLUD: readonly Shot[] = [
  { at: [0, 0], to: OPENING },
  { at: HO.open, to: { x: 540, y: 1040, z: 1.08 } },
  { at: [HO.coupleIn[1], HO.cheek[0]], to: { x: 556, y: 1380, z: 1.8 } },
  { at: [HO.cheek[0], HO.rise[0]], to: { x: 566, y: 1400, z: 1.88 } },
  { at: HO.rise, to: HIGH },
];

/** The ছাদনাতলা: down from the night sky to Deep; her approach on the পিঁড়ি; a cut to her view for the first look, then the two of them. */
export const WEDDING_SHOTS: readonly Shot[] = [
  { at: [0, 0], to: HIGH },
  { at: WE.descend, to: { x: 540, y: 1010, z: 1.06 } },
  { at: WE.piriIn, to: { x: 600, y: 1060, z: 1.12 } },
  { at: WE.lower, to: { x: 640, y: 1150, z: 1.3 } },
  // শুভদৃষ্টি: her view, close on him; then the two of them, close
  { at: WE.leavesDown, from: { x: 540, y: 1036, z: 2.3 }, to: { x: 540, y: 1030, z: 2.36 } },
  { at: WE.gaze, from: { x: 636, y: 1080, z: 1.62 }, to: { x: 636, y: 1076, z: 1.72 } },
  { at: [WE.exchange[0], WE.exchange[0] + 30], to: { x: 620, y: 1140, z: 1.45 } },
  { at: [WE.tableau[0], WE.tableau[1]], to: { x: 540, y: 1000, z: 1 } },
];
