import type { CSSProperties } from "react";
import { BN_PAD, DISPLAY_WEIGHT, FONT_BN, FONT_BN_DISPLAY, FONT_BN_UI, FONT_EN } from "./fontStacks";
import type { TextStyleId } from "./overlay";

/** CSS for one in-picture text style, per language where they differ. `glow`: a gold glow rides a reveal wipe. */
export interface TextStyle {
  bn: CSSProperties;
  en: CSSProperties;
  glow?: boolean;
}

const INK = "#30251f";
const MUTED = "#665343";
const SINDOOR = "#781f2b";
const GOLD = "#c49a52";
const GOLD_DEEP = "#8f6c2a";

const HEADING_SHADOW_INK = "0 0 18px rgba(251,244,230,.9), 0 0 4px rgba(251,244,230,.9)";
const HEADING_SHADOW_LIGHT = "0 2px 18px rgba(0,0,0,.55)";

const headingBase = (color: string, textShadow: string) => ({
  bn: {
    fontFamily: FONT_BN,
    fontWeight: 500,
    fontSize: 64,
    lineHeight: 1.45,
    padding: `${BN_PAD} 0.2em`,
    letterSpacing: "0.01em",
    color,
    textShadow,
  },
  en: {
    fontFamily: FONT_EN,
    fontWeight: 600,
    fontSize: 44,
    lineHeight: 1.45,
    padding: `${BN_PAD} 0.2em`,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color,
    textShadow,
  },
}) satisfies Pick<TextStyle, "bn" | "en">;

/** Small gold labels on the card (Wedding / Reception / Venue). */
const cardLabel = {
  bn: { fontFamily: FONT_BN_UI, fontWeight: 600, fontSize: 32, lineHeight: 1.4, letterSpacing: "0.02em", color: GOLD_DEEP },
  en: {
    fontFamily: FONT_EN,
    fontWeight: 600,
    fontSize: 36,
    lineHeight: 1.4,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: GOLD_DEEP,
  },
} satisfies Pick<TextStyle, "bn" | "en">;

const line = (bn: CSSProperties, en: CSSProperties): Pick<TextStyle, "bn" | "en"> => ({
  bn: { fontFamily: FONT_BN, lineHeight: 1.4, ...bn },
  en: { fontFamily: FONT_EN, lineHeight: 1.4, ...en },
});

const mapLinkBox: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 28,
  boxSizing: "border-box",
  height: 136,
  minWidth: 600,
  padding: "0 64px",
  borderRadius: 75,
  background: SINDOOR,
  border: `5px solid ${GOLD}`,
  color: "#f8ecd2",
  lineHeight: 1.4,
  textDecoration: "none",
  boxShadow: "0 10px 0 rgba(48,37,31,.18)",
  whiteSpace: "nowrap",
};

const captionBox: CSSProperties = {
  boxSizing: "border-box",
  maxWidth: 900,
  padding: "22px 44px",
  whiteSpace: "normal",
  textAlign: "center",
  color: INK,
  background: "rgba(251,244,230,.95)",
  border: `3px solid ${GOLD}`,
  borderRadius: 44,
  boxShadow: "0 8px 0 rgba(48,37,31,.16)",
};

/**
 * Every in-picture text style (reference/deep-film/docs/SPEC/visual.md section 6). Ids are what scenes put in `OverlayItem.style`.
 * Text is placed by its line-box centre; reveal-clipped styles keep `BN_PAD` block padding so vowel signs are never cut.
 */
