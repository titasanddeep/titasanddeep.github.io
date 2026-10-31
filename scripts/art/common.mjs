// Shared helpers for the generated art. Everything is deterministic (seeded), so a re-run reproduces the same pixels.

export const INK = "#3a2620";

export const rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const r1 = (n) => Math.round(n * 10) / 10;
export const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
export const lerp = (a, b, t) => a + (b - a) * t;

/** Mixes two #rrggbb colours. */
export const mix = (c1, c2, t) => {
  const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const a = p(c1);
  const b = p(c2);
  return `#${a.map((v, i) => Math.round(lerp(v, b[i], t)).toString(16).padStart(2, "0")).join("")}`;
};

/**
 * A piece of art to bake. `bounds` is the drawing area in the piece's design coordinates; the baked image is trimmed
 * to its visible pixels and the manifest records where those pixels sit in design coordinates.
 */
export const piece = (name, bounds, body, { scale = 1, quality = 0.86, opaque = false, trim = !opaque, defs = "" } = {}) => ({
  name,
  bounds,
  scale,
  quality,
  trim,
  svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(bounds.w * scale)}" height="${Math.round(bounds.h * scale)}" viewBox="${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}">${defs ? `<defs>${defs}</defs>` : ""}${body}</svg>\n`,
});

export const lin = (id, stops, { x1 = 0, y1 = 0, x2 = 0, y2 = 1, units = "" } = {}) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${units ? ` gradientUnits="${units}"` : ""}>${stops
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}"${a === 1 ? "" : ` stop-opacity="${a}"`}/>`)
    .join("")}</linearGradient>`;

export const rad = (id, stops, { cx = 0.5, cy = 0.5, r = 0.5, fx, fy, units = "" } = {}) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"${fx !== undefined ? ` fx="${fx}" fy="${fy}"` : ""}${units ? ` gradientUnits="${units}"` : ""}>${stops
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}"${a === 1 ? "" : ` stop-opacity="${a}"`}/>`)
    .join("")}</radialGradient>`;

export const blurFilter = (id, sd) =>
  `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;

/** Watercolour edge: displaces the source slightly with fractal noise. */
export const wcFilter = (id, scale = 10, freq = 0.02, seed = 7) =>
  `<filter id="${id}" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="${seed}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/></filter>`;

/** Fine paper/fabric grain multiplied into whatever it is applied to (keeps alpha). */
export const grainFilter = (id, amount = 0.18, freq = 0.9, seed = 3) =>
  `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="${seed}" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${amount} 0" result="ga"/><feComposite in="ga" in2="SourceGraphic" operator="in" result="gm"/><feBlend in="gm" in2="SourceGraphic" mode="multiply"/></filter>`;

/** A pointed leaf with its base at the origin, pointing up (negative y). */
export const leafPath = (len, wid) =>
  `M0 0C${r1(wid)} ${r1(-len * 0.28)} ${r1(wid * 0.85)} ${r1(-len * 0.72)} 0 ${r1(-len)}C${r1(-wid * 0.85)} ${r1(-len * 0.72)} ${r1(-wid)} ${r1(-len * 0.28)} 0 0Z`;

export const marigold = (R, cx, cy, r, { tone = 0 } = {}) => {
  const outer = ["#e98f1c", "#f2a62a", "#e27d16", "#f0b43c"][tone % 4];
  const inner = ["#f6b847", "#fbc957", "#f3a33a", "#ffd56a"][tone % 4];
  let s = `<g transform="translate(${r1(cx)} ${r1(cy)}) rotate(${r1(R() * 60)})">`;
  s += `<circle r="${r1(r * 1.02)}" fill="${mix(outer, "#7a3a0c", 0.35)}"/>`;
  for (let ring = 0; ring < 3; ring++) {
    const n = 16 - ring * 4;
    const rr = r * (0.95 - ring * 0.27);
    const col = mix(outer, inner, ring / 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 360 + ring * 13 + R() * 8;
      s += `<ellipse cx="0" cy="${r1(-rr * 0.55)}" rx="${r1(rr * 0.24)}" ry="${r1(rr * 0.46)}" transform="rotate(${r1(a)})" fill="${col}" stroke="${mix(col, "#7a3a0c", 0.5)}" stroke-opacity=".55" stroke-width="${r1(Math.max(0.5, r * 0.035))}"/>`;
    }
  }
  s += `<circle r="${r1(r * 0.2)}" fill="#a3561a"/><circle r="${r1(r * 0.1)}" cx="${r1(-r * 0.05)}" cy="${r1(-r * 0.05)}" fill="#f7c35a" opacity=".7"/></g>`;
  return s;
};

export const blossom = (R, cx, cy, r, fill = "#f8f1e6", center = "#e0a83a") => {
  let s = `<g transform="translate(${r1(cx)} ${r1(cy)}) rotate(${r1(R() * 72)})">`;
  for (let i = 0; i < 5; i++) {
    s += `<ellipse cx="0" cy="${r1(-r * 0.5)}" rx="${r1(r * 0.36)}" ry="${r1(r * 0.54)}" transform="rotate(${i * 72})" fill="${fill}" stroke="${mix(fill, INK, 0.45)}" stroke-opacity=".5" stroke-width="${r1(Math.max(0.6, r * 0.05))}"/>`;
    s += `<ellipse cx="0" cy="${r1(-r * 0.36)}" rx="${r1(r * 0.12)}" ry="${r1(r * 0.3)}" transform="rotate(${i * 72})" fill="#ffffff" opacity=".35"/>`;
  }
  s += `<circle r="${r1(r * 0.2)}" fill="${center}"/></g>`;
  return s;
};
