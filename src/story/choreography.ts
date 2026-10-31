/**
 * Choreography: every pose and position the scenes need, as PURE functions of the beat.
 *
 * Units: `f` is a scene-local beat (1 beat = 1/30 s; 2 frames at 60 FPS); `g` / `globalBeat` is a beat counted from the
 * start of the story. Positions are SET px (src/story/layout.ts). Nothing here reads a clock or random numbers: the
 * same beat always gives the same result.
 */
import type { ArtName } from "../art/manifest";
import { bump, easeInOut, easeOut, keyframes, lerp, progress, seeded } from "./anim";
import { BOWL_MARIGOLDS, BOWL_SCALE, CARD_EDGE_Y, CHHADNA, GROOM_SCALE, HOLUD, LAMP_RING, ORNAMENT_POS, PIRI, POV_HOLD, TITLE, type Pt } from "./layout";
import { figurePoints, lerpPt, pendulum, SKELETON, type FigureProps, type PoseWeights } from "./rig";
import { BEATS, SCENE_BEATS } from "./timeline";

// ===================================================================================================================
// Sprites
// ===================================================================================================================

/** Names of the sprite art the sprite lists use: keys of the art manifest. */
export type SpriteName = ArtName;

/**
 * One sprite: art `name` placed at (x, y) px, rotated `rot` degrees, uniformly scaled by `scale` and horizontally by a
 * further `sx` (flip effect), drawn at `opacity` (0 hides it; lists never change length).
 */
export interface SpriteState {
  name: SpriteName;
  x: number;
  y: number;
  rot?: number;
  scale?: number;
  sx?: number;
  opacity?: number;
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const toFigure = (p: Pt, fig: { x: number; y: number; scale?: number }): Pt => ({ x: (p.x - fig.x) / (fig.scale ?? 1), y: (p.y - fig.y) / (fig.scale ?? 1) });
const angleOf = (v: Pt): number => (Math.atan2(v.y, v.x) * 180) / Math.PI;
const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });

/** A reach from a named pose toward a set point, eased in and out by `mix` (so hands never jump). */
const reachTo = (target: Pt, mix: number, base: PoseWeights, fig: FigureProps) =>
  mix > 0.001 ? { reach: toFigure(target, fig), mix: easeInOut(clamp01(mix)), base } : base;

/**
 * A hand reaching in from beyond the frame edge (a woman we do not see): its fingertips at `tip`, the arm running back
 * toward `from`. The sprite's arm lies along its -x axis.
 */
export const handFrom = (name: SpriteName, tip: Pt, from: Pt, opacity: number, scale = 1): SpriteState => ({
  name,
  x: tip.x,
  y: tip.y,
  rot: angleOf(sub(from, tip)) - 180,
  scale,
  opacity,
});

// ===================================================================================================================
// 1. গায়ে হলুদ, and the names over the morning courtyard
// ===================================================================================================================

const HB = BEATS.holud;

/** The names over the morning courtyard: where the title is (screen y), how visible, and the subtitle under it. */
export interface OpeningTitle {
  y: number;
  opacity: number;
  subtitle: number;
}

/** The names rise from low in the frame as the camera pulls back from the bowl, settle, and lift away before the haldi. */
export const openingTitle = (f: number, reduced: boolean): OpeningTitle => {
  const tp = progress(f, HB.title, (t) => t);
  const out = progress(f, HB.titleOut);
  const keep = 1 - out;
  return {
    y: (reduced ? TITLE.to : lerp(TITLE.from, TITLE.to, easeOut(tp))) - (reduced ? 0 : 30 * out),
    opacity: easeInOut(progress(tp, [0, 0.5], (t) => t)) * keep,
    subtitle: progress(f, HB.subtitle) * keep,
  };
};

