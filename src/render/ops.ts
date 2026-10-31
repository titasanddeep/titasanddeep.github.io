import type { ArtName } from "../art/manifest";
import type { Mat } from "./mat";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A clip region: a rectangle or SVG path in local coordinates under its own matrix `m` (final, frame coordinates). */
export type Clip = { rect: Rect; m: Mat } | { path: string; m: Mat };

export type Paint =
  | string // CSS colour
  | { linear: [x0: number, y0: number, x1: number, y1: number]; stops: [offset: number, color: string][] }
  | { radial: [x0: number, y0: number, r0: number, x1: number, y1: number, r1: number]; stops: [number, string][] };

export interface Stroke {
  paint: Paint;
  width: number;
  cap?: CanvasLineCap;
  join?: CanvasLineJoin;
  dash?: number[];
  dashOffset?: number;
}

export type DrawOp =
  /** ART[art] drawn at its manifest rect (x,y,w,h) in local coordinates, under m. clip has its own matrix. */
  | { kind: "image"; art: ArtName; m: Mat; alpha: number; clip?: Clip }
  /** SVG path data in local coordinates under m (fill and/or stroke). */
  | { kind: "path"; d: string; m: Mat; alpha: number; fill?: Paint; stroke?: Stroke; clip?: Clip }
  /** Circle / ellipse (cheaper than a path for glows and discs). */
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number; m: Mat; alpha: number; fill: Paint; clip?: Clip }
  /** Axis-aligned rectangle (washes, card backgrounds). */
  | { kind: "rect"; rect: Rect; m: Mat; alpha: number; fill: Paint; radius?: number; clip?: Clip }
  /**
   * Group opacity (SVG <g opacity> semantics): children are drawn at full alpha into a pooled offscreen canvas of
   * `bounds` (frame coordinates, rounded out) and composited with `alpha`. Use ONLY where overlapping children make
   * per-op alpha visibly wrong (e.g. the lotus fading in). `alpha >= 0.999` → children drawn directly.
   */
  | { kind: "group"; alpha: number; bounds: Rect; ops: DrawOp[] };
