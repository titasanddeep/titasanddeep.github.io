// Deep, Titas and her mother, as cut-out puppets: every part is painted here in FIGURE coordinates (origin between the feet,
// y up is negative) in its rest pose and baked separately, so the runtime rig moves them with CSS transforms only.
// The geometry constants below are mirrored in src/story/rig.ts SKELETON — keep them in sync.
// Faces (eyes, brows, mouth) are NOT baked: they stay vector so expressions can change (see WeddingCouple.tsx).
import { INK, grainFilter, lin, mix, piece, r1, rad, rng } from "./common.mjs";

const SCALE = 1.6;
const GOLD = "#d2a74e";
const GOLD_L = "#f4da92";
const GOLD_D = "#94702c";
const HAIR = "#1b1210";
const RED = "#a3162a";
const RED_D = "#6e0c1a";
const RED_L = "#c8313f";

export const SKIN = {
  groom: { base: "#c98d5e", light: "#e2a97a", shade: "#a26a42" },
  bride: { base: "#dba27a", light: "#efc29a", shade: "#b77e56" },
  mother: { base: "#cf9670", light: "#e6b48e", shade: "#a77250" },
};

/* --- skeleton (rest pose), shared with the runtime rig --- */
export const BONES = {
  groom: { shoulder: { x: 62, y: -496 }, elbow: { x: 72, y: -384 }, wrist: { x: 78, y: -282 } },
  bride: { shoulder: { x: 54, y: -490 }, elbow: { x: 62, y: -382 }, wrist: { x: 68, y: -286 } },
  mother: { shoulder: { x: 58, y: -486 }, elbow: { x: 66, y: -378 }, wrist: { x: 72, y: -284 } },
};

const OUT = `stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"`;
const OUT_T = `stroke="${INK}" stroke-opacity=".55" stroke-width="1.3" stroke-linejoin="round"`;

/** A group whose local +y runs from `a` to `b` (a bone). */
const bone = (a, b, body) => {
  const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI - 90;
  return `<g transform="translate(${a.x} ${a.y}) rotate(${r1(ang)})">${body}</g>`;
};
const len = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

const skinDefs = (who) => {
  const s = SKIN[who];
  return `${lin(`sk-${who}`, [[0, s.light], [0.45, s.base], [1, s.shade]], { x1: 0, y1: 0, x2: 1, y2: 0 })}${rad(`skf-${who}`, [[0, s.light], [0.55, s.base], [1, s.shade]], { cx: 0.38, cy: 0.38, r: 0.75 })}`;
};

const fabric = (id, light, base, shade) => lin(id, [[0, light], [0.4, base], [1, shade]], { x1: 0, y1: 0, x2: 1, y2: 0 });

/* ------------------------------------------------------------------ hands */
const hand = (who, L, { alta = false } = {}) => {
  const s = SKIN[who];
  const y0 = L - 4;
  return `<path d="M-9 ${y0} C-12 ${y0 + 10} -12 ${y0 + 22} -8 ${y0 + 31} C-5 ${y0 + 37} 4 ${y0 + 37} 7 ${y0 + 31} C11 ${y0 + 23} 11 ${y0 + 10} 8 ${y0}Z" fill="url(#sk-${who})" ${OUT}/>
<path d="M-8 ${y0 + 7} C-15 ${y0 + 10} -17 ${y0 + 18} -12 ${y0 + 22}" fill="${s.base}" ${OUT}/>
<path d="M-3 ${y0 + 22}V${y0 + 32}M1 ${y0 + 22}V${y0 + 33}M5 ${y0 + 21}V${y0 + 30}" stroke="${s.shade}" stroke-width="1.2" stroke-linecap="round"/>
${alta ? `<path d="M-8 ${y0 + 31} C-5 ${y0 + 37} 4 ${y0 + 37} 7 ${y0 + 31}" stroke="#c1121f" stroke-width="3.2" fill="none" stroke-linecap="round"/><circle cx="0" cy="${y0 + 16}" r="3.4" fill="#c1121f" opacity=".75"/>` : ""}`;
};

/* ------------------------------------------------------------------ groom */
const groomUpperArm = () => {
  const { shoulder: S, elbow: E } = BONES.groom;
  const L = len(S, E);
  const body = `<path d="M-17 -4 C-17 -18 17 -18 17 -4 L14.5 ${L} C14.5 ${L + 12} -14.5 ${L + 12} -14.5 ${L}Z" fill="url(#silk)" ${OUT}/>
<path d="M-6 6 C-4 ${L * 0.4} -8 ${L * 0.7} -5 ${L}" stroke="${mix("#f3e6c8", INK, 0.25)}" stroke-width="1.6" fill="none" opacity=".6"/>
<path d="M8 10 C10 ${L * 0.5} 6 ${L * 0.8} 9 ${L + 4}" stroke="${mix("#f3e6c8", INK, 0.3)}" stroke-width="1.4" fill="none" opacity=".5"/>`;
  return bone(S, E, body);
};

const groomForearm = () => {
  const { elbow: E, wrist: W } = BONES.groom;
  const L = len(E, W);
  const body = `${hand("groom", L)}
<path d="M-14.5 -2 C-14.5 -14 14.5 -14 14.5 -2 L13 ${L - 6} L-13 ${L - 6}Z" fill="url(#silk)" ${OUT}/>
<path d="M2 8 C0 ${L * 0.4} 4 ${L * 0.7} 1 ${L - 10}" stroke="${mix("#f3e6c8", INK, 0.28)}" stroke-width="1.4" fill="none" opacity=".55"/>
<rect x="-14" y="${L - 16}" width="28" height="12" rx="3" fill="url(#gold)" ${OUT_T}/>
${[-8, -3, 2, 7].map((x) => `<circle cx="${x}" cy="${L - 10}" r="1.6" fill="${RED}"/>`).join("")}`;
  return bone(E, W, body);
};

