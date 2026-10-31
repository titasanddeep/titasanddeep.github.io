import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { t } from "../content/translations";
import { wedding } from "../content/wedding";
import { describeFrame, type FrameContext } from "../scene/frame";
import { FontGate } from "./FontGate";
import { Overlay } from "./Overlay";
import { Soundtrack } from "./Soundtrack";
import { StoryCanvas } from "./StoryCanvas";
import type { WeddingProps } from "./props";

/**
 * The whole composition: one picture canvas, the text/tap-target overlay, and (video renders only) the soundtrack.
 * Click-through except for the overlay's hotspots and the map link.
 */
export const WeddingComposition = (props: WeddingProps) => {
  const { lang, assetBase, audioSrc, reducedMotion, interactive, guided, canvasScale } = props;
  const frame = useCurrentFrame();
  const { enabled, awaiting, onActivate } = guided;

  const ctx = useMemo<FrameContext>(
    () => ({ lang, text: t(lang), wedding, reducedMotion, interactive, guided: { enabled, awaiting } }),
    [lang, reducedMotion, interactive, enabled, awaiting],
  );
  const output = describeFrame(frame, ctx);

  return (
    <FontGate>
      <AbsoluteFill style={{ pointerEvents: "none", background: "#f5ebdd", overflow: "hidden", fontSynthesis: "none" }}>
        <StoryCanvas output={output} assetBase={assetBase} canvasScale={canvasScale} interactive={interactive} />
        <Overlay output={output} lang={lang} interactive={interactive} reducedMotion={reducedMotion} onActivate={onActivate} />
        <Soundtrack src={audioSrc} />
      </AbsoluteFill>
    </FontGate>
  );
};
