import { Html5Audio, useCurrentFrame } from "remotion";
import { soundtrackVolume } from "../app/lib/soundtrackVolume";
import { FRAMES_PER_BEAT } from "../story/timeline";

/**
 * Video renders only: renders nothing unless a soundtrack URL was provided, so a missing file never breaks a render.
 * The track plays once (it ends as the card settles); the volume follows the same envelope as the website's
 * (src/app/lib/soundtrackVolume.ts). The website plays the track from the shell with a plain audio element.
 */
export const Soundtrack = ({ src }: { src: string | null }) => {
  const beat = useCurrentFrame() / FRAMES_PER_BEAT;
  if (!src) return null;
  return <Html5Audio src={src} volume={soundtrackVolume(beat)} />;
};
