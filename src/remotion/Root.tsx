import { Composition, getStaticFiles, staticFile } from "remotion";
import { AUDIO_PATH } from "../content/assets";
import { DURATION, FPS, HEIGHT, WIDTH } from "../story/timeline";
import { WeddingComposition } from "./WeddingComposition";
import { defaultWeddingProps, type WeddingProps } from "./props";

/** Detects an optional soundtrack in public/audio so renders include it only when it exists (no 404 probing). */
const detectAudio = (): string | null => {
  try {
    return getStaticFiles().some((f) => f.name === AUDIO_PATH) ? staticFile(AUDIO_PATH) : null;
  } catch {
    return null;
  }
};

export const RemotionRoot = () => (
  <Composition
    id="TitasAndDeepWedding"
    component={WeddingComposition}
    width={WIDTH}
    height={HEIGHT}
    fps={FPS}
    durationInFrames={DURATION}
    defaultProps={defaultWeddingProps}
    calculateMetadata={({ props }) => {
      const p: WeddingProps = props;
      return { props: { ...p, audioSrc: p.audioSrc ?? detectAudio() } };
    }}
  />
);
