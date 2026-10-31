/**
 * Pure motion maths for the cut-out rig: skeleton, two-bone IK for the arms, walk cycle, breathing, blinks,
 * cloth lag and a damped pendulum. Everything is a pure function of its inputs (no timers, no randomness),
 * so the same frame always produces the same pose.
 *
 * Coordinates are FIGURE coordinates: origin between the feet, y grows downward (the head is near y ≈ -600).
 * The rest-pose geometry mirrors scripts/art/characters.mjs, where the parts are painted.
 */
import { seeded } from "./anim";

/** Deep, Titas, and Titas's mother (the only other full character; generic, not modelled on anyone). */
export type Who = "groom" | "bride" | "mother";

export interface Pt {
  x: number;
  y: number;
}

interface Skeleton {
  shoulder: Pt;
  elbow: Pt;
  wrist: Pt;
  /** Torso and lower body pivot (waist/hips). */
  hip: Pt;
  /** Head pivot. */
  neck: Pt;
  /** Where the headgear sits. */
  crown: Pt;
  /** Pivot of the cloth that hangs from the neck/head (stole, veil). */
  drape: Pt;
  foot: Pt;
}

export const SKELETON: Record<Who, Skeleton> = {
  groom: {
    shoulder: { x: 62, y: -496 },
    elbow: { x: 72, y: -384 },
    wrist: { x: 78, y: -282 },
    hip: { x: 0, y: -370 },
    neck: { x: 0, y: -546 },
    crown: { x: 0, y: -648 },
    drape: { x: 0, y: -524 },
    foot: { x: 30, y: -2 },
  },
  bride: {
    shoulder: { x: 54, y: -490 },
    elbow: { x: 62, y: -382 },
    wrist: { x: 68, y: -286 },
    hip: { x: 0, y: -420 },
    neck: { x: 0, y: -538 },
    crown: { x: 0, y: -650 },
    drape: { x: 0, y: -660 },
    foot: { x: 28, y: -4 },
  },
  mother: {
    shoulder: { x: 58, y: -486 },
    elbow: { x: 66, y: -378 },
    wrist: { x: 72, y: -284 },
    hip: { x: 0, y: -416 },
    neck: { x: 0, y: -534 },
    crown: { x: 0, y: -644 },
    drape: { x: 40, y: -508 },
    foot: { x: 28, y: -4 },
  },
};

/**
 * How far the hips drop (figure units) when a figure sits on a low stool: the waist comes down to the top of the seated
 * saree (scripts/art/characters.mjs seatedSaree, waist at y ≈ -126).
 */
export const SIT_DROP: Record<Who, number> = { groom: 290, bride: 296, mother: 292 };

/** How far past the wrist the centre of the palm is. */
const HAND = 24;

const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
const scale = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k });
const len = (a: Pt): number => Math.hypot(a.x, a.y);
const angle = (a: Pt): number => (Math.atan2(a.y, a.x) * 180) / Math.PI;
const DEG = Math.PI / 180;
export const rotate = (p: Pt, deg: number): Pt => {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
};
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Rest positions of one arm (side +1 = screen right, -1 = screen left). */
export const restArm = (who: Who, side: 1 | -1) => {
  const k = SKELETON[who];
  const m = (p: Pt): Pt => ({ x: p.x * side, y: p.y });
  const S = m(k.shoulder);
  const E = m(k.elbow);
  const W = m(k.wrist);
  const fore = sub(W, E);
  const H = add(W, scale(fore, HAND / len(fore)));
  return { S, E, H, upper: len(sub(E, S)), lower: len(sub(H, E)) };
};

/**
 * Named arm poses for the screen-right arm (the left arm mirrors x), torso-local: where the palm goes AND where the
 * elbow sits. A flat, front-facing figure cannot fold its arms in depth, so each pose says where the elbow appears and
 * the arm is foreshortened (scaled along its length) to reach — the elbows stay at the sides and the arms never cross.
 */
