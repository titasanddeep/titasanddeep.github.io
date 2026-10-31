// @vitest-environment node
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ART, type ArtName } from "../src/art/manifest";
import { t } from "../src/content/translations";
import { wedding } from "../src/content/wedding";
import type { DrawOp } from "../src/render/ops";
import { BODY, LOOKS } from "../src/scene/figure";
import { describeFrame } from "../src/scene/frame";
import { LAST_FRAME } from "../src/story/timeline";

const root = path.resolve(__dirname, "..");

describe("art manifest", () => {
  const entries = Object.entries(ART);

  it("has files that exist with matching byte sizes and positive dimensions", () => {
    for (const [name, a] of entries) {
      const file = path.join(root, "public", a.src);
      expect(existsSync(file), name).toBe(true);
      expect(statSync(file).size, name).toBe(a.bytes);
      expect(a.w, name).toBeGreaterThan(0);
      expect(a.h, name).toBeGreaterThan(0);
    }
  });

  it("has unique names and files", () => {
    expect(new Set(entries.map(([, a]) => a.src)).size).toBe(entries.length);
  });

  it("ships nothing the film never draws (every byte is preloaded on the guest's phone)", () => {
    const flat = (ops: readonly DrawOp[]): DrawOp[] => ops.flatMap((o) => (o.kind === "group" ? flat(o.ops) : [o]));
    const used = new Set<ArtName>();
    for (const reducedMotion of [false, true]) {
      for (let f = 0; f <= LAST_FRAME; f += 1) {
        const out = describeFrame(f, { lang: "bn", text: t("bn"), wedding, reducedMotion, interactive: true, guided: { enabled: false, awaiting: null } });
        for (const op of flat(out.draw)) if (op.kind === "image") used.add(op.art);
      }
    }
    // the figures' standing parts belong to their wardrobes even where everyone in the film sits
    const wardrobe = new Set<ArtName>([...Object.values(BODY), ...Object.values(LOOKS).map((l) => l.body)].flat().map(([art]) => art));
    const unused = (Object.keys(ART) as ArtName[]).filter((n) => !used.has(n) && !wardrobe.has(n));
    expect(unused).toEqual([]);
  });
});
