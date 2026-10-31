/**
 * Small helpers the scene builders share: the full-frame cross-fade group, soft gold discs, clipping a run of ops (the
 * mirror's reflection), and a sampler that finds a point along a path (the alta brush follows the line it draws).
 */
import type { Mat } from "../render/mat";
import type { Clip, DrawOp, Paint, Rect } from "../render/ops";
import type { Pt } from "../story/layout";
import { SCENE_BEATS, SCENE_FADE_IN, SCENE_OVERLAP, type SceneId } from "../story/timeline";
import { MIN_ALPHA } from "./sprites";

export const FRAME_BOX: Rect = { x: 0, y: 0, w: 1080, h: 1920 };

/** Whether a scene draws at a scene-local beat: from its start through its overlap under the next scene. */
export const sceneLive = (id: SceneId, local: number): boolean => local >= 0 && local < SCENE_BEATS[id].end - SCENE_BEATS[id].start + SCENE_OVERLAP[id];

/** 0..1 the scene fading in over the previous one (its first SCENE_FADE_IN beats). */
export const sceneFade = (id: SceneId, local: number): number => (SCENE_FADE_IN[id] > 0 ? Math.min(1, Math.max(0, local / SCENE_FADE_IN[id])) : 1);

/** Ops drawn at a group opacity (ONE full-frame group, so overlapping parts never show through each other). */
export const faded = (ops: DrawOp[], alpha: number, bounds: Rect = FRAME_BOX): DrawOp[] => {
  if (alpha <= MIN_ALPHA || ops.length === 0) return [];
  if (alpha >= 0.999) return ops;
  return [{ kind: "group", alpha, bounds, ops }];
};

/** Drops ops that would be skipped anyway (alpha ≤ 0.002), keeping groups. */
export const visible = (ops: DrawOp[]): DrawOp[] => ops.filter((op) => op.kind === "group" || op.alpha > MIN_ALPHA);

/** A soft gold disc of light: `radial-gradient(circle, …)` on a 2r box (farthest-corner radius r·√2), clipped to the disc. */
export const glowDisc = (x: number, y: number, r: number, alpha: number, m: Mat): DrawOp[] =>
  alpha > MIN_ALPHA
    ? [
        {
          kind: "ellipse",
          cx: x,
          cy: y,
          rx: r,
          ry: r,
          m,
          alpha,
          fill: {
            radial: [x, y, 0, x, y, r * Math.SQRT2],
            stops: [
              [0, "rgba(249,226,160,.9)"],
              [0.45, "rgba(241,196,99,.35)"],
              [0.7, "rgba(241,196,99,0)"],
            ],
          },
        },
      ]
    : [];

/** A rectangle of colour over a set (washes, the dark before dawn). `paint` is in set coordinates. */
export const wash = (paint: Paint, alpha: number, m: Mat, rect: Rect = FRAME_BOX): DrawOp[] =>
  alpha > MIN_ALPHA ? [{ kind: "rect", rect, m, alpha, fill: paint }] : [];

/** Every op (and every op inside groups) clipped to `clip`, keeping clips the ops already have (the eyes' own). */
export const clipped = (ops: readonly DrawOp[], clip: Clip): DrawOp[] =>
  ops.map((op): DrawOp => (op.kind === "group" ? { ...op, ops: clipped(op.ops, clip) } : op.clip ? op : { ...op, clip }));

/** An ellipse as SVG path data (for clips and stroked rings). */
export const ellipsePath = (cx: number, cy: number, rx: number, ry: number): string =>
  `M${cx + rx} ${cy}A${rx} ${ry} 0 1 1 ${cx - rx} ${cy}A${rx} ${ry} 0 1 1 ${cx + rx} ${cy}Z`;

/** A unit ring (radius 1, flattened to 0.3 in y), stroked and scaled by its matrix: ripples on the water. */
export const RIPPLE = ellipsePath(0, 0, 1, 0.3);

/**
 * Samples a path made of absolute M, L, C and Z commands: `at(t)` is the point at fraction t of its length. Built once
 * per path (the alta outlines are constants).
 */
export const pathSampler = (d: string): { at: (t: number) => Pt; length: number } => {
  const pts: Pt[] = [];
  const cmds = d.match(/[MLCZ][^MLCZ]*/g) ?? [];
  let cur: Pt = { x: 0, y: 0 };
  let start: Pt = cur;
  for (const c of cmds) {
    const v = (c.slice(1).match(/[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi) ?? []).map(Number);
    if (c[0] === "M") {
      cur = { x: v[0], y: v[1] };
      start = cur;
      pts.push(cur);
    } else if (c[0] === "L") {
      for (let i = 0; i + 1 < v.length; i += 2) {
        cur = { x: v[i], y: v[i + 1] };
        pts.push(cur);
      }
    } else if (c[0] === "C") {
      for (let i = 0; i + 5 < v.length; i += 6) {
        const p0 = cur;
        for (let s = 1; s <= 24; s++) {
          const t = s / 24;
          const u = 1 - t;
          pts.push({
            x: u * u * u * p0.x + 3 * u * u * t * v[i] + 3 * u * t * t * v[i + 2] + t * t * t * v[i + 4],
            y: u * u * u * p0.y + 3 * u * u * t * v[i + 1] + 3 * u * t * t * v[i + 3] + t * t * t * v[i + 5],
          });
        }
        cur = { x: v[i + 4], y: v[i + 5] };
      }
    } else {
      pts.push(start);
      cur = start;
    }
  }
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const length = cum[cum.length - 1];
  return {
    length,
    at: (t: number): Pt => {
      const target = Math.min(1, Math.max(0, t)) * length;
      let i = 1;
      while (i < cum.length - 1 && cum[i] < target) i++;
      const seg = cum[i] - cum[i - 1] || 1;
      const k = (target - cum[i - 1]) / seg;
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k };
    },
  };
};