const groomHead = () => {
  const sk = SKIN.groom;
  let s = `<ellipse cx="-43" cy="-598" rx="8" ry="14" fill="${sk.base}" ${OUT}/><ellipse cx="43" cy="-598" rx="8" ry="14" fill="${sk.shade}" ${OUT}/>
<path d="M-44 -598q4 -6 2 -10M44 -598q-4 -6 -2 -10" stroke="${sk.shade}" stroke-width="1.6" fill="none"/>
<path d="M0 -652C-26 -652 -43 -634 -43 -606C-43 -584 -38 -566 -26 -555C-17 -548 -8 -545 0 -545C8 -545 17 -548 26 -555C38 -566 43 -584 43 -606C43 -634 26 -652 0 -652Z" fill="url(#skf-groom)" ${OUT}/>
<path d="M26 -555C38 -566 43 -584 43 -606C40 -588 34 -570 20 -558Z" fill="${sk.shade}" opacity=".45"/>
<path d="M-1 -598C-3 -586 -6 -578 -4 -573" stroke="${sk.shade}" stroke-width="2" fill="none" stroke-linecap="round"/>
<path d="M-8 -572Q-4 -567 0 -569Q4 -567 8 -572" stroke="${mix(sk.shade, INK, 0.3)}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
<ellipse cx="-2" cy="-576" rx="2.5" ry="1.6" fill="${sk.light}" opacity=".8"/>
<path d="M-17 -563C-10 -569 -3 -567 0 -564C3 -567 10 -569 17 -563C12 -561 5 -561.5 0 -562C-5 -561.5 -12 -561 -17 -563Z" fill="${HAIR}"/>
<path d="M-12 -548Q0 -543 12 -548" stroke="${sk.shade}" stroke-width="1.6" fill="none" opacity=".6"/>`;
  // hair: hairline and sideburns (the topor covers the crown)
  s += `<path d="M-44 -604C-48 -640 -30 -666 0 -666C30 -666 48 -640 44 -604C42 -620 37 -632 29 -638C14 -633 -14 -633 -29 -638C-37 -632 -42 -620 -44 -604Z" fill="${HAIR}"/>
<path d="M-26 -640C-10 -646 12 -646 26 -640" stroke="#4a3830" stroke-width="2" fill="none" opacity=".7"/>
<path d="M-43 -612L-41 -586L-37 -588L-38 -612Z" fill="${HAIR}"/><path d="M43 -612L41 -586L37 -588L38 -612Z" fill="${HAIR}"/>`;
  // chandan: an arc of dots over each brow and a mark at the centre of the forehead
  for (const side of [-1, 1]) {
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      const x = side * (7 + t * 30);
      const y = -621 - Math.sin(t * Math.PI) * 6 + t * 3;
      s += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${k % 2 ? 1.5 : 2}" fill="#fff8ea" stroke="${GOLD_D}" stroke-width=".5"/>`;
    }
  }
  s += `<path d="M0 -632V-622" stroke="#fff8ea" stroke-width="3.6" stroke-linecap="round"/><circle cx="0" cy="-635" r="2.4" fill="${RED}"/>`;
  return s;
};

const topor = () => {
  const R = rng(91);
  let s = `<path d="M-74 -652C-90 -720 -60 -800 0 -812C60 -800 90 -720 74 -652Z" fill="url(#shola)" ${OUT}/>`;
  // scalloped edge of the back fan
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * (0.06 + (i / 16) * 0.88);
    const x = -Math.cos(a) * 80;
    const y = -652 - Math.sin(a) * 158;
    s += `<circle cx="${r1(x)}" cy="${r1(y)}" r="6" fill="#fbf7ec" ${OUT_T}/>`;
  }
  // the tall cone
  s += `<path d="M-52 -648C-56 -702 -30 -792 0 -886C30 -792 56 -702 52 -648Z" fill="url(#shola)" ${OUT}/>
<path d="M14 -880C26 -790 48 -702 50 -650L30 -650C30 -710 20 -790 6 -870Z" fill="#d9cbaa" opacity=".45"/>`;
  // tiers of cut-work
  [-684, -722, -760, -798, -836].forEach((y, i) => {
    const w = 48 - i * 9;
    s += `<path d="M${-w} ${y}Q0 ${y + 10} ${w} ${y}" stroke="${GOLD_D}" stroke-width="2.2" fill="none"/>`;
    for (let k = -2; k <= 2; k++) {
      if (Math.abs(k) * 12 > w) continue;
      s += `<path d="M${k * 12 - 6} ${y - 4}q6 -12 12 0" stroke="${GOLD_D}" stroke-width="1.6" fill="none"/><circle cx="${k * 12}" cy="${y - 13}" r="1.8" fill="${i % 2 ? RED : GOLD}"/>`;
    }
  });
  for (let i = 0; i < 26; i++) {
    const t = R();
    const y = -660 - t * 210;
    const half = 50 * (1 - t * 0.92);
    s += `<circle cx="${r1((R() - 0.5) * 2 * half * 0.8)}" cy="${r1(y)}" r="1.2" fill="${GOLD}" opacity=".8"/>`;
  }
  // finial and the gold band that sits on the forehead
  s += `<circle cx="0" cy="-890" r="7" fill="url(#gold)" ${OUT_T}/><path d="M0 -897V-914" stroke="${GOLD}" stroke-width="2.6"/><path d="M0 -914l-5 -8M0 -914l5 -8" stroke="${RED}" stroke-width="2"/>
<path d="M-56 -640Q0 -626 56 -640L54 -656Q0 -644 -54 -656Z" fill="url(#gold)" ${OUT}/>
${[-40, -20, 0, 20, 40].map((x) => `<circle cx="${x}" cy="${r1(-644 + Math.abs(x) * 0.08)}" r="3.2" fill="${RED}" stroke="${GOLD_D}" stroke-width=".8"/>`).join("")}
${[-1, 1].map((m) => `<path d="M${m * 54} -644C${m * 62} -626 ${m * 60} -606 ${m * 56} -590" stroke="#fbf7ec" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="${m * 56}" cy="-588" r="3" fill="${GOLD}"/>`).join("")}`;
  return s;
};

const groomTorso = () => {
  const sk = SKIN.groom;
  let s = `<path d="M-15 -564L-15 -518L15 -518L15 -564Z" fill="url(#sk-groom)" ${OUT}/><ellipse cx="0" cy="-556" rx="16" ry="6" fill="${sk.shade}" opacity=".55"/>
<path d="M-18 -526C-34 -522 -56 -516 -68 -506C-76 -498 -78 -480 -76 -460C-73 -420 -70 -380 -72 -330C-76 -290 -82 -260 -86 -232Q0 -218 86 -232C82 -260 76 -290 72 -330C70 -380 73 -420 76 -460C78 -480 76 -498 68 -506C56 -516 34 -522 18 -526Z" fill="url(#silk)" ${OUT}/>`;
  // folds
  const folds = [[-44, -470, -52, -236], [-20, -420, -26, -226], [26, -430, 34, -226], [52, -470, 60, -238]];
  for (const [x1, y1, x2, y2] of folds) s += `<path d="M${x1} ${y1}C${x1 - 4} ${(y1 + y2) / 2} ${x2 + 4} ${(y1 + y2) / 2 + 30} ${x2} ${y2}" stroke="${mix("#f3e6c8", INK, 0.3)}" stroke-width="1.6" fill="none" opacity=".45"/>`;
  s += `<path d="M-70 -380Q-40 -372 -10 -380M10 -384Q40 -374 70 -384" stroke="${mix("#f3e6c8", INK, 0.3)}" stroke-width="1.4" fill="none" opacity=".4"/>`;
  // embroidered yoke, placket, buttons, collar
  s += `<path d="M-64 -500C-40 -486 -20 -478 -6 -476M64 -500C40 -486 20 -478 6 -476" stroke="${GOLD}" stroke-width="2.6" fill="none"/>`;
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    s += `<circle cx="${r1(-60 + t * 50)}" cy="${r1(-496 + t * 16 - Math.sin(t * Math.PI) * 4)}" r="1.8" fill="${GOLD_D}"/><circle cx="${r1(60 - t * 50)}" cy="${r1(-496 + t * 16 - Math.sin(t * Math.PI) * 4)}" r="1.8" fill="${GOLD_D}"/>`;
  }
  s += `<rect x="-6" y="-526" width="12" height="108" fill="url(#gold)" ${OUT_T}/>
<path d="M0 -522c4 6 -4 10 0 16c4 6 -4 10 0 16c4 6 -4 10 0 16c4 6 -4 10 0 16c4 6 -4 10 0 16c4 6 -4 10 0 16" stroke="${GOLD_D}" stroke-width="1.2" fill="none"/>
${[-508, -486, -464, -442].map((y) => `<circle cx="0" cy="${y}" r="3.6" fill="${GOLD_L}" stroke="${GOLD_D}" stroke-width="1.2"/>`).join("")}
<path d="M-18 -528C-10 -520 10 -520 18 -528L18 -542C10 -534 -10 -534 -18 -542Z" fill="url(#gold)" ${OUT_T}/>
<path d="M-84 -246Q0 -232 84 -246L85 -236Q0 -222 -85 -236Z" fill="url(#gold)" ${OUT_T}/>
<path d="M-74 -262L-82 -232M74 -262L82 -232" stroke="${INK}" stroke-opacity=".5" stroke-width="1.6"/>`;
  return `<g filter="url(#grain)">${s}</g>`;
};

