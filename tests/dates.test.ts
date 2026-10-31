import { describe, expect, it } from "vitest";
import { bengaliDay, formatDate, toBengaliDigits } from "../src/content/dates";

describe("dates", () => {
  it("formats in English", () => {
    expect(formatDate("2026-11-25", "en")).toEqual({ weekday: "Wednesday", day: "25 November 2026" });
    expect(formatDate("2026-11-27", "en")).toEqual({ weekday: "Friday", day: "27 November 2026" });
  });
  it("formats in Bengali", () => {
    expect(formatDate("2026-11-25", "bn")).toEqual({ weekday: "বুধবার", day: "২৫শে নভেম্বর ২০২৬" });
    expect(formatDate("2026-11-27", "bn")).toEqual({ weekday: "শুক্রবার", day: "২৭শে নভেম্বর ২০২৬" });
  });
  it("rejects non-dates", () => {
    for (const bad of ["", "25-11-2026", "2026-02-30", "2026-13-01"]) expect(formatDate(bad, "en")).toBeNull();
  });
  it("Bengali ordinals and digits", () => {
    expect([1, 2, 3, 4, 5, 10, 18, 19, 25, 27, 31].map(bengaliDay)).toEqual(["১লা", "২রা", "৩রা", "৪ঠা", "৫ই", "১০ই", "১৮ই", "১৯শে", "২৫শে", "২৭শে", "৩১শে"]);
    expect(toBengaliDigits("0123456789")).toBe("০১২৩৪৫৬৭৮৯");
  });
});