/** The loose marigolds round the resting bowl (always BOWL_MARIGOLDS.length). */
export const bowlMarigolds = (): SpriteState[] =>
  BOWL_MARIGOLDS.map((p, i): SpriteState => ({
    name: (["marigold-a", "marigold-b", "marigold-c"] as const)[i % 3],
    x: HOLUD.bowlRest.x + p.x,
    y: HOLUD.bowlRest.y + p.y,
    rot: i * 53,
    scale: 1.45 - (i % 3) * 0.18,
    opacity: 1,
  }));

export interface HoludCast {
  mother: FigureProps;
  titas: FigureProps;
  bowl: SpriteState;
  /** The women's hands reaching in from beyond the frame (always 2). */
  hands: SpriteState[];
  /** 0..1 both figures fading in. */
  cast: number;
  garlands: number;
  /** Rings of light for the ululation (always 6), in SCREEN px. */
  ulu: SpriteState[];
}

/** Holud-local beat at which the mother's hand reaches the bowl on the floor (the top of her pick). */
export const BOWL_TAKEN = (HB.coupleIn[0] + HB.coupleIn[1] + 24) / 2;

export const holudCast = (f: number, reduced: boolean): HoludCast => {
  const laugh = bump(f, HB.laugh[0], HB.laugh[1]);
  const titas: FigureProps = {
    ...HOLUD.titas,
    scale: HOLUD.scale,
    t: f,
    sit: 1,
    look: "holud",
    turn: -0.35 + 0.2 * laugh,
    arms: { l: { hold: 1 }, r: { hold: 1 } },
    headTilt: 7 * laugh,
    face: { gaze: -0.5, look: 0.3 + 0.35 * laugh, smile: 0.35 + 0.6 * progress(f, [HB.cheek[0], HB.laugh[0] + 30]) - 0.15 * progress(f, [HB.laugh[1], HB.laugh[1] + 30]), blush: 0.2 + 0.4 * laugh, close: 0.55 * laugh },
    haldi: { face: progress(f, [HB.cheek[0] + 20, HB.cheek[1]]), arms: progress(f, [HB.arm[0] + 18, HB.arm[1]]), feet: progress(f, [HB.feet[0] + 18, HB.feet[1]]) },
    reduced,
  };
  const T = figurePoints("bride", titas);
  const mother: FigureProps = {
    ...HOLUD.mother,
    scale: HOLUD.scale,
    t: f + 40,
    sit: 1,
    turn: 0.6,
    bow: 0.8 * bump(f, HB.feet[0], HB.feet[1]),
    bowSide: 1,
    face: { gaze: 0.8, look: 0.35 + 0.3 * bump(f, HB.feet[0], HB.feet[1]), smile: 0.4 + 0.3 * laugh },
    reduced,
  };
  const touch = (r: readonly [number, number]) => bump(f, r[0], r[1]);
  // her forearm nearest her mother, half way to the elbow
  const arm = lerpPt(T.handL, T.torso({ x: -60, y: -400 }), 0.4);
  const target = f < HB.arm[0] - 4 ? T.cheekL : f < HB.feet[0] - 4 ? arm : { x: HOLUD.titas.x - 40, y: HOLUD.titas.y - 8 };
  const mix = touch(HB.cheek) + touch(HB.arm) + touch(HB.feet);
  // as she comes in, her left hand goes down to the bowl on the floor and brings it up to hold
  const pick = reduced ? 0 : bump(f, HB.coupleIn[0], HB.coupleIn[1] + 24);
  mother.arms = { l: reachTo(HOLUD.bowlRest, pick, { hold: 1 }, mother), r: reachTo(target, mix, { hold: 0.6 }, mother) };
  const M = figurePoints("mother", mother);
  // two women's hands from beyond the frame, adding more haldi to her cheek and her other arm
  const hin = (k: number) => bump(f, HB.hands[0] + k * 14, HB.hands[1] - (1 - k) * 10);
  const hands = [
    handFrom("hand-haldi", lerpPt({ x: 1200, y: T.cheekR.y - 80 }, T.cheekR, easeOut(hin(0))), { x: 1400, y: T.cheekR.y - 200 }, hin(0) > 0.02 ? 1 : 0, 0.9),
    handFrom("hand-haldi", lerpPt({ x: 1180, y: 1900 }, T.handR, easeOut(hin(1))), { x: 1300, y: 2100 }, hin(1) > 0.02 ? 1 : 0, 0.9),
  ];
  const ulu = Array.from({ length: 6 }, (_, i): SpriteState => {
    const origin = [
      { x: -40, y: 820 },
      { x: 1120, y: 1060 },
      { x: 60, y: 1560 },
    ][i % 3];
    const period = 46;
    const start = HB.ulu[0] + (i % 3) * 13 + Math.floor(i / 3) * (period / 2);
    const u = ((f - start) % period + period) % period / period;
    const live = !reduced && f >= start && f < HB.ulu[1];
    return { name: "ring", x: origin.x, y: origin.y, scale: 0.6 + 3.4 * u, opacity: live ? (1 - u) * 0.7 : 0 };
  });
  return {
    mother,
    titas,
    // the bowl rests on the floor until her hand reaches it (half way through the pick), then goes with her hand
    bowl:
      f < BOWL_TAKEN && !(reduced && f >= HB.coupleIn[0])
        ? { name: "haldi-bowl", x: HOLUD.bowlRest.x, y: HOLUD.bowlRest.y, scale: BOWL_SCALE.rest, opacity: 1 }
        : { name: "haldi-bowl", x: M.handL.x + 4, y: M.handL.y - 2, scale: lerp(BOWL_SCALE.rest, BOWL_SCALE.hand, reduced ? 1 : progress(f, [BOWL_TAKEN, BOWL_TAKEN + 24])), opacity: 1 },
    hands,
    cast: reduced ? (f >= HB.coupleIn[0] ? 1 : 0) : progress(f, HB.coupleIn),
    garlands: progress(f, HB.garlands),
    ulu,
  };
};

