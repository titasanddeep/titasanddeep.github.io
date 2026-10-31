// The two settings of the bride's side (spec/story.md §2) and the paper ground.
// Every setting is designed in composition coordinates (1080×1920 at camera zoom 1). Numbers the runtime also needs
// (where the lamp sits, the alpana under the piri) are mirrored in src/story/layout.ts: keep them in sync.
import { INK, blossom, blurFilter, grainFilter, leafPath, lerp, lin, marigold, mix, pick, piece, r1, rad, rng, wcFilter } from "./common.mjs";

const W = 1080;
const H = 1920;

/* ------------------------------------------------------------------ shared painting helpers */
const LIGHT = { x: 0.62, y: -0.78 };
const GREENS = ["#22352a", "#2f4a35", "#3f5e40", "#557648", "#6f8f52", "#93ab66", "#bccb84"];
const shadeColor = (pal, t) => {
  const i = Math.max(0, Math.min(pal.length - 1.001, t * (pal.length - 1)));
  return mix(pal[Math.floor(i)], pal[Math.ceil(i)], i - Math.floor(i));
};

/** A painterly clump of leaves lit from the upper right (as in the groom's garden). */
const foliage = (R, cx, cy, rx, ry, { pal = GREENS, n = 80, len = [34, 70], haze = null, hazeAmt = 0 } = {}) => {
  const col = (c) => (haze ? mix(c, haze, hazeAmt) : c);
  let s = "";
  for (let i = 0; i < 9; i++) {
    const a = R() * Math.PI * 2;
    const d = R() * 0.45;
    s += `<ellipse cx="${r1(cx + Math.cos(a) * rx * d)}" cy="${r1(cy + Math.sin(a) * ry * d + ry * 0.08)}" rx="${r1(rx * (0.55 + R() * 0.25))}" ry="${r1(ry * (0.5 + R() * 0.25))}" fill="${col(pal[1])}"/>`;
  }
  const leaves = [];
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2;
    const d = Math.sqrt(R());
    const ux = Math.cos(a) * d;
    const uy = Math.sin(a) * d;
    const lit = (ux * LIGHT.x + uy * LIGHT.y) * 0.5 + 0.5;
    leaves.push({ x: cx + ux * rx, y: cy + uy * ry, ang: (a * 180) / Math.PI + 90 + (R() - 0.5) * 70, lit: lit * 0.8 + d * 0.15 + R() * 0.15, L: lerp(len[0], len[1], R()) });
  }
  leaves.sort((p, q) => p.lit - q.lit);
  for (const l of leaves) {
    const c = col(shadeColor(pal, Math.min(1, l.lit)));
    s += `<path d="${leafPath(l.L, l.L * 0.34)}" transform="translate(${r1(l.x)} ${r1(l.y)}) rotate(${r1(l.ang)})" fill="${c}" stroke="${mix(c, INK, 0.5)}" stroke-opacity=".35" stroke-width="1.1"/>`;
  }
  return s;
};

