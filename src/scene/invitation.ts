import { formatDate } from "../content/dates";
import { EVENT_KEYS, hasValue, type EventKey } from "../content/wedding";
import { I, apply, mul, scale, translate, type Mat } from "../render/mat";
import type { DrawOp } from "../render/ops";
import type { OverlayItem } from "../render/overlay";
import { easeInOut, easeOut, lerp, progress, rise } from "../story/anim";
import { CARD_EDGE_Y, ORNAMENT_SCALE } from "../story/layout";
import { BEATS } from "../story/timeline";
import type { FrameContext, FrameOutput } from "./frame";
import { emblemOps } from "./shapes/emblem";
import { drawnPath, pathLength, rgba } from "./shapes/util";
import { lineHeightOf } from "./text";

const B = BEATS.invitation;

const SINDOOR = "#781f2b";
const GOLD = "#c49a52";

/** The keepsake card: frame coordinates of its box (top is where it rests; it slides up from the ornament). */
export const CARD = { left: 70, width: 940, height: 1690, top: 150, radius: 26 } as const;

/**
 * Content column inside the card (card-relative px): left/right 96, top 276, bottom 132, gap 16. The bride's card is a
 * little taller than the groom's: one event, but a longer message and the family's line.
 */
const COLUMN = { left: 96, width: 748, top: 276, height: 1282, gap: 16 } as const;
const DIVIDER = { w: 520, h: 44 } as const;
const BUTTON = { marginTop: 6, h: 136 } as const;
const LABEL_GAP = 4;
const EVENT_GAP = 20;
const EVENT_RULE = 3;
const DETAIL_GAP = 20;
/** Lines the invitation message wraps to (measured with the shipped fonts and text: scripts/measure-text.mjs). */
const MESSAGE_LINES = { bn: 3, en: 3 } as const;
/** Space between the message and the family's signature. */
const FAMILY_GAP = 4;
const RISE_PX = 26;

/**
 * Venue name and note share one centred line in two sizes: card-relative x of the name's right edge and of the note's
 * left edge ("(" after the space), and how far the note's line centre sits below the name's so the baselines meet.
 * Measured with the shipped fonts and venue text; re-measure if either changes.
 */
const VENUE_SPLIT = {
  bn: { nameRight: 399.03, noteLeft: 404.97, noteDrop: 2.3 },
  en: { nameRight: 345.53, noteLeft: 354.89, noteDrop: 2.9 },
} as const;

/** Empirical: the overlay lays the Bengali names glyphs about 2 px higher than the old flex column did (Galada at 134 px). */
const NAMES_NUDGE = { bn: 2, en: 0 } as const;

const roundedRectPath = (w: number, h: number, r: number): string =>
  `M${r} 0H${w - r}A${r} ${r} 0 0 1 ${w} ${r}V${h - r}A${r} ${r} 0 0 1 ${w - r} ${h}H${r}A${r} ${r} 0 0 1 0 ${h - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`;

const W = CARD.width;
const H = CARD.height;
const CARD_PATH = roundedRectPath(W, H, CARD.radius);
const BORDER_OUTER = `M44 22H${W - 44}Q${W - 22} 22 ${W - 22} 44V${H - 44}Q${W - 22} ${H - 22} ${W - 44} ${H - 22}H44Q22 ${H - 22} 22 ${H - 44}V44Q22 22 44 22Z`;
const BORDER_INNER = `M60 40H${W - 60}Q${W - 40} 40 ${W - 40} 60V${H - 60}Q${W - 40} ${H - 40} ${W - 60} ${H - 40}H60Q40 ${H - 40} 40 ${H - 60}V60Q40 40 60 40Z`;
const CORNER = {
  a: "M34 100A66 66 0 0 1 100 34",
  b: "M34 76A42 42 0 0 1 76 34",
  c: "M34 130C34 90 60 60 100 54C124 52 136 66 128 80C122 90 108 88 110 76",
  d: "M130 34C90 34 60 60 54 100C52 124 66 136 80 128C90 122 88 108 76 110",
};
const FLOURISH_L = "M-250 0C-200 -18 -150 18 -100 0C-70 -10 -50 -4 -34 0";
const FLOURISH_R = "M250 0C200 -18 150 18 100 0C70 -10 50 -4 34 0";
const DROP = "M0 -22C14 -10 14 10 0 22C-14 10 -14 -10 0 -22Z";
const DIVIDER_L = "M10 22H220";
const DIVIDER_R = "M300 22H510";
const DIVIDER_DROP = "M260 6C272 14 272 30 260 38C248 30 248 14 260 6Z";
const dot = (r: number): string => `M${r} 0A${r} ${r} 0 1 1 ${-r} 0A${r} ${r} 0 1 1 ${r} 0Z`;