// ===================================================================================================================
// 2. পিঁড়ি, শুভদৃষ্টি, মালাবদল
// ===================================================================================================================

const WB = BEATS.wedding;

/** Where the পিঁড়ি is (set px of its plank top) and how high it is carried. */
export interface Piri {
  x: number;
  /** Set y of the floor under it. */
  floor: number;
  lift: number;
}

/** Carried in at shoulder height from beyond the right of the frame, at an even pace, to her place at his right; then lowered. */
export const piriAt = (f: number, reduced: boolean): Piri => {
  const u = reduced ? (f >= WB.piriIn[0] ? 1 : 0) : progress(f, WB.piriIn, (t) => 0.5 * t + 0.5 * easeOut(t));
  const down = progress(f, WB.lower);
  return {
    x: lerp(PIRI.enterFrom.x, PIRI.rest.x, u),
    floor: lerp(PIRI.enterFrom.y, PIRI.rest.y, u),
    // the bearers' step shows as a small bob until it is set down
    lift: lerp(PIRI.lift, PIRI.lowered, down) + (reduced ? 0 : Math.sin(f * 0.32) * 5 * (1 - down)),
  };
};

/** মালাবদল: she garlands him first, then he garlands her. Wedding-local beats. */
const X0 = WB.exchange[0];
export const EXCHANGE = {
  appear: [X0 - 6, X0 + 12],
  bride: { lift: [X0 + 6, X0 + 28], settle: [X0 + 28, X0 + 40], release: [X0 + 40, X0 + 60] },
  groom: { stepIn: [X0 + 60, X0 + 76], lift: [X0 + 68, X0 + 90], settle: [X0 + 90, X0 + 102], release: [X0 + 102, X0 + 122], stepBack: [X0 + 112, X0 + 130] },
} as const;

/** From this wedding-local beat the groom is drawn in front of her (he garlands her). */
export const SWAP = EXCHANGE.groom.stepIn[0];