/** A banana plant: a ringed stem and long, torn, arching leaves. `base` at the foot of the stem. */
const bananaPlant = (R, x, base, top, { lean = 0, leaves = 7, dark = 0 } = {}) => {
  const stem = `M${x - 26} ${base}C${x - 24} ${lerp(base, top, 0.5)} ${x - 18 + lean * 0.5} ${top + 60} ${x - 14 + lean} ${top}L${x + 14 + lean} ${top}C${x + 18 + lean * 0.5} ${top + 60} ${x + 24} ${lerp(base, top, 0.5)} ${x + 26} ${base}Z`;
  let s = `<path d="${stem}" fill="${mix("#8fa55c", "#1b2416", dark)}" stroke="${INK}" stroke-opacity=".5" stroke-width="2.4"/>`;
  for (let i = 0; i < 9; i++) {
    const y = lerp(base - 30, top + 40, i / 8);
    s += `<path d="M${x - 24} ${r1(y)}Q${x + lean * ((base - y) / (base - top))} ${r1(y + 12)} ${x + 24} ${r1(y)}" stroke="${mix("#56693c", "#10160d", dark)}" stroke-opacity=".6" stroke-width="2.2" fill="none"/>`;
  }
  // a red thread tied round the stem, for the day
  s += `<path d="M${x - 25} ${base - 170}Q${x} ${base - 158} ${x + 25} ${base - 170}" stroke="#b3202c" stroke-width="4" fill="none"/>`;
  for (let i = 0; i < leaves; i++) {
    const side = i % 2 ? 1 : -1;
    const ang = side * (18 + i * 9 + R() * 10) + lean * 0.05;
    const L = 300 + R() * 160;
    const c = mix(pick(R, ["#4f7a3a", "#5f8a44", "#3f6b36", "#6b9450"]), "#0d140b", dark);
    const tear = Array.from({ length: 5 }, (_, k) => `<path d="M0 ${r1(-L * (0.25 + k * 0.14))}l${side * 48} ${r1(-20 - R() * 14)}" stroke="${mix(c, "#000000", 0.25)}" stroke-width="2" opacity=".55"/>`).join("");
    s += `<g transform="translate(${x + lean} ${top + 10}) rotate(${r1(ang)})"><path d="${leafPath(L, 62)}" fill="${c}" stroke="${INK}" stroke-opacity=".45" stroke-width="2"/><path d="M0 -6V${r1(-L * 0.95)}" stroke="${mix("#a7b56f", "#151c10", dark)}" stroke-width="3"/>${tear}</g>`;
  }
  return s;
};

/** A string of mango leaves with marigolds, sagging between two points. */
const torana = (R, x1, y1, x2, y2, sag, { n = 16, dark = 0 } = {}) => {
  let s = `<path d="M${x1} ${y1}Q${(x1 + x2) / 2} ${y1 + sag * 2} ${x2} ${y2}" stroke="#5a4030" stroke-width="2.4" fill="none"/>`;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * ((x1 + x2) / 2) + t * t * x2;
    const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * (y1 + sag * 2) + t * t * y2;
    const c = mix(pick(R, ["#3f6b36", "#4f7a3a", "#2f5a2a"]), "#0d140b", dark);
    s += `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(180 + (R() - 0.5) * 30)})"><path d="${leafPath(54, 13)}" fill="${c}" stroke="${INK}" stroke-opacity=".5" stroke-width="1.4"/></g>`;
    if (i % 2 === 0) s += marigold(R, x, y + 10, 13, { tone: i });
  }
  return s;
};

/** A rice-paste alpana: concentric rings, petals and dots, drawn flat on the floor (scaleY squashes it). */
const alpanaRing = (R, cx, cy, rx, ry, { ink = "#fbf3e0", ground = null, red = null } = {}) => {
  let s = `<g transform="translate(${cx} ${cy}) scale(1 ${r1((ry / rx) * 100) / 100})">`;
  if (ground) s += `<circle r="${rx}" fill="${ground}"/>`;
  s += `<circle r="${r1(rx * 0.98)}" fill="none" stroke="${ink}" stroke-width="7"/><circle r="${r1(rx * 0.9)}" fill="none" stroke="${ink}" stroke-width="3" stroke-dasharray="2 14" stroke-linecap="round"/>`;
  const petals = 16;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * 360;
    s += `<g transform="rotate(${a}) translate(0 ${r1(-rx * 0.78)})"><path d="M0 ${r1(rx * 0.12)}C${r1(rx * 0.07)} 0 ${r1(rx * 0.06)} ${r1(-rx * 0.08)} 0 ${r1(-rx * 0.14)}C${r1(-rx * 0.06)} ${r1(-rx * 0.08)} ${r1(-rx * 0.07)} 0 0 ${r1(rx * 0.12)}Z" fill="${red ?? "none"}" stroke="${ink}" stroke-width="5"/></g>`;
  }
  s += `<circle r="${r1(rx * 0.56)}" fill="none" stroke="${ink}" stroke-width="5"/>`;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * 360;
    s += `<g transform="rotate(${a})"><path d="M0 0C${r1(rx * 0.12)} ${r1(-rx * 0.16)} ${r1(rx * 0.1)} ${r1(-rx * 0.38)} 0 ${r1(-rx * 0.5)}C${r1(-rx * 0.1)} ${r1(-rx * 0.38)} ${r1(-rx * 0.12)} ${r1(-rx * 0.16)} 0 0Z" fill="${red ? mix(red, "#ffffff", 0.1) : "none"}" fill-opacity=".55" stroke="${ink}" stroke-width="5"/></g>`;
  }
  for (let i = 0; i < 48; i++) {
    const a = R() * Math.PI * 2;
    const d = 0.62 + R() * 0.2;
    s += `<circle cx="${r1(Math.cos(a) * rx * d)}" cy="${r1(Math.sin(a) * rx * d)}" r="${r1(3 + R() * 2)}" fill="${ink}" opacity=".85"/>`;
  }
  s += `<circle r="${r1(rx * 0.08)}" fill="${ink}"/></g>`;
  return s;
};