const LEN = {
  outer: pathLength(BORDER_OUTER),
  inner: pathLength(BORDER_INNER),
  a: pathLength(CORNER.a),
  b: pathLength(CORNER.b),
  c: pathLength(CORNER.c),
  d: pathLength(CORNER.d),
  fl: pathLength(FLOURISH_L),
  fr: pathLength(FLOURISH_R),
  dl: pathLength(DIVIDER_L),
  dr: pathLength(DIVIDER_R),
};

/** Upper normal tail Q(x) = P(Z > x) (Abramowitz-Stegun 7.1.26 erf). */
const tail = (x: number): number => {
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erfAbs = 1 - poly * Math.exp(-z * z);
  const upper = 0.5 * (1 - erfAbs);
  return x >= 0 ? upper : 1 - upper;
};

const SHADOW = { dy: 34, blur: 90, alpha: 0.55 } as const;
/** Expansions (px) of the stacked rounded rects that stand in for the blurred box-shadow. */
const SHADOW_STEPS = [100, 80, 60, 40, 20, 0, -20] as const;

/** `0 34px 90px rgba(20,8,8,.55)` as stacked translucent rounded rects whose cumulative alpha follows the Gaussian edge. */
const shadowOps = (top: number, m: Mat, visibleAlpha: number): DrawOp[] => {
  const sigma = SHADOW.blur / 2;
  const ops: DrawOp[] = [];
  let prev = 0;
  SHADOW_STEPS.forEach((e, i) => {
    const next = SHADOW_STEPS[i + 1];
    const mid = next === undefined ? e - 10 : (e + next) / 2;
    const cum = SHADOW.alpha * tail(mid / sigma);
    const a = 1 - (1 - cum) / (1 - prev);
    prev = cum;
    if (a <= 0.002) return;
    ops.push({
      kind: "rect",
      rect: { x: CARD.left - e, y: top + SHADOW.dy - e, w: W + 2 * e, h: H + 2 * e },
      m,
      alpha: a * visibleAlpha,
      fill: "rgb(20,8,8)",
      radius: Math.max(0, CARD.radius + e),
    });
  });
  return ops;
};

interface Pt {
  x: number;
  y: number;
}

/** Card-relative layout of the content column (vertical centres of every line), reflowed as the old flex column did. */
interface Layout {
  heading: number;
  names: number;
  divider: number;
  message: number;
  family: number;
  events: { key: EventKey; cx: number; label: number; day: number; bndate: number; when: number }[];
  venue: { label: number; name: number; address: number; landmark: number } | null;
  /** Gold rules between event blocks: card-relative x of each, and their shared top and height. */
  rules: { xs: number[]; top: number; h: number };
  button: number;
}

