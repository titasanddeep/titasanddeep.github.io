import type { PlayerRef } from "@remotion/player";
import { useCallback, useEffect, useRef, type RefObject } from "react";
import { FPS, framesToBeats } from "../../story/timeline";
import { soundtrackVolume, trackTime } from "../lib/soundtrackVolume";

/** Re-sync the music only when it has drifted this far from the story (seeks, stalls), never every frame. */
const MAX_DRIFT_S = 0.35;

/**
 * The website plays the soundtrack with a plain <audio> element outside the Player: the browser decodes and mixes it
 * off the main thread. It follows the Player (play, pause, seek) and the volume envelope. Sound starts only after a
 * guest gesture; a missing or failing file is silently ignored.
 */
export const useSoundtrack = (playerRef: RefObject<PlayerRef | null>, src: string | null) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!src) return;
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.muted = true;
    // the track plays once and ends as the card settles (trackTime); the story finishes in quiet
    audio.loop = false;
    audioRef.current = audio;
    audio.addEventListener("error", () => {
      audioRef.current = null;
    });
    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [src]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const sync = (frame: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const t = trackTime(frame / FPS, audio.duration);
      if (Math.abs(audio.currentTime - t) > MAX_DRIFT_S) audio.currentTime = t;
      audio.volume = Math.min(1, Math.max(0, soundtrackVolume(framesToBeats(frame))));
    };
    const onPlay = () => {
      const audio = audioRef.current;
      if (!audio) return;
      sync(player.getCurrentFrame());
      audio.play().catch(() => undefined);
    };
    const onPause = () => audioRef.current?.pause();
    const onFrame = (e: { detail: { frame: number } }) => sync(e.detail.frame);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    player.addEventListener("ended", onPause);
    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("seeked", onFrame);
    return () => {
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
      player.removeEventListener("ended", onPause);
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("seeked", onFrame);
    };
  }, [playerRef]);

  /** Mutes/unmutes. Unmuting must happen in a guest gesture the first time (browsers block sound otherwise). */
  return useCallback(
    (muted: boolean) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.muted = muted;
      // play() inside the gesture unlocks audio (iOS); if the story is not running, pause again right away
      if (!muted)
        audio
          .play()
          .then(() => {
            if (!playerRef.current?.isPlaying()) audio.pause();
          })
          .catch(() => undefined);
    },
    [playerRef],
  );
};
