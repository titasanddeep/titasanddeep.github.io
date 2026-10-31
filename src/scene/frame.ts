/**
 * Everything on screen at one frame, assembled from the scene builders. Paint order (back to front): the paper; the two
 * story scenes in order (a scene keeps drawing through its overlap while the next fades in over it); the headings' gold
 * rules; the invitation; the atmosphere (petals and gold dust). Overlay: every scene's ids, the headings, the card, the
 * Explore caption. The overlay ids are the same on every frame.
 */
import { ART, type ArtName } from "../art/manifest";
import type { Dictionary } from "../content/translations";
import type { WeddingDetails } from "../content/wedding";
import type { DrawOp } from "../render/ops";
import { I } from "../render/mat";
import type { HotspotAction, OverlayItem } from "../render/overlay";
import { atmosphereSprites } from "../story/choreography";
import { CAPTION_Y } from "../story/layout";
import { FRAMES_PER_BEAT, SCENE_BEATS } from "../story/timeline";
import { holud } from "./holud";
import { invitationScene } from "./invitation";
import { spriteOps } from "./sprites";
import { headings } from "./text";
import { wedding } from "./wedding";

export interface FrameContext {
  lang: "bn" | "en";
  /** The dictionary for `lang` (src/content/translations.ts). */
  text: Dictionary;
  /** src/content/wedding.ts */
  wedding: WeddingDetails;
  reducedMotion: boolean;
  /** Website (true) vs video render (false). */
  interactive: boolean;
  guided: { enabled: boolean; awaiting: HotspotAction | null };
}

export interface FrameOutput {
  draw: DrawOp[];
  overlay: OverlayItem[];
}

/** The Explore caption for each stop: the short line about what the story is holding on (spec/story.md §4). */
const NOTE: Record<HotspotAction, keyof Dictionary | null> = {
  holud: "noteHolud",
  wedding: "noteWedding",
  invitation: null,
};

/** Everything on screen at a 60 FPS frame (0…LAST_FRAME). Pure. */
export const describeFrame = (frame: number, ctx: FrameContext): FrameOutput => {
  const beat = frame / FRAMES_PER_BEAT;
  const at = (id: keyof typeof SCENE_BEATS) => beat - SCENE_BEATS[id].start;
  const scenes = [holud(at("holud"), ctx), wedding(at("wedding"), ctx)];
  const titles = headings(beat, ctx);
  const invite = invitationScene(at("invitation"), ctx);

  const draw: DrawOp[] = [{ kind: "image", art: "paper", m: I, alpha: 1 }];
  for (const s of scenes) draw.push(...s.draw);
  draw.push(...titles.draw);
  draw.push(...invite.draw);
  draw.push(...spriteOps(atmosphereSprites(beat, ctx.reducedMotion)));

  const overlay: OverlayItem[] = [...scenes.flatMap((s) => s.overlay), ...titles.overlay, ...invite.overlay];
  // the Explore caption, placed away from the hotspot it explains
  const awaiting = ctx.guided.awaiting;
  const key = awaiting ? NOTE[awaiting] : null;
  const spot = overlay.find((o) => o.kind === "hotspot" && o.visible);
  const low = spot !== undefined && spot.kind === "hotspot" && spot.y > 1250;
  overlay.push({
    kind: "text",
    id: "guide-caption",
    text: key ? ctx.text[key] : "",
    x: 540,
    y: low ? CAPTION_Y.high : CAPTION_Y.low,
    anchor: "center",
    style: "caption",
    opacity: ctx.interactive && key && spot ? 1 : 0,
  });
  return { draw, overlay };
};

/** Every image any frame can draw (the loader preloads these; renders wait for them). */
export const ALL_ART: readonly ArtName[] = Object.keys(ART) as ArtName[];