const compute = (ctx: FrameContext): Layout => {
  const { lang, wedding } = ctx;
  const bn = lang === "bn";
  const h = (style: string): number => lineHeightOf(style, lang);

  const shown = EVENT_KEYS.filter((k) => formatDate(wedding.events[k].date, lang) !== null);
  const evBlock = (k: EventKey): number => {
    const ev = wedding.events[k];
    const d = formatDate(ev.date, lang);
    const when = [d?.weekday ?? "", ev.time[lang]].filter(hasValue).join(", ");
    return (
      h("card-label") + LABEL_GAP + h("card-day") + (bn && hasValue(ev.bengaliDate) ? h("card-bndate") : 0) + (hasValue(when) ? h("card-when") : 0)
    );
  };
  const rowH = shown.length ? Math.max(...shown.map(evBlock)) : 0;

  const v = wedding.venue;
  const hasName = hasValue(v.name[lang]);
  const hasAddress = hasValue(v.address[lang]);
  const hasLandmark = hasValue(v.landmark[lang]);
  const hasVenue = hasName || hasAddress;
  const venueH = hasVenue
    ? h("card-label") + LABEL_GAP + (hasName ? h("card-venue") : 0) + (hasAddress ? h("card-address") : 0) + (hasLandmark ? h("card-landmark") : 0)
    : 0;
  const detailsH = rowH + (rowH > 0 && venueH > 0 ? DETAIL_GAP : 0) + venueH;

  const heights = [
    h("card-heading"),
    h("card-names"),
    DIVIDER.h,
    h("card-message") * MESSAGE_LINES[lang],
    FAMILY_GAP + h("card-family"),
    ...(detailsH > 0 ? [detailsH] : []),
    BUTTON.marginTop + BUTTON.h,
  ];
  const total = heights.reduce((a, b) => a + b, 0) + COLUMN.gap * (heights.length - 1);
  let y = COLUMN.top + (COLUMN.height - total) / 2;
  const take = (hh: number): number => {
    const top = y;
    y += hh + COLUMN.gap;
    return top;
  };

  const heading = take(heights[0]) + heights[0] / 2;
  const names = take(heights[1]) + heights[1] / 2;
  const divider = take(DIVIDER.h);
  const message = take(heights[3]) + heights[3] / 2;
  const family = take(heights[4]) + FAMILY_GAP + h("card-family") / 2;
  let events: Layout["events"] = [];
  let venue: Layout["venue"] = null;
  let rules: Layout["rules"] = { xs: [], top: 0, h: 0 };
  if (detailsH > 0) {
    const top = take(detailsH);
    const n = shown.length;
    const bw = (COLUMN.width - (n - 1) * (EVENT_GAP * 2 + EVENT_RULE)) / Math.max(1, n);
    events = shown.map((key, i) => {
      const ev = wedding.events[key];
      const hasBn = bn && hasValue(ev.bengaliDate);
      const d = formatDate(ev.date, lang);
      const hasWhen = hasValue([d?.weekday ?? "", ev.time[lang]].filter(hasValue).join(", "));
      const label = top + h("card-label") / 2;
      const day = top + h("card-label") + LABEL_GAP + h("card-day") / 2;
      const afterDay = top + h("card-label") + LABEL_GAP + h("card-day");
      const bndate = afterDay + h("card-bndate") / 2;
      const when = afterDay + (hasBn ? h("card-bndate") : 0) + h("card-when") / 2;
      return { key, cx: COLUMN.left + i * (bw + EVENT_GAP * 2 + EVENT_RULE) + bw / 2, label, day, bndate: hasBn ? bndate : -1, when: hasWhen ? when : -1 };
    });
    rules = { xs: events.slice(1).map((e) => e.cx - bw / 2 - EVENT_GAP - EVENT_RULE), top, h: rowH };
    if (hasVenue) {
      const vt = top + rowH + (rowH > 0 ? DETAIL_GAP : 0);
      const nameTop = vt + h("card-label") + LABEL_GAP;
      const addrTop = nameTop + (hasName ? h("card-venue") : 0);
      venue = {
        label: vt + h("card-label") / 2,
        name: hasName ? nameTop + h("card-venue") / 2 : -1,
        address: hasAddress ? addrTop + h("card-address") / 2 : -1,
        landmark: hasLandmark ? addrTop + (hasAddress ? h("card-address") : 0) + h("card-landmark") / 2 : -1,
      };
    }
  }
  const button = take(BUTTON.marginTop + BUTTON.h) + BUTTON.marginTop + BUTTON.h / 2;
  return { heading, names, divider, message, family, events, venue, rules, button };
};

export interface CardOptions {
  /** Frame y of the card's top edge. */
  top: number;
  /** How much of the ornamental border is drawn (0..1). */
  border: number;
  /** Prefix of every overlay id of this card (`card-w` / `card-i`). */
  idPrefix: string;
  /** Parent matrix (the camera for the wedding's card edge, identity for the invitation). */
  m: Mat;
  /** Whether the card is on screen at all (otherwise only the hidden overlay ids are returned). */
  visible: boolean;
}

/**
 * The keepsake card at the invitation's local beat: paper, border, corners, flourish and divider as ops; every text
 * field as an overlay item (blank wedding fields stay hidden); the map button as a link. The wedding scene shows
 * only its rising edge, drawing it at local beat 0 where nothing but the border is revealed.
 */