export const ARM_POSES = {
  groom: {
    namaskar: { hand: { x: 7, y: -452 }, elbow: { x: 88, y: -404 } },
    hold: { hand: { x: 44, y: -432 }, elbow: { x: 94, y: -390 } },
    chest: { hand: { x: 10, y: -462 }, elbow: { x: 90, y: -404 } },
    face: { hand: { x: 12, y: -548 }, elbow: { x: 46, y: -428 } },
    aside: { hand: { x: 86, y: -302 }, elbow: { x: 76, y: -392 } },
    low: { hand: { x: 26, y: -350 }, elbow: { x: 80, y: -392 } },
  },
  bride: {
    namaskar: { hand: { x: 7, y: -448 }, elbow: { x: 78, y: -400 } },
    hold: { hand: { x: 40, y: -430 }, elbow: { x: 88, y: -388 } },
    chest: { hand: { x: 9, y: -462 }, elbow: { x: 80, y: -404 } },
    face: { hand: { x: 11, y: -546 }, elbow: { x: 40, y: -430 } },
    aside: { hand: { x: 82, y: -305 }, elbow: { x: 70, y: -390 } },
    low: { hand: { x: 24, y: -356 }, elbow: { x: 74, y: -388 } },
  },
  mother: {
    namaskar: { hand: { x: 7, y: -446 }, elbow: { x: 82, y: -398 } },
    hold: { hand: { x: 42, y: -428 }, elbow: { x: 92, y: -386 } },
    chest: { hand: { x: 9, y: -458 }, elbow: { x: 84, y: -400 } },
    face: { hand: { x: 11, y: -542 }, elbow: { x: 42, y: -426 } },
    aside: { hand: { x: 86, y: -302 }, elbow: { x: 74, y: -388 } },
    low: { hand: { x: 26, y: -352 }, elbow: { x: 78, y: -386 } },
  },
} as const satisfies Record<Who, Record<string, { hand: Pt; elbow: Pt }>>;

export type PoseName = keyof (typeof ARM_POSES)["groom"];
export type PoseWeights = Partial<Record<PoseName, number>>;

/**
 * Blends named poses with the rest pose as a weighted average (each weight 0..1; the rest pose takes whatever is left,
 * and weights summing past 1 are normalised). The elbow is averaged; the forearm is blended as a swing about the elbow
 * (its angle and length separately), so the hand sweeps round in an arc like a real forearm and never passes through
 * the elbow (which made it flip). Angles are measured so that every swing passes in front of the body, never round the
 * outside, and blend continuously. Returns palm and elbow, torso-local.
 */
export const poseArm = (who: Who, side: 1 | -1, w: PoseWeights): { hand: Pt; elbow: Pt } => {
  const rest = restArm(who, side);
  const names = Object.keys(ARM_POSES[who]) as PoseName[];
  const sum = names.reduce((n, k) => n + clamp(w[k] ?? 0, 0, 1), 0);
  const norm = sum > 1 ? 1 / sum : 1;
  const parts: { t: number; hand: Pt; elbow: Pt }[] = [{ t: 1 - sum * norm, hand: rest.H, elbow: rest.E }];
  for (const name of names) {
    const t = clamp(w[name] ?? 0, 0, 1) * norm;
    if (t <= 0) continue;
    const q = ARM_POSES[who][name];
    parts.push({ t, hand: { x: q.hand.x * side, y: q.hand.y }, elbow: { x: q.elbow.x * side, y: q.elbow.y } });
  }
  const elbow = { x: 0, y: 0 };
  let ang = 0;
  let reach = 0;
  for (const { t, hand, elbow: e } of parts) {
    elbow.x += e.x * t;
    elbow.y += e.y * t;
    const v = sub(hand, e);
    ang += swingAngle(v, side) * t;
    reach += len(v) * t;
  }
  return { hand: fromSwing(elbow, ang, reach, side), elbow };
};

/** Where the palm goes for a blend of named poses (torso-local). */
export const poseTarget = (who: Who, side: 1 | -1, w: PoseWeights): Pt => poseArm(who, side, w).hand;

/** Forearm angles are unwrapped into [SWING_FROM, SWING_FROM + 360): just outside "hanging down", so blends go inward. */
const SWING_FROM = 30;

