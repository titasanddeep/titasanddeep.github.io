import { describe, expect, it } from "vitest";
import { fitStage } from "../src/app/hooks/useStageLayout";

describe("fitStage", () => {
  it("always fits a 9:16 frame in the room", () => {
    for (const [w, h] of [[390, 844], [375, 667], [844, 390], [1920, 1080], [280, 653]]) {
      const f = fitStage({ w, h }, { w, h });
      expect(f.width).toBeLessThanOrEqual(w);
      expect(f.height).toBeLessThanOrEqual(h + 0.01);
      expect(f.height / f.width).toBeCloseTo(16 / 9, 2);
      expect(f.scale).toBeCloseTo(f.width / 1080, 6);
    }
  });
  it("does not change when only the stage height changes", () => {
    const a = fitStage({ w: 390, h: 664 }, { w: 390, h: 664 });
    const b = fitStage({ w: 390, h: 664 }, { w: 390, h: 750 });
    expect([a.width, a.hud]).toEqual([b.width, b.hud]);
    expect(fitStage({ w: 412, h: 839 }, { w: 412, h: 839 }).hud).toBe(fitStage({ w: 412, h: 839 }, { w: 412, h: 915 }).hud);
  });
  it("picks the hud placement", () => {
    const hud = (w: number, h: number) => fitStage({ w, h }, { w, h }).hud;
    expect(hud(390, 844)).toBe("bands");
    expect(hud(375, 667)).toBe("inside");
    expect(hud(844, 390)).toBe("side");
    expect(hud(1920, 1080)).toBe("side");
  });
});