const uttariya = () => {
  const strip = (m) => {
    const x0 = m * 64;
    const x1 = m * 30;
    const end = m < 0 ? -292 : -306;
    return `<path d="M${x0} -510L${x1} -524C${m * 30} -450 ${m * 26} -380 ${m * 24} ${end}L${m * 58} ${end + 4}C${m * 62} -380 ${m * 66} -450 ${x0} -510Z" fill="url(#red)" ${OUT}/>
<path d="M${x1 + m * 4} -520C${m * 34} -450 ${m * 30} -380 ${m * 29} ${end}" stroke="${GOLD}" stroke-width="4" fill="none"/>
<path d="M${x0 - m * 5} -506C${m * 58} -450 ${m * 61} -380 ${m * 54} ${end + 4}" stroke="${GOLD}" stroke-width="4" fill="none"/>
${Array.from({ length: 6 }, (_, k) => `<circle cx="${r1(m * (42 + (k % 2) * 4))}" cy="${-480 + k * 30}" r="2.2" fill="${GOLD_L}"/>`).join("")}
<path d="M${m * 24} ${end}L${m * 58} ${end + 4}L${m * 58} ${end + 12}L${m * 24} ${end + 8}Z" fill="url(#gold)" ${OUT_T}/>
${Array.from({ length: 7 }, (_, k) => `<path d="M${r1(m * (27 + k * 5))} ${end + 10}v14" stroke="${GOLD_D}" stroke-width="2.2" stroke-linecap="round"/>`).join("")}`;
  };
  // the band that wraps the back of the neck, seen above the shoulders
  return `<g filter="url(#grain)"><path d="M-66 -508C-50 -532 -30 -538 0 -538C30 -538 50 -532 66 -508L52 -506C40 -522 22 -526 0 -526C-22 -526 -40 -522 -52 -506Z" fill="${RED_D}" ${OUT}/>${strip(-1)}${strip(1)}</g>`;
};

const dhoti = () => {
  let s = `<path d="M-70 -340C-76 -250 -88 -120 -96 -14Q-60 -4 -8 -10L0 -64L8 -10Q60 -4 96 -14C88 -120 76 -250 70 -340Z" fill="url(#cotton)" ${OUT}/>`;
  // legs folds and the pleated kochi down the front
  s += `<path d="M-40 -230C-46 -150 -56 -80 -60 -12M40 -230C46 -150 56 -80 60 -12" stroke="${INK}" stroke-opacity=".22" stroke-width="2" fill="none"/>`;
  for (let i = 0; i < 6; i++) s += `<path d="M${-12 + i * 3} -300L${-34 + i * 8} -16" stroke="${INK}" stroke-opacity=".2" stroke-width="1.5"/>`;
  s += `<path d="M-14 -300L-38 -16" stroke="${RED}" stroke-width="5"/><path d="M-10 -300L-32 -16" stroke="${GOLD}" stroke-width="2"/>`;
  s += `<path d="M-96 -26Q-60 -16 -8 -22L-8 -10Q-60 -4 -96 -14Z" fill="${RED}"/><path d="M96 -26Q60 -16 8 -22L8 -10Q60 -4 96 -14Z" fill="${RED}"/>
<path d="M-95 -30Q-60 -20 -8 -26M95 -30Q60 -20 8 -26" stroke="${GOLD}" stroke-width="2.2" fill="none"/>`;
  return `<g filter="url(#grain)">${s}</g>`;
};

const mojari = (m) =>
  `<g transform="translate(${m * 30} 0) scale(${m} 1)"><path d="M-22 -2Q-24 -16 -4 -18Q16 -20 28 -12Q38 -8 44 -18Q46 -6 34 -2Z" fill="url(#gold)" ${OUT}/><path d="M-8 -16Q6 -10 20 -14" stroke="${RED}" stroke-width="2.4" fill="none"/>${[-4, 4, 12].map((x) => `<circle cx="${x}" cy="-9" r="1.6" fill="${RED}"/>`).join("")}</g>`;

/* ------------------------------------------------------------------ bride (and the mother, who shares her build) */
/** Upper arm with its blouse sleeve; `armlet` adds the gold bajubandh of the wedding look. */
const upperArm = (who, { armlet = true, sleeve = "blouse" } = {}) => {
  const { shoulder: S, elbow: E } = BONES[who];
  const L = len(S, E);
  const body = `<path d="M-13.5 0 L-12 ${L} C-12 ${L + 13} 12 ${L + 13} 12 ${L} L13.5 0Z" fill="url(#sk-${who})" ${OUT}/>
<path d="M-16 -6C-16 -20 16 -20 16 -6L15.5 ${L * 0.42}Q0 ${L * 0.48} -15.5 ${L * 0.42}Z" fill="url(#${sleeve})" ${OUT}/>
${armlet ? `<path d="M-15 ${L * 0.36}Q0 ${L * 0.42} 15 ${L * 0.36}L15 ${L * 0.42}Q0 ${L * 0.48} -15 ${L * 0.42}Z" fill="url(#gold)" ${OUT_T}/>
<path d="M-13 ${L * 0.66}Q0 ${L * 0.7} 13 ${L * 0.66}" stroke="${GOLD}" stroke-width="5" fill="none"/>
<path d="M-4 ${L * 0.66}l4 7l4 -7" fill="${RED}" stroke="${GOLD_D}" stroke-width=".8"/>` : `<path d="M-15 ${L * 0.38}Q0 ${L * 0.44} 15 ${L * 0.38}" stroke="${GOLD}" stroke-width="2" fill="none" opacity=".8"/>`}`;
  return bone(S, E, body);
};
const brideUpperArm = () => upperArm("bride");

const BANGLES = {
  // gold churi, pola (red), shakha (white conch), gold bala at the wrist
  wedding: [
    [0.56, GOLD, 3.2],
    [0.62, GOLD, 3.2],
    [0.7, "#b3202c", 6],
    [0.8, "#f6f1e4", 7],
    [0.9, GOLD_L, 5],
  ],
  // a married woman's everyday shakha and pola, and the iron loha
  married: [
    [0.7, "#3a3633", 3.4],
    [0.78, "#b3202c", 5.4],
    [0.88, "#f6f1e4", 6.6],
  ],
  none: [],
};

