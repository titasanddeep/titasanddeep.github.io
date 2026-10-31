import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { ART, type ArtName } from "../art/manifest";
import { ALL_ART, type FrameOutput } from "../scene/frame";
import { drawFrame } from "../render/canvas";
import { artImage, imageReady, whenDecoded } from "../render/images";
import { resolveAsset } from "./assets";

interface Props {
  output: Pick<FrameOutput, "draw">;
  assetBase: string | null;
  /** Backing-store pixels per composition pixel (default 1). */
  canvasScale?: number;
  /** Website (true) or video render (false: waits until every image is decoded). */
  interactive: boolean;
}

export const FRAME_W = 1080;
export const FRAME_H = 1920;

/**
 * THE picture: one canvas, 1080×1920 in CSS, redrawn in a layout effect on every render (Remotion renders once per frame).
 * Everything the scenes draw goes through `drawFrame`; there is no other imagery in the composition.
 */
export const StoryCanvas = ({ output, assetBase, canvasScale = 1, interactive }: Props) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [handle] = useState(() => (interactive ? null : delayRender("Loading art", { timeoutInMilliseconds: 60000 })));
  const [ready, setReady] = useState(interactive);

  const image = useMemo(() => {
    const cache = new Map<ArtName, HTMLImageElement>();
    return (name: ArtName): HTMLImageElement => {
      let img = cache.get(name);
      if (!img) {
        img = artImage(resolveAsset(ART[name].src, assetBase));
        cache.set(name, img);
      }
      return img;
    };
  }, [assetBase]);

  // video renders: hold every frame until the art is decoded
  useEffect(() => {
    if (handle === null) return;
    Promise.all(ALL_ART.map((n) => whenDecoded(image(n)))).finally(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [handle, image]);

  const pw = Math.round(FRAME_W * canvasScale);
  const ph = Math.round(FRAME_H * canvasScale);

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    ctxRef.current ??= canvas.getContext("2d");
    const ctx = ctxRef.current;
    if (!ctx) return;
    drawFrame(ctx, output.draw, {
      scale: canvasScale,
      image: (name) => {
        const img = image(name);
        return imageReady(img) ? img : null;
      },
    });
  }, [output, image, canvasScale, ready]);

  return (
    <canvas
      ref={ref}
      width={pw}
      height={ph}
      style={{ position: "absolute", left: 0, top: 0, width: FRAME_W, height: FRAME_H, display: "block" }}
    />
  );
};
