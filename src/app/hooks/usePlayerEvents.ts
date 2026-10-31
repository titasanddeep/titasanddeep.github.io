import type { PlayerRef } from "@remotion/player";
import { useEffect, useState, type MutableRefObject, type RefObject } from "react";
import { guidedHoldFrame, SCENE_ORDER, sceneAt, type SceneId } from "../../story/timeline";
import type { StoryAction, StoryState } from "../state/storyMachine";

interface Options {
  playerRef: RefObject<PlayerRef | null>;
  stateRef: MutableRefObject<StoryState>;
  send: (action: StoryAction) => void;
}

/**
 * Subscribes to the Player once. `frameupdate` fires on every frame, so the handler only does work at scene
 * boundaries; React state is touched only when the scene or play/pause state actually changes.
 */
export const usePlayerEvents = ({ playerRef, stateRef, send }: Options) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [scene, setScene] = useState<SceneId>(SCENE_ORDER[0]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    let lastScene: SceneId | null = null;

    const onFrame = (e: { detail: { frame: number } }) => {
      const frame = e.detail.frame;
      const s = stateRef.current;
      // Boundary first, and with `>=`: on a slow device the Player may skip the checkpoint frame itself,
      // and the guest must still be held on the hold frame (on the next stop's object) rather than slipping past it.
      if (s.phase === "playing" && s.mode === "guided" && s.step !== "invitation" && frame >= guidedHoldFrame(s.step)) {
        player.pause();
        player.seekTo(guidedHoldFrame(s.step));
        send({ type: "BOUNDARY", scene: s.step });
        return;
      }
      const current = sceneAt(frame);
      if (current !== lastScene) {
        lastScene = current;
        setScene(current);
        send({ type: "SCENE", scene: current });
      }
    };
    const onEnded = () => send({ type: "ENDED" });
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("ended", onEnded);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    return () => {
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("ended", onEnded);
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
    };
  }, [playerRef, stateRef, send]);

  return { isPlaying, scene };
};
