/**
 * Deep, Titas and her mother as draw ops. Each figure is a cut-out puppet of baked parts moved by the transforms the
 * rig solves (src/story/rig.ts), plus a small vector face. Draw order (back to front): shadow, body parts, head group
 * (base, face, veil front, crown) and, while she holds the betel leaves, the leaves and her front forearms.
 * Titas changes through the day (`look`): the parts each look uses are listed in LOOKS. Everything here is data:
 * nothing is mounted or unmounted.
 */
import type { ArtName } from "../art/manifest";
import { about, I, mul, rotate, scale, sprite, translate, type Mat } from "../render/mat";
import type { Clip, DrawOp, Rect } from "../render/ops";
import { blinkAt, SKELETON, solveFigure, type FigureProps, type Look, type PartXf, type Pt, type SolvedFigure, type Who } from "../story/rig";
import { MIN_ALPHA } from "./sprites";

const INK = "#30251f";
export const SKIN = { groom: "#c98d5e", bride: "#dba27a", mother: "#cf9670" } as const;
const SKIN_SHADE = { groom: "#a26a42", bride: "#b77e56", mother: "#a77250" } as const;
const HALDI = "#f2b818";

const FACE = {
  groom: { eyeY: -601, eyeX: 17, browY: -613, mouthY: -556, cheekY: -574 },
  bride: { eyeY: -594, eyeX: 16, browY: -607, mouthY: -553, cheekY: -569 },
  mother: { eyeY: -594, eyeX: 16.5, browY: -607, mouthY: -552, cheekY: -568 },
} as const;

const EYE = "M-10 0Q-1 -7 10 -0.5Q1 5.5 -10 0Z";

/** Rounds to 1/100 like the old face did, so the same expression gives the same path strings. */
const q = (n: number): number => Math.round(n * 100) / 100;

/** `translate(at - pivot) rotate(rot) scale(sx, sy)` about the part's rest pivot: the old `partTransform`/`partOrigin`. */
export const partMatrix = (xf: PartXf): Mat =>
  about(
    xf.pivot.x,
    xf.pivot.y,
    mul(translate(xf.at.x - xf.pivot.x, xf.at.y - xf.pivot.y), mul(rotate(xf.rot), scale(xf.sx ?? 1, xf.sy ?? 1))),
  );

export type XfKey = "lower" | "torso" | "drape" | "footL" | "footR" | "upperL" | "upperR" | "foreL" | "foreR";
type Slot = readonly [ArtName, XfKey];

/** The art one figure wears: body parts back to front, the seated saree, and the head group. */
interface Wardrobe {
  body: readonly Slot[];
  seated: ArtName;
  head: ArtName;
  crown?: ArtName;
  front?: ArtName;
}

const groomBody: readonly Slot[] = [
  ["groom-foot-l", "footL"],
  ["groom-foot-r", "footR"],
  ["groom-dhoti", "lower"],
  ["groom-torso", "torso"],
  ["groom-stole", "drape"],
  ["groom-arm-l", "upperL"],
  ["groom-arm-r", "upperR"],
  ["groom-fore-l", "foreL"],
  ["groom-fore-r", "foreR"],
];

/** Titas's parts, look by look (the wedding look adds her veil, its front and her crown). */
const bride = (saree: ArtName, torso: ArtName, arms: "bride" | "bride-plain", fore: "bride" | "bride-plain", feet: "bride" | "bride-plain"): readonly Slot[] => [
  [`${feet}-foot-l` as ArtName, "footL"],
  [`${feet}-foot-r` as ArtName, "footR"],
  [saree, "lower"],
  [torso, "torso"],
  [`${arms}-arm-l` as ArtName, "upperL"],
  [`${arms}-arm-r` as ArtName, "upperR"],
  [`${fore}-fore-l` as ArtName, "foreL"],
  [`${fore}-fore-r` as ArtName, "foreR"],
];

export const LOOKS: Record<Look, Wardrobe> = {
  holud: { body: bride("bride-saree-holud", "bride-torso-holud", "bride-plain", "bride-plain", "bride-plain"), seated: "bride-saree-holud-seated", head: "bride-head-plain" },
  wedding: { body: bride("bride-saree", "bride-torso", "bride", "bride", "bride"), seated: "bride-saree-seated", head: "bride-head", crown: "bride-mukut", front: "bride-veil-front" },
};

