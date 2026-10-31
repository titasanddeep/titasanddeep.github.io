/** 2D affine matrices in canvas `setTransform` order: x' = a·x + c·y + e, y' = b·x + d·y + f. */
export type Mat = readonly [a: number, b: number, c: number, d: number, e: number, f: number];

export const I: Mat = [1, 0, 0, 1, 0, 0];

/** m · n: apply `n` first, then `m`. */
export const mul = (m: Mat, n: Mat): Mat => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];

export const translate = (x: number, y: number): Mat => [1, 0, 0, 1, x, y];

/** Rotation by `deg` degrees (clockwise on screen, y down — like CSS `rotate`). */
export const rotate = (deg: number): Mat => {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [c, s, -s, c, 0, 0];
};

export const scale = (sx: number, sy: number = sx): Mat => [sx, 0, 0, sy, 0, 0];

/** translate(o) · m · translate(-o): `m` applied about the point (ox, oy). */
export const about = (ox: number, oy: number, m: Mat): Mat => mul(translate(ox, oy), mul(m, translate(-ox, -oy)));

export const apply = (m: Mat, p: { x: number; y: number }): { x: number; y: number } => ({
  x: m[0] * p.x + m[2] * p.y + m[4],
  y: m[1] * p.x + m[3] * p.y + m[5],
});

/** CSS-like `translate(x,y) rotate(rot) scale(sx·k, k)` — the sprite placement. */
export const sprite = (x: number, y: number, rotDeg: number, k: number, sx: number = 1): Mat =>
  mul(translate(x, y), mul(rotate(rotDeg), scale(sx * k, k)));
