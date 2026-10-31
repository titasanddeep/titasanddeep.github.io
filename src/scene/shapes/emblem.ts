import { mul, scale, translate, type Mat } from "../../render/mat";
import type { DrawOp } from "../../render/ops";
import { lotusOps } from "./lotus";
import { boundsOf, glowPaint } from "./util";

const SINDOOR = "#781f2b";
const GOLD = "#c49a52";

export interface EmblemOptions {
  /** Lotus bloom, 0..1 (default fully open). */
  bloom?: number;
  /** 0..1 ring halo, drawn as the ornament wakes (default 1). */
  halo?: number;
}

const ring = (r: number): string => `M${r} 0A${r} ${r} 0 1 1 ${-r} 0A${r} ${r} 0 1 1 ${r} 0Z`;

/**
 * The gold-on-sindoor lotus medallion that opens the invitation. `opacity` is the SVG `<g opacity>` (a group op when
 * it is below 1, because the halo and disc overlap). `m` is the parent matrix (the camera, or identity).
 */
export const emblemOps = (x: number, y: number, scaleBy: number, opacity: number, m: Mat, { bloom = 1, halo = 1 }: EmblemOptions = {}): DrawOp[] => {
  if (opacity <= 0.002) return [];
  const em = mul(m, mul(translate(x, y), scale(scaleBy)));
  const ops: DrawOp[] = [];
  if (halo > 0.01) ops.push({ kind: "ellipse", cx: 0, cy: 0, rx: 150, ry: 150, m: em, alpha: 0.7 * halo, fill: glowPaint(0, 0, 150) });
  ops.push({ kind: "ellipse", cx: 0, cy: 0, rx: 92, ry: 92, m: em, alpha: 1, fill: SINDOOR });
  ops.push({ kind: "path", d: ring(92), m: em, alpha: 1, stroke: { paint: GOLD, width: 6 } });
  ops.push({ kind: "path", d: ring(78), m: em, alpha: 1, stroke: { paint: GOLD, width: 2.4, cap: "round", dash: [1, 10] } });
  ops.push({ kind: "path", d: ring(66), m: em, alpha: 1, stroke: { paint: "rgba(230,200,128,0.7)", width: 1.6 } });
  ops.push(...lotusOps(mul(em, mul(translate(0, 50), scale(0.33))), { bloom, tone: "gold" }));
  if (opacity >= 0.999) return ops;
  return [{ kind: "group", alpha: opacity, bounds: boundsOf(em, { x: -156, y: -156, w: 312, h: 312 }, 4), ops }];
};