const WARDROBE: Record<Exclude<Who, "bride">, Wardrobe> = {
  groom: { body: groomBody, seated: "groom-dhoti", head: "groom-head", crown: "groom-topor" },
  mother: {
    body: [
      ["mother-anchal", "drape"],
      ["mother-foot-l", "footL"],
      ["mother-foot-r", "footR"],
      ["mother-saree", "lower"],
      ["mother-torso", "torso"],
      ["mother-arm-l", "upperL"],
      ["mother-arm-r", "upperR"],
      ["mother-fore-l", "foreL"],
      ["mother-fore-r", "foreR"],
    ],
    seated: "mother-saree-seated",
    head: "mother-head",
  },
};

/** Draw order of each figure's body parts in its default look (the wedding look for Titas). */
export const BODY: Record<Who, readonly Slot[]> = { groom: groomBody, bride: LOOKS.wedding.body, mother: WARDROBE.mother.body };

const wardrobeOf = (who: Who, look: Look = "wedding"): Wardrobe => (who === "bride" ? LOOKS[look] : WARDROBE[who]);

/** Rest pivot of the part moved by each solved transform (figure coordinates). */
export const pivotOf = (who: Who, k: XfKey): Pt => {
  const kk = SKELETON[who];
  const m = (p: Pt, side: number): Pt => ({ x: p.x * side, y: p.y });
  switch (k) {
    case "lower":
    case "torso":
      return kk.hip;
    case "drape":
      return kk.drape;
    case "footL":
      return m(kk.foot, -1);
    case "footR":
      return kk.foot;
    case "upperL":
      return m(kk.shoulder, -1);
    case "upperR":
      return kk.shoulder;
    case "foreL":
      return m(kk.elbow, -1);
    case "foreR":
      return kk.elbow;
  }
};

/** The crown relative to the head group (it wobbles a little on top of the head's own motion). */
const crownLocal = (s: SolvedFigure): PartXf => ({ pivot: s.crown.pivot, at: s.crown.pivot, rot: s.crown.rot - s.head.rot });

/** The vector face: eyes (irises clipped by the eye shape), lids, brows, mouth and blush, under the head matrix `m`. */
const faceOps = (who: Who, m: Mat, dx: number, gx: number, gy: number, blink: number, smile: number, blush: number, haldi: number): DrawOp[] => {
  const f = FACE[who];
  const woman = who !== "groom";
  const skin = SKIN[who];
  const lidY = -7 + 12.5 * blink;
  const base = mul(m, translate(dx, 0));
  const ops: DrawOp[] = [];
  if (haldi > 0.01) {
    for (const cx of [-24, 24]) ops.push({ kind: "ellipse", cx, cy: f.cheekY + 2, rx: 12, ry: 8, m: base, alpha: haldi * 0.8, fill: HALDI });
  }
  if (blush > 0.01) {
    for (const cx of [-25, 25]) ops.push({ kind: "ellipse", cx, cy: f.cheekY, rx: 8, ry: 5, m: base, alpha: blush * 0.42, fill: "#e0607a" });
  }
  for (const s of [-1, 1] as const) {
    const em = mul(base, translate(s * f.eyeX, f.eyeY));
    const clip: Clip = { path: EYE, m: em };
    ops.push({ kind: "path", d: EYE, m: em, alpha: 1, fill: "#fffaf0" });
    const ix = gx * 3.4;
    const iy = gy * 1.8 - 0.5;
    ops.push({ kind: "ellipse", cx: ix, cy: iy, rx: 4.6, ry: 4.6, m: em, alpha: 1, fill: "#3a2316", clip });
    ops.push({ kind: "ellipse", cx: ix, cy: iy, rx: 2.4, ry: 2.4, m: em, alpha: 1, fill: "#120a07", clip });
    ops.push({ kind: "ellipse", cx: ix + 1.5, cy: gy * 1.8 - 2.2, rx: 1.3, ry: 1.3, m: em, alpha: 1, fill: "#ffffff", clip });
    // upper lid, closing with the blink
    if (blink > 0.02) ops.push({ kind: "path", d: `M-11 0Q-1 -8 11 -0.5Q1 ${q(lidY)} -11 0Z`, m: em, alpha: 1, fill: skin });
    ops.push({ kind: "path", d: `M-11 0.5Q-1 ${q(lidY - 0.5)} 11 -1`, m: em, alpha: 1, stroke: { paint: INK, width: 2.6, cap: "round" } });
    if (woman) ops.push({ kind: "path", d: `M${s * 10} -1l${s * 5} -3.4`, m: em, alpha: 1, stroke: { paint: INK, width: 2.2, cap: "round" } });
    ops.push({ kind: "path", d: "M-8 3.4Q0 6 8 2.6", m: em, alpha: 0.35, stroke: { paint: INK, width: 1 } });
    ops.push({ kind: "path", d: "M-8 -7Q0 -11 8 -7", m: em, alpha: 0.7, stroke: { paint: SKIN_SHADE[who], width: 1.2 } });
  }
  for (const s of [-1, 1] as const) {
    ops.push({
      kind: "path",
      d: `M${s * 6} ${f.browY + 2 - smile * 1.2}Q${s * 16} ${f.browY - 4 - smile * 1.5} ${s * 27} ${f.browY + 1}`,
      m: base,
      alpha: 1,
      stroke: { paint: "#1b1210", width: woman ? 2.6 : 3.6, cap: "round" },
    });
  }
  const mm = mul(base, translate(0, f.mouthY));
  if (woman) {
    const w = 7.5 + smile * 1.5;
    const y = -smile * 1.6;
    const [dark, light] = who === "bride" ? ["#a52a37", "#c23a48"] : ["#8e3a3e", "#a8494c"];
    ops.push({ kind: "path", d: `M${-w} ${y}Q-3.5 -3.6 0 -2.2Q3.5 -3.6 ${w} ${y}Q0 ${q(-0.6 + smile)} ${-w} ${y}Z`, m: mm, alpha: 1, fill: dark });
    ops.push({ kind: "path", d: `M${-w} ${y}Q0 ${q(5.5 + smile * 1.5)} ${w} ${y}Q0 ${q(-0.6 + smile)} ${-w} ${y}Z`, m: mm, alpha: 1, fill: light });
    ops.push({ kind: "path", d: "M-2.5 2.4Q0 3.4 2.5 2.4", m: mm, alpha: 0.35, stroke: { paint: "#ffffff", width: 1 } });
  } else {
    ops.push({
      kind: "path",
      d: `M${-8.5 - smile * 1.5} ${-smile * 2}Q0 ${q(2.4 + smile * 3)} ${8.5 + smile * 1.5} ${-smile * 2}`,
      m: mm,
      alpha: 1,
      stroke: { paint: "#7a3030", width: 2.4, cap: "round" },
    });
    ops.push({ kind: "path", d: "M-4 4.2Q0 5.6 4 4.2", m: mm, alpha: 1, stroke: { paint: SKIN_SHADE[who], width: 1.4 } });
  }
  return ops;
};