/** A garland strand: anchors (set px), sag, swing (deg), opacity, seed. */
export interface GarlandState {
  a: Pt;
  b: Pt;
  sag: number;
  swing: number;
  opacity: number;
  seed: number;
}

export interface WeddingCast {
  groom: FigureProps;
  titas: FigureProps;
  piri: Piri;
  /** Index 0 is her garland for him, 1 his for her. */
  garlands: GarlandState[];
  /** 0..1 his face glowing at the first look. */
  gaze: number;
  /** The betel leaves of her view (SCREEN px; always 2) during the first look. */
  leaves: SpriteState[];
  /** Her forearms holding them, from her own eyes (SCREEN px; always 2). */
  hands: SpriteState[];
  /** True while we see through her eyes (her own figure is not drawn). */
  pov: boolean;
}

export const weddingCast = (f: number, reduced: boolean): WeddingCast => {
  const piri = piriAt(f, reduced);
  const scale = PIRI.titasScale;
  const X = EXCHANGE;
  const after = f >= WB.gaze[0];
  const two = progress(f, [WB.gaze[0], WB.gaze[0] + 24]);
  const joy = progress(f, [WB.gaze[0] + 10, WB.exchange[0] + 20]);
  const appear = progress(f, X.appear);
  const brideHas = appear * (1 - progress(f, [X.bride.release[1], X.bride.release[1] + 24]));
  const groomHas = appear * (1 - progress(f, [X.groom.release[1], X.groom.release[1] + 24]));
  const tableau = progress(f, WB.tableau);
  const stepIn = progress(f, X.groom.stepIn) * (1 - progress(f, X.groom.stepBack));
  const turnToHer = progress(f, [WB.lower[0], WB.lower[1]]);
  const receiveG = bump(f, X.bride.lift[0], X.bride.release[1]);
  const receiveB = bump(f, X.groom.lift[0], X.groom.release[1]);
  const gx = CHHADNA.cx + stepIn * 40;
  const groom: FigureProps = {
    x: gx,
    y: CHHADNA.cy,
    scale: GROOM_SCALE,
    t: f,
    moving: reduced ? 0 : Math.abs(progress(f, X.groom.stepIn) - progress(f - 1, X.groom.stepIn)) * 20 + Math.abs(progress(f, X.groom.stepBack) - progress(f - 1, X.groom.stepBack)) * 20,
    walk: stepIn * Math.PI,
    turn: lerp(0.1, 0.75, turnToHer),
    arms: {
      l: { namaskar: (1 - appear) * (1 - progress(f, [WB.lower[0], WB.gaze[0]])) + tableau, low: groomHas * (1 - stepIn), hold: groomHas * stepIn },
      r: { namaskar: (1 - appear) * (1 - progress(f, [WB.lower[0], WB.gaze[0]])) + tableau, low: groomHas * (1 - stepIn), hold: groomHas * stepIn },
    },
    bow: 0.6 * receiveG,
    headTilt: 5 * receiveG,
    face: {
      // his eyes go to her as she is carried in, to her view at the first look, then to her
      gaze: f < WB.leavesDown[0] ? 0.6 * progress(f, [WB.piriIn[0] + 30, WB.piriIn[1]]) : f < WB.gaze[0] ? 0 : 0.9,
      look: 0.1 + 0.25 * receiveG,
      smile: 0.3 + 0.5 * joy,
      blush: 0.25 * joy,
    },
    reduced,
  };
  const titas: FigureProps = {
    x: piri.x,
    y: piri.floor - piri.lift + 10 * scale,
    scale,
    t: f,
    sit: 1,
    look: "wedding",
    turn: after ? lerp(-0.4, -0.75, two) : -0.3,
    // the betel leaves before her face until the first look; then the garland, then folded hands
    arms: after ? { l: { hold: Math.max(brideHas, 1 - appear), namaskar: tableau }, r: { hold: Math.max(brideHas, 1 - appear), namaskar: tableau } } : { l: { face: 1 }, r: { face: 1 } },
    paan: after ? 0 : 0.95,
    bow: 0.6 * receiveB,
    bowSide: -1,
    headTilt: -5 * receiveB,
    face: { gaze: after ? -0.9 : 0, look: after ? 0.1 + 0.25 * receiveB : 0.4, smile: after ? 0.3 + 0.5 * joy : 0.2, blush: after ? 0.4 + 0.4 * joy : 0.3, close: after ? 0 : 0.35 },
    reduced,
  };
  // the garlands: each giver's hands carry it to the other's neck, where it then hangs
  const garlands: GarlandState[] = [];
  const give = (giver: "bride" | "groom") => {
    const recvProps = giver === "bride" ? groom : titas;
    const giverProps = giver === "bride" ? titas : groom;
    const R = figurePoints(giver === "bride" ? "groom" : "bride", recvProps);
    const w = X[giver];
    const lift = progress(f, w.lift, (t) => t);
    const settleP = progress(f, w.settle, (t) => t);
    const release = progress(f, w.release, (t) => t);
    const k = recvProps.scale ?? 1;
    const chin = { l: { x: R.neckL.x - 6, y: R.neckL.y - 62 * k }, r: { x: R.neckR.x + 6, y: R.neckR.y - 62 * k } };
    const neck = { l: R.neckL, r: R.neckR };
    if (lift > 0 && release < 1) {
      const base = giverProps.arms as { l: PoseWeights; r: PoseWeights };
      const mix = easeInOut(lift) * (1 - easeInOut(release));
      const at = (side: "l" | "r") => toFigure(lerpPt(chin[side], neck[side], easeInOut(settleP)), giverProps);
      giverProps.arms = { l: { reach: at("l"), mix, base: base.l }, r: { reach: at("r"), mix, base: base.r } };
      giverProps.lean = (giver === "bride" ? -1 : 1) * 5 * bump(f, w.lift[0], w.release[1]);
    }
    const H = figurePoints(giver === "bride" ? "bride" : "groom", giverProps);
    const placed = settleP >= 1;
    garlands.push({
      a: placed ? R.neckL : H.handL,
      b: placed ? R.neckR : H.handR,
      sag: (placed ? lerp(60, 112, easeOut(release)) : lerp(64, 46, lift)) * k,
      swing: reduced ? 0 : pendulum(f - w.release[0], 9) + (placed ? 0 : Math.sin((f + (giver === "bride" ? 0 : 9)) * 0.21) * 3 * (1 - lift)),
      opacity: appear,
      seed: giver === "bride" ? 0 : 3,
    });
  };
  give("bride");
  give("groom");
  // her view: her own hands hold the two leaves over his face, then lower them and part them (a cut in reduced motion)
  const H = POV_HOLD;
  const down = reduced ? (f >= (WB.reveal[0] + WB.reveal[1]) / 2 ? 1 : 0) : progress(f, WB.reveal, easeInOut);
  const pov = f >= WB.leavesDown[0] && f < WB.gaze[0];
  const leaves: SpriteState[] = [];
  const hands: SpriteState[] = [];
  for (const s of [-1, 1] as const) {
    const stalk = { x: H.x + s * (H.apart + H.part * down), y: H.y + H.lower * down };
    leaves.push({ name: "paan", x: stalk.x, y: stalk.y, rot: s * (6 + 30 * down), scale: H.leafScale, opacity: pov ? 1 : 0 });
    hands.push(heldForearm(s, stalk, { x: stalk.x + s * H.elbowOut, y: stalk.y + H.elbowDown }, pov ? 1 : 0));
  }
  return {
    groom,
    titas,
    piri,
    garlands,
    gaze: bump(f, WB.gaze[0] - 10, WB.exchange[0] + 30) * 0.7,
    leaves,
    hands,
    pov,
  };
};

