import { mul, rotate, type Mat } from "../../render/mat";
import type { DrawOp, Paint, Rect } from "../../render/ops";
import { boundsOf, rgba } from "./util";

const INK = "#30251f";

interface Layer {
  count: number;
  spread: number;
  len: number;
  wid: number;
  open: number;
}

const LAYERS: readonly Layer[] = [
  { count: 7, spread: 168, len: 235, wid: 62, open: 1 },
  { count: 6, spread: 120, len: 205, wid: 56, open: 0.85 },
  { count: 5, spread: 78, len: 170, wid: 50, open: 0.6 },
  { count: 3, spread: 36, len: 130, wid: 42, open: 0.35 },
];

const petalPath = (len: number, wid: number): string =>
  `M0 0C${wid} ${-len * 0.28} ${wid * 0.78} ${-len * 0.8} 0 ${-len}C${-wid * 0.78} ${-len * 0.8} ${-wid} ${-len * 0.28} 0 0Z`;

/** Local rectangle that contains the whole lotus (glow, petals, sepals, stamens) at any bloom. */
export const LOTUS_BOX: Rect = { x: -330, y: -460, w: 660, h: 680 };

export interface LotusOptions {
  /** 0 = closed bud, 1 = fully open. */
  bloom: number;
  /** Warm gold glow behind the flower, 0..1. */
  glow?: number;
  /** "pink" (sindoor-rose) or "gold" (ornament). */
  tone?: "pink" | "gold";
}

/**
 * A stylised lotus whose petals fan open with `bloom`, drawn with its stem point at the origin of `m` (so `m` already
 * holds the lotus translate and scale). The `<g opacity>` of the stamens is a group op; a caller that fades the whole
 * lotus wraps it in its own group.
 */
export const lotusOps = (m: Mat, { bloom, glow = 0, tone = "pink" }: LotusOptions): DrawOp[] => {
  const pink = tone === "pink";
  const base = pink ? "#fbeee6" : "#f6e2a8";
  const mid = pink ? "#eaa3a8" : "#e0bf6e";
  const tip = pink ? "#c4566a" : "#b98a36";
  const edge = pink ? "#781f2b" : "#8a6422";
  const petalFill = (len: number): Paint => ({
    linear: [0, 0, 0, -len],
    stops: [
      [0, base],
      [0.55, mid],
      [1, tip],
    ],
  });
  const ops: DrawOp[] = [];

  if (glow > 0.002) {
    ops.push({
      kind: "ellipse",
      cx: 0,
      cy: -130,
      rx: 330,
      ry: 330,
      m,
      alpha: glow,
      fill: {
        radial: [0, -130, 0, 0, -130, 330],
        stops: [
          [0, "rgba(247,220,152,0.85)"],
          [1, "rgba(247,220,152,0)"],
        ],
      },
    });
  }
  const leaf = (s: 1 | -1): DrawOp => ({
    kind: "path",
    d: `M0 6C${70 * s} 8 ${150 * s} -4 ${190 * s} -40C${120 * s} -52 ${50 * s} -34 0 6Z`,
    m,
    alpha: 1,
    fill: rgba("#4f6b4a", 0.85),
    stroke: { paint: rgba(INK, 0.4), width: 2 },
  });
  ops.push(leaf(-1), leaf(1));

  for (const layer of LAYERS) {
    for (let i = 0; i < layer.count; i++) {
      const f = layer.count === 1 ? 0 : i / (layer.count - 1) - 0.5;
      const angle = Number((f * layer.spread * (0.18 + 0.82 * bloom)).toFixed(2));
      const len = layer.len * (0.62 + 0.38 * bloom);
      const wid = layer.wid * (0.7 + 0.3 * layer.open * bloom);
      const pm = mul(m, rotate(angle));
      ops.push({ kind: "path", d: petalPath(len, wid), m: pm, alpha: 1, fill: petalFill(len), stroke: { paint: rgba(edge, 0.55), width: 2.2 } });
      ops.push({ kind: "path", d: `M0 -8L0 ${-len * 0.78}`, m: pm, alpha: 1, stroke: { paint: rgba(edge, 0.3), width: 1.6 } });
      ops.push({
        kind: "path",
        d: `M${-wid * 0.3} -20C${-wid * 0.35} ${-len * 0.4} ${-wid * 0.22} ${-len * 0.65} 0 ${-len * 0.86}`,
        m: pm,
        alpha: 1,
        stroke: { paint: rgba(edge, 0.18), width: 1.4 },
      });
    }
  }

  const stamens: DrawOp[] = [];
  for (let i = 0; i < 9; i++) {
    const sm = mul(m, rotate((i / 8 - 0.5) * 70));
    stamens.push({ kind: "path", d: "M0 -4L0 -62", m: sm, alpha: 1, stroke: { paint: "#c49a52", width: 3, cap: "round" } });
    stamens.push({ kind: "ellipse", cx: 0, cy: -66, rx: 5, ry: 5, m: sm, alpha: 1, fill: "#c49a52" });
  }
  ops.push({ kind: "group", alpha: Math.min(1, 0.4 + 0.6 * bloom), bounds: boundsOf(m, { x: -60, y: -80, w: 120, h: 90 }, 6), ops: stamens });
  return ops;
};

/** Bounds (frame coordinates) of the whole lotus under `m`, for a fading group. */
export const lotusBounds = (m: Mat): Rect => boundsOf(m, LOTUS_BOX, 4);
