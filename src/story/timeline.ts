/**
 * Single source of truth for the cinematic timeline.
 * Scene starts/ends, guided checkpoints, the skip target and the composition duration all derive from here.
 * `end` is exclusive: a scene owns frames [start, end).
 *
 * Pacing is authored in BEATS (1 beat = 1/30 s) and the composition plays at 60 FPS, so every beat is two frames.
 * Animation code reads the fractional beat, which keeps all hand-tuned numbers below while interpolating smoothly at
 * 60 FPS. Anything that talks to the Player uses frames.
 */
export const BEAT_FPS = 30;
export const FPS = 60;
export const FRAMES_PER_BEAT = FPS / BEAT_FPS;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/**
 * Scene boundaries in beats (spec/story.md §4). The order is the family's revised outline (2026-10-31) and never
 * changes: গায়ে হলুদ → পিঁড়ি, শুভদৃষ্টি, মালাবদল → the invitation.
 */
export const SCENE_BEATS = {
  holud: { start: 0, end: 540 },
  wedding: { start: 540, end: 1140 },
  invitation: { start: 1140, end: 1590 },
} as const;

export type SceneId = keyof typeof SCENE_BEATS;
export const SCENE_ORDER = ["holud", "wedding", "invitation"] as const satisfies readonly SceneId[];

export const beatsToFrames = (beats: number): number => Math.round(beats * FRAMES_PER_BEAT);
export const framesToBeats = (frames: number): number => frames / FRAMES_PER_BEAT;

/** Scene boundaries in frames (60 FPS). */
export const SCENES = Object.fromEntries(
  SCENE_ORDER.map((id) => [id, { start: beatsToFrames(SCENE_BEATS[id].start), end: beatsToFrames(SCENE_BEATS[id].end) }]),
) as Record<SceneId, { start: number; end: number }>;

export const DURATION = SCENES.invitation.end; // 3180 frames = 53 s at 60 FPS
export const LAST_FRAME = DURATION - 1; // 3179: the final, fully revealed invitation

/**
 * Beats a scene keeps drawing after its end, under the next scene's cross-fade. The holud rises into the evening while
 * the wedding comes down into it; the wedding keeps going while the card rises out of it (as in the groom's film).
 */
export const SCENE_OVERLAP: Record<SceneId, number> = {
  holud: 40,
  wedding: 62,
  invitation: 0,
};

/** Beats over which each scene fades in over the previous one (its first beats). */
export const SCENE_FADE_IN: Record<SceneId, number> = {
  holud: 0,
  wedding: 40,
  invitation: 0,
};

/** Frame shown behind the cover: the sunlit courtyard, close on the turmeric among the marigolds, before the names. */
export const COVER_FRAME = beatsToFrames(36);

/** Scene length in beats. */
export const sceneDuration = (id: SceneId): number => SCENE_BEATS[id].end - SCENE_BEATS[id].start;

/** Last frame (60 FPS) that belongs to a scene. */
export const sceneLastFrame = (id: SceneId): number => SCENES[id].end - 1;

export const sceneAt = (frame: number): SceneId => {
  const f = Math.max(0, Math.min(LAST_FRAME, Math.floor(frame)));
  for (const id of SCENE_ORDER) {
    if (f >= SCENES[id].start && f < SCENES[id].end) return id;
  }
  return "invitation";
};

export const nextScene = (id: SceneId): SceneId | null => {
  const i = SCENE_ORDER.indexOf(id);
  return SCENE_ORDER[i + 1] ?? null;
};

export const previousScene = (id: SceneId): SceneId | null => {
  const i = SCENE_ORDER.indexOf(id);
  return SCENE_ORDER[i - 1] ?? null;
};

export const framesToSeconds = (frames: number): number => frames / FPS;
export const secondsToFrames = (seconds: number): number => Math.round(seconds * FPS);

/**
 * Beats RELATIVE to the start of each scene. Animation code reads these instead of hard-coding numbers, so pacing can
 * be tuned in one place.
 */
export const BEATS = {
  holud: {
    /** The sun comes into the courtyard, close on the haldi bowl among the marigolds. */
    sunIn: [0, 44],
    garlands: [0, 80],
    /** The camera pulls back from the bowl while the names rise. */
    open: [36, 170],
    title: [40, 150],
    subtitle: [100, 156],
    titleOut: [168, 194],
    /** The heading, over the wide courtyard; mother and daughter come in and the bowl passes into the mother's hand. */
    headingIn: [190, 222],
    coupleIn: [200, 236],
    /** গায়ে হলুদ: cheeks, forearms, feet (the camera pushes in from coupleIn[1] to cheek[0]). */
    cheek: [276, 312],
    arm: [318, 352],
    feet: [358, 392],
    hands: [390, 460],
    laugh: [400, 466],
    ulu: [394, 500],
    petals: [370, 530],
    /** The camera rises to the verandah garlands as the day turns to evening (and on, under the wedding's fade-in). */
    rise: [466, 540],
    dusk: [470, 580],
  },
  wedding: {
    /** The camera comes down from high in the ছাদনাতলা as the lamps light. */
    descend: [0, 76],
    lampsIn: [0, 76],
    headingIn: [24, 60],
    /** Titas is carried in on the পিঁড়ি at shoulder height, her face behind two betel leaves. */
    piriIn: [72, 196],
    lower: [198, 228],
    /** শুভদৃষ্টি, through her eyes: her hands hold the leaves over his face, lower them (`reveal`), and his face is there. */
    leavesDown: [222, 290],
    reveal: [236, 274],
    gaze: [286, 342],
    /** মালাবদল: she garlands him first, then he garlands her. */
    exchange: [342, 502],
    tableau: [502, 572],
    petalCross: [558, 599],
    cardEdge: [572, 599],
  },
  invitation: {
    cardUnfold: [0, 104],
    emblem: [86, 136],
    heading: [116, 158],
    names: [150, 208],
    message: [200, 258],
    details: [250, 292],
    family: [274, 308],
    mapButton: [292, 334],
    /** Ends with the soundtrack (50 s); the finished card then holds in quiet. */
    flourish: [320, 360],
  },
} as const satisfies Record<SceneId, Record<string, readonly [number, number] | readonly (readonly [number, number])[]>>;

/**
 * Explore mode: where the story holds after the guest starts each scene, in GLOBAL beats. Each hold sits on the
 * object of the next stop (spec/story.md §4: the betel leaves), so the guest taps the thing the story is about. The
 * wedding holds on its last frame, on the ornament that opens the card.
 */
export const GUIDED_HOLD_BEAT: Record<SceneId, number> = {
  holud: SCENE_BEATS.wedding.start + BEATS.wedding.piriIn[1],
  wedding: SCENE_BEATS.wedding.end - 0.5,
  invitation: SCENE_BEATS.invitation.end - 0.5,
};

/** The frame guided mode pauses on after playing `id` (offering the next scene's hotspot). */
export const guidedHoldFrame = (id: SceneId): number => Math.min(LAST_FRAME, beatsToFrames(GUIDED_HOLD_BEAT[id]));