/**
 * Her forearm (the wedding look's, with her শাঁখা-পলা) seen from her own eyes, as a sprite: the baked part placed so its
 * palm lands on `palm` and its elbow on `elbow` (screen px). Side -1 is her left arm, on the left of her view.
 */
const heldForearm = (side: -1 | 1, palm: Pt, elbow: Pt, opacity: number): SpriteState => {
  const k = SKELETON.bride;
  const e0 = { x: side * k.elbow.x, y: k.elbow.y };
  // the palm, a little past the wrist
  const p0 = { x: side * (k.wrist.x + (k.wrist.x - k.elbow.x) * 0.14), y: k.wrist.y + (k.wrist.y - k.elbow.y) * 0.14 };
  const v0 = sub(p0, e0);
  const v1 = sub(palm, elbow);
  const rot = angleOf(v1) - angleOf(v0);
  const scale = Math.hypot(v1.x, v1.y) / Math.hypot(v0.x, v0.y);
  const r = (rot * Math.PI) / 180;
  const c = Math.cos(r) * scale;
  const sn = Math.sin(r) * scale;
  return { name: side < 0 ? "bride-fore-l" : "bride-fore-r", x: palm.x - (c * p0.x - sn * p0.y), y: palm.y - (sn * p0.x + c * p0.y), rot, scale, opacity };
};

