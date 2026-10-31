
import { nextScene, SCENE_ORDER, type SceneId } from "../../story/timeline";

/**
 * Website-level story state, kept separate from frame-driven animation state.
 * It is a pure reducer so the guided order (haldi bowl → betel leaves → ornament) can be unit-tested.
 */
export type StoryMode = "cinematic" | "guided";
export type StoryPhase = "intro" | "playing" | "awaiting" | "finished";

export interface StoryState {
  phase: StoryPhase;
  mode: StoryMode | null;
  /** The scene most recently started (guided: the one now playing). */
  step: SceneId;
  /** Guided mode: the scene a tap on the current hotspot will start. */
  awaiting: SceneId | null;
}

export type StoryAction =
  | { type: "START_CINEMATIC" }
  | { type: "START_GUIDED" }
  | { type: "ACTIVATE"; target: SceneId }
  | { type: "SCENE"; scene: SceneId }
  | { type: "BOUNDARY"; scene: SceneId }
  | { type: "ENDED" }
  | { type: "SKIP" }
  | { type: "REPLAY" }
  | { type: "RESET" };

/** The first scene, where both Watch and Explore begin. */
const FIRST: SceneId = SCENE_ORDER[0];

export const initialStoryState: StoryState = {
  phase: "intro",
  mode: null,
  step: FIRST,
  awaiting: null,
};

export const storyReducer = (state: StoryState, action: StoryAction): StoryState => {
  switch (action.type) {
    case "START_CINEMATIC":
    case "REPLAY":
      return { phase: "playing", mode: "cinematic", step: FIRST, awaiting: null };

    case "START_GUIDED":
      return { phase: "awaiting", mode: "guided", step: FIRST, awaiting: FIRST };

    case "ACTIVATE":
      // Only the hotspot currently offered may advance the story, so taps can never skip a scene.
      if (state.phase !== "awaiting" || state.awaiting !== action.target) return state;
      return { ...state, phase: "playing", step: action.target, awaiting: null };

    case "SCENE":
      // Cinematic only: in guided mode the step is advanced solely by the guest's taps (ACTIVATE).
      if (state.phase !== "playing" || state.mode !== "cinematic" || state.step === action.scene) return state;
      return { ...state, step: action.scene };

    case "BOUNDARY": {
      // Guided mode pauses at each scene's hold (timeline guidedHoldFrame) and offers the next hotspot.
      if (state.phase !== "playing" || state.mode !== "guided" || state.step !== action.scene) return state;
      const next = nextScene(action.scene);
      return next
        ? { ...state, phase: "awaiting", awaiting: next }
        : { ...state, phase: "finished", awaiting: null };
    }

    case "ENDED":
      return state.phase === "intro" ? state : { ...state, phase: "finished", step: "invitation", awaiting: null };

    case "SKIP":
      return { phase: "finished", mode: state.mode ?? "cinematic", step: "invitation", awaiting: null };

    case "RESET":
      return initialStoryState;
  }
};