/** Forearm and hand. `bangles` picks the set at the wrist, `alta` reddens the palm edge. */
const forearm = (who, { bangles = "wedding", alta = true } = {}) => {
  const { elbow: E, wrist: W } = BONES[who];
  const L = len(E, W);
  let body = `${hand(who, L, { alta })}<path d="M-12 -2C-12 -15 12 -15 12 -2L9.5 ${L}L-9.5 ${L}Z" fill="url(#sk-${who})" ${OUT}/>`;
  for (const [t, c, w] of BANGLES[bangles]) {
    const y = L * t;
    body += `<path d="M-13 ${r1(y)}Q0 ${r1(y + 4)} 13 ${r1(y)}" stroke="${INK}" stroke-opacity=".6" stroke-width="${w + 2}" fill="none" stroke-linecap="round"/><path d="M-13 ${r1(y)}Q0 ${r1(y + 4)} 13 ${r1(y)}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
    if (c === "#f6f1e4") body += `<path d="M-8 ${r1(y)}l3 2M-1 ${r1(y + 1)}l3 2M6 ${r1(y)}l3 2" stroke="#b8ad94" stroke-width="1"/>`;
  }
  return bone(E, W, body);
};
const brideForearm = () => forearm("bride");

/** Chandan (kalka) dots: arcs over the brows and a trail down each cheek. */
const chandanDots = () => {
  let s = "";
  for (const m of [-1, 1]) {
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      const x = m * (6 + t * 32);
      const y = -620 - Math.sin(t * Math.PI) * 9 + t * 8;
      s += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${k % 2 ? 1.3 : 1.8}" fill="#fff8ea" stroke="${GOLD_D}" stroke-width=".4"/>`;
      if (k % 2 === 0 && k < 8) s += `<circle cx="${r1(x + m * 2)}" cy="${r1(y - 4.5)}" r="1" fill="#b3121f"/>`;
    }
    for (let k = 0; k < 6; k++) s += `<circle cx="${r1(m * (37 - k * 1.2))}" cy="${r1(-600 + k * 6)}" r="${r1(1.7 - k * 0.15)}" fill="#fff8ea" stroke="${GOLD_D}" stroke-width=".4"/>`;
    s += `<path d="M${m * 31} -566c${m * 4} -2 ${m * 6} 2 ${m * 3} 6c${m * -3} 3 ${m * -6} 0 ${m * -3} -6Z" fill="none" stroke="#fff8ea" stroke-width="1.4"/>`;
  }
  return s;
};

/** The face shape, ears and nose shared by Titas's heads. */
const brideFace = () => {
  const sk = SKIN.bride;
  return `<ellipse cx="-40" cy="-592" rx="7" ry="12" fill="${sk.base}" ${OUT}/><ellipse cx="40" cy="-592" rx="7" ry="12" fill="${sk.shade}" ${OUT}/>
<path d="M0 -646C-24 -646 -40 -628 -40 -602C-40 -580 -35 -564 -24 -553C-16 -546 -8 -542 0 -542C8 -542 16 -546 24 -553C35 -564 40 -580 40 -602C40 -628 24 -646 0 -646Z" fill="url(#skf-bride)" ${OUT}/>
<path d="M24 -553C35 -564 40 -580 40 -602C37 -584 32 -568 19 -556Z" fill="${sk.shade}" opacity=".4"/>
<path d="M0 -590C-2 -580 -5 -574 -3 -569" stroke="${sk.shade}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
<path d="M-6 -567Q-3 -563 0 -565Q3 -563 6 -567" stroke="${mix(sk.shade, INK, 0.25)}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
<ellipse cx="-1.5" cy="-571" rx="2.2" ry="1.4" fill="${sk.light}" opacity=".9"/>`;
};

const PARTED_HAIR = `<path d="M-42 -598C-46 -634 -26 -652 0 -652C26 -652 46 -634 42 -598C40 -616 34 -628 22 -634C14 -632 6 -636 0 -644C-6 -636 -14 -632 -22 -634C-34 -628 -40 -616 -42 -598Z" fill="${HAIR}"/>
<path d="M-30 -636C-20 -642 -10 -644 -3 -646M30 -636C20 -642 10 -644 3 -646" stroke="#4a3830" stroke-width="2" fill="none" opacity=".75"/>`;

/** Titas's wedding head: the parted hair, tikli, teep and chandan, nath and jhumkas. */
const brideHead = () => {
  let s = `<path d="M-42 -604C-46 -580 -44 -560 -40 -546L-33 -550C-37 -566 -37 -584 -37 -604Z" fill="${HAIR}"/><path d="M42 -604C46 -580 44 -560 40 -546L33 -550C37 -566 37 -584 37 -604Z" fill="${HAIR}"/>
${brideFace()}`;
  // hair, centre-parted
  s += PARTED_HAIR;
  // tikli down the parting
  s += `<path d="M0 -652V-634" stroke="${GOLD}" stroke-width="1.6"/><circle cx="0" cy="-630" r="4.6" fill="${GOLD}" ${OUT_T}/><circle cx="0" cy="-630" r="2" fill="${RED}"/><circle cx="0" cy="-623" r="1.6" fill="#f8f4ea"/>`;
  // teep and chandan
  s += `<circle cx="0" cy="-614" r="3.8" fill="#b3121f"/>`;
  s += chandanDots();
  // nath (nose ring) with its chain, and jhumka earrings
  s += `<circle cx="13" cy="-560" r="11" fill="none" stroke="${GOLD}" stroke-width="2"/><circle cx="20" cy="-551" r="2.4" fill="${RED}" stroke="${GOLD_D}" stroke-width=".6"/><circle cx="5" cy="-567" r="1.8" fill="${GOLD_L}"/>
<path d="M22 -557C30 -566 34 -580 36 -596" stroke="${GOLD}" stroke-width="1" fill="none" stroke-dasharray="1.5 1.5"/>`;
  for (const m of [-1, 1]) {
    s += `<circle cx="${m * 41}" cy="-584" r="3.2" fill="${GOLD}" ${OUT_T}/><path d="M${m * 41} -581v4" stroke="${GOLD}" stroke-width="1.6"/>
<path d="M${m * 41 - 7} -566C${m * 41 - 7} -576 ${m * 41 + 7} -576 ${m * 41 + 7} -566Z" fill="url(#gold)" ${OUT_T}/>
${[-5, 0, 5].map((d) => `<circle cx="${m * 41 + d}" cy="-563" r="1.6" fill="#f8f4ea"/>`).join("")}`;
  }
  return s;
};

/** Titas on the morning of her wedding: hair parted and gathered into a low knot, a small black teep, tiny studs. */
const bridePlainHead = () => {
  let s = `<path d="M30 -600C52 -598 58 -572 50 -556C44 -546 30 -548 28 -560C26 -572 30 -584 30 -600Z" fill="${HAIR}"/>
<path d="M36 -586C44 -580 46 -570 42 -562" stroke="#4a3830" stroke-width="1.6" fill="none" opacity=".7"/>
<path d="M-42 -604C-46 -584 -44 -566 -40 -556L-34 -560C-37 -572 -37 -588 -37 -604Z" fill="${HAIR}"/>
${brideFace()}${PARTED_HAIR}`;
  s += `<circle cx="0" cy="-614" r="2.6" fill="#2a1b17"/>`;
  for (const m of [-1, 1]) s += `<circle cx="${m * 41}" cy="-584" r="2.4" fill="${GOLD}" ${OUT_T}/>`;
  return s;
};