/** Which of the two is drawn in front at a wedding-local beat during the exchange. */
export const frontFigure = (f: number): "groom" | "bride" => (f < SWAP ? "bride" : "groom");

/** The ring of lamps round the alpana (glow, bowl and flame for each: always 3 × 14). */
export const lampRing = (f: number, time: number): SpriteState[] => {
  const sprites: SpriteState[] = [];
  LAMP_RING.forEach((d, i) => {
    const lit = progress(f, [WB.lampsIn[0] + (i / LAMP_RING.length) * 60, WB.lampsIn[0] + (i / LAMP_RING.length) * 60 + 20]);
    const tt = time + i * 11;
    const flick = 1 + 0.09 * Math.sin(tt * 0.72) + 0.05 * Math.sin(tt * 1.93 + 1.3);
    const s = 0.62 + (d.y - CHHADNA.cy) / 900;
    sprites.push(
      { name: "glow", x: d.x, y: d.y - 22 * s, scale: Math.max(0.001, 0.75 * s * lit), opacity: 0.85 * lit },
      { name: "diya", x: d.x, y: d.y, scale: s, opacity: 1 },
      { name: "flame", x: d.x, y: d.y - 20 * s, rot: Math.sin(tt * 0.41) * 3, scale: Math.max(0.001, s * lit * flick), opacity: lit > 0.01 ? 1 : 0 },
    );
  });
  return sprites;
};

// ===================================================================================================================
// Garlands (as in the groom's film)
// ===================================================================================================================

const KINDS: SpriteName[] = ["marigold-a", "tuberose", "rose", "tuberose", "marigold-b", "tuberose", "rose", "tuberose"];

/** Points (px) along a hanging strand from `a` to `b` that sags by `sag`, swung by `swing` degrees about its ends. */
export const strandPoints = (a: Pt, b: Pt, sag: number, swing: number, n: number): Pt[] => {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const r = (swing * Math.PI) / 180;
  const down = { x: -Math.sin(r) * sag * 2, y: Math.cos(r) * sag * 2 };
  const c = { x: mid.x + down.x, y: mid.y + down.y };
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const u = 1 - t;
    return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
  });
};

/** One garland strand as flower sprites (always `count`; opacity hides them). `size` is one flower in px. */
export const garlandSprites = ({ a, b, sag, swing = 0, size, count = 17, opacity = 1, seed = 0 }: GarlandState & { size: number; count?: number }): SpriteState[] =>
  strandPoints(a, b, sag, swing, count).map((p, i) => ({
    name: KINDS[(i + seed) % KINDS.length],
    x: p.x,
    y: p.y,
    rot: i * 47 + seed * 13,
    scale: size / 22,
    opacity,
  }));

