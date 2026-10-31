import { describe, expect, it } from "vitest";
import { bezier, bump, clamp, easeInOut, easeOut, easeSoft, keyframes, lerp, progress, ramp, rise, seeded, settle, smoothKeyframes } from "../src/story/anim";

describe("anim helpers", () => {
  it("eases cubically and hits the end points", () => {
    for (const e of [easeOut, easeInOut, easeSoft, rise]) {
      expect(e(0)).toBe(0);
      expect(e(1)).toBe(1);
    }
    expect(easeOut(0.5)).toBeCloseTo(0.875, 9);
    expect(easeInOut(0.25)).toBeCloseTo(4 * 0.25 ** 3, 9);
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 9);
    expect(bezier(0.25, 0.25, 0.75, 0.75)(0.3)).toBeCloseTo(0.3, 9);
  });

  it("clamps progress and ramp outside their range", () => {
    expect(progress(-10, [0, 10])).toBe(0);
    expect(progress(99, [0, 10])).toBe(1);
    expect(progress(5, [0, 10], (t) => t)).toBe(0.5);
    expect(ramp(0, [0, 10], 22, -22, (t) => t)).toBe(22);
    expect(ramp(10, [0, 10], 22, -22, (t) => t)).toBe(-22);
  });

  it("interpolates multi-stop keyframes linearly and clamped", () => {
    expect(keyframes(-1, [0, 10, 20], [0, 1, 0])).toBe(0);
    expect(keyframes(5, [0, 10, 20], [0, 1, 0])).toBe(0.5);
    expect(keyframes(15, [0, 10, 20], [0, 1, 0])).toBe(0.5);
    expect(keyframes(99, [0, 10, 20], [0, 1, 5])).toBe(5);
  });

  it("eases every segment of smoothKeyframes", () => {
    expect(smoothKeyframes(0, [0, 10, 20], [1, 2, 3])).toBe(1);
    expect(smoothKeyframes(10, [0, 10, 20], [1, 2, 3])).toBe(2);
    expect(smoothKeyframes(5, [0, 10, 20], [1, 2, 3])).toBeCloseTo(1.5, 9);
    expect(smoothKeyframes(99, [0, 10, 20], [1, 2, 3])).toBe(3);
  });

  it("has simple helpers", () => {
    expect(lerp(10, 20, 0.25)).toBe(12.5);
    expect(clamp(5, 0, 1)).toBe(1);
    expect(bump(0, 0, 10)).toBeCloseTo(0, 9);
    expect(bump(5, 0, 10)).toBeCloseTo(1, 9);
    expect(bump(10, 0, 10)).toBeCloseTo(0, 9);
    expect(settle(0)).toBe(0);
    expect(settle(1)).toBeCloseTo(1, 1);
  });

  it("is deterministic and in [0,1)", () => {
    for (let i = 0; i < 200; i++) {
      const v = seeded(i);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(seeded(i)).toBe(v);
    }
  });
});