const veilBack = () => {
  let s = `<path d="M0 -672C-54 -672 -82 -632 -86 -584C-90 -540 -98 -500 -118 -440C-126 -410 -130 -380 -126 -346L-80 -352C-74 -420 -66 -470 -58 -500L58 -500C66 -470 74 -420 80 -352L126 -346C130 -380 126 -410 118 -440C98 -500 90 -540 86 -584C82 -632 54 -672 0 -672Z" fill="url(#red)" fill-opacity=".96" ${OUT}/>`;
  s += `<path d="M-126 -350C-130 -384 -126 -412 -118 -442C-98 -502 -90 -542 -86 -586C-82 -634 -54 -672 0 -672C54 -672 82 -634 86 -586C90 -542 98 -502 118 -442C126 -412 130 -384 126 -350" stroke="${GOLD}" stroke-width="9" fill="none" stroke-linejoin="round"/>
<path d="M-126 -350C-130 -384 -126 -412 -118 -442C-98 -502 -90 -542 -86 -586C-82 -634 -54 -672 0 -672C54 -672 82 -634 86 -586C90 -542 98 -502 118 -442C126 -412 130 -384 126 -350" stroke="${RED_D}" stroke-width="2" fill="none" stroke-dasharray="3 6"/>`;
  const R = rng(17);
  for (let i = 0; i < 40; i++) {
    const m = R() < 0.5 ? -1 : 1;
    const y = -560 + R() * 200;
    const x = m * (86 + (y + 560) * 0.14 - R() * 20);
    s += `<circle cx="${r1(x)}" cy="${r1(y)}" r="1.8" fill="${GOLD_L}" opacity=".8"/>`;
  }
  s += `<path d="M-126 -346L-80 -352L-80 -344L-126 -338ZM126 -346L80 -352L80 -344L126 -338Z" fill="url(#gold)"/>`;
  return `<g filter="url(#grain)">${s}</g>`;
};

const veilFront = () =>
  `<path d="M-47 -596C-52 -640 -28 -674 0 -674C28 -674 52 -640 47 -596L39 -598C41 -632 22 -658 0 -658C-22 -658 -41 -632 -39 -598Z" fill="url(#red)" ${OUT}/>
<path d="M-40 -600C-42 -634 -22 -660 0 -660C22 -660 42 -634 40 -600" stroke="${GOLD}" stroke-width="4" fill="none"/>
${Array.from({ length: 11 }, (_, k) => {
  const a = Math.PI * (0.1 + (k / 10) * 0.8);
  return `<circle cx="${r1(-Math.cos(a) * 44)}" cy="${r1(-604 - Math.sin(a) * 62)}" r="1.8" fill="${GOLD_L}"/>`;
}).join("")}`;

const mukut = () => {
  let s = `<path d="M-60 -650C-76 -702 -54 -776 0 -800C54 -776 76 -702 60 -650Q0 -638 -60 -650Z" fill="url(#shola)" ${OUT}/>`;
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI * (0.08 + (i / 14) * 0.84);
    s += `<path d="M${r1(-Math.cos(a) * 64)} ${r1(-652 - Math.sin(a) * 140)}l${r1(-Math.cos(a) * 12)} ${r1(-Math.sin(a) * 14)}" stroke="#fbf7ec" stroke-width="6" stroke-linecap="round"/><circle cx="${r1(-Math.cos(a) * 78)}" cy="${r1(-652 - Math.sin(a) * 156)}" r="2.2" fill="${GOLD}"/>`;
  }
  [0.84, 0.62, 0.4].forEach((k, i) => {
    s += `<path d="M${r1(-58 * k)} -652C${r1(-72 * k)} ${r1(-652 - 60 * k)} ${r1(-50 * k)} ${r1(-652 - 128 * k)} 0 ${r1(-652 - 140 * k)}C${r1(50 * k)} ${r1(-652 - 128 * k)} ${r1(72 * k)} ${r1(-652 - 60 * k)} ${r1(58 * k)} -652" stroke="${i === 1 ? RED : GOLD_D}" stroke-width="${i === 1 ? 2.6 : 1.8}" fill="none"/>`;
  });
  // lotus at the centre of the crown
  s += `<g transform="translate(0 -700)">${[-50, -25, 0, 25, 50].map((a) => `<path d="M0 0C6 -6 6 -18 0 -26C-6 -18 -6 -6 0 0Z" transform="rotate(${a})" fill="#f6d9d4" stroke="${RED}" stroke-width="1.2"/>`).join("")}<circle r="3" cy="2" fill="${GOLD}"/></g>`;
  s += `<path d="M-60 -642Q0 -628 60 -642L58 -658Q0 -646 -58 -658Z" fill="url(#gold)" ${OUT}/>${[-42, -21, 0, 21, 42].map((x) => `<circle cx="${x}" cy="${r1(-646 + Math.abs(x) * 0.07)}" r="3" fill="${RED}" stroke="${GOLD_D}" stroke-width=".8"/>`).join("")}`;
  return s;
};

/**
 * Saree palettes. `fabric`/`blouse` are gradient ids from `defs`; `edge` is the border colour, `zari` its inner line,
 * `buti` the scattered motifs (null for none), `fold` the shadow colour of the folds.
 */
const LOOKS = {
  wedding: { fabric: "red", blouse: "blouse", edge: "url(#gold)", zari: GOLD, buti: GOLD_L, fold: RED_D, jewels: true, pleat: "url(#gold)", hemLine: RED },
  // the gaye holud: turmeric yellow with a red border
  holud: { fabric: "yellow", blouse: "blouse", edge: "#b5202e", zari: "#2f6b3a", buti: "#f9e7a6", fold: "#b98a12", jewels: false, pleat: "#b5202e", hemLine: "#2f6b3a" },
  // the mother's লালপাড় সাদা শাড়ি
  mother: { fabric: "white", blouse: "mblouse", edge: "#a3162a", zari: "#d2a74e", buti: null, fold: "#c8bfa8", jewels: false, pleat: "#a3162a", hemLine: "#d2a74e" },
};

