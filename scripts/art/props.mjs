// The things of the day, as sprites drawn around their origin (0,0) and placed at runtime by transforms: the piri, the
// haldi bowl, the women's hands that reach in from the frame edge, the piri's bearers and the rings of light. Origins
// are noted per piece; scenes rely on them.
import { INK, blurFilter, grainFilter, lin, mix, piece, rad } from "./common.mjs";

const RED = "#a3162a";
const SKIN = { base: "#cf9670", light: "#e6b48e", shade: "#a77250" };

const BRASS = lin("brass", [[0, "#f6d77c"], [0.45, "#d0a03a"], [1, "#8a6420"]], { x1: 0, y1: 0, x2: 1, y2: 0 });
const WOOD = lin("wood", [[0, "#9a6038"], [0.5, "#7a4628"], [1, "#56301a"]]);
const SK = lin("sk", [[0, SKIN.light], [0.5, SKIN.base], [1, SKIN.shade]], { x1: 0, y1: 0, x2: 0, y2: 1 });
const GRAIN = grainFilter("grain", 0.14, 0.85, 21);

const OUT = `stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"`;

/** The পিঁড়ি: a painted wooden plank, origin at the centre of its top (where she sits). */
const piri = () => {
  let s = `<path d="M-160 0H160L150 30H-150Z" fill="url(#wood)" ${OUT}/><path d="M-160 0C-120 -12 120 -12 160 0" fill="#9a6038" ${OUT}/>`;
  s += `<path d="M-146 14H146" stroke="#fbf3e0" stroke-width="3"/>`;
  for (let i = 0; i < 9; i++) {
    const x = -128 + i * 32;
    s += `<path d="M${x} 22c6 -10 12 -10 18 0" stroke="#fbf3e0" stroke-width="2.6" fill="none"/><circle cx="${x + 9}" cy="24" r="2" fill="#c1121f"/>`;
  }
  return piece("piri", { x: -170, y: -16, w: 340, h: 52 }, `<g filter="url(#grain)">${s}</g>`, { scale: 2, defs: `${WOOD}${GRAIN}` });
};

/** The brass bowl of haldi paste that came with the tattva, origin at its centre. */
const haldiBowl = () =>
  piece(
    "haldi-bowl",
    { x: -52, y: -32, w: 104, h: 62 },
    `<path d="M-42 -6C-36 24 36 24 42 -6Z" fill="url(#brass)" ${OUT}/><ellipse cx="0" cy="-6" rx="42" ry="11" fill="#e8a91a" ${OUT}/><ellipse cx="-6" cy="-9" rx="22" ry="5" fill="#f8cf4a"/><path d="M-28 -6q8 -6 16 0q8 6 16 0" stroke="#c98a12" stroke-width="2" fill="none"/>`,
    { scale: 3, defs: BRASS },
  );

/**
 * A woman's forearm and hand reaching in from the frame edge (shakha, pola, loha), fingers dipped in haldi.
 * Origin at the fingertips; the arm extends along -x (so the sprite is placed by where the fingers touch).
 */
const handReach = (name, { haldi = false } = {}) => {
  let s = `<path d="M-420 -30C-300 -32 -170 -28 -90 -22L-90 22C-170 28 -300 32 -420 30Z" fill="url(#sk)" ${OUT}/>`;
  s += `<path d="M-96 -24C-60 -30 -30 -22 -6 -12C4 -6 4 6 -6 10C-30 20 -60 26 -96 22Z" fill="url(#sk)" ${OUT}/><path d="M-70 -24C-58 -40 -40 -40 -36 -26" fill="${SKIN.base}" ${OUT}/>`;
  s += `<path d="M-60 -6h44M-60 4h46" stroke="${SKIN.shade}" stroke-width="1.6"/>`;
  if (haldi) s += `<ellipse cx="-10" cy="0" rx="16" ry="12" fill="#f0b81c" opacity=".9"/><ellipse cx="-20" cy="-4" rx="8" ry="5" fill="#ffd84a"/>`;
  for (const [x, c, w] of [[-150, "#3a3633", 8], [-132, "#b3202c", 14], [-112, "#f6f1e4", 16]]) {
    s += `<path d="M${x} -36Q${x + 6} 0 ${x} 36" stroke="${INK}" stroke-opacity=".6" stroke-width="${w + 3}" fill="none" stroke-linecap="round"/><path d="M${x} -36Q${x + 6} 0 ${x} 36" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  }
  return piece(name, { x: -430, y: -48, w: 440, h: 96 }, `<g filter="url(#grain)">${s}</g>`, { scale: 1.6, defs: `${SK}${GRAIN}` });
};

/**
 * The পিঁড়ি bearers, backlit: four men from the plank down to the floor, their hands raised to its underside.
 * Origin at the plank's underside centre; they stand 440 units tall below it.
 */
const bearers = () => {
  let s = "";
  for (const [x, k, lean] of [[-118, 1, -3], [-40, 0.96, 2], [40, 0.98, -2], [118, 1, 3]]) {
    s += `<g transform="translate(${x} 0) scale(${k}) rotate(${lean})"><path d="M-30 440L-26 250C-40 210 -42 150 -34 110C-30 86 -16 72 0 72C16 72 30 86 34 110C42 150 40 210 26 250L30 440Z" fill="#1d1418"/><circle cy="44" r="22" fill="#1d1418"/>
<path d="M-24 96C-30 70 -26 30 -18 4M24 96C30 70 26 30 18 4" stroke="#1d1418" stroke-width="11" stroke-linecap="round" fill="none"/>
<path d="M-18 30C-16 20 -6 16 4 18" stroke="#f0b060" stroke-opacity=".7" stroke-width="2.4" fill="none"/><path d="M-32 120C-36 160 -34 200 -26 240" stroke="#f0b060" stroke-opacity=".45" stroke-width="2.4" fill="none"/></g>`;
  }
  return piece("bearers", { x: -170, y: -10, w: 340, h: 456 }, s, { scale: 1.2 });
};

/** A soft ring of light (ululation, the conch's sound, the click of a bangle), origin at its centre. */
const ring = () =>
  piece("ring", { x: -64, y: -64, w: 128, h: 128 }, `<circle r="52" fill="none" stroke="url(#rg)" stroke-width="10" filter="url(#rb)"/>`, {
    scale: 2,
    trim: false,
    defs: `${rad("rg", [[0.7, "#fff1c8", 0], [0.85, "#fbe2a0", 1], [1, "#f1c463", 0]])}${blurFilter("rb", 3)}`,
  });

export const propArt = () => [
  piri(),
  haldiBowl(),
  handReach("hand-haldi", { haldi: true }),
  bearers(),
  ring(),
];

void mix;
void RED;
