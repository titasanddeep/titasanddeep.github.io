import { ART, type ArtName } from "../art/manifest";
import { I, mul, scale as scaleMat, translate, type Mat } from "./mat";
import type { DrawOp, Paint, Rect } from "./ops";

type Canvas2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type Surface = HTMLCanvasElement | OffscreenCanvas;

export interface DrawOptions {
  /** Backing-store pixels per composition pixel. */
  scale: number;
  /** The decoded image for a manifest name, or null while it is not ready (the op is skipped). */
  image: (art: ArtName) => CanvasImageSource | null;
  /** Creates an offscreen surface for group opacity (default: a DOM canvas, or OffscreenCanvas without a DOM). */
  createCanvas?: (width: number, height: number) => Surface;
}

/** Ops at or below this opacity are not drawn. */
export const MIN_ALPHA = 0.002;

interface Pooled {
  surface: Surface;
  ctx: Canvas2D;
}

/** Per-context caches: gradients (by JSON key) and the pooled offscreen canvases (by depth and size). */
interface State {
  gradients: Map<string, CanvasGradient>;
  pool: Map<string, Pooled>;
}

const states = new WeakMap<object, State>();
const stateOf = (ctx: object): State => {
  let s = states.get(ctx);
  if (!s) {
    s = { gradients: new Map(), pool: new Map() };
    states.set(ctx, s);
  }
  return s;
};

const paths = new Map<string, Path2D>();
/** One Path2D per path string. */
const pathFor = (d: string): Path2D => {
  let p = paths.get(d);
  if (!p) {
    p = new Path2D(d);
    paths.set(d, p);
  }
  return p;
};

const paintStyle = (ctx: Canvas2D, paint: Paint): string | CanvasGradient => {
  if (typeof paint === "string") return paint;
  const state = stateOf(ctx);
  const key = JSON.stringify(paint);
  let g = state.gradients.get(key);
  if (!g) {
    if ("linear" in paint) {
      const [x0, y0, x1, y1] = paint.linear;
      g = ctx.createLinearGradient(x0, y0, x1, y1);
    } else {
      const [x0, y0, r0, x1, y1, r1] = paint.radial;
      g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
    }
    for (const [offset, color] of paint.stops) g.addColorStop(offset, color);
    state.gradients.set(key, g);
  }
  return g;
};

const defaultCanvas = (width: number, height: number): Surface => {
  if (typeof document !== "undefined") {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    return c;
  }
  return new OffscreenCanvas(width, height);
};

const roundedRect = (ctx: Canvas2D, r: Rect, radius: number): void => {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(r.x, r.y, r.w, r.h, radius);
    return;
  }
  const k = Math.min(radius, r.w / 2, r.h / 2);
  ctx.moveTo(r.x + k, r.y);
  ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + r.h, k);
  ctx.arcTo(r.x + r.w, r.y + r.h, r.x, r.y + r.h, k);
  ctx.arcTo(r.x, r.y + r.h, r.x, r.y, k);
  ctx.arcTo(r.x, r.y, r.x + r.w, r.y, k);
  ctx.closePath();
};

const set = (ctx: Canvas2D, m: Mat): void => ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);

const drawOps = (ctx: Canvas2D, ops: readonly DrawOp[], base: Mat, opts: DrawOptions, depth: number, root: Canvas2D): void => {
  for (const op of ops) {
    if (op.alpha <= MIN_ALPHA) continue;

    if (op.kind === "group") {
      if (op.alpha >= 0.999) {
        drawOps(ctx, op.ops, base, opts, depth, root);
        continue;
      }
      const s = opts.scale;
      const bx = Math.floor(op.bounds.x);
      const by = Math.floor(op.bounds.y);
      const bw = Math.ceil(op.bounds.x + op.bounds.w) - bx;
      const bh = Math.ceil(op.bounds.y + op.bounds.h) - by;
      const pw = Math.max(1, Math.ceil(bw * s));
      const ph = Math.max(1, Math.ceil(bh * s));
      const pool = stateOf(root).pool;
      const key = `${depth}:${pw}x${ph}`;
      let off = pool.get(key);
      if (!off) {
        const surface = (opts.createCanvas ?? defaultCanvas)(pw, ph);
        const octx = surface.getContext("2d") as Canvas2D | null;
        if (!octx) continue;
        off = { surface, ctx: octx };
        pool.set(key, off);
      }
      off.ctx.setTransform(1, 0, 0, 1, 0, 0);
      off.ctx.globalAlpha = 1;
      off.ctx.clearRect(0, 0, pw, ph);
      drawOps(off.ctx, op.ops, mul(scaleMat(s), translate(-bx, -by)), opts, depth + 1, root);
      off.ctx.globalAlpha = 1;
      set(ctx, base);
      ctx.globalAlpha = op.alpha;
      ctx.drawImage(off.surface, 0, 0, pw, ph, bx, by, bw, bh);
      ctx.globalAlpha = 1;
      continue;
    }

    let img: CanvasImageSource | null = null;
    if (op.kind === "image") {
      img = opts.image(op.art);
      if (!img) continue;
    }

    const clip = op.clip;
    if (clip) {
      ctx.save();
      set(ctx, mul(base, clip.m));
      if ("path" in clip) {
        ctx.clip(pathFor(clip.path));
      } else {
        ctx.beginPath();
        ctx.rect(clip.rect.x, clip.rect.y, clip.rect.w, clip.rect.h);
        ctx.clip();
      }
    }
    set(ctx, mul(base, op.m));
    ctx.globalAlpha = op.alpha;

    switch (op.kind) {
      case "image": {
        const a = ART[op.art];
        ctx.drawImage(img as CanvasImageSource, a.x, a.y, a.w, a.h);
        break;
      }
      case "path": {
        const p = pathFor(op.d);
        if (op.fill !== undefined) {
          ctx.fillStyle = paintStyle(ctx, op.fill);
          ctx.fill(p);
        }
        if (op.stroke) {
          const st = op.stroke;
          ctx.strokeStyle = paintStyle(ctx, st.paint);
          ctx.lineWidth = st.width;
          ctx.lineCap = st.cap ?? "butt";
          ctx.lineJoin = st.join ?? "miter";
          ctx.setLineDash(st.dash ?? []);
          ctx.lineDashOffset = st.dashOffset ?? 0;
          ctx.stroke(p);
        }
        break;
      }
      case "ellipse":
        ctx.fillStyle = paintStyle(ctx, op.fill);
        ctx.beginPath();
        ctx.ellipse(op.cx, op.cy, op.rx, op.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "rect":
        ctx.fillStyle = paintStyle(ctx, op.fill);
        if (op.radius) {
          roundedRect(ctx, op.rect, op.radius);
          ctx.fill();
        } else {
          ctx.fillRect(op.rect.x, op.rect.y, op.rect.w, op.rect.h);
        }
        break;
    }

    if (clip) ctx.restore();
    ctx.globalAlpha = 1;
  }
};

/**
 * Clears the canvas and draws `ops` back to front. Matrices are final frame coordinates; `scale` maps the 1080×1920
 * frame to the backing store. Allocates nothing per frame once its caches (paths, gradients, offscreen canvases) are warm.
 */
export const drawFrame = (ctx: CanvasRenderingContext2D, ops: readonly DrawOp[], opts: DrawOptions): void => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawOps(ctx, ops, scaleMat(opts.scale), opts, 0, ctx);
  ctx.setTransform(...I);
};
