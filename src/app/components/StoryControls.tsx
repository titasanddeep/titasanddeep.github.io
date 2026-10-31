import type { SyntheticEvent } from "react";
import { t, type Lang } from "../../content/translations";
import type { StoryPhase } from "../state/storyMachine";

interface Props {
  lang: Lang;
  phase: StoryPhase;
  isPlaying: boolean;
  muted: boolean;
  hasAudio: boolean;
  copied: boolean;
  onTogglePlay: (e: SyntheticEvent) => void;
  onToggleMute: () => void;
  onSkip: () => void;
  onReplay: (e: SyntheticEvent) => void;
  onShare: () => void;
}

const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg className="ctl__icon" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {children}
  </svg>
);

const PauseIcon = () => (
  <Icon>
    <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
  </Icon>
);
const PlayIcon = () => (
  <Icon>
    <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />
  </Icon>
);
const SoundOnIcon = () => (
  <Icon>
    <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" fill="currentColor" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </Icon>
);
const SoundOffIcon = () => (
  <Icon>
    <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" fill="currentColor" />
    <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </Icon>
);
const SkipIcon = () => (
  <Icon>
    <path d="M5 5v14l9-7zM16 5h3v14h-3z" fill="currentColor" />
  </Icon>
);
const ReplayIcon = () => (
  <Icon>
    <path d="M12 5a7 7 0 1 1-6.6 4.7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 1.5L7.5 5 12 8.5z" fill="currentColor" />
  </Icon>
);
const ShareIcon = () => (
  <Icon>
    <path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 13v6h14v-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

/** Bottom thumb-zone controls. Which ones appear depends on the story phase. */
export const StoryControls = ({
  lang,
  phase,
  isPlaying,
  muted,
  hasAudio,
  copied,
  onTogglePlay,
  onToggleMute,
  onSkip,
  onReplay,
  onShare,
}: Props) => {
  const tx = t(lang);
  if (phase === "intro") return null;
  const finished = phase === "finished";
  return (
    <div className="controls" role="toolbar" aria-label={tx.controlsLabel}>
      {phase === "playing" && (
        <button type="button" className="ctl" onClick={onTogglePlay}>
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
          <span>{isPlaying ? tx.pause : tx.resume}</span>
        </button>
      )}
      {finished && (
        <>
          <button type="button" className="ctl" onClick={onReplay}>
            <ReplayIcon />
            <span>{tx.replay}</span>
          </button>
          <button type="button" className="ctl" onClick={onShare}>
            <ShareIcon />
            <span>{tx.share}</span>
          </button>
        </>
      )}
      {hasAudio && (
        <button type="button" className="ctl ctl--icon" onClick={onToggleMute} aria-pressed={muted} aria-label={muted ? tx.unmute : tx.mute}>
          {muted ? <SoundOffIcon /> : <SoundOnIcon />}
        </button>
      )}
      {!finished && (
        <button type="button" className="ctl" onClick={onSkip}>
          <SkipIcon />
          <span>{tx.skip}</span>
        </button>
      )}
      <span className="toast" role="status" aria-live="polite">
        {copied ? tx.copied : ""}
      </span>
    </div>
  );
};