/** Forearm direction in degrees, mirrored into the screen-right arm's frame (90 = hanging down, increasing = inward). */
const swingAngle = (v: Pt, side: 1 | -1): number => {
  const deg = (Math.atan2(v.y, v.x * side) * 180) / Math.PI;
  return ((((deg - SWING_FROM) % 360) + 360) % 360) + SWING_FROM;
};
const fromSwing = (e: Pt, deg: number, length: number, side: 1 | -1): Pt => ({
  x: e.x + Math.cos((deg * Math.PI) / 180) * length * side,
  y: e.y + Math.sin((deg * Math.PI) / 180) * length,
});

/** Foreshortening limit: a segment can come toward the viewer down to this fraction of its length. */
const MIN_FORESHORTEN = 0.5;

/**
 * Two-bone IK for explicit hand targets (the garland exchange): the solution whose elbow is nearest the arm's natural
 * hanging elbow (moved with the body), so the elbow never flips to the other side of the body.
 */
export const solveArm = (S: Pt, T: Pt, upper: number, lower: number, prefElbow: Pt) => {
  const d0 = sub(T, S);
  const d = clamp(len(d0), Math.abs(upper - lower) + 1, (upper + lower) * 0.99999);
  const base = Math.atan2(d0.y, d0.x);
  const a = Math.acos(clamp((upper * upper + d * d - lower * lower) / (2 * upper * d), -1, 1));
  const c1 = { x: S.x + Math.cos(base + a) * upper, y: S.y + Math.sin(base + a) * upper };
  const c2 = { x: S.x + Math.cos(base - a) * upper, y: S.y + Math.sin(base - a) * upper };
  const E = len(sub(c1, prefElbow)) <= len(sub(c2, prefElbow)) ? c1 : c2;
  const dir = Math.atan2(T.y - E.y, T.x - E.x);
  return { E, H: { x: E.x + Math.cos(dir) * lower, y: E.y + Math.sin(dir) * lower } };
};

/**
 * Places an arm from a shoulder, a chosen elbow and a palm target: each segment points where it must and is
 * foreshortened (never stretched beyond a hair) to reach. Returns the elbow and palm actually reached and both scales.
 */
export const placeArm = (S: Pt, E: Pt, T: Pt, upper: number, lower: number) => {
  const ku = clamp(len(sub(E, S)) / upper, MIN_FORESHORTEN, 1.03);
  const dirU = Math.atan2(E.y - S.y, E.x - S.x);
  const elbow = { x: S.x + Math.cos(dirU) * upper * ku, y: S.y + Math.sin(dirU) * upper * ku };
  const kf = clamp(len(sub(T, elbow)) / lower, MIN_FORESHORTEN, 1.03);
  const dirF = Math.atan2(T.y - elbow.y, T.x - elbow.x);
  return { E: elbow, H: { x: elbow.x + Math.cos(dirF) * lower * kf, y: elbow.y + Math.sin(dirF) * lower * kf }, ku, kf };
};

/** A placed part: rotate by `rot` (deg) and scale about its rest pivot, then move the pivot to `at`. */
export interface PartXf {
  pivot: Pt;
  at: Pt;
  rot: number;
  sx?: number;
  sy?: number;
}

export interface FigurePose {
  /** Walk phase (radians) and how much of the walk is applied (0..1). */
  walk?: number;
  moving?: number;
  /** Horizontal speed in figure units per beat; drives cloth lag and lean. */
  vel?: number;
  /** Time in beats (breathing, wind, blinks). */
  t?: number;
  /** Extra forward lean of the upper body, degrees (+ = toward screen right). */
  lean?: number;
  /** Head tilt in degrees. */
  headTilt?: number;
  /** Arm targets: named-pose weights (torso-local), an explicit palm position in figure coordinates, or a reach. */
  arms?: { l?: ArmSpec; r?: ArmSpec };
  /** Bow of the upper body (0..1), used for greetings and the garland exchange. */
  bow?: number;
  /** 0 standing … 1 seated on a low stool: the hips drop by SIT_DROP and the standing saree folds down from the floor. */
  sit?: number;
  /** Which way a bow leans: +1 toward screen right, -1 toward screen left (default: the groom right, the others left). */
  bowSide?: 1 | -1;
  reduced?: boolean;
}

/**
 * A reach toward an explicit palm position (figure coordinates), faded in and out of a named pose by `mix`
 * (0 = exactly the named pose, 1 = exactly the reach), so hands leave and return to a pose without a jump.
 */
