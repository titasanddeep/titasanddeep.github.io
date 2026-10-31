import { beforeAll, describe, expect, it } from "vitest";
import { ART, type ArtName } from "../src/art/manifest";
import { drawFrame } from "../src/render/canvas";
import { I, about, apply, mul, rotate, scale, sprite, translate } from "../src/render/mat";
import type { DrawOp } from "../src/render/ops";

const close = (a: readonly number[], b: readonly number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 9));

describe("mat", () => {
  it("mul applies the right operand first", () => {
    const m = mul(translate(10, 0), scale(2));
    expect(apply(m, { x: 1, y: 1 })).toEqual({ x: 12, y: 2 });
    expect(mul(I, m)).toEqual(m);
  });
  it("about rotates around a point", () => {
    const p = apply(about(10, 10, rotate(90)), { x: 20, y: 10 });
    expect(p.x).toBeCloseTo(10);
    expect(p.y).toBeCloseTo(20);
  });
  it("sprite equals translate·rotate·scale", () => {
    close(sprite(5, 6, 30, 2, 0.5), mul(translate(5, 6), mul(rotate(30), scale(1, 2))));
  });
});

type Call = [string, ...unknown[]];

const mockCtx = (log: Call[], w = 1080, h = 1920) => {
  const rec = (name: string) => (...a: unknown[]) => void log.push([name, ...a]);
  const props: Record<string, unknown> = {};
  const target: Record<string, unknown> = {
    canvas: { width: w, height: h },
    createLinearGradient: (...a: unknown[]) => {
      log.push(["createLinearGradient", ...a]);
      return { addColorStop: rec("addColorStop") };
    },
    createRadialGradient: (...a: unknown[]) => {
      log.push(["createRadialGradient", ...a]);
      return { addColorStop: rec("addColorStop") };
    },
  };
  for (const n of ["setTransform", "clearRect", "drawImage", "save", "restore", "beginPath", "rect", "clip", "fill", "stroke", "fillRect", "ellipse", "setLineDash"])
    target[n] = rec(n);
  return new Proxy(target, {
    get: (t, k: string) => (k in t ? t[k] : props[k]),
    set: (_t, k: string, v) => {
      props[k] = v;
      if (k === "globalAlpha") log.push(["globalAlpha", v]);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
};

beforeAll(() => {
  (globalThis as { Path2D?: unknown }).Path2D = class {
    constructor(public d: string) {}
  };
});

const art: ArtName = "bride-head";
const img = {} as CanvasImageSource;
const opts = (scaleBy = 1, extra = {}) => ({ scale: scaleBy, image: () => img, ...extra });

describe("drawFrame", () => {
  it("draws an image at its manifest rect under scale·m with alpha", () => {
    const log: Call[] = [];
    drawFrame(mockCtx(log), [{ kind: "image", art, m: translate(10, 20), alpha: 0.5 }], opts(0.5));
    const a = ART[art];
    expect(log[0]).toEqual(["setTransform", 1, 0, 0, 1, 0, 0]);
    expect(log.find((c) => c[0] === "clearRect")).toBeDefined();
    expect(log).toContainEqual(["setTransform", 0.5, 0, 0, 0.5, 5, 10]);
    expect(log).toContainEqual(["globalAlpha", 0.5]);
    expect(log).toContainEqual(["drawImage", img, a.x, a.y, a.w, a.h]);
  });

  it("skips alpha <= 0.002 and images that are not ready", () => {
    const log: Call[] = [];
    const ops: DrawOp[] = [
      { kind: "image", art, m: I, alpha: 0.002 },
      { kind: "rect", rect: { x: 0, y: 0, w: 1, h: 1 }, m: I, alpha: 0, fill: "red" },
      { kind: "image", art, m: I, alpha: 1 },
    ];
    drawFrame(mockCtx(log), ops, { scale: 1, image: () => null });
    expect(log.some((c) => c[0] === "drawImage" || c[0] === "fillRect")).toBe(false);
  });

  it("clips with its own matrix before applying the op matrix (rect and path)", () => {
    const rectLog: Call[] = [];
    drawFrame(mockCtx(rectLog), [{ kind: "image", art, m: translate(100, 100), alpha: 1, clip: { rect: { x: 1, y: 2, w: 3, h: 4 }, m: translate(7, 8) } }], opts(2));
    const names = rectLog.map((c) => c[0]);
    const iClip = names.indexOf("clip");
    expect(rectLog[iClip - 1]).toEqual(["rect", 1, 2, 3, 4]);
    expect(rectLog.slice(0, iClip).filter((c) => c[0] === "setTransform").pop()).toEqual(["setTransform", 2, 0, 0, 2, 14, 16]);
    const after = rectLog.slice(iClip).filter((c) => c[0] === "setTransform");
    expect(after[0]).toEqual(["setTransform", 2, 0, 0, 2, 200, 200]);
    expect(names.indexOf("save")).toBeLessThan(iClip);
    expect(names.indexOf("restore")).toBeGreaterThan(names.indexOf("drawImage"));

    const pathLog: Call[] = [];
    drawFrame(mockCtx(pathLog), [{ kind: "image", art, m: translate(100, 100), alpha: 1, clip: { path: "M0 0L9 9", m: scale(3) } }], opts(1));
    const pn = pathLog.map((c) => c[0]);
    const pc = pn.indexOf("clip");
    expect(pathLog[pc][1]).toMatchObject({ d: "M0 0L9 9" });
    expect(pathLog.slice(0, pc).filter((c) => c[0] === "setTransform").pop()).toEqual(["setTransform", 3, 0, 0, 3, 0, 0]);
    expect(pathLog.slice(pc).find((c) => c[0] === "setTransform")).toEqual(["setTransform", 1, 0, 0, 1, 100, 100]);
  });

  it("group uses one pooled offscreen canvas and composites with alpha", () => {
    const made: Call[][] = [];
    const createCanvas = (w: number, h: number) => {
      const log: Call[] = [];
      made.push(log);
      return { width: w, height: h, getContext: () => mockCtx(log, w, h) } as unknown as HTMLCanvasElement;
    };
    const group: DrawOp = {
      kind: "group",
      alpha: 0.4,
      bounds: { x: 10.2, y: 20.5, w: 100, h: 50 },
      ops: [{ kind: "image", art, m: I, alpha: 1 }],
    };
    const ctx = mockCtx([]);
    const log: Call[] = [];
    const main = mockCtx(log);
    drawFrame(main, [group, group], opts(1, { createCanvas }));
    drawFrame(ctx, [], opts());
    expect(made).toHaveLength(1);
    expect(made[0].filter((c) => c[0] === "drawImage")).toHaveLength(2);
    expect(made[0]).toContainEqual(["setTransform", 1, 0, 0, 1, -10, -20]);
    const composites = log.filter((c) => c[0] === "drawImage");
    expect(composites).toHaveLength(2);
    expect(composites[0].slice(0, 1)).toEqual(["drawImage"]);
    expect(composites[0].slice(2)).toEqual([0, 0, 101, 51, 10, 20, 101, 51]);
    expect(log).toContainEqual(["globalAlpha", 0.4]);
  });

  it("draws a group of alpha >= 0.999 directly", () => {
    const log: Call[] = [];
    drawFrame(mockCtx(log), [{ kind: "group", alpha: 1, bounds: { x: 0, y: 0, w: 5, h: 5 }, ops: [{ kind: "image", art, m: I, alpha: 1 }] }], {
      ...opts(),
      createCanvas: () => {
        throw new Error("no offscreen expected");
      },
    });
    expect(log.filter((c) => c[0] === "drawImage")).toHaveLength(1);
  });

  it("caches Path2D per string and gradients per key", () => {
    const log: Call[] = [];
    const ctx = mockCtx(log);
    const grad = { linear: [0, 0, 1, 1], stops: [[0, "#000"], [1, "#fff"]] } as const;
    const ops: DrawOp[] = [
      { kind: "path", d: "M0 0L5 5", m: I, alpha: 1, fill: { linear: [0, 0, 1, 1], stops: [[0, "#000"], [1, "#fff"]] } },
      { kind: "path", d: "M0 0L5 5", m: I, alpha: 1, stroke: { paint: "red", width: 2, dash: [1, 2] } },
      { kind: "ellipse", cx: 0, cy: 0, rx: 1, ry: 2, m: I, alpha: 1, fill: { radial: [0, 0, 0, 0, 0, 5], stops: [[0, "#fff"]] } },
    ];
    drawFrame(ctx, ops, opts());
    drawFrame(ctx, ops, opts());
    void grad;
    const fills = log.filter((c) => c[0] === "fill");
    expect(fills[0][1]).toBe(fills[2][1]);
    const strokes = log.filter((c) => c[0] === "stroke");
    expect(strokes[0][1]).toBe(fills[0][1]);
    expect(log.filter((c) => c[0] === "createLinearGradient")).toHaveLength(1);
    expect(log.filter((c) => c[0] === "createRadialGradient")).toHaveLength(1);
    expect(log).toContainEqual(["setLineDash", [1, 2]]);
  });
});