/** Soft plaster mottling over a rectangle (watercolour edges). */
const mottle = (R, x, y, w, h, colours, n = 30, k = 1) => {
  let s = "";
  for (let i = 0; i < n; i++) {
    s += `<ellipse cx="${r1(x + R() * w)}" cy="${r1(y + R() * h)}" rx="${r1((60 + R() * 220) * k)}" ry="${r1((20 + R() * 90) * k)}" fill="${pick(R, colours)}" fill-opacity="${r1(0.1 + R() * 0.2)}"/>`;
  }
  return s;
};

const STD_DEFS = (seed = 3) => `${grainFilter("grain", 0.16, 0.85, seed)}${wcFilter("wc", 8, 0.02, seed)}${blurFilter("b4", 4)}${blurFilter("b12", 12)}${blurFilter("b30", 30)}`;

/* ------------------------------------------------------------------ paper (the ground behind everything) */
const paper = () => {
  const defs = `
<filter id="mottle" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="3" seed="5"/><feColorMatrix type="matrix" values="0 0 0 0 .75  0 0 0 0 .6  0 0 0 0 .4  1.3 0 0 0 -.5"/></filter>
<filter id="fibre" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9 0.35" numOctaves="2" seed="17"/><feColorMatrix type="matrix" values="0 0 0 0 .36  0 0 0 0 .27  0 0 0 0 .18  1.6 0 0 0 -.86"/></filter>
${rad("vig", [[0.6, "#8a5a3a", 0], [1, "#8a5a3a", 0.3]], { cx: 0.5, cy: 0.46, r: 0.75 })}`;
  const body = `<rect width="1080" height="1920" fill="#f5ebdd"/><rect width="1080" height="1920" filter="url(#mottle)" opacity=".5"/><rect width="1080" height="1920" filter="url(#fibre)" opacity=".55"/><rect width="1080" height="1920" fill="url(#vig)"/>`;
  return piece("paper", { x: 0, y: 0, w: 1080, h: 1920 }, body, { opaque: true, quality: 0.8, defs });
};

/* ------------------------------------------------------------------ 1. the courtyard (উঠোন) */
/** Mirrored in src/story/layout.ts COURTYARD. */
export const COURTYARD = { roof: 300, cornice: 712, step: 1150, floor: 1214, tulsiX: 252, tulsiBase: 1334, niche: { x: 252, y: 1238 }, window: { x: 780, y: 530 } };

