// Self-hosted fonts (no runtime network). Imported by both the website and the Remotion bundle.
// Bengali: Anek Bangla (a modern variable face with real weights) for text, headings and UI, and Galada (flowing
// script, close to the hand-lettering on the printed card) for the couple's names. English: Cormorant Garamond.
import "@fontsource-variable/anek-bangla/wght.css";
import "@fontsource/galada/bengali-400.css";
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/cormorant-garamond/latin-400-italic.css";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/latin-600.css";

export { BN_PAD, DISPLAY_WEIGHT, FONT_BN, FONT_BN_DISPLAY, FONT_BN_UI, FONT_EN } from "../render/fontStacks";

/** Anek Bangla has real weights (100–800); English uses the weight asked for. */
export const bnWeight = (_lang: "bn" | "en", weight: number): number => weight;