const brideTorso = (look = LOOKS.wedding) => {
  const sk = SKIN.bride;
  let s = `<path d="M-13 -556L-13 -508L13 -508L13 -556Z" fill="url(#sk-bride)" ${OUT}/><ellipse cx="0" cy="-548" rx="14" ry="5" fill="${sk.shade}" opacity=".5"/>
<path d="M-15 -514C-30 -512 -48 -508 -58 -500C-66 -492 -64 -470 -60 -452C-56 -436 -50 -424 -46 -408L46 -408C50 -424 56 -436 60 -452C64 -470 66 -492 58 -500C48 -508 30 -512 15 -514C10 -498 -10 -498 -15 -514Z" fill="url(#${look.blouse})" ${OUT}/>
<path d="M-15 -514C-10 -498 10 -498 15 -514" stroke="${look.jewels ? GOLD : look.zari}" stroke-width="${look.jewels ? 4 : 2.4}" fill="none"/>`;
  // the pallu across the chest and over the left shoulder, with its borders
  s += `<path d="M-50 -400L-34 -414C-2 -440 26 -472 42 -510L62 -500C54 -462 30 -420 -6 -396Z" fill="url(#${look.fabric})" ${OUT}/>
<path d="M-34 -414C-2 -440 26 -472 42 -510" stroke="${look.edge}" stroke-width="6" fill="none"/><path d="M-6 -396C30 -420 54 -462 62 -500" stroke="${look.edge}" stroke-width="6" fill="none"/>`;
  if (look.buti) s += [0.25, 0.45, 0.65].map((t) => `<circle cx="${r1(-20 + t * 60)}" cy="${r1(-410 - t * 70)}" r="3" fill="${look.buti}"/>`).join("");
  if (look.jewels) {
    // choker and sitahar
    s += `<path d="M-14 -526Q0 -516 14 -526" stroke="${INK}" stroke-opacity=".5" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M-14 -526Q0 -516 14 -526" stroke="url(#gold)" stroke-width="7" fill="none" stroke-linecap="round"/>
${[-8, 0, 8].map((x) => `<circle cx="${x}" cy="${r1(-521 + (8 - Math.abs(x)) * 0.15)}" r="2" fill="${RED}"/>`).join("")}
<path d="M-24 -512C-34 -470 -16 -446 0 -440C16 -446 34 -470 24 -512" stroke="${GOLD}" stroke-width="3.4" fill="none"/>
<path d="M-30 -508C-44 -456 -18 -426 0 -420C18 -426 44 -456 30 -508" stroke="${GOLD}" stroke-width="2.6" fill="none" stroke-dasharray="3 3"/>
<path d="M-8 -440C-8 -428 8 -428 8 -440C8 -446 -8 -446 -8 -440Z" fill="url(#gold)" ${OUT_T}/><circle cx="0" cy="-437" r="3" fill="${RED}"/>`;
  } else {
    // a fine gold chain
    s += `<path d="M-13 -524Q0 -506 13 -524" stroke="${GOLD}" stroke-width="1.6" fill="none"/>`;
  }
  return `<g filter="url(#grain)">${s}</g>`;
};

const saree = (look = LOOKS.wedding, seed = 23) => {
  let s = `<path d="M-50 -426C-62 -330 -92 -160 -110 -12Q0 6 110 -12C92 -160 62 -330 50 -426Z" fill="url(#${look.fabric})" ${OUT}/>`;
  // buti pattern
  if (look.buti) {
    const R = rng(seed);
    for (let i = 0; i < 70; i++) {
      const y = -400 + R() * 340;
      const half = 50 + ((y + 426) / 414) * 56;
      const x = (R() - 0.5) * 2 * half * 0.86;
      s += `<path d="M${r1(x)} ${r1(y)}c2 -4 5 -4 4 0c-1 3 -4 4 -4 0Z" fill="${look.buti}" opacity=".85"/>`;
    }
  }
  // folds and the front pleats (kuchi)
  for (const [x1, x2] of [[-30, -80], [-12, -40], [14, 36], [30, 84]]) s += `<path d="M${x1} -400C${x1} -260 ${(x1 + x2) / 2} -120 ${x2} -14" stroke="${look.fold}" stroke-width="2" fill="none" opacity=".55"/>`;
  for (let i = 0; i < 5; i++) s += `<path d="M${-4 + i * 4} -410L${-30 + i * 14} -10" stroke="${look.fold}" stroke-width="1.4" opacity=".5"/>`;
  s += `<path d="M-8 -410L-36 -12L-18 -10L6 -410Z" fill="${look.pleat}" opacity=".95"/><path d="M-6 -400L-30 -16" stroke="${look.hemLine}" stroke-width="2" stroke-dasharray="4 5"/>`;
  // the broad border at the hem
  s += `<path d="M-106 -46Q0 -30 106 -46L110 -12Q0 6 -110 -12Z" fill="${look.edge}" ${OUT_T}/>
<path d="M-108 -38Q0 -22 108 -38" stroke="${look.hemLine}" stroke-width="4" fill="none"/>
${Array.from({ length: 15 }, (_, k) => {
  const x = -98 + k * 14;
  const y = -22 + Math.abs(x) * -0.03;
  return `<path d="M${x} ${r1(y)}l5 -6l5 6l-5 6Z" fill="${look === LOOKS.wedding ? RED : look.zari}"/>`;
}).join("")}
<path d="M-48 -422Q0 -412 48 -422" stroke="${look.jewels ? GOLD : look.edge}" stroke-width="4" fill="none"/>`;
  return `<g filter="url(#grain)">${s}</g>`;
};

/**
 * The saree of a woman seated on a low stool (feet origin, hips at about y = -120): the waist, the knees drawn up under
 * the cloth, the border pooled at the floor, two feet peeping out. Mirrored in src/story/rig.ts SIT_DROP.
 */
const seatedSaree = (look, who, { alta = false } = {}) => {
  const sk = SKIN[who];
  const toes = [-1, 1].map((m) => `<g transform="translate(${m * 40} -6)"><path d="M-17 4C-17 -8 17 -8 17 4C17 9 -17 9 -17 4Z" fill="url(#sk-${who})" ${OUT}/>${alta ? `<path d="M-17 4C-17 9 17 9 17 4" stroke="#c1121f" stroke-width="3.4" fill="none"/>` : ""}<path d="M-8 -2v4M-2 -3v4M4 -3v4" stroke="${sk.shade}" stroke-width="1"/></g>`).join("");
  let s = toes;
  s += `<path d="M-48 -132C-74 -138 -112 -128 -114 -88C-116 -56 -108 -30 -104 -10Q0 4 104 -10C108 -30 116 -56 114 -88C112 -128 74 -138 48 -132Z" fill="url(#${look.fabric})" ${OUT}/>`;
  // knees and the fall of cloth between them
  s += `<path d="M-100 -96C-84 -118 -40 -118 -14 -100M100 -96C84 -118 40 -118 14 -100" stroke="#ffffff" stroke-opacity=".28" stroke-width="7" fill="none" stroke-linecap="round"/>
<path d="M-6 -100C-12 -70 -10 -40 -16 -12M8 -100C10 -66 14 -40 12 -12M-60 -96C-70 -60 -76 -36 -82 -12M60 -96C70 -60 76 -36 82 -12" stroke="${look.fold}" stroke-width="2" fill="none" opacity=".55"/>`;
  if (look.buti) {
    const R = rng(who === "bride" ? 31 : 37);
    for (let i = 0; i < 26; i++) s += `<path d="M${r1((R() - 0.5) * 190)} ${r1(-110 + R() * 80)}c2 -4 5 -4 4 0c-1 3 -4 4 -4 0Z" fill="${look.buti}" opacity=".85"/>`;
  }
  s += `<path d="M-108 -34Q0 -20 108 -34L104 -10Q0 4 -104 -10Z" fill="${look.edge}" ${OUT_T}/><path d="M-106 -26Q0 -12 106 -26" stroke="${look.hemLine}" stroke-width="3" fill="none"/>
<path d="M-48 -128Q0 -118 48 -128" stroke="${look.jewels ? GOLD : look.edge}" stroke-width="4" fill="none"/>`;
  return `<g filter="url(#grain)">${s}</g>`;
};

const brideFeet = (m, { alta = true, who = "bride" } = {}) =>
  `<g transform="translate(${m * 28} -4)"><path d="M-14 0C-14 -10 14 -10 14 0C14 5 -14 5 -14 0Z" fill="url(#sk-${who})" ${OUT}/>${alta ? `<path d="M-14 0C-14 5 14 5 14 0" stroke="#c1121f" stroke-width="3.4" fill="none"/>${[-8, -3, 2, 7].map((x) => `<circle cx="${x}" cy="-5" r="1.6" fill="#c1121f" opacity=".75"/>`).join("")}` : `<path d="M-6 -5v3M0 -6v3M6 -5v3" stroke="${SKIN[who].shade}" stroke-width="1"/>`}<circle cx="-6" cy="-6" r="1.8" fill="none" stroke="#e6e2d8" stroke-width="1"/></g>`;

