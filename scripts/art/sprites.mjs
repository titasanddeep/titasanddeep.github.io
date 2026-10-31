// Small sprites moved only by transforms at runtime: petals, gold motes, glows, flames, diya, flower heads, betel leaf.
// Each is drawn around its origin (0,0) in design units; the manifest records the trimmed rectangle around it.
import { INK, blurFilter, lin, marigold, mix, piece, r1, rad, rng } from "./common.mjs";

const PETAL = "M0 -1C0.95 -0.7 0.9 0.5 0 1C-0.9 0.5 -0.95 -0.7 0 -1Z";

const petal = (name, fill, edge) =>
  piece(
    name,
    { x: -24, y: -34, w: 48, h: 68 },
    `<g transform="scale(20 30)"><path d="${PETAL}" fill="url(#pg)" stroke="${edge}" stroke-width="0.05"/><path d="M0 -0.8V0.75" stroke="${INK}" stroke-opacity=".22" stroke-width="0.04"/><path d="M-0.35 -0.55C-0.2 -0.1 -0.2 0.3 -0.1 0.6" stroke="#ffffff" stroke-opacity=".45" stroke-width="0.07" fill="none"/></g>`,
    { scale: 2, defs: lin("pg", [[0, mix(fill, "#ffffff", 0.3)], [1, mix(fill, edge, 0.35)]], { x1: 0, y1: 0, x2: 1, y2: 1 }) },
  );

const tuberose = () =>
  piece(
    "tuberose",
    { x: -16, y: -16, w: 32, h: 32 },
    `${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse cx="0" cy="-7" rx="4.6" ry="8" transform="rotate(${a})" fill="#fbf8ef" stroke="#c8bfa6" stroke-width=".8"/>`).join("")}<circle r="3.6" fill="#efe6c6"/><circle r="1.6" fill="#d5c48a"/>`,
    { scale: 3, defs: "" },
  );

const rose = () =>
  piece(
    "rose",
    { x: -16, y: -16, w: 32, h: 32 },
    `<circle r="12" fill="#9c1b2a"/><path d="M-9 2C-9 -8 -2 -11 3 -9C9 -7 10 0 6 5C2 10 -6 9 -9 2Z" fill="#c22e3f"/><path d="M-4 0C-4 -5 1 -6 3 -3C5 0 2 4 -1 3" stroke="#7c1220" stroke-width="1.6" fill="none"/><path d="M-7 6C-2 11 6 9 9 3" stroke="#7c1220" stroke-width="1.4" fill="none"/>`,
    { scale: 3 },
  );

const marigoldHead = (name, tone, seed) =>
  piece(name, { x: -24, y: -24, w: 48, h: 48 }, marigold(rng(seed), 0, 0, 20, { tone }), { scale: 2.4 });

const mote = () =>
  piece("mote", { x: -16, y: -16, w: 32, h: 32 }, `<circle r="14" fill="url(#mg)"/>`, {
    scale: 2,
    defs: rad("mg", [[0, "#fff7dc", 1], [0.25, "#f5d68a", 0.9], [1, "#d4aa5e", 0]]),
  });

/** Soft warm bloom; scaled up at runtime (a GPU-cheap replacement for big CSS gradients). */
const glow = () =>
  piece("glow", { x: -128, y: -128, w: 256, h: 256 }, `<circle r="128" fill="url(#gg)"/>`, {
    scale: 1,
    trim: false,
    quality: 0.9,
    defs: rad("gg", [[0, "#fbe7a8", 0.95], [0.3, "#f6d37e", 0.55], [0.62, "#f1c463", 0.16], [1, "#f1c463", 0]]),
  });

const flame = () =>
  piece(
    "flame",
    { x: -20, y: -62, w: 40, h: 66 },
    `<g filter="url(#fb)"><path d="M0 0C-15 -10 -12 -30 0 -56C12 -30 15 -10 0 0Z" fill="#ffb347" opacity=".7"/></g><path d="M0 0C-13 -10 -10 -28 0 -50C10 -28 13 -10 0 0Z" fill="url(#fl)"/><path d="M0 -3C-5 -9 -4 -18 0 -28C4 -18 5 -9 0 -3Z" fill="#fff6d0"/><ellipse cx="0" cy="-4" rx="3" ry="4" fill="#5c8ad6" opacity=".55"/>`,
    { scale: 3, defs: `${lin("fl", [[0, "#ffe58a"], [0.55, "#f7a232"], [1, "#de5a1e"]])}${blurFilter("fb", 2.2)}` },
  );

const diyaBowl = () =>
  piece(
    "diya",
    { x: -48, y: -30, w: 96, h: 50 },
    `<path d="M-32 -10C-26 14 26 14 32 -10C18 -17 -18 -17 -32 -10Z" fill="url(#clay)" stroke="${INK}" stroke-width="2.2"/>
<path d="M-32 -10Q0 -22 32 -10Q0 -2 -32 -10Z" fill="#6e3119" stroke="${INK}" stroke-width="1.8"/>
<path d="M-24 -9Q0 -15 24 -9" stroke="#e9b84f" stroke-width="2.4" fill="none" opacity=".75"/>
<path d="M-20 5Q0 11 20 5" stroke="#f0b483" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/>
${[-18, -9, 0, 9, 18].map((x) => `<circle cx="${x}" cy="${r1(1 + Math.abs(x) * -0.05)}" r="2" fill="#f3d38a" opacity=".85"/>`).join("")}
<path d="M-35 -10Q-46 -14 -44 -23Q-35 -19 -31 -12" fill="#b5603a" stroke="${INK}" stroke-width="1.8"/>
<path d="M-1 -14L1 -22" stroke="#2a1b14" stroke-width="2.4" stroke-linecap="round"/>`,
    { scale: 2.5, defs: lin("clay", [[0, "#c8703f"], [1, "#8f4528"]]) },
  );

/** A glossy betel (paan) leaf, stalk at the origin, tip pointing up. */
const paan = () =>
  piece(
    "paan",
    { x: -60, y: -126, w: 120, h: 136 },
    `<path d="M0 6V-10" stroke="#3a5a30" stroke-width="5" stroke-linecap="round"/>
<path d="M0 -8C-16 0 -52 -18 -50 -58C-48 -92 -14 -100 0 -118C14 -100 48 -92 50 -58C52 -18 16 0 0 -8Z" fill="url(#leaf)" stroke="#24391f" stroke-width="2.2" stroke-linejoin="round"/>
<path d="M0 -10V-104M0 -32L-26 -50M0 -32L26 -50M0 -56L-30 -74M0 -56L30 -74M0 -80L-20 -94M0 -80L20 -94" stroke="#2c4a26" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>
<path d="M-30 -80C-38 -60 -36 -36 -20 -20" stroke="#ffffff" stroke-opacity=".28" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    { scale: 2, defs: lin("leaf", [[0, "#7aa04f"], [0.55, "#4f7a3a"], [1, "#3a5e2e"]], { x1: 0, y1: 0, x2: 1, y2: 1 }) },
  );

export const spriteArt = () => [
  petal("petal-pink", "#ef9faa", "#c4566a"),
  petal("petal-marigold", "#f4ac3a", "#c9701a"),
  petal("petal-white", "#fbf3e4", "#c49a52"),
  petal("petal-red", "#c8303f", "#7c1220"),
  marigoldHead("marigold-a", 0, 11),
  marigoldHead("marigold-b", 1, 12),
  marigoldHead("marigold-c", 3, 13),
  tuberose(),
  rose(),
  mote(),
  glow(),
  flame(),
  diyaBowl(),
  paan(),
];