const courtyard = () => {
  const R = rng(1101);
  const C = COURTYARD;
  const defs = `${STD_DEFS(4)}
${lin("sky", [[0, "#cfe0ef"], [0.7, "#f2e6d2"], [1, "#f8ecd8"]])}
${lin("upper", [[0, "#f3dfb0"], [1, "#e2c48e"]])}
${lin("veranda", [[0, "#cfa877"], [1, "#b88d5e"]])}
${lin("inside", [[0, "#4a2d1e"], [1, "#2e1b12"]])}
${lin("floor", [[0, "#cfa271"], [0.4, "#c18f5f"], [1, "#a8754a"]])}
${lin("pillar", [[0, "#f6e8c8"], [0.5, "#ead3a2"], [1, "#c6a573"]], { x1: 0, y1: 0, x2: 1, y2: 0 })}
${lin("oxide", [[0, "#a64532"], [1, "#7c2c1f"]])}
${lin("lime", [[0, "#fbf3df"], [1, "#e1cfa6"]], { x1: 0, y1: 0, x2: 1, y2: 0 })}
${lin("shutter", [[0, "#4f7f66"], [1, "#2f5a46"]], { x1: 0, y1: 0, x2: 1, y2: 0 })}`;
  let s = `<g filter="url(#grain)"><rect width="${W}" height="${C.roof + 20}" fill="url(#sky)"/>`;
  // a coconut palm beyond the roof, and a few clouds
  s += `<g opacity=".9"><path d="M940 ${C.roof + 10}C950 220 968 150 990 96" stroke="#6b5a44" stroke-width="16" fill="none" stroke-linecap="round"/>`;
  for (let i = 0; i < 9; i++) {
    const a = -170 + i * 40 + R() * 12;
    s += `<g transform="translate(990 96) rotate(${r1(a)})"><path d="M0 0Q90 -20 190 30" stroke="#3f5e40" stroke-width="5" fill="none"/>${Array.from({ length: 12 }, (_, k) => `<path d="M${16 + k * 14} ${r1(-4 + k * 2.2)}l${r1(6 + R() * 6)} ${r1(26 + R() * 10)}" stroke="${pick(R, ["#3f5e40", "#557648", "#2f4a35"])}" stroke-width="4" stroke-linecap="round"/>`).join("")}</g>`;
  }
  s += `</g><g filter="url(#b12)" opacity=".7"><ellipse cx="240" cy="120" rx="160" ry="34" fill="#ffffff"/><ellipse cx="560" cy="70" rx="120" ry="24" fill="#ffffff"/></g>`;
  // the upper storey: parapet, lime-washed wall, Titas's window, a smaller window
  s += `<path d="M0 ${C.roof - 16}H${W}V${C.roof + 14}H0Z" fill="#e6cf9e" stroke="${INK}" stroke-opacity=".4" stroke-width="2"/>`;
  for (let x = 20; x < W; x += 64) s += `<rect x="${x}" y="${C.roof - 40}" width="34" height="26" fill="#ead6a8" stroke="${INK}" stroke-opacity=".35" stroke-width="1.6"/>`;
  s += `<rect y="${C.roof + 14}" width="${W}" height="${C.cornice - C.roof - 14}" fill="url(#upper)"/>`;
  s += `<g filter="url(#wc)">${mottle(R, 0, C.roof + 14, W, C.cornice - C.roof, ["#d9b67a", "#f6e6bd", "#cfa86c"], 26)}</g>`;
  // weathering streaks under the parapet
  for (let i = 0; i < 16; i++) {
    const x = R() * W;
    s += `<path d="M${r1(x)} ${C.roof + 16}q${r1((R() - 0.5) * 8)} ${r1(60 + R() * 120)} ${r1((R() - 0.5) * 10)} ${r1(120 + R() * 140)}" stroke="#b08a58" stroke-opacity=".18" stroke-width="${r1(6 + R() * 10)}" fill="none"/>`;
  }
  const win = (x, y, w, h, { shutters = true } = {}) => {
    let o = `<rect x="${x - 10}" y="${y - 14}" width="${w + 20}" height="${h + 26}" rx="6" fill="#d8b98a" stroke="${INK}" stroke-opacity=".45" stroke-width="2"/>`;
    o += `<path d="M${x} ${y + 24}Q${x + w / 2} ${y - 20} ${x + w} ${y + 24}V${y + h}H${x}Z" fill="url(#inside)" stroke="${INK}" stroke-opacity=".6" stroke-width="2.4"/>`;
    for (let k = 1; k < 6; k++) o += `<path d="M${r1(x + (w * k) / 6)} ${y + 12}V${y + h}" stroke="#2a221c" stroke-width="4"/>`;
    if (shutters) {
      o += `<path d="M${x} ${y + 20}L${x - w * 0.42} ${y + 30}V${y + h + 8}L${x} ${y + h}Z" fill="url(#shutter)" stroke="${INK}" stroke-opacity=".6" stroke-width="2"/>`;
      o += `<path d="M${x + w} ${y + 20}L${x + w + w * 0.42} ${y + 30}V${y + h + 8}L${x + w} ${y + h}Z" fill="url(#shutter)" stroke="${INK}" stroke-opacity=".6" stroke-width="2"/>`;
      for (let k = 1; k < 7; k++) {
        o += `<path d="M${r1(x - w * 0.4)} ${r1(y + 30 + k * ((h - 20) / 7))}L${x} ${r1(y + 24 + k * ((h - 20) / 7))}M${x + w} ${r1(y + 24 + k * ((h - 20) / 7))}L${r1(x + w + w * 0.4)} ${r1(y + 30 + k * ((h - 20) / 7))}" stroke="#25463a" stroke-width="2"/>`;
      }
    }
    o += `<rect x="${x - 16}" y="${y + h + 4}" width="${w + 32}" height="12" fill="#e9d4a6" stroke="${INK}" stroke-opacity=".4" stroke-width="1.6"/>`;
    return o;
  };
  s += win(C.window.x - 80, C.window.y - 110, 160, 220);
  s += win(150, 430, 120, 170);
  // cornice
  s += `<path d="M0 ${C.cornice - 12}H${W}V${C.cornice + 22}H0Z" fill="#efdcb2" stroke="${INK}" stroke-opacity=".45" stroke-width="2"/><path d="M0 ${C.cornice + 22}H${W}" stroke="#a88456" stroke-width="5"/>`;
  for (let x = 12; x < W; x += 36) s += `<path d="M${x} ${C.cornice + 24}v16h20v-16" fill="#e2c999" stroke="${INK}" stroke-opacity=".3" stroke-width="1.2"/>`;
  // the verandah: back wall in shade, a door with its threshold, four pillars
  s += `<rect y="${C.cornice + 40}" width="${W}" height="${C.step - C.cornice - 40}" fill="url(#veranda)"/>`;
  s += `<g filter="url(#wc)">${mottle(R, 0, C.cornice + 40, W, C.step - C.cornice - 40, ["#a37a4e", "#d6b483", "#8f6a44"], 18)}</g>`;
  s += `<path d="M470 1146V870Q540 806 610 870V1146Z" fill="url(#inside)" stroke="${INK}" stroke-opacity=".6" stroke-width="3"/><path d="M462 1146V866Q540 794 618 866V1146" stroke="#7a4a28" stroke-width="10" fill="none"/>`;
  s += `<path d="M470 1146V870L500 852V1146Z" fill="#6e4426" opacity=".9"/><path d="M610 1146V870L580 852V1146Z" fill="#6e4426" opacity=".9"/>`;
  // the verandah's plinth and step (red oxide with a white line)
  s += `<path d="M0 ${C.step}H${W}V${C.floor}H0Z" fill="url(#oxide)" stroke="${INK}" stroke-opacity=".5" stroke-width="2"/><path d="M0 ${C.step + 8}H${W}" stroke="#f3e6cc" stroke-width="3" opacity=".8"/>`;
  for (const px of [110, 390, 690, 970]) {
    s += `<rect x="${px - 30}" y="${C.cornice + 30}" width="60" height="${C.step - C.cornice - 30}" fill="url(#pillar)" stroke="${INK}" stroke-opacity=".5" stroke-width="2.4"/>`;
    s += `<rect x="${px - 40}" y="${C.cornice + 26}" width="80" height="22" fill="#efdcb2" stroke="${INK}" stroke-opacity=".45" stroke-width="2"/><rect x="${px - 40}" y="${C.step - 30}" width="80" height="30" fill="#e6cf9e" stroke="${INK}" stroke-opacity=".45" stroke-width="2"/>`;
    s += `<path d="M${px + 18} ${C.cornice + 50}V${C.step - 34}" stroke="#a88456" stroke-opacity=".5" stroke-width="6"/>`;
  }
  // the courtyard floor, smoothed with clay
  s += `<rect y="${C.floor}" width="${W}" height="${H - C.floor}" fill="url(#floor)"/>`;
  s += `<g filter="url(#wc)" opacity=".8">${mottle(R, 0, C.floor, W, H - C.floor, ["#b88454", "#d8ae7c", "#a06c42", "#caa070"], 40)}</g>`;
  for (let i = 0; i < 140; i++) {
    const y = C.floor + 10 + R() * (H - C.floor - 10);
    s += `<path d="M${r1(R() * W)} ${r1(y)}q${r1(20 + R() * 40)} ${r1((R() - 0.5) * 4)} ${r1(60 + R() * 80)} 0" stroke="#8f5d36" stroke-opacity="${r1(0.08 + R() * 0.12)}" stroke-width="${r1(1 + R() * 2)}" fill="none"/>`;
  }
  // a red-and-white alpana at the threshold
  s += alpanaRing(R, 540, 1268, 200, 40, { ink: "#fbf3e0", red: "#b5302c" });
  // the তুলসী মঞ্চ: a stepped, lime-washed pedestal with a niche for the lamp, the tulsi bush on top
  const tx = C.tulsiX;
  const tb = C.tulsiBase;
  s += `<path d="M${tx - 104} ${tb}V${tb - 40}H${tx + 104}V${tb}Z" fill="url(#lime)" stroke="${INK}" stroke-opacity=".55" stroke-width="2.4"/>`;
  s += `<path d="M${tx - 80} ${tb - 40}V${tb - 200}H${tx + 80}V${tb - 40}Z" fill="url(#lime)" stroke="${INK}" stroke-opacity=".55" stroke-width="2.4"/>`;
  s += `<path d="M${tx - 96} ${tb - 200}H${tx + 96}V${tb - 222}H${tx - 96}Z" fill="#f6ead0" stroke="${INK}" stroke-opacity=".55" stroke-width="2.4"/>`;
  s += `<path d="M${tx - 70} ${tb - 222}Q${tx} ${tb - 236} ${tx + 70} ${tb - 222}V${tb - 236}H${tx - 70}Z" fill="#7a4a28"/>`;
  // the niche (dark) where the lamp is lit, with a red border and a sindoor swastika-free simple motif
  s += `<path d="M${C.niche.x - 30} ${C.niche.y + 2}V${C.niche.y - 54}Q${C.niche.x} ${C.niche.y - 84} ${C.niche.x + 30} ${C.niche.y - 54}V${C.niche.y + 2}Z" fill="#3b2418" stroke="#b5302c" stroke-width="4"/>`;
  for (const k of [-1, 1]) s += `<path d="M${tx + k * 56} ${tb - 186}V${tb - 56}" stroke="#b5302c" stroke-width="3" stroke-dasharray="10 8"/><circle cx="${tx + k * 56}" cy="${tb - 46}" r="5" fill="#b5302c"/>`;
  s += `<path d="M${tx - 92} ${tb - 30}H${tx + 92}" stroke="#b5302c" stroke-width="3"/>`;
  s += foliage(R, tx, tb - 290, 86, 70, { n: 90, len: [14, 26], pal: ["#1f3324", "#2b4a30", "#3a5f3a", "#4c7444", "#5f8a4f", "#7aa05e", "#9cbb76"] });
  for (let i = 0; i < 8; i++) s += `<path d="M${r1(tx - 40 + R() * 80)} ${r1(tb - 330 - R() * 50)}v-18" stroke="#6a4a5a" stroke-width="3" stroke-linecap="round"/>`;
  s += `</g>`;
  return piece("courtyard", { x: 0, y: 0, w: W, h: H }, s, { opaque: true, quality: 0.84, defs });
};

