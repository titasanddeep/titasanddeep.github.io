import { describe, expect, it } from "vitest";
import { otherLang, t, translations } from "../src/content/translations";

describe("translations", () => {
  it("has identical, non-empty keys in both languages", () => {
    expect(Object.keys(translations.bn).sort()).toEqual(Object.keys(translations.en).sort());
    for (const lang of ["bn", "en"] as const) for (const v of Object.values(translations[lang])) expect(v.trim()).not.toBe("");
  });
  it("keeps the exact copy: bride first, the spec's headings, no reception", () => {
    expect(translations.bn.title).toBe("তিতাস ও দীপ");
    expect(translations.en.title).toBe("Titas & Deep");
    expect(translations.bn.subtitle).toBe("তিতাসের বাড়ি থেকে");
    expect(translations.bn.headingHolud).toBe("গায়ে হলুদ");
    expect(translations.bn.headingWedding).toBe("শুভদৃষ্টি ও মালাবদল");
    expect(translations.bn.invitationFrom).toBe("— তিতাসের পরিবার");
    expect(translations.bn.location).toBe("স্থান দেখুন");
    expect(Object.keys(translations.bn).some((k) => /reception/i.test(k))).toBe(false);
    for (const lang of ["bn", "en"] as const) expect(Object.values(translations[lang]).join(" ")).not.toMatch(/প্রীতিভোজ|Reception/);
  });
  it("t and otherLang", () => {
    expect(t("bn")).toBe(translations.bn);
    expect(otherLang("bn")).toBe("en");
    expect(otherLang("en")).toBe("bn");
  });
});