export const invitationCard = (localBeat: number, opts: CardOptions, ctx: FrameContext): FrameOutput => {
  const { top, border, idPrefix, m, visible } = opts;
  const { lang, text: tx, wedding } = ctx;
  const f = localBeat;
  const heading = progress(f, B.heading, easeOut);
  const names = progress(f, B.names, easeOut);
  const message = progress(f, B.message, easeOut);
  const family = progress(f, B.family, easeOut);
  const details = progress(f, B.details, easeOut);
  const button = progress(f, B.mapButton, easeOut);
  const flourish = progress(f, B.flourish, easeInOut);
  // one soft gold glow passing over the names, then it settles for good
  const shimmer = Math.sin(Math.PI * progress(f, [B.flourish[0] - 10, B.flourish[1] + 30])) * 0.9;

  const L = compute(ctx);
  const cardM = mul(m, translate(CARD.left, top));
  const draw: DrawOp[] = [];

  if (visible) {
    draw.push(...shadowOps(top, m, 1));
    draw.push({ kind: "rect", rect: { x: CARD.left - 2, y: top - 2, w: W + 4, h: H + 4 }, m, alpha: 1, fill: rgba(GOLD, 0.55), radius: CARD.radius + 2 });
    draw.push({
      kind: "rect",
      rect: { x: CARD.left, y: top, w: W, h: H },
      m,
      alpha: 1,
      fill: { linear: [0, top, 0, top + H], stops: [[0, "#fbf4e6"], [1, "#f6ecd9"]] },
      radius: CARD.radius,
    });
    const cover = Math.max(W / 1080, H / 1920);
    draw.push({ kind: "image", art: "paper", m: mul(cardM, scale(cover)), alpha: 0.55, clip: { path: CARD_PATH, m: cardM } });

    const add = (op: DrawOp | null): void => {
      if (op) draw.push(op);
    };
    add(drawnPath(BORDER_OUTER, LEN.outer, border, cardM, GOLD, 4));
    add(drawnPath(BORDER_INNER, LEN.inner, border, cardM, SINDOOR, 2.6, 0.85));
    for (const [mx, my] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const) {
      const cm = mul(cardM, mul(translate(mx === 1 ? 0 : W, my === 1 ? 0 : H), scale(mx, my)));
      add(drawnPath(CORNER.a, LEN.a, border, cm, GOLD, 3.5));
      add(drawnPath(CORNER.b, LEN.b, border, cm, SINDOOR, 3, 0.8));
      add(drawnPath(CORNER.c, LEN.c, border, cm, GOLD, 3));
      add(drawnPath(CORNER.d, LEN.d, border, cm, GOLD, 3));
      if (border > 0.5) {
        draw.push({ kind: "path", d: dot(9), m: mul(cm, translate(50, 50)), alpha: (border - 0.5) * 2, fill: SINDOOR, stroke: { paint: GOLD, width: 3 } });
      }
    }
    // the settling flourish
    const fm = mul(cardM, translate(W / 2, H - 92));
    add(drawnPath(FLOURISH_L, LEN.fl, flourish, fm, GOLD, 3.5));
    add(drawnPath(FLOURISH_R, LEN.fr, flourish, fm, GOLD, 3.5));
    if (flourish > 0.002) {
      draw.push({ kind: "path", d: DROP, m: fm, alpha: flourish, fill: SINDOOR, stroke: { paint: GOLD, width: 3 } });
      draw.push({ kind: "ellipse", cx: 0, cy: 0, rx: 4, ry: 4, m: fm, alpha: flourish, fill: GOLD });
    }
    // the gold rules between the event blocks (gold fading to nothing downward)
    if (details > 0.002) {
      for (const rx of L.rules.xs) {
        draw.push({
          kind: "rect",
          rect: { x: CARD.left + rx, y: top + L.rules.top, w: EVENT_RULE, h: L.rules.h },
          m,
          alpha: details,
          fill: { linear: [0, top + L.rules.top, 0, top + L.rules.top + L.rules.h], stops: [[0, GOLD], [1, rgba(GOLD, 0)]] },
        });
      }
    }
    // the divider under the names
    const dm = mul(cardM, translate((W - DIVIDER.w) / 2, L.divider));
    add(drawnPath(DIVIDER_L, LEN.dl, names, dm, GOLD, 3));
    add(drawnPath(DIVIDER_R, LEN.dr, names, dm, GOLD, 3));
    if (names > 0.002) {
      draw.push({ kind: "path", d: DIVIDER_DROP, m: dm, alpha: names, fill: SINDOOR, stroke: { paint: GOLD, width: 2.5 } });
      draw.push({ kind: "ellipse", cx: 232, cy: 22, rx: 4.5, ry: 4.5, m: dm, alpha: names, fill: GOLD });
      draw.push({ kind: "ellipse", cx: 288, cy: 22, rx: 4.5, ry: 4.5, m: dm, alpha: names, fill: GOLD });
    }
  }

  // ---- overlay text (frame coordinates under `m`) ----
  const overlay: OverlayItem[] = [];
  const cx = CARD.left + COLUMN.left + COLUMN.width / 2;
  const mProp = m === I ? {} : { m };
  const field = (
    key: string,
    value: string,
    style: string,
    x: number,
    cy: number,
    p: number,
    anchor: "center" | "left" | "right" = "center",
    glow?: number,
  ): void => {
    const on = visible && hasValue(value) && cy >= 0 && p > 0.002;
    overlay.push({
      kind: "text",
      id: `${idPrefix}-${key}`,
      text: hasValue(value) ? value : "",
      x,
      y: top + cy + (1 - p) * RISE_PX,
      anchor,
      style,
      opacity: on ? p : 0,
      ...(glow === undefined ? {} : { glow }),
      ...mProp,
    });
  };

  field("heading", tx.invitation, "card-heading", cx, L.heading, heading);
  field("names", tx.title, "card-names", cx, L.names + NAMES_NUDGE[lang], names, "center", Math.max(0, shimmer));
  field("message", tx.invitationMessage, "card-message", cx, L.message, message);
  field("family", tx.invitationFrom, "card-family", cx, L.family, family);

  for (const key of EVENT_KEYS) {
    const e = L.events.find((x) => x.key === key);
    const ev = wedding.events[key];
    const d = formatDate(ev.date, lang);
    const when = [d?.weekday ?? "", ev.time[lang]].filter(hasValue).join(", ");
    const x = e ? CARD.left + e.cx : cx;
    const label = tx.weddingLabel;
    field(`${key}-label`, e ? label : "", "card-label", x, e?.label ?? -1, details);
    field(`${key}-day`, e && d ? d.day : "", "card-day", x, e?.day ?? -1, details);
    field(`${key}-bndate`, e && lang === "bn" ? ev.bengaliDate : "", "card-bndate", x, e?.bndate ?? -1, details);
    field(`${key}-when`, e ? when : "", "card-when", x, e?.when ?? -1, details);
  }

  const v = L.venue;
  const venue = wedding.venue;
  field("venue-label", v ? tx.venueLabel : "", "card-label", cx, v?.label ?? -1, details);
  const note = venue.note[lang];
  const hasNote = hasValue(note) && v !== null && v.name >= 0;
  const split = VENUE_SPLIT[lang];
  if (hasNote && v) {
    field("venue-name", venue.name[lang], "card-venue", CARD.left + split.nameRight, v.name, details, "right");
  } else {
    field("venue-name", v ? venue.name[lang] : "", "card-venue", cx, v?.name ?? -1, details);
  }
  field("venue-note", hasNote ? `(${note})` : "", "card-venue-note", CARD.left + split.noteLeft, (v?.name ?? -1) + split.noteDrop, details, "left");
  field("venue-address", v ? venue.address[lang] : "", "card-address", cx, v?.address ?? -1, details);
  field("venue-landmark", v && hasValue(venue.landmark[lang]) ? `${tx.landmarkLabel}: ${venue.landmark[lang]}` : "", "card-landmark", cx, v?.landmark ?? -1, details);

  const linkAt: Pt = apply(m, { x: cx, y: top + L.button + (1 - button) * RISE_PX });
  overlay.push({
    kind: "link",
    id: `map-link-${idPrefix.replace(/^card-/, "")}`,
    href: wedding.mapUrl,
    text: tx.location,
    x: linkAt.x,
    y: linkAt.y,
    style: "map-link",
    opacity: visible && button > 0.002 ? button : 0,
    visible: visible && button > 0.002,
  });

  return { draw, overlay };
};