export const TEXT_STYLES: Record<TextStyleId, TextStyle> = {
  /** Scene heading on the light garden (ink tone). */
  "heading-ink": headingBase(SINDOOR, HEADING_SHADOW_INK),
  /** Scene heading on the dark mandap (light tone). */
  "heading-light": headingBase("#fbefd6", HEADING_SHADOW_LIGHT),
  /** The couple's names, revealed by a travelling light. */
  title: {
    glow: true,
    bn: {
      fontFamily: FONT_BN_DISPLAY,
      fontWeight: DISPLAY_WEIGHT,
      fontSize: 156,
      lineHeight: 1.3,
      padding: `${BN_PAD} 0`,
      letterSpacing: "0.02em",
      color: SINDOOR,
    },
    en: {
      fontFamily: FONT_EN,
      fontStyle: "italic",
      fontWeight: 600,
      fontSize: 168,
      lineHeight: 1.3,
      padding: `${BN_PAD} 0`,
      letterSpacing: "0.02em",
      color: SINDOOR,
    },
  },
  subtitle: {
    glow: true,
    bn: {
      fontFamily: FONT_BN,
      fontWeight: 500,
      fontSize: 50,
      lineHeight: 1.3,
      padding: `${BN_PAD} 0`,
      letterSpacing: "0.04em",
      color: MUTED,
    },
    en: {
      fontFamily: FONT_EN,
      fontStyle: "italic",
      fontWeight: 400,
      fontSize: 56,
      lineHeight: 1.3,
      padding: `${BN_PAD} 0`,
      letterSpacing: "0.08em",
      color: MUTED,
    },
  },
  "card-heading": {
    bn: { fontFamily: FONT_BN, fontWeight: 600, fontSize: 60, lineHeight: 1.4, letterSpacing: "0.01em", color: SINDOOR },
    en: {
      fontFamily: FONT_EN,
      fontWeight: 600,
      fontSize: 54,
      lineHeight: 1.4,
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      color: SINDOOR,
    },
  },
  "card-names": {
    bn: {
      fontFamily: FONT_BN_DISPLAY,
      fontWeight: DISPLAY_WEIGHT,
      fontSize: 134,
      lineHeight: 1.3,
      padding: `${BN_PAD} 0.2em`,
      color: SINDOOR,
    },
    en: {
      fontFamily: FONT_EN,
      fontStyle: "italic",
      fontWeight: 500,
      fontSize: 156,
      lineHeight: 1.3,
      padding: `${BN_PAD} 0.2em`,
      color: SINDOOR,
    },
  },
  "card-message": {
    bn: {
      fontFamily: FONT_BN,
      fontWeight: 500,
      fontSize: 44,
      lineHeight: 1.55,
      color: INK,
      maxWidth: 740,
      whiteSpace: "normal",
      textAlign: "center",
    },
    en: {
      fontFamily: FONT_EN,
      fontStyle: "italic",
      fontWeight: 400,
      fontSize: 54,
      lineHeight: 1.3,
      color: INK,
      maxWidth: 740,
      whiteSpace: "normal",
      textAlign: "center",
    },
  },
  "card-label": cardLabel,
  /** Event date line, e.g. "২৫শে নভেম্বর ২০২৬". */
  "card-day": line({ fontWeight: 600, fontSize: 42, lineHeight: 1.35, color: SINDOOR }, { fontWeight: 600, fontSize: 46, lineHeight: 1.35, color: SINDOOR }),
  /** Bengali calendar date (Bengali only; the English card does not draw it). */
  "card-bndate": line({ fontWeight: 500, fontSize: 33, color: GOLD_DEEP }, { fontWeight: 500, fontSize: 33, color: GOLD_DEEP }),
  /** Weekday and time. */
  "card-when": line({ fontWeight: 500, fontSize: 36, color: MUTED }, { fontWeight: 400, fontSize: 42, color: MUTED }),
  "card-venue": line({ fontWeight: 600, fontSize: 44, lineHeight: 1.35, color: INK }, { fontWeight: 600, fontSize: 52, lineHeight: 1.35, color: INK }),
  "card-venue-note": line({ fontWeight: 500, fontSize: 34, color: MUTED }, { fontWeight: 400, fontSize: 40, color: MUTED }),
  "card-address": line({ fontWeight: 500, fontSize: 36, color: INK }, { fontWeight: 500, fontSize: 40, color: INK }),
  "card-landmark": line({ fontWeight: 500, fontSize: 33, color: MUTED }, { fontWeight: 400, fontSize: 38, color: MUTED }),
  /** Who the invitation is from, under the message. */
  "card-family": line(
    { fontWeight: 600, fontSize: 40, lineHeight: 1.45, color: SINDOOR },
    { fontStyle: "italic", fontWeight: 600, fontSize: 48, lineHeight: 1.3, color: SINDOOR },
  ),
  /** Explore mode: the short line about the stop the story is holding on (a pill sized to its text). */
  caption: {
    bn: { ...captionBox, fontFamily: FONT_BN, fontWeight: 500, fontSize: 36, lineHeight: 1.5 },
    en: { ...captionBox, fontFamily: FONT_EN, fontStyle: "italic", fontWeight: 500, fontSize: 42, lineHeight: 1.3 },
  },
  /** The "View location" button (a link: box, pin and text). */
  "map-link": {
    bn: { ...mapLinkBox, fontFamily: FONT_BN_UI, fontWeight: 600, fontSize: 52, letterSpacing: "0.01em" },
    en: { ...mapLinkBox, fontFamily: FONT_EN, fontWeight: 600, fontSize: 58, letterSpacing: "0.06em" },
  },
};

/** The CSS for a style id and language (an unknown id falls back to the card message so text never vanishes). */
export const textStyle = (id: TextStyleId, lang: "bn" | "en"): CSSProperties =>
  (TEXT_STYLES[id] ?? TEXT_STYLES["card-message"])[lang];
