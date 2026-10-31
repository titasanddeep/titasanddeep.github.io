import { I } from "../render/mat";
import type { DrawOp } from "../render/ops";
import type { OverlayItem } from "../render/overlay";
import { textStyle } from "../render/textStyles";
import { easeSoft, progress, type Range } from "../story/anim";
import { BEATS, SCENE_BEATS, type SceneId } from "../story/timeline";
import type { FrameContext, FrameOutput } from "./frame";
import { rgba } from "./shapes/util";

type Lang = FrameContext["lang"];
type HeadingKey = "headingHolud" | "headingWedding";

/** Height of a text style's line box in px (font size × line height), the same numbers the overlay renders with. */
export const lineHeightOf = (style: string, lang: Lang): number => {
  const css = textStyle(style, lang);
  return Number(css.fontSize) * Number(css.lineHeight);
};

/**
 * Width in px of each heading's text box (text plus the 0.2em side padding), measured with the shipped fonts
 * (scripts/measure-text.mjs). The gold rules sit 26 px either side of it, so they follow the text. Re-measure if a
 * heading string or font changes.
 */
const HEADING_WIDTH: Record<Lang, Record<HeadingKey, number>> = {
  bn: { headingHolud: 288.89, headingWedding: 541.38 },
  en: { headingHolud: 345.27, headingWedding: 837.45 },
};

const TOP = 196;
const GAP = 26;
const RULE = { w: 80, h: 3 } as const;
const FADE_OUT = 28;
const RISE = 14;

interface HeadingDef {
  key: HeadingKey;
  tone: "ink" | "light";
  scene: SceneId;
  fadeIn: Range;
  /** Scene-local beat the heading starts to leave (before the scene's main moment). */
  fadeOutAt: number;
}

/** One heading per story scene: ink over the day, light over the night. */
const DEFS: readonly HeadingDef[] = [
  { key: "headingHolud", tone: "ink", scene: "holud", fadeIn: BEATS.holud.headingIn, fadeOutAt: BEATS.holud.coupleIn[1] },
  { key: "headingWedding", tone: "light", scene: "wedding", fadeIn: BEATS.wedding.headingIn, fadeOutAt: BEATS.wedding.piriIn[1] - 10 },
];

/**
 * The scene headings. The words are overlay text; the gold rules either side are canvas ops, drawn with the same fade
 * and 14 px rise as the groom's film. Every id is always returned.
 */
export const headings = (globalBeat: number, ctx: FrameContext): FrameOutput => {
  const { lang, text } = ctx;
  const bn = lang === "bn";
  const size = bn ? 64 : 44;
  const boxH = size * (1.45 + 2 * 0.32);
  const draw: DrawOp[] = [];
  const overlay: OverlayItem[] = [];
  for (const def of DEFS) {
    const f = globalBeat - SCENE_BEATS[def.scene].start;
    const inP = progress(f, def.fadeIn, easeSoft);
    const outP = progress(f, [def.fadeOutAt, def.fadeOutAt + FADE_OUT]);
    const o = inP * (1 - outP);
    const cy = TOP + boxH / 2 + (1 - inP) * RISE;
    overlay.push({
      kind: "text",
      id: `heading-${def.scene}`,
      text: text[def.key],
      x: 540,
      y: cy,
      anchor: "center",
      style: def.tone === "ink" ? "heading-ink" : "heading-light",
      opacity: o > 0.002 ? o : 0,
    });
    if (o <= 0.002) continue;
    const colour = def.tone === "ink" ? "#c49a52" : "#e3c27a";
    const half = (RULE.w * 2 + GAP * 2 + HEADING_WIDTH[lang][def.key]) / 2;
    const left = 540 - half;
    const right = 540 + half - RULE.w;
    const y = cy - RULE.h / 2;
    draw.push({
      kind: "rect",
      rect: { x: left, y, w: RULE.w, h: RULE.h },
      m: I,
      alpha: o,
      fill: { linear: [left, 0, left + RULE.w, 0], stops: [[0, rgba(colour, 0)], [1, colour]] },
    });
    draw.push({
      kind: "rect",
      rect: { x: right, y, w: RULE.w, h: RULE.h },
      m: I,
      alpha: o,
      fill: { linear: [right, 0, right + RULE.w, 0], stops: [[0, colour], [1, rgba(colour, 0)]] },
    });
  }
  return { draw, overlay };
};