/** Frame-coordinate rectangle that contains `r` after `m` (axis-aligned bounds of its corners). */
export const boundsOf = (m: Mat, r: Rect): Rect => {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [x, y] of [
    [r.x, r.y],
    [r.x + r.w, r.y],
    [r.x, r.y + r.h],
    [r.x + r.w, r.y + r.h],
  ] as const) {
    xs.push(m[0] * x + m[2] * y + m[4]);
    ys.push(m[1] * x + m[3] * y + m[5]);
  }
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
};

/** The figure's local extent (feet origin): body, arms reaching out, a lifted crown. */
const FIGURE_BOX: Rect = { x: -330, y: -1000, w: 660, h: 1040 };

/** Where a haldi smear sits on a forearm (rest coordinates, between elbow and wrist) for side ±1. */
const foreMid = (who: Who, side: 1 | -1): Pt => {
  const k = SKELETON[who];
  return { x: ((k.elbow.x + k.wrist.x) / 2) * side, y: (k.elbow.y + k.wrist.y) / 2 + 6 };
};

/**
 * One figure as ops, back to front. `props.opacity` below 1 wraps everything in ONE group op, so overlapping parts do
 * not show through each other.
 * @param m parent matrix (default identity): the camera for a figure inside the camera group
 */
export const figureOps = (who: Who, props: FigureProps, m: Mat = I): DrawOp[] => {
  const { x, y, scale: k = 1, opacity = 1, turn = 0, face = {}, t = 0 } = props;
  if (opacity <= MIN_ALPHA) return [];
  const paan = props.paan ?? 0;
  const sit = Math.min(1, Math.max(0, props.sit ?? 0));
  const look = props.look ?? "wedding";
  const wear = wardrobeOf(who, look);
  const haldi = props.haldi ?? {};
  const s = solveFigure(who, props);
  const shell = mul(m, mul(translate(x, y), scale(k)));
  const skel = SKELETON[who];
  const leaves = paan > 0;
  const fronts = (key: XfKey) => key === "foreL" || key === "foreR";
  const ops: DrawOp[] = [];

  // soft shadow: an ellipse 240 x 32 whose radial paint is stretched from a circle by the matrix
  ops.push({
    kind: "ellipse",
    cx: 0,
    cy: 0,
    rx: 120,
    ry: 120,
    m: mul(shell, scale(1, 16 / 120)),
    alpha: 1,
    fill: {
      radial: [0, 0, 0, 0, 0, 120],
      stops: [
        [0, "rgba(48,37,31,.32)"],
        [1, "rgba(48,37,31,0)"],
      ],
    },
  });

  // her Benarasi's veil hangs behind everything else
  const veiled = who === "bride" && look === "wedding";
  if (veiled) ops.push({ kind: "image", art: "bride-veil", m: mul(shell, partMatrix(s.drape)), alpha: 1 });

  // sitting: the standing saree folds down while the seated one fades in; the feet tuck away under it
  const seatedA = Math.min(1, Math.max(0, (sit - 0.55) / 0.3));
  const footA = 1 - Math.min(1, sit / 0.3);
  for (const [art, key] of wear.body) {
    if (leaves && fronts(key)) continue;
    const pm = mul(shell, partMatrix(s[key]));
    if (key === "footL" || key === "footR") {
      if (footA > MIN_ALPHA) ops.push({ kind: "image", art, m: pm, alpha: footA });
      if (footA > MIN_ALPHA && (haldi.feet ?? 0) > 0.01) ops.push({ kind: "ellipse", cx: pivotOf(who, key).x, cy: -6, rx: 13, ry: 5, m: pm, alpha: (haldi.feet ?? 0) * 0.85 * footA, fill: HALDI });
      continue;
    }
    if (key === "lower") {
      if (seatedA < 1) ops.push({ kind: "image", art, m: pm, alpha: 1 - seatedA });
      if (seatedA > MIN_ALPHA) ops.push({ kind: "image", art: wear.seated, m: shell, alpha: seatedA });
      if (seatedA > MIN_ALPHA && (haldi.feet ?? 0) > 0.01) {
        for (const fx of [-40, 40]) ops.push({ kind: "ellipse", cx: fx, cy: -4, rx: 14, ry: 5, m: shell, alpha: (haldi.feet ?? 0) * 0.85 * seatedA, fill: HALDI });
      }
      continue;
    }
    ops.push({ kind: "image", art, m: pm, alpha: 1 });
    if (fronts(key) && (haldi.arms ?? 0) > 0.01) {
      const c = foreMid(who, key === "foreR" ? 1 : -1);
      ops.push({ kind: "ellipse", cx: c.x, cy: c.y, rx: 11, ry: 18, m: pm, alpha: (haldi.arms ?? 0) * 0.8, fill: HALDI });
    }
  }

  // head group: rotates about the neck; the crown wobbles on top of it
  const headM = mul(
    shell,
    about(skel.neck.x, skel.neck.y, mul(translate(s.head.at.x - s.head.pivot.x, s.head.at.y - s.head.pivot.y), rotate(s.head.rot))),
  );
  const blink = Math.min(1, (face.close ?? 0) + blinkAt(t, who === "groom" ? 3 : who === "mother" ? 13 : 8));
  ops.push({ kind: "image", art: wear.head, m: headM, alpha: 1 });
  ops.push(...faceOps(who, headM, q(turn * 4), q(face.gaze ?? turn), q(face.look ?? 0), q(blink), q(face.smile ?? 0), q(face.blush ?? 0), q(haldi.face ?? 0)));
  if (wear.front && veiled) ops.push({ kind: "image", art: wear.front, m: headM, alpha: 1 });
  if (wear.crown) ops.push({ kind: "image", art: wear.crown, m: mul(headM, partMatrix(crownLocal(s))), alpha: 1 });

  if (leaves) {
    // the leaves and her forearms cover her face
    ops.push({ kind: "image", art: "paan", m: mul(shell, sprite(s.handL.x, s.handL.y, s.handAngL + 90 - 6, paan)), alpha: 1 });
    ops.push({ kind: "image", art: "paan", m: mul(shell, sprite(s.handR.x, s.handR.y, s.handAngR + 90 + 6, paan)), alpha: 1 });
    for (const [art, key] of wear.body) if (fronts(key)) ops.push({ kind: "image", art, m: mul(shell, partMatrix(s[key])), alpha: 1 });
  }

  if (opacity >= 0.999) return ops;
  return [{ kind: "group", alpha: opacity, bounds: boundsOf(shell, FIGURE_BOX), ops }];
};
