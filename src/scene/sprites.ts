import { I, mul, sprite, type Mat } from "../render/mat";
import type { DrawOp } from "../render/ops";
import type { SpriteState } from "../story/choreography";

/** Ops at or below this opacity are not drawn (the renderer skips them too). */
export const MIN_ALPHA = 0.002;

/** Opacity of a sprite as drawn (never above 1). */
export const spriteAlpha = (s: SpriteState): number => Math.min(1, s.opacity ?? 1);

/**
 * One sprite as an image op: the art at its manifest rect under `m · translate(x,y) · rotate(rot) · scale(sx·k, k)`,
 * drawn at the sprite's opacity (the old `spriteTransform` placement).
 * @param m parent matrix (default identity); the camera for sprites inside the camera group
 */
export const spriteOp = (s: SpriteState, m: Mat = I): DrawOp => ({
  kind: "image",
  art: s.name,
  m: mul(m, sprite(s.x, s.y, s.rot ?? 0, s.scale ?? 1, s.sx ?? 1)),
  alpha: spriteAlpha(s),
});

/** A whole sprite list as ops, skipping hidden sprites (opacity ≤ 0.002). */
export const spriteOps = (list: readonly SpriteState[], m: Mat = I): DrawOp[] => {
  const out: DrawOp[] = [];
  for (const s of list) if (spriteAlpha(s) > MIN_ALPHA) out.push(spriteOp(s, m));
  return out;
};