/* ------------------------------------------------------------------ the mother (generic: not modelled on anyone) */
const motherHead = () => {
  const sk = SKIN.mother;
  let s = `<path d="M-30 -598C-56 -596 -60 -566 -50 -552C-42 -542 -28 -546 -28 -560C-28 -572 -30 -584 -30 -598Z" fill="${HAIR}"/>
<path d="M-38 -584C-46 -576 -48 -566 -44 -558" stroke="#5a4a42" stroke-width="1.8" fill="none" opacity=".7"/>
<ellipse cx="-41" cy="-590" rx="7.5" ry="12" fill="${sk.base}" ${OUT}/><ellipse cx="41" cy="-590" rx="7.5" ry="12" fill="${sk.shade}" ${OUT}/>
<path d="M0 -646C-25 -646 -42 -628 -42 -602C-42 -578 -37 -561 -25 -550C-17 -543 -8 -539 0 -539C8 -539 17 -543 25 -550C37 -561 42 -578 42 -602C42 -628 25 -646 0 -646Z" fill="url(#skf-mother)" ${OUT}/>
<path d="M25 -550C37 -561 42 -578 42 -602C39 -582 33 -566 20 -553Z" fill="${sk.shade}" opacity=".42"/>
<path d="M-24 -566Q-20 -560 -14 -560M24 -566Q20 -560 14 -560" stroke="${sk.shade}" stroke-width="1.4" fill="none" opacity=".6"/>
<path d="M0 -590C-2 -579 -5 -573 -3 -568" stroke="${sk.shade}" stroke-width="1.9" fill="none" stroke-linecap="round"/>
<path d="M-6 -566Q-3 -562 0 -564Q3 -562 6 -566" stroke="${mix(sk.shade, INK, 0.25)}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
<ellipse cx="-1.5" cy="-570" rx="2.2" ry="1.4" fill="${sk.light}" opacity=".85"/>`;
  // hair parted and drawn back, a little silver at the temple; sindoor in the parting
  s += `<path d="M-43 -598C-47 -636 -26 -654 0 -654C26 -654 47 -636 43 -598C41 -618 34 -630 22 -636C14 -634 6 -638 0 -646C-6 -638 -14 -634 -22 -636C-34 -630 -41 -618 -43 -598Z" fill="${HAIR}"/>
<path d="M-32 -636C-22 -642 -12 -645 -3 -647M32 -636C22 -642 12 -645 3 -647" stroke="#6b5a50" stroke-width="2" fill="none" opacity=".8"/>
<path d="M-40 -612C-38 -622 -34 -628 -28 -632" stroke="#b9b0a6" stroke-width="1.6" fill="none" opacity=".7"/>
<path d="M0 -654V-640" stroke="#c1121f" stroke-width="3.4" stroke-linecap="round"/>
<circle cx="0" cy="-616" r="5" fill="#b3121f"/><circle cx="-1" cy="-617.5" r="1.4" fill="#ffffff" opacity=".35"/>`;
  // a small gold nose stud and earrings
  s += `<circle cx="7" cy="-570" r="1.8" fill="${GOLD_L}" stroke="${GOLD_D}" stroke-width=".5"/>`;
  for (const m of [-1, 1]) s += `<circle cx="${m * 42}" cy="-582" r="3" fill="${GOLD}" ${OUT_T}/><circle cx="${m * 42}" cy="-575" r="2.2" fill="${GOLD_L}"/>`;
  return s;
};

const motherTorso = () => {
  const sk = SKIN.mother;
  const look = LOOKS.mother;
  let s = `<path d="M-14 -552L-14 -504L14 -504L14 -552Z" fill="url(#sk-mother)" ${OUT}/><ellipse cx="0" cy="-544" rx="15" ry="5" fill="${sk.shade}" opacity=".5"/>
<path d="M-16 -510C-32 -508 -51 -504 -61 -496C-69 -486 -67 -464 -63 -446C-59 -430 -53 -420 -49 -404L49 -404C53 -420 59 -430 63 -446C67 -464 69 -486 61 -496C51 -504 32 -508 16 -510C11 -496 -11 -496 -16 -510Z" fill="url(#mblouse)" ${OUT}/>`;
  // the আঁচল across the chest and over the left shoulder, white with its red border
  s += `<path d="M-54 -396L-36 -412C-2 -440 28 -474 44 -508L66 -496C56 -458 32 -418 -6 -392Z" fill="url(#${look.fabric})" ${OUT}/>
<path d="M-36 -412C-2 -440 28 -474 44 -508" stroke="${look.edge}" stroke-width="7" fill="none"/><path d="M-6 -392C32 -418 56 -458 66 -496" stroke="${look.edge}" stroke-width="7" fill="none"/>
<path d="M-28 -416C2 -440 30 -472 46 -500" stroke="${look.fold}" stroke-width="1.6" fill="none" opacity=".6"/>`;
  s += `<path d="M-13 -520Q0 -506 13 -520" stroke="${GOLD}" stroke-width="1.8" fill="none"/>`;
  return `<g filter="url(#grain)">${s}</g>`;
};

/** The end of the আঁচল thrown over her left shoulder, hanging at her side, with the bunch of keys tied in its corner. */
const motherAnchal = () => {
  const look = LOOKS.mother;
  let s = `<path d="M40 -512C70 -500 86 -470 90 -430C94 -394 96 -364 100 -330L72 -326C70 -360 66 -392 60 -424C56 -454 48 -482 30 -500Z" fill="url(#${look.fabric})" ${OUT}/>
<path d="M90 -430C94 -394 96 -364 100 -330" stroke="${look.edge}" stroke-width="6" fill="none"/><path d="M72 -326L100 -330" stroke="${look.edge}" stroke-width="5"/>`;
  // the knot and the keys (চাবির গোছা)
  s += `<path d="M86 -330C94 -322 92 -312 86 -310C80 -312 78 -322 86 -330Z" fill="#f2ede0" ${OUT_T}/><circle cx="86" cy="-304" r="6" fill="none" stroke="#8a6a2e" stroke-width="2.2"/>`;
  [[-8, 16], [-2, 20], [5, 17], [10, 13]].forEach(([dx, l], i) => {
    s += `<g transform="translate(${86 + dx * 0.4} -300) rotate(${dx * 2.2})"><path d="M0 0V${l}" stroke="${i % 2 ? "#b88b3a" : "#9a7a44"}" stroke-width="2.6" stroke-linecap="round"/><path d="M0 ${l}h3M0 ${l - 4}h2.4" stroke="${i % 2 ? "#b88b3a" : "#9a7a44"}" stroke-width="2"/><circle r="2.6" fill="none" stroke="#8a6a2e" stroke-width="1.4"/></g>`;
  });
  return `<g filter="url(#grain)">${s}</g>`;
};