/** Marigold garlands hung in swags along the verandah for the gaye holud. */
const courtyardGarlands = () => {
  const R = rng(1111);
  let s = "";
  const ys = COURTYARD.cornice + 34;
  const pillars = [110, 390, 690, 970];
  for (let i = 0; i < pillars.length - 1; i++) s += torana(R, pillars[i], ys, pillars[i + 1], ys, 70, { n: 14 });
  for (const px of pillars) {
    for (let k = 0; k < 9; k++) s += marigold(R, px + Math.sin(k * 1.3) * 6, ys + 20 + k * 24, 12, { tone: k });
  }
  s += torana(R, -40, ys, 110, ys, 30, { n: 6 }) + torana(R, 970, ys, 1120, ys, 30, { n: 6 });
  return piece("courtyard-garlands", { x: 0, y: ys - 30, w: W, h: 290 }, s, { quality: 0.85 });
};

/* ------------------------------------------------------------------ 2. the ছাদনাতলা at night */
/** Mirrored in src/story/layout.ts CHHADNA. */
export const CHHADNA = { cx: 540, cy: 1560, rx: 470, ry: 128, back: [236, 844], backBase: 1330 };

const chhadnatala = () => {
  const R = rng(1501);
  const C = CHHADNA;
  const defs = `${STD_DEFS(12)}
${lin("night", [[0, "#141634"], [0.6, "#2a1e3a"], [1, "#3a2230"]])}
${lin("bwall", [[0, "#3a1e22"], [1, "#24120f"]])}
${lin("ground", [[0, "#5a3020"], [1, "#2e170f"]])}
${rad("warm", [[0, "#f0a050", 0.55], [0.5, "#c0602a", 0.2], [1, "#c0602a", 0]])}`;
  let s = `<g filter="url(#grain)"><rect width="${W}" height="420" fill="url(#night)"/>`;
  for (let i = 0; i < 40; i++) s += `<circle cx="${r1(R() * W)}" cy="${r1(R() * 360)}" r="${r1(0.8 + R() * 1.8)}" fill="#fff6dc" opacity="${r1(0.3 + R() * 0.6)}"/>`;
  s += `<rect y="380" width="${W}" height="${1200 - 380}" fill="url(#bwall)"/>`;
  s += `<g filter="url(#wc)">${mottle(R, 0, 380, W, 820, ["#4a2428", "#2a1414", "#5a2e2a"], 24)}</g>`;
  // a warm glow of lamps on the wall behind
  s += `<ellipse cx="540" cy="1100" rx="620" ry="420" fill="url(#warm)"/>`;
  // a string of small lights along the top of the wall
  for (let i = 0; i < 30; i++) {
    const x = 20 + i * 36;
    const y = 420 + Math.sin((i / 29) * Math.PI) * 60;
    s += `<circle cx="${x}" cy="${r1(y)}" r="9" fill="#ffd77a" opacity=".35" filter="url(#b4)"/><circle cx="${x}" cy="${r1(y)}" r="3.4" fill="#fff2c6"/>`;
  }
  s += `<rect y="1200" width="${W}" height="${H - 1200}" fill="url(#ground)"/>`;
  s += `<g filter="url(#wc)" opacity=".6">${mottle(R, 0, 1200, W, H - 1200, ["#6a3a26", "#3a1e14"], 20)}</g>`;
  // the alpana under the piri, lit from above
  s += `<ellipse cx="${C.cx}" cy="${C.cy}" rx="${C.rx + 30}" ry="${C.ry + 14}" fill="#a8482c" opacity=".55"/>`;
  s += alpanaRing(R, C.cx, C.cy, C.rx, C.ry, { ink: "#fbf3e0", red: "#b5302c" });
  s += `<ellipse cx="${C.cx}" cy="${C.cy - 30}" rx="${C.rx * 0.9}" ry="${C.ry * 1.6}" fill="url(#warm)" opacity=".7"/>`;
  // the two back banana plants and the mango-leaf strings between them
  for (const [i, x] of C.back.entries()) s += bananaPlant(R, x, C.backBase, 640, { lean: i ? 24 : -24, leaves: 8, dark: 0.45 });
  s += torana(R, C.back[0], 660, C.back[1], 660, 50, { n: 20, dark: 0.35 });
  s += torana(R, C.back[0], 660, -40, 520, 20, { n: 8, dark: 0.35 }) + torana(R, C.back[1], 660, 1120, 520, 20, { n: 8, dark: 0.35 });
  s += `</g>`;
  return piece("chhadnatala", { x: 0, y: 0, w: W, h: H }, s, { opaque: true, quality: 0.84, defs });
};

/** The two front banana plants, framing the ছাদনাতলা (drawn over everything else in the scene). */
const chhadnatalaFront = () => {
  const R = rng(1502);
  let s = bananaPlant(R, 40, 2000, 900, { lean: 40, leaves: 7, dark: 0.55 }) + bananaPlant(R, 1040, 2000, 920, { lean: -40, leaves: 7, dark: 0.55 });
  return piece("chhadnatala-front", { x: -300, y: 400, w: 1680, h: 1520 }, `<g filter="url(#grain)">${s}</g>`, { quality: 0.82, defs: grainFilter("grain", 0.16, 0.85, 13) });
};

export const settingArt = () => [
  paper(),
  courtyard(),
  courtyardGarlands(),
  chhadnatala(),
  chhadnatalaFront(),
];

void blossom;