/** Both garlands as one 34-sprite list (hers first). */
export const garlandField = (garlands: readonly GarlandState[], size: number): SpriteState[] => garlands.flatMap((gl) => garlandSprites({ ...gl, size }));

// ===================================================================================================================
// The closing: a petal becomes the ornament and the card's edge rises (as in the groom's film)
// ===================================================================================================================

/** Position (px) of the drifting petal at linear progress t: crosses from the left, then settles down the centre. */
export const petalAt = (t: number): { x: number; y: number; rot: number } => {
  const e = easeInOut(t);
  return {
    x: lerp(-90, 540, e) + Math.sin(t * Math.PI * 2.4) * 130 * (1 - t),
    y: lerp(560, ORNAMENT_POS.y, easeOut(t) * 0.55 + t * 0.45),
    rot: t * 540 - 40,
  };
};

export interface Closing {
  petal: { x: number; y: number; rot: number };
  petalScale: number;
  petalOpacity: number;
  ornamentOpacity: number;
  ornamentGrow: number;
  cardVisible: boolean;
  edge: number;
  cardTop: number;
}

/** Closing transition numbers at a wedding-local beat (the scene runs on through its overlap into the invitation). */
export const closingAt = (f: number, reduced: boolean, sceneLength: number): Closing => {
  const hp = progress(f, WB.petalCross, (t) => t);
  const morph = progress(hp, [0.82, 1]);
  const inScene = f < sceneLength;
  const edge = progress(f, WB.cardEdge);
  return {
    petal: petalAt(hp),
    petalScale: lerp(1.3, 1.7, hp),
    petalOpacity: inScene && hp > 0 ? 1 - morph : 0,
    ornamentOpacity: morph,
    ornamentGrow: reduced ? 1 : lerp(0.5, 1, morph),
    cardVisible: inScene && edge > 0,
    edge,
    cardTop: lerp(1920, CARD_EDGE_Y, easeInOut(edge)),
  };
};

// ===================================================================================================================
// Atmosphere: petals and gold dust over the whole film (fixed-length lists; opacity hides)
// ===================================================================================================================

const S = SCENE_BEATS;

/**
 * How many petals are in the air at a global beat (0..1.2): light under the names, full at the haldi, carried across the
 * turn of the day, gone while she is carried in, and full again at the garlands.
 */
export const petalIntensity = (b: number): number =>
  keyframes(
    b,
    [
      S.holud.start + HB.title[0],
      S.holud.start + HB.title[0] + 50,
      S.holud.start + HB.titleOut[1],
      S.holud.start + HB.petals[0],
      S.holud.start + HB.petals[0] + 40,
      S.holud.start + HB.petals[1],
      S.wedding.start + WB.descend[1],
      S.wedding.start + WB.piriIn[0] + 20,
      S.wedding.start + WB.gaze[0],
      S.wedding.start + WB.exchange[0],
      S.wedding.start + WB.exchange[0] + 60,
      S.wedding.start + WB.exchange[0] + 100,
      S.wedding.start + WB.tableau[1],
      S.wedding.end - 4,
    ],
    [0, 0.4, 0.3, 0.3, 1, 0.85, 0.5, 0, 0, 0.6, 1.2, 0.9, 0.5, 0],
  );

/** Gold dust amount (0..1) at a global beat. */
export const dustIntensity = (b: number): number =>
  keyframes(
    b,
    [S.holud.start + HB.title[0] - 30, S.holud.start + HB.title[1], S.holud.start + HB.cheek[0], S.wedding.start, S.wedding.start + WB.gaze[0], S.wedding.start + WB.exchange[1], S.wedding.end, S.invitation.start + 200, S.invitation.end - 1],
    [0, 0.6, 0.3, 0.45, 0.8, 1, 0.5, 0.35, 0.12],
  );