/* ------------------------------------------------------------------ export */
export const characterArt = () => {
  const defs = (who) => `${skinDefs(who)}
${fabric("silk", "#fff7e2", "#f1e2c0", "#cdb688")}
${fabric("cotton", "#ffffff", "#f7f1e3", "#d9cfb6")}
${fabric("red", RED_L, RED, RED_D)}
${fabric("blouse", "#9e1c2e", "#7f1022", "#5a0814")}
${fabric("mblouse", "#b52436", "#931a2a", "#64101b")}
${fabric("yellow", "#ffe27a", "#f4c430", "#c99712")}
${fabric("white", "#ffffff", "#f6f2e8", "#d8d0bd")}
${fabric("shola", "#ffffff", "#fbf6ea", "#ddd0b2")}
${lin("gold", [[0, GOLD_L], [0.5, GOLD], [1, GOLD_D]])}
${grainFilter("grain", 0.16, 0.8)}`;
  const p = (name, who, bounds, body, scale = SCALE) => piece(name, bounds, body, { scale, defs: defs(who), quality: 0.88 });
  // arms are baked about their shoulder/elbow with the right side drawn; the left side is the mirror image
  const mirror = (body) => `<g transform="scale(-1 1)">${body}</g>`;
  const g = BONES.groom;
  const b = BONES.bride;
  const mo = BONES.mother;
  const arms = (prefix, who, bones, upper, fore) => [
    p(`${prefix}-arm-r`, who, { x: bones.shoulder.x - 40, y: bones.shoulder.y - 30, w: 80, h: 150 }, upper),
    p(`${prefix}-arm-l`, who, { x: -bones.shoulder.x - 40, y: bones.shoulder.y - 30, w: 80, h: 150 }, mirror(upper)),
    p(`${prefix}-fore-r`, who, { x: bones.elbow.x - 40, y: bones.elbow.y - 30, w: 80, h: 160 }, fore),
    p(`${prefix}-fore-l`, who, { x: -bones.elbow.x - 40, y: bones.elbow.y - 30, w: 80, h: 160 }, mirror(fore)),
  ];
  const HEAD_BOX = { x: -60, y: -670, w: 120, h: 140 };
  const SEATED_BOX = { x: -124, y: -150, w: 248, h: 162 };
  return [
    p("groom-dhoti", "groom", { x: -110, y: -350, w: 220, h: 360 }, dhoti()),
    p("groom-foot-l", "groom", { x: -90, y: -30, w: 90, h: 36 }, mojari(-1)),
    p("groom-foot-r", "groom", { x: 0, y: -30, w: 90, h: 36 }, mojari(1)),
    p("groom-torso", "groom", { x: -100, y: -572, w: 200, h: 352 }, groomTorso()),
    p("groom-stole", "groom", { x: -80, y: -546, w: 160, h: 290 }, uttariya()),
    p("groom-arm-r", "groom", { x: g.shoulder.x - 40, y: g.shoulder.y - 30, w: 80, h: 150 }, groomUpperArm()),
    p("groom-arm-l", "groom", { x: -g.shoulder.x - 40, y: g.shoulder.y - 30, w: 80, h: 150 }, mirror(groomUpperArm())),
    p("groom-fore-r", "groom", { x: g.elbow.x - 40, y: g.elbow.y - 30, w: 80, h: 170 }, groomForearm()),
    p("groom-fore-l", "groom", { x: -g.elbow.x - 40, y: g.elbow.y - 30, w: 80, h: 170 }, mirror(groomForearm())),
    p("groom-head", "groom", { x: -60, y: -680, w: 120, h: 145 }, groomHead()),
    p("groom-topor", "groom", { x: -100, y: -930, w: 200, h: 300 }, topor()),
    // Titas's wedding look
    p("bride-veil", "bride", { x: -140, y: -690, w: 280, h: 360 }, veilBack()),
    p("bride-saree", "bride", { x: -120, y: -440, w: 240, h: 450 }, saree()),
    p("bride-foot-l", "bride", { x: -50, y: -20, w: 40, h: 24 }, brideFeet(-1)),
    p("bride-foot-r", "bride", { x: 10, y: -20, w: 40, h: 24 }, brideFeet(1)),
    p("bride-torso", "bride", { x: -80, y: -566, w: 160, h: 180 }, brideTorso()),
    p("bride-arm-r", "bride", { x: b.shoulder.x - 40, y: b.shoulder.y - 30, w: 80, h: 150 }, brideUpperArm()),
    p("bride-arm-l", "bride", { x: -b.shoulder.x - 40, y: b.shoulder.y - 30, w: 80, h: 150 }, mirror(brideUpperArm())),
    p("bride-fore-r", "bride", { x: b.elbow.x - 40, y: b.elbow.y - 30, w: 80, h: 160 }, brideForearm()),
    p("bride-fore-l", "bride", { x: -b.elbow.x - 40, y: b.elbow.y - 30, w: 80, h: 160 }, mirror(brideForearm())),
    p("bride-head", "bride", HEAD_BOX, brideHead()),
    p("bride-veil-front", "bride", { x: -60, y: -690, w: 120, h: 100 }, veilFront()),
    p("bride-mukut", "bride", { x: -100, y: -830, w: 200, h: 200 }, mukut()),
    p("bride-saree-seated", "bride", SEATED_BOX, seatedSaree(LOOKS.wedding, "bride", { alta: true })),
    // Titas's gaye holud look (yellow): bare arms and feet, plain hair
    p("bride-head-plain", "bride", HEAD_BOX, bridePlainHead()),
    p("bride-torso-holud", "bride", { x: -80, y: -566, w: 160, h: 180 }, brideTorso(LOOKS.holud)),
    p("bride-saree-holud", "bride", { x: -120, y: -440, w: 240, h: 450 }, saree(LOOKS.holud, 29)),
    p("bride-saree-holud-seated", "bride", SEATED_BOX, seatedSaree(LOOKS.holud, "bride")),
    ...arms("bride-plain", "bride", b, upperArm("bride", { armlet: false }), forearm("bride", { bangles: "none", alta: false })),
    p("bride-plain-foot-l", "bride", { x: -50, y: -20, w: 40, h: 24 }, brideFeet(-1, { alta: false })),
    p("bride-plain-foot-r", "bride", { x: 10, y: -20, w: 40, h: 24 }, brideFeet(1, { alta: false })),
    // মা
    p("mother-anchal", "mother", { x: 20, y: -520, w: 92, h: 236 }, motherAnchal()),
    p("mother-saree", "mother", { x: -120, y: -440, w: 240, h: 450 }, saree(LOOKS.mother)),
    p("mother-saree-seated", "mother", SEATED_BOX, seatedSaree(LOOKS.mother, "mother", { alta: true })),
    p("mother-torso", "mother", { x: -80, y: -562, w: 160, h: 180 }, motherTorso()),
    ...arms("mother", "mother", mo, upperArm("mother", { armlet: false, sleeve: "mblouse" }), forearm("mother", { bangles: "married", alta: true })),
    p("mother-head", "mother", { x: -64, y: -670, w: 128, h: 140 }, motherHead()),
    p("mother-foot-l", "mother", { x: -50, y: -20, w: 40, h: 24 }, brideFeet(-1, { who: "mother" })),
    p("mother-foot-r", "mother", { x: 10, y: -20, w: 40, h: 24 }, brideFeet(1, { who: "mother" })),
  ];
};
