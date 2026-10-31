import { describe, expect, it } from "vitest";
import { ART } from "../src/art/manifest";
import { t } from "../src/content/translations";
import { wedding } from "../src/content/wedding";
import { ALL_ART, describeFrame, type FrameContext } from "../src/scene/frame";
import type { DrawOp } from "../src/render/ops";
import type { HotspotAction } from "../src/render/overlay";
import { COVER_FRAME, guidedHoldFrame, LAST_FRAME, previousScene, SCENE_ORDER } from "../src/story/timeline";

const ctxOf = (lang: "bn" | "en", reducedMotion: boolean, awaiting: HotspotAction | null = null, interactive = true): FrameContext => ({
  lang,
  text: t(lang),
  wedding,
  reducedMotion,
  interactive,
  guided: { enabled: awaiting !== null, awaiting },
});

/** Every op, with group children flattened in. */
const flat = (ops: readonly DrawOp[]): DrawOp[] => ops.flatMap((o) => (o.kind === "group" ? [o, ...flat(o.ops)] : [o]));

const frames = (step: number, from = 0, to = LAST_FRAME): number[] => {
  const out: number[] = [];
  for (let f = from; f <= to; f += step) out.push(f);
  if (out[out.length - 1] !== to) out.push(to);
  return out;
};

const variants = [
  ["bn", false],
  ["en", false],
  ["bn", true],
  ["en", true],
] as const;

/** Where Explore holds before offering each stop (the haldi bowl is offered on the very first frame). */
const offeredAt = (stop: HotspotAction): number => {
  const prev = previousScene(stop);
  return prev ? guidedHoldFrame(prev) : 0;
};

describe("describeFrame", () => {
  it("is pure: the same frame gives the same output twice, in every language and motion mode", () => {
    for (const [lang, reduced] of variants) {
      const ctx = ctxOf(lang, reduced);
      for (const f of frames(149)) {
        const a = JSON.stringify(describeFrame(f, ctx));
        describeFrame((f + 1700) % LAST_FRAME, ctx);
        expect(JSON.stringify(describeFrame(f, ctx)), `frame ${f}`).toBe(a);
      }
    }
  });

  it("returns the same overlay ids on every frame", () => {
    const ids = (f: number, ctx: FrameContext) => describeFrame(f, ctx).overlay.map((o) => o.id);
    for (const ctx of [ctxOf("bn", false), ctxOf("en", true), ctxOf("bn", false, "wedding"), ctxOf("en", false, "invitation")]) {
      const first = ids(0, ctx);
      expect(new Set(first).size).toBe(first.length);
      for (const f of frames(37)) expect(ids(f, ctx), `frame ${f}`).toEqual(first);
    }
    const first = ids(0, ctxOf("bn", false));
    for (const scene of SCENE_ORDER) expect(first).toContain(`hotspot-${scene}`);
    expect(first).toContain("guide-caption");
    expect(first.some((id) => id.startsWith("card-w"))).toBe(true);
    expect(first.some((id) => /reception/.test(id))).toBe(false);
  });

  it("only draws images that are in ALL_ART and the art manifest", () => {
    expect(new Set(ALL_ART).size).toBe(ALL_ART.length);
    for (const art of ALL_ART) expect(ART[art]).toBeDefined();
    for (const [lang, reduced] of variants) {
      for (const f of frames(53)) {
        for (const op of flat(describeFrame(f, ctxOf(lang, reduced)).draw)) {
          if (op.kind === "image") expect(ART[op.art], `frame ${f}: ${op.art}`).toBeDefined();
        }
      }
    }
  });

  it("never emits an op that would be skipped, nor a non-finite matrix", () => {
    for (const [lang, reduced] of variants) {
      for (const f of frames(41)) {
        for (const op of flat(describeFrame(f, ctxOf(lang, reduced)).draw)) {
          expect(op.alpha, `frame ${f} ${op.kind}`).toBeGreaterThan(0.002);
          if (op.kind !== "group") expect(op.m.every(Number.isFinite), `frame ${f} ${op.kind}`).toBe(true);
        }
      }
    }
  });

  it("starts with the paper and keeps the atmosphere out of reduced motion", () => {
    const { draw } = describeFrame(COVER_FRAME, ctxOf("bn", false));
    expect(draw[0]).toMatchObject({ kind: "image", art: "paper" });
    for (const f of frames(97)) {
      const ops = flat(describeFrame(f, ctxOf("bn", true)).draw);
      expect(ops.some((o) => o.kind === "image" && o.art === "mote"), `frame ${f}`).toBe(false);
    }
  });

  it("offers each Explore stop only at its hold, with its caption, and never in renders", () => {
    for (const stop of SCENE_ORDER) {
      const f = offeredAt(stop);
      const out = describeFrame(f, ctxOf("bn", false, stop));
      const shown = out.overlay.filter((o) => o.kind === "hotspot" && o.visible).map((o) => o.id);
      expect(shown, stop).toEqual([`hotspot-${stop}`]);
      const caption = out.overlay.find((o) => o.id === "guide-caption");
      if (stop !== "invitation") expect(caption?.kind === "text" && caption.opacity === 1 && caption.text.length > 0, stop).toBe(true);
      // not offered when nothing is awaited, and never in a video render
      expect(describeFrame(f, ctxOf("bn", false)).overlay.some((o) => o.kind === "hotspot" && o.visible)).toBe(false);
      expect(describeFrame(f, ctxOf("bn", false, stop, false)).overlay.some((o) => o.kind === "hotspot" && o.visible)).toBe(false);
    }
  });

  it("ends on the card: the wedding only, the family's line, the map link exactly", () => {
    for (const lang of ["bn", "en"] as const) {
      const out = describeFrame(LAST_FRAME, ctxOf(lang, false));
      const text = (id: string) => out.overlay.find((o) => o.id === id);
      expect(text("card-i-wedding-label")).toMatchObject({ text: t(lang).weddingLabel, opacity: 1 });
      expect(text("card-i-family")).toMatchObject({ text: t(lang).invitationFrom, opacity: 1 });
      expect(text("card-i-names")).toMatchObject({ text: t(lang).title });
      const link = out.overlay.find((o) => o.kind === "link");
      expect(link?.kind === "link" && link.href).toBe(wedding.mapUrl);
    }
  });
});