export interface Reach {
  reach: Pt;
  mix: number;
  base: PoseWeights;
}
export type ArmSpec = PoseWeights | Pt | Reach;

const isPt = (v: unknown): v is Pt => typeof v === "object" && v !== null && "x" in v && "y" in v;
const isReach = (v: unknown): v is Reach => typeof v === "object" && v !== null && "reach" in v;

/** Breathing: a slow, tiny rise of the chest (period ~3 s). */
export const breathe = (t: number): number => 1 + 0.006 * Math.sin((t / 90) * Math.PI * 2);

/** Gentle idle wind on hanging cloth (degrees). */
export const wind = (t: number, seed: number): number =>
  Math.sin(t * 0.045 + seed) * 1.1 + Math.sin(t * 0.11 + seed * 2.3) * 0.5;

/**
 * Blink amount (0 open … 1 closed) at time t (beats). Blinks are spaced 3–6 s apart with a seeded jitter,
 * each lasting ~0.25 s. Deterministic for a given seed.
 */
export const blinkAt = (t: number, seed: number): number => {
  const period = 135;
  const k = Math.floor(t / period);
  let b = 0;
  for (const i of [k - 1, k, k + 1]) {
    const at = i * period + 20 + seeded(i * 7 + seed) * 70;
    const u = Math.abs(t - at) / 4;
    if (u < 1) b = Math.max(b, 1 - u * u);
  }
  return b;
};

/** Damped pendulum angle (deg) `dt` beats after a push of `amp` degrees. 0 before the push. */
export const pendulum = (dt: number, amp: number, periodBeats = 38, damping = 0.045): number =>
  dt <= 0 ? 0 : amp * Math.exp(-damping * dt) * Math.sin((dt / periodBeats) * Math.PI * 2);

export interface SolvedFigure {
  hip: PartXf;
  lower: PartXf;
  torso: PartXf;
  drape: PartXf;
  head: PartXf;
  crown: PartXf;
  footL: PartXf;
  footR: PartXf;
  upperL: PartXf;
  upperR: PartXf;
  foreL: PartXf;
  foreR: PartXf;
  /** Palm centres and forearm directions (deg) in figure coordinates, for things held in the hands. */
  handL: Pt;
  handR: Pt;
  handAngL: number;
  handAngR: number;
  /** Where a worn garland sits (both sides of the neck) and the head top, in figure coordinates. */
  neckL: Pt;
  neckR: Pt;
  headTop: Pt;
  /** Face points (figure coordinates): the mouth, the middle of the forehead, each cheek (screen left/right). */
  mouth: Pt;
  forehead: Pt;
  cheekL: Pt;
  cheekR: Pt;
  /** Maps a head-local point (rest figure coordinates on the head) to where it is now (figure coordinates). */
  onHead: (p: Pt) => Pt;
  /** The same for a point that rides on the torso. */
  onTorso: (p: Pt) => Pt;
}