/**
 * Scene 4, the invitation. The card rises from the edge revealed at the end of the wedding scene, the ornament settles
 * into the emblem, then each element appears in turn. The last frame is the fully revealed card. `beat` is scene-local.
 */
export const invitationScene = (beat: number, ctx: FrameContext): FrameOutput => {
  const live = beat >= 0;
  const e = ctx.reducedMotion ? 1 : progress(beat, B.cardUnfold, rise);
  const top = lerp(CARD_EDGE_Y, CARD.top, e);
  const emblemY = top + lerp(-30, 190, e);
  const emblemScale = lerp(ORNAMENT_SCALE, 1, e);
  const backdrop = progress(beat, [0, 50]);
  const emblemBloom = progress(beat, B.emblem);
  const halo = 1 - progress(beat, [B.emblem[1], B.emblem[1] + 60]) * 0.6;

  const card = invitationCard(beat, { top, border: 1, idPrefix: "card-i", m: I, visible: live }, ctx);
  if (!live) return card;
  const draw: DrawOp[] = [];
  if (backdrop > 0.002) {
    draw.push({
      kind: "rect",
      rect: { x: 0, y: 0, w: 1080, h: 1920 },
      m: I,
      alpha: backdrop,
      fill: {
        radial: [540, 537.6, 0, 540, 537.6, Math.hypot(540, 1920 - 537.6)],
        stops: [[0, "#62262d"], [0.58, "#3b1b1c"], [1, "#26110f"]],
      },
    });
  }
  draw.push(...card.draw);
  draw.push(...emblemOps(540, emblemY, emblemScale, 1, I, { bloom: 0.55 + 0.45 * emblemBloom, halo }));
  return { draw, overlay: card.overlay };
};
