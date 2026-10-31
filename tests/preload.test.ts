import { describe, expect, it } from "vitest";
import { weightedProgress, type LoadItem } from "../src/app/loader/preload";

const items: LoadItem[] = [
  { id: "a", kind: "image", src: "a", weight: 100 },
  { id: "b", kind: "image", src: "b", weight: 300 },
  { id: "music", kind: "audio", src: "m", weight: 600 },
];

describe("weightedProgress", () => {
  it("weights by size", () => {
    expect(weightedProgress(items, new Map())).toBe(0);
    expect(weightedProgress(items, new Map([["a", 1]]))).toBeCloseTo(0.1);
    expect(weightedProgress(items, new Map([["b", 1], ["music", 1]]))).toBeCloseTo(0.9);
    expect(weightedProgress(items, new Map([["a", 1], ["b", 1], ["music", 1]]))).toBe(1);
    expect(weightedProgress(items, new Map([["a", 7]]))).toBeCloseTo(0.1);
    expect(weightedProgress([], new Map())).toBe(1);
  });
});
