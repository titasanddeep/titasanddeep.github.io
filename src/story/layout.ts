/**
 * Every position in the composition lives here. Each setting is designed as a 1080 × 1920 "set" (y down) seen through
 * its own camera (src/story/camera.ts), so these are SET coordinates: at camera zoom 1 they are composition px.
 * Numbers marked "mirrors scripts/art/…" are painted into the art: change both together.
 */
export interface Pt {
  readonly x: number;
  readonly y: number;
}

export const SET = { w: 1080, h: 1920 } as const;

// ---------------------------------------------------------------------------------------------------- the courtyard
/** The উঠোন (mirrors scripts/art/settings.mjs COURTYARD): the lamp's niche in the তুলসী মঞ্চ, the conch beside it. */
export const COURTYARD = {
  lamp: { x: 252, y: 1238 },
  conch: { x: 336, y: 1300 },
  floor: 1214,
} as const;

/** The names rise from low in the frame and settle high over the sunlit courtyard. */
export const TITLE = { from: 1600, to: 440, subtitle: 620 } as const;

// ---------------------------------------------------------------------------------------------------- the gaye holud
/**
 * Titas, in yellow, on a low stool; her mother on another beside her. Before they come in, the haldi bowl that came
 * with the tattva rests on the floor between their places, among loose marigolds.
 */
export const HOLUD = {
  titas: { x: 650, y: 1730 },
  mother: { x: 420, y: 1726 },
  scale: 1,
  bowlRest: { x: 540, y: 1660 },
} as const;

/** Loose marigolds round the resting bowl (offsets from it, px). */
export const BOWL_MARIGOLDS: readonly Pt[] = [
  { x: -96, y: 8 },
  { x: -62, y: 40 },
  { x: -14, y: 58 },
  { x: 40, y: 50 },
  { x: 84, y: 22 },
  { x: 108, y: -14 },
  { x: -126, y: -26 },
  { x: 70, y: -40 },
];
/** The bowl's size at rest (it shrinks to its in-hand size once the mother has it). */
export const BOWL_SCALE = { rest: 0.95, hand: 0.62 } as const;

/** Where the camera looks first: close on the bowl, the sun coming across it. */
export const OPENING = { x: 540, y: 1520, z: 2.4 } as const;

// ---------------------------------------------------------------------------------------------------- the wedding
/** The ছাদনাতলা (mirrors scripts/art/settings.mjs CHHADNA): the alpana where Deep stands. */
export const CHHADNA = { cx: 540, cy: 1560, rx: 470, ry: 128 } as const;
export const GROOM_SCALE = 0.9;

/** The ring of lamps round the alpana. */
export const LAMP_RING: readonly Pt[] = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2 + Math.PI / 14;
  return { x: CHHADNA.cx + Math.cos(a) * 510, y: CHHADNA.cy + Math.sin(a) * 150 };
});

/** The পিঁড়ি: carried in from beyond the right of the frame to her place at his right, and how high it is carried. */
export const PIRI = {
  enterFrom: { x: 1420, y: 1572 },
  /** Height of the plank above the floor while carried (set px), and once lowered for the first look. */
  lift: 430,
  lowered: 276,
  /** Where the piri comes to rest, facing him, for শুভদৃষ্টি and মালাবদল. */
  rest: { x: 740, y: 1572 },
  titasScale: 0.86,
} as const;

/**
 * Her view at the first look (screen px): her two hands hold the betel leaves, stalks pinched just below his face, tips
 * up over it; the elbows are below the frame. Lowering, the hands go down by `lower` and apart by `part` each.
 */
export const POV_HOLD = { x: 540, y: 1300, apart: 40, leafScale: 4.3, elbowOut: 240, elbowDown: 800, lower: 1150, part: 230 } as const;

/** Face level of the couple once the piri is lowered (set px), for the শুভদৃষ্টি glow. */
export const GAZE_POINT = { x: 640, y: 1030 } as const;
export const GAZE_GLOW = { x: GAZE_POINT.x, y: GAZE_POINT.y + 10, r: 260 } as const;
export const RING_GLOW = { x: CHHADNA.cx, y: 1300, r: 820 } as const;

/** Card edge peeking into frame at the very end of the wedding scene (px) and where the ornament lands. */
export const CARD_EDGE_Y = 1575;
export const ORNAMENT_POS = { x: 540, y: 1545 } as const;
export const ORNAMENT_SCALE = 0.62;

// ---------------------------------------------------------------------------------------------------- explore mode
/** Hotspot tap-target sizes (composition px). */
export const HOTSPOT_SIZE = { bowl: 300, leaves: 280, ornament: 300 } as const;
/** Where the explore caption sits (composition px): low on the frame, or high when the hotspot is low. */
export const CAPTION_Y = { low: 1640, high: 330 } as const;