/** Solves every part's transform for a pose. Shared by the renderer and by scenes that need hand positions. */
export const solveFigure = (who: Who, p: FigurePose): SolvedFigure => {
  const k = SKELETON[who];
  const t = p.t ?? 0;
  const moving = p.reduced ? 0 : (p.moving ?? 0);
  const ph = p.walk ?? 0;
  const vel = p.vel ?? 0;
  const sn = Math.sin(ph);

  const bob = -Math.abs(Math.sin(ph)) * 6 * moving;
  const sway = sn * 1.4 * moving;
  const lean = (p.lean ?? 0) + clamp(vel * 0.9, -4, 4) + (p.bow ?? 0) * 7 * (p.bowSide ?? (who === "groom" ? 1 : -1));
  const torsoRot = lean - sway * 0.6;
  const breath = p.reduced ? 1 : breathe(t + (who === "bride" ? 40 : who === "mother" ? 70 : 0));

  const sit = clamp(p.sit ?? 0, 0, 1);
  const hip: PartXf = { pivot: k.hip, at: { x: k.hip.x, y: k.hip.y + bob + SIT_DROP[who] * sit }, rot: 0 };
  // sitting folds the standing cloth down from the floor (scaled about y = 0) so the waist stays at the hips
  const fold = sit > 0 ? hip.at.y / (k.hip.y + bob) : 1;
  const lower: PartXf = { pivot: k.hip, at: hip.at, rot: -sn * 2.2 * moving + lean * 0.15, ...(sit > 0 ? { sy: fold } : {}) };
  const torso: PartXf = { pivot: k.hip, at: hip.at, rot: torsoRot, sy: breath };

  // a point that rides on the torso
  const onTorso = (q: Pt): Pt => {
    const local = sub(q, k.hip);
    return add(hip.at, rotate({ x: local.x, y: local.y * breath }, torsoRot));
  };

  const neck = onTorso(k.neck);
  const idleHead = p.reduced ? 0 : Math.sin(t * 0.031 + (who === "bride" ? 1.7 : who === "mother" ? 3.1 : 0)) * 0.8;
  const headRot = torsoRot + (p.headTilt ?? 0) + idleHead - sway * 0.4;
  const head: PartXf = { pivot: k.neck, at: neck, rot: headRot };
  const onHead = (q: Pt): Pt => add(neck, rotate(sub(q, k.neck), headRot));

  const lag = p.reduced ? 0 : clamp(-vel * 1.4, -7, 7) + wind(t, who === "bride" ? 2 : 5) - sn * 1.2 * moving;
  const crown: PartXf = { pivot: k.crown, at: onHead(k.crown), rot: headRot + lag * 0.15 };
  const drape: PartXf =
    who === "bride"
      ? { pivot: k.drape, at: onHead(k.drape), rot: torsoRot + (headRot - torsoRot) * 0.35 + lag * 0.6 }
      : { pivot: k.drape, at: onTorso(k.drape), rot: torsoRot + lag * 0.5 };

  const stepL = Math.max(0, sn) * 9 * moving;
  const stepR = Math.max(0, -sn) * 9 * moving;
  const footL: PartXf = { pivot: { x: -k.foot.x, y: k.foot.y }, at: { x: -k.foot.x - stepL * 0.3, y: k.foot.y - stepL }, rot: -stepL * 0.4 };
  const footR: PartXf = { pivot: k.foot, at: { x: k.foot.x + stepR * 0.3, y: k.foot.y - stepR }, rot: stepR * 0.4 };

  const arm = (side: 1 | -1) => {
    const rest = restArm(who, side);
    const spec = side === 1 ? p.arms?.r : p.arms?.l;
    const S = onTorso(rest.S);
    let E: Pt;
    let H: Pt;
    let ku = 1;
    let kf = 1;
    const named = (w: PoseWeights) => {
      const pose = poseArm(who, side, w);
      // arms swing a little while walking (only when hanging at rest)
      const restness = 1 - Math.min(1, Object.values(w).reduce((a, b) => a + (b ?? 0), 0));
      const swing = Math.sin(ph + (side === 1 ? 0 : Math.PI)) * moving * restness;
      const off = { x: swing * 6 * side, y: -Math.max(0, swing) * 10 };
      return placeArm(S, onTorso(pose.elbow), onTorso(add(pose.hand, off)), rest.upper, rest.lower);
    };
    if (isPt(spec)) {
      ({ E, H } = solveArm(S, spec, rest.upper, rest.lower, onTorso(rest.E)));
    } else if (isReach(spec)) {
      const m = clamp(spec.mix, 0, 1);
      const from = named(spec.base);
      const to = solveArm(S, spec.reach, rest.upper, rest.lower, onTorso(rest.E));
      if (m <= 0) ({ E, H, ku, kf } = from);
      else {
        // elbow in a line, forearm as a swing about it, so the hand never passes through the elbow
        const e = lerpPt(from.E, to.E, m);
        const vf = sub(from.H, from.E);
        const vt = sub(to.H, to.E);
        const af = swingAngle(vf, side);
        const turn = ((((swingAngle(vt, side) - af) % 360) + 540) % 360) - 180; // the shorter way round
        const a = af + turn * m;
        ({ E, H, ku, kf } = placeArm(S, e, fromSwing(e, a, len(vf) + (len(vt) - len(vf)) * m, side), rest.upper, rest.lower));
      }
    } else {
      ({ E, H, ku, kf } = named(spec ?? {}));
    }
    // foreshortened segments are scaled along their own length (each part is drawn along its local y axis)
    const upper: PartXf = { pivot: rest.S, at: S, rot: angle(sub(E, S)) - angle(sub(rest.E, rest.S)), ...(ku !== 1 ? { sy: ku } : {}) };
    const fore: PartXf = { pivot: rest.E, at: E, rot: angle(sub(H, E)) - angle(sub(rest.H, rest.E)), ...(kf !== 1 ? { sy: kf } : {}) };
    return { upper, fore, H, ang: angle(sub(H, E)) };
  };
  const L = arm(-1);
  const R = arm(1);

  const neckSide = who === "groom" ? 30 : who === "mother" ? 27 : 26;
  return {
    hip,
    lower,
    torso,
    drape,
    head,
    crown,
    footL,
    footR,
    upperL: L.upper,
    upperR: R.upper,
    foreL: L.fore,
    foreR: R.fore,
    handL: L.H,
    handR: R.H,
    handAngL: L.ang,
    handAngR: R.ang,
    neckL: onTorso({ x: -neckSide, y: k.neck.y + 22 }),
    neckR: onTorso({ x: neckSide, y: k.neck.y + 22 }),
    headTop: onHead({ x: 0, y: k.crown.y - 10 }),
    mouth: onHead({ x: 0, y: k.neck.y - 14 }),
    forehead: onHead({ x: 0, y: k.crown.y + 34 }),
    cheekL: onHead({ x: -24, y: k.neck.y - 30 }),
    cheekR: onHead({ x: 24, y: k.neck.y - 30 }),
    onHead,
    onTorso,
  };
};

