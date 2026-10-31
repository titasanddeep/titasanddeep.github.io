import { useLayoutEffect, type RefObject } from "react";
import { HEIGHT, WIDTH } from "../../story/timeline";

/** Where the language toggle and story controls sit: over the picture, in the bands above/below it, or beside it. */
export type HudPlacement = "inside" | "bands" | "side";

export interface StageFit {
  /** Frame size in CSS px (always 9:16). */
  width: number;
  height: number;
  /** Composition px → CSS px. */
  scale: number;
  /** Free space above/below and beside the frame (each side), in CSS px. */
  bandY: number;
  bandX: number;
  hud: HudPlacement;
}

/**
 * Fits the 9:16 frame into the room available. `room` is the stable height (the small viewport: what is left when the
 * browser's toolbars are showing), so the frame never rescales while a phone's address bar slides in and out;
 * `stage` is the real visible box, which decides how much band there is around the frame for the controls.
 */
export const fitStage = (room: { w: number; h: number }, stage: { w: number; h: number }): StageFit => {
  const width = Math.max(1, Math.floor(Math.min(room.w, (room.h * WIDTH) / HEIGHT)));
  const height = (width * HEIGHT) / WIDTH;
  const bandY = Math.max(0, (stage.h - height) / 2);
  const bandX = Math.max(0, (stage.w - width) / 2);
  // where the controls go is decided from the stable room (so they never hop between places as a toolbar slides);
  // they are max(44px, 10.4% of the frame) tall, and about 40% of the frame wide at their widest
  const controlH = Math.max(44, width * 0.104);
  const roomBandY = (room.h - height) / 2;
  const roomBandX = (room.w - width) / 2;
  const hud: HudPlacement =
    roomBandY >= controlH + 12 ? "bands" : roomBandX >= Math.max(190, width * 0.4) + 24 ? "side" : "inside";
  return { width, height, scale: width / WIDTH, bandY, bandX, hud };
};

/**
 * Lays out the stage from a ResizeObserver, writing CSS variables straight onto the stage element. The observer runs
 * after layout and before paint, so the frame, the scaled composition and the controls all change in the same painted
 * frame as the viewport. (The Player's own scaling goes through React state, a frame late, which showed a cropped
 * picture for a frame on every resize.) Nothing here re-renders React.
 */
export const useStageLayout = (stageRef: RefObject<HTMLElement | null>, roomRef: RefObject<HTMLElement | null>) => {
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const room = roomRef.current;
    if (!stage || !room) return;
    let last = "";
    const apply = () => {
      const s = stage.getBoundingClientRect();
      const r = room.getBoundingClientRect();
      const cs = getComputedStyle(stage);
      const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const fit = fitStage({ w: r.width, h: r.height }, { w: s.width - padX, h: s.height - padY });
      const key = `${fit.width}|${fit.bandY.toFixed(1)}|${fit.bandX.toFixed(1)}|${fit.hud}`;
      if (key === last) return;
      last = key;
      stage.style.setProperty("--frame-w", `${fit.width}px`);
      stage.style.setProperty("--stage-scale", String(fit.scale));
      stage.style.setProperty("--band-y", `${fit.bandY}px`);
      stage.style.setProperty("--band-x", `${fit.bandX}px`);
      stage.dataset.hud = fit.hud;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(stage);
    ro.observe(room);
    return () => ro.disconnect();
  }, [stageRef, roomRef]);
};

