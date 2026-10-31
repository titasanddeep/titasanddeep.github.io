import { Player, type PlayerRef } from "@remotion/player";
import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { asset, AUDIO_PATH } from "../../content/assets";
import { COVER_FRAME, DURATION, FPS, HEIGHT, LAST_FRAME, WIDTH, type SceneId } from "../../story/timeline";
import { t, type Lang } from "../../content/translations";
import { WeddingComposition } from "../../remotion/WeddingComposition";
import type { WeddingProps } from "../../remotion/props";
import { usePlayerEvents } from "../hooks/usePlayerEvents";
import { useSoundtrack } from "../hooks/useSoundtrack";
import { useStageLayout } from "../hooks/useStageLayout";
import { useStoryMachine } from "../hooks/useStoryMachine";
import { IntroScreen } from "./IntroScreen";
import { LanguageToggle } from "./LanguageToggle";
import { StoryControls } from "./StoryControls";

interface Props {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  reducedMotion: boolean;
}

const HAS_AUDIO = typeof __HAS_AUDIO__ !== "undefined" && __HAS_AUDIO__;
const SCENE_HEADING = {
  holud: "headingHolud",
  wedding: "headingWedding",
  invitation: "invitation",
} as const satisfies Record<SceneId, keyof ReturnType<typeof t>>;

/**
 * The 9:16 website shell: a fixed-ratio frame holding the Remotion Player and the cover, with the language toggle and
 * story controls in a HUD over the frame, or in the free bands around it when there is room (tall phones, landscape,
 * desktop). Website state lives in a reducer; the animation stays frame-driven inside the Player.
 */
export const ExperienceShell = ({ lang, onLangChange, reducedMotion }: Props) => {
  const playerRef = useRef<PlayerRef>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<HTMLDivElement>(null);
  useStageLayout(stageRef, roomRef);
  const { state, stateRef, send } = useStoryMachine();
  const { isPlaying, scene } = usePlayerEvents({ playerRef, stateRef, send });
  const [muted, setMuted] = useState(true);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | undefined>(undefined);

  const base = import.meta.env.BASE_URL;
  const audioSrc = HAS_AUDIO ? asset(base, AUDIO_PATH) : null;
  const setSoundMuted = useSoundtrack(playerRef, audioSrc);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t(lang).documentTitle;
  }, [lang]);

  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

  // Test/profiling handle (dev, or any build opened with ?debug) so checks can read the frame and seek the Player.
  useEffect(() => {
    if (import.meta.env.DEV || new URLSearchParams(window.location.search).has("debug")) {
      Object.assign(window, { __weddingPlayer: playerRef, __weddingState: stateRef });
    }
  }, [stateRef]);

  // Sound begins only after a guest gesture (browsers block it otherwise); the story works fine without it.
  const enableSound = useCallback(() => {
    if (!HAS_AUDIO) return;
    setSoundMuted(false);
    setMuted(false);
  }, [setSoundMuted]);

  const watch = useCallback(
    (e: SyntheticEvent) => {
      const p = playerRef.current;
      if (!p) return;
      send({ type: "START_CINEMATIC" });
      p.seekTo(0);
      enableSound();
      p.play(e);
    },
    [send, enableSound],
  );

  const explore = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    send({ type: "START_GUIDED" });
    p.pause();
    p.seekTo(0);
    enableSound();
  }, [send, enableSound]);

  const activate = useCallback(
    (target: SceneId, e: SyntheticEvent) => {
      const p = playerRef.current;
      const s = stateRef.current;
      if (!p || s.phase !== "awaiting" || s.awaiting !== target) return;
      send({ type: "ACTIVATE", target });
      p.play(e);
    },
    [send, stateRef],
  );

  const skip = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    p.pause();
    p.seekTo(LAST_FRAME);
    send({ type: "SKIP" });
  }, [send]);

  const replay = useCallback(
    (e: SyntheticEvent) => {
      const p = playerRef.current;
      if (!p) return;
      send({ type: "REPLAY" });
      p.seekTo(0);
      p.play(e);
    },
    [send],
  );

  const togglePlay = useCallback((e: SyntheticEvent) => playerRef.current?.toggle(e), []);

  const toggleMute = useCallback(() => {
    setSoundMuted(!muted);
    setMuted(!muted);
  }, [muted, setSoundMuted]);

  const share = useCallback(async () => {
    const tx = t(lang);
    const url = window.location.href.split("#")[0];
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: tx.title, text: tx.shareText, url });
        return;
      }
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2400);
    } catch {
      window.prompt(tx.share, url);
    }
  }, [lang]);

  const guided = useMemo(
    () => ({ enabled: state.mode === "guided", awaiting: state.awaiting, onActivate: activate }),
    [state.mode, state.awaiting, activate],
  );

  // Memoised so the Player re-renders the composition only when something it shows actually changes.
  // The soundtrack is played by the shell (useSoundtrack), not inside the Player.
  const inputProps = useMemo<WeddingProps>(
    () => ({
      lang,
      assetBase: base,
      audioSrc: null,
      reducedMotion,
      interactive: true,
      guided,
    }),
    [lang, base, reducedMotion, guided],
  );

  const tx = t(lang);
  return (
    <div className="stage" ref={stageRef}>
      <div className="stage__room" ref={roomRef} aria-hidden="true" />

      <div className="hud hud--top">
        <LanguageToggle lang={lang} onChange={onLangChange} />
        <p className="rotate-hint" lang={lang}>
          {tx.rotateHint}
        </p>
      </div>

      <main className="frame" aria-label={tx.storyLabel}>
        {/* the composition at its own size (scale 1 inside the Player), scaled to the frame by CSS: see useStageLayout */}
        <div className="frame__player">
          <Player
            ref={playerRef}
            component={WeddingComposition}
            inputProps={inputProps}
            durationInFrames={DURATION}
            compositionWidth={WIDTH}
            compositionHeight={HEIGHT}
            fps={FPS}
            initialFrame={COVER_FRAME}
            controls={false}
            loop={false}
            clickToPlay={false}
            doubleClickToFullscreen={false}
            spaceKeyToPlayOrPause={false}
            allowFullscreen={false}
            moveToBeginningWhenEnded={false}
            initiallyMuted
            acknowledgeRemotionLicense
            style={{ width: WIDTH, height: HEIGHT }}
          />
        </div>

        {state.phase === "intro" && (
          <IntroScreen lang={lang} onWatch={watch} onExplore={explore} onSkip={skip} />
        )}

        <div className="sr-only" aria-live="polite">
          {state.phase === "intro" ? "" : tx[SCENE_HEADING[scene]]}
        </div>
      </main>

      <div className="hud hud--bottom">
        <StoryControls
          lang={lang}
          phase={state.phase}
          isPlaying={isPlaying}
          muted={muted}
          hasAudio={HAS_AUDIO}
          copied={copied}
          onTogglePlay={togglePlay}
          onToggleMute={toggleMute}
          onSkip={skip}
          onReplay={replay}
          onShare={share}
        />
      </div>
    </div>
  );
};
