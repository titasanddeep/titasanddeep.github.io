import { mul, type Mat } from "../../render/mat";
import type { DrawOp, Paint, Rect } from "../../render/ops";

/** `#rrggbb` + alpha as a CSS colour (SVG `fillOpacity` / `strokeOpacity` / `stopOpacity`). */
export const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const NUM = /[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi;
const STEPS = 48;

type Pt = readonly [number, number];

/** Length of an arc given SVG endpoint parameters (flattened; circular and elliptical arcs). */
const arcLength = (p0: Pt, rx: number, ry: number, rotDeg: number, large: boolean, sweep: boolean, p1: Pt): number => {
  if (rx === 0 || ry === 0 || (p0[0] === p1[0] && p0[1] === p1[1])) return Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  const phi = (rotDeg * Math.PI) / 180;
  const cp = Math.cos(phi);
  const sp = Math.sin(phi);
  const dx = (p0[0] - p1[0]) / 2;
  const dy = (p0[1] - p1[1]) / 2;
  const x1 = cp * dx + sp * dy;
  const y1 = -sp * dx + cp * dy;
  let arx = Math.abs(rx);
  let ary = Math.abs(ry);
  const lam = (x1 * x1) / (arx * arx) + (y1 * y1) / (ary * ary);
  if (lam > 1) {
    arx *= Math.sqrt(lam);
    ary *= Math.sqrt(lam);
  }
  const num = arx * arx * ary * ary - arx * arx * y1 * y1 - ary * ary * x1 * x1;
  const den = arx * arx * y1 * y1 + ary * ary * x1 * x1;
  const co = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (co * arx * y1) / ary;
  const cyp = (-co * ary * x1) / arx;
  const ang = (ux: number, uy: number, vx: number, vy: number): number => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = ang(1, 0, (x1 - cxp) / arx, (y1 - cyp) / ary);
  let dt = ang((x1 - cxp) / arx, (y1 - cyp) / ary, (-x1 - cxp) / arx, (-y1 - cyp) / ary);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  let len = 0;
  let prev: Pt | null = null;
  for (let i = 0; i <= STEPS; i++) {
    const t = t1 + (dt * i) / STEPS;
    const px = arx * Math.cos(t);
    const py = ary * Math.sin(t);
    const q: Pt = [cp * px - sp * py + cxp * cp - cyp * sp + (p0[0] + p1[0]) / 2, sp * px + cp * py + cxp * sp + cyp * cp + (p0[1] + p1[1]) / 2];
    if (prev) len += Math.hypot(q[0] - prev[0], q[1] - prev[1]);
    prev = q;
  }
  return len;
};

/**
 * Length of an SVG path (M L H V C Q A Z, absolute and relative), flattened. The browser uses the true length for
 * `pathLength=1` dashes; this agrees to well under a pixel, which is all a self-drawing stroke needs.
 */
export const pathLength = (d: string): number => {
  const cmds = d.match(/[a-zA-Z][^a-zA-Z]*/g) ?? [];
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let len = 0;
  for (const c of cmds) {
    const cmd = c[0];
    const v = (c.slice(1).match(NUM) ?? []).map(Number);
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    const line = (nx: number, ny: number): void => {
      len += Math.hypot(nx - x, ny - y);
      x = nx;
      y = ny;
    };
    switch (cmd.toUpperCase()) {
      case "M":
        x = v[0] + ox;
        y = v[1] + oy;
        sx = x;
        sy = y;
        for (let i = 2; i + 1 < v.length; i += 2) line(v[i] + ox, v[i + 1] + oy);
        break;
      case "L":
        for (let i = 0; i + 1 < v.length; i += 2) line(v[i] + (rel ? x : 0), v[i + 1] + (rel ? y : 0));
        break;
      case "H":
        for (const h of v) line(h + (rel ? x : 0), y);
        break;
      case "V":
        for (const w of v) line(x, w + (rel ? y : 0));
        break;
      case "C":
        for (let i = 0; i + 5 < v.length; i += 6) {
          const bx = rel ? x : 0;
          const by = rel ? y : 0;
          const p = [x, y, v[i] + bx, v[i + 1] + by, v[i + 2] + bx, v[i + 3] + by, v[i + 4] + bx, v[i + 5] + by];
          for (let s = 1; s <= STEPS; s++) {
            const t = s / STEPS;
            const u = 1 - t;
            const a = u * u * u;
            const b = 3 * u * u * t;
            const cc = 3 * u * t * t;
            const dd = t * t * t;
            line(a * p[0] + b * p[2] + cc * p[4] + dd * p[6], a * p[1] + b * p[3] + cc * p[5] + dd * p[7]);
          }
        }
        break;
      case "Q":
        for (let i = 0; i + 3 < v.length; i += 4) {
          const bx = rel ? x : 0;
          const by = rel ? y : 0;
          const p = [x, y, v[i] + bx, v[i + 1] + by, v[i + 2] + bx, v[i + 3] + by];
          for (let s = 1; s <= STEPS; s++) {
            const t = s / STEPS;
            const u = 1 - t;
            line(u * u * p[0] + 2 * u * t * p[2] + t * t * p[4], u * u * p[1] + 2 * u * t * p[3] + t * t * p[5]);
          }
        }
        break;
      case "A":
        for (let i = 0; i + 6 < v.length; i += 7) {
          const nx = v[i + 5] + (rel ? x : 0);
          const ny = v[i + 6] + (rel ? y : 0);
          len += arcLength([x, y], v[i], v[i + 1], v[i + 2], v[i + 3] !== 0, v[i + 4] !== 0, [nx, ny]);
          x = nx;
          y = ny;
        }
        break;
      case "Z":
        line(sx, sy);
        break;
      default:
        break;
    }
  }
  return len;
};

/** A path that draws itself: SVG `pathLength=1` + `strokeDasharray=1` + `strokeDashoffset=1-p`, with the real length `len`. */
export const drawnPath = (d: string, len: number, p: number, m: Mat, paint: Paint, width: number, alpha = 1): DrawOp | null =>
  p <= 0.001
    ? null
    : { kind: "path", d, m, alpha, stroke: { paint, width, cap: "round", join: "round", dash: [len, len], dashOffset: len * (1 - p) } };

/** Axis-aligned bounds (frame coordinates) of the local rectangle `r` under `m`, grown by `pad`. */
export const boundsOf = (m: Mat, r: Rect, pad = 2): Rect => {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [px, py] of [
    [r.x, r.y],
    [r.x + r.w, r.y],
    [r.x, r.y + r.h],
    [r.x + r.w, r.y + r.h],
  ]) {
    xs.push(m[0] * px + m[2] * py + m[4]);
    ys.push(m[1] * px + m[3] * py + m[5]);
  }
  const x0 = Math.min(...xs) - pad;
  const y0 = Math.min(...ys) - pad;
  return { x: x0, y: y0, w: Math.max(...xs) + pad - x0, h: Math.max(...ys) + pad - y0 };
};

/** `m · n` helper that reads like the CSS it replaces. */
export const compose = (...ms: Mat[]): Mat => ms.reduce((a, b) => mul(a, b));

/** The soft gold glow gradient (`glow-grad` in the old SharedDefs) centred on (cx, cy) with radius r. */
export const glowPaint = (cx: number, cy: number, r: number): Paint => ({
  radial: [cx, cy, 0, cx, cy, r],
  stops: [
    [0, "rgba(249,226,160,0.9)"],
    [0.45, "rgba(241,196,99,0.35)"],
    [1, "rgba(241,196,99,0)"],
  ],
});
