// Font stacks and text constants, free of CSS side effects (src/remotion/fonts.ts imports the font files).
export const FONT_BN = '"Anek Bangla Variable", "Noto Sans Bengali", sans-serif';
export const FONT_BN_DISPLAY = '"Galada", "Anek Bangla Variable", serif';
export const FONT_BN_UI = FONT_BN;
export const FONT_EN = '"Cormorant Garamond", "Times New Roman", serif';

/** Galada has a single (regular) weight: asking for bold would be synthesised and ugly. */
export const DISPLAY_WEIGHT = 400;

/**
 * Bengali vowel signs (ি ী ু ৃ) and Galada's loops reach well outside the line box. Text boxes that clip or
 * mask (reveals, buttons) need this much padding above and below so no glyph is ever cut.
 */
export const BN_PAD = "0.32em";