/** Facial expression of a figure (all optional; the renderer adds natural blinks via `blinkAt`). */
export interface Expression {
  /** -1 looks to screen-left … +1 to screen-right. */
  gaze?: number;
  /** 0 = eyes level, 1 = cast down. */
  look?: number;
  /** 0..1 */
  smile?: number;
  blush?: number;
  /** 0 = open, 1 = closed; added to the natural blinks. */
  close?: number;
}

/** Everything that places and poses one figure: feet position (composition px), scale, head turn, face. */
export interface FigureProps extends FigurePose {
  /** Feet position on the canvas (composition px), and uniform scale. */
  x: number;
  y: number;
  scale?: number;
  /** -1..1 head turn (features shift toward that side). */
  turn?: number;
  face?: Expression;
  opacity?: number;
  /** Bride only: size of the betel leaves in her hands (0 = none). */
  paan?: number;
  /** Bride only: which of her day's looks she wears (default the wedding look). */
  look?: Look;
  /** Haldi touched to her cheeks, forearms and feet (0..1 each). */
  haldi?: { face?: number; arms?: number; feet?: number };
}

/**
 * Titas's looks through the day: the gaye holud (yellow saree, plain hair, bare arms and feet) and the wedding (the red
 * Benarasi, veil, শোলার মুকুট and chandan, as in the groom's film).
 */
export type Look = "holud" | "wedding";

/** Where a figure's hands, neck and head top are, in COMPOSITION coordinates (px); hand angles in degrees. */
export const figurePoints = (who: Who, props: FigureProps) => {
  const s = solveFigure(who, props);
  const k = props.scale ?? 1;
  const toWorld = (p: Pt): Pt => ({ x: props.x + p.x * k, y: props.y + p.y * k });
  return {
    handL: toWorld(s.handL),
    handR: toWorld(s.handR),
    neckL: toWorld(s.neckL),
    neckR: toWorld(s.neckR),
    headTop: toWorld(s.headTop),
    mouth: toWorld(s.mouth),
    forehead: toWorld(s.forehead),
    cheekL: toWorld(s.cheekL),
    cheekR: toWorld(s.cheekR),
    handAngL: s.handAngL,
    handAngR: s.handAngR,
    /** A head-local point (rest figure coordinates) in composition px. */
    head: (p: Pt): Pt => toWorld(s.onHead(p)),
    /** A torso-local point (rest figure coordinates) in composition px, e.g. half way up her forearm. */
    torso: (p: Pt): Pt => toWorld(s.onTorso(p)),
  };
};