/**
 * Which petals fall at a global beat: marigold for the gaye holud and across the turn of the day, a mix from the first
 * look on. The switch falls where no petals are in the air (petalIntensity is 0 there), so none changes in flight.
 */
export const KIND_SWITCH = S.wedding.start + WB.gaze[0];
export const atmosphereKind = (b: number): "marigold" | "mixed" => (b < KIND_SWITCH ? "marigold" : "mixed");

const PETAL_COUNT = 20;
const MIXED: SpriteName[] = ["petal-pink", "petal-marigold", "petal-white", "petal-red"];

/** Drifting petals on three depth layers (always 20). */
export const petalSprites = ({ beat, intensity, kind = "mixed" }: { beat: number; intensity: number; kind?: "marigold" | "mixed" }): SpriteState[] => {
  const n = PETAL_COUNT * Math.min(1, Math.max(0, intensity));
  return Array.from({ length: PETAL_COUNT }, (_, i): SpriteState => {
    const T = 420 + seeded(i + 1) * 360;
    const phase = seeded(i + 40) * T;
    const f = ((beat + phase) % T) / T;
    const depth = i % 3;
    const size = depth === 0 ? 0.95 : depth === 1 ? 0.68 : 0.46;
    const base = depth === 0 ? 0.95 : depth === 1 ? 0.82 : 0.55;
    const x0 = seeded(i + 80) * 1180 - 50;
    const drift = (seeded(i + 120) - 0.35) * 320;
    const x = x0 + drift * f + Math.sin(beat * (0.018 + seeded(i + 7) * 0.02) + i) * (40 + depth * 12);
    const y = -60 + f * 2040;
    const spin = beat * (0.8 + seeded(i + 9) * 1.6) * (i % 2 ? 1 : -1) + i * 40;
    const flip = Math.cos(beat * (0.04 + seeded(i + 15) * 0.04) + i);
    const env = Math.min(1, f * 7, (1 - f) * 7);
    const name: SpriteName = kind === "marigold" ? (i % 4 === 0 ? "petal-red" : "petal-marigold") : MIXED[i % MIXED.length];
    const present = Math.min(1, Math.max(0, n - i));
    return { name, x, y, rot: spin, scale: size, sx: 0.35 + 0.65 * Math.abs(flip), opacity: env * base * Math.min(1, intensity) * present };
  });
};

const DUST_COUNT = 16;

/** Restrained gold motes rising slowly and twinkling (always 16; faded by opacity). */
export const dustSprites = ({ beat, intensity }: { beat: number; intensity: number }): SpriteState[] => {
  const n = DUST_COUNT * Math.min(1, Math.max(0, intensity));
  return Array.from({ length: DUST_COUNT }, (_, i): SpriteState => {
    const speed = 0.0009 + seeded(i + 3) * 0.0012;
    const f = (seeded(i + 50) + beat * speed) % 1;
    const x = seeded(i + 90) * 1080 + Math.sin(beat * 0.02 + i * 2.1) * 26;
    const y = 1960 - f * 2040;
    const r = 0.35 + seeded(i + 130) * 0.55;
    const tw = 0.45 + 0.55 * Math.sin(beat * (0.07 + seeded(i + 170) * 0.06) + i);
    const env = Math.min(1, f * 6, (1 - f) * 6);
    const present = Math.min(1, Math.max(0, n - i));
    return { name: "mote", x, y, scale: r, opacity: env * tw * 0.9 * Math.min(1, intensity) * present };
  });
};

/** The whole atmosphere field at a global beat: dust first, then petals (36 sprites). Empty in reduced motion. */
export const atmosphereSprites = (beat: number, reduced: boolean): SpriteState[] =>
  reduced ? [] : [...dustSprites({ beat, intensity: dustIntensity(beat) }), ...petalSprites({ beat, intensity: petalIntensity(beat), kind: atmosphereKind(beat) })];
