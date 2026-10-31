/**
 * Scene 1, গায়ে হলুদ: the courtyard as the morning sun comes across it, close on the haldi bowl that came with the tattva
 * (the same turmeric that touched Deep), resting among marigolds; the names rise as the camera pulls back; then Titas in
 * yellow and her mother, who takes up the bowl and touches the haldi to her cheeks, forearms and feet, while other
 * women's hands reach in from beyond the frame; petals, and the ululation as rings of light; and the camera rising to the
 * verandah garlands as the day turns to evening, into the wedding.
 */
import { apply, I, translate } from "../render/mat";
import type { DrawOp, Paint } from "../render/ops";
import type { OverlayItem } from "../render/overlay";
import { bowlMarigolds, holudCast, openingTitle } from "../story/choreography";
import { cameraAlong, cameraMatrix, COURTYARD_HOLUD } from "../story/camera";
import { bump, easeOut, lerp, progress } from "../story/anim";
import { HOLUD, HOTSPOT_SIZE, TITLE } from "../story/layout";
import { BEATS } from "../story/timeline";
import { figureOps } from "./figure";
import type { FrameContext, FrameOutput } from "./frame";
import { faded, sceneFade, sceneLive, visible, wash } from "./kit";
import { spriteOp, spriteOps } from "./sprites";

const B = BEATS.holud;

/** The courtyard in shade before the sun reaches it. */
const SHADE = "rgb(64,58,96)";
/** The band of morning light sweeping across the courtyard, centred at set x `x` (set coordinates). */
const sunBand = (x: number): Paint => ({
  linear: [x - 460, 0, x + 460, 320],
  stops: [
    [0, "rgba(255,226,160,0)"],
    [0.5, "rgba(255,230,170,0.85)"],
    [1, "rgba(255,226,160,0)"],
  ],
});
/** The evening coming on: rose high, amber low (set coordinates, so it moves with the camera). */
const DUSK: Paint = {
  linear: [0, 0, 0, 1920],
  stops: [
    [0, "#6e3458"],
    [0.4, "#c8645a"],
    [1, "#e49a4c"],
  ],
};

export const holud = (beat: number, ctx: FrameContext): FrameOutput => {
  const f = beat;
  const reduced = ctx.reducedMotion;
  const live = sceneLive("holud", f);
  const cam = cameraMatrix(cameraAlong(COURTYARD_HOLUD, Math.max(0, f), reduced));
  const title = openingTitle(live ? f : B.titleOut[1], reduced);

  const overlay: OverlayItem[] = [
    { kind: "text", id: "aw-title", text: ctx.text.title, x: 0, y: 0, anchor: "center", style: "title", opacity: title.opacity, m: translate(540, title.y) },
    { kind: "text", id: "aw-subtitle", text: ctx.text.subtitle, x: 540, y: TITLE.subtitle, anchor: "center", style: "subtitle", opacity: title.subtitle },
  ];
  const bowlAt = apply(cam, { x: HOLUD.bowlRest.x, y: HOLUD.bowlRest.y - 20 });
  overlay.push({
    kind: "hotspot",
    id: "hotspot-holud",
    x: bowlAt.x,
    y: bowlAt.y,
    size: HOTSPOT_SIZE.bowl,
    label: ctx.text.hintBowl,
    ariaLabel: ctx.text.hintBowl,
    labelPosition: "above",
    visible: live && f < B.sunIn[0] + 2 && ctx.interactive && ctx.guided.awaiting === "holud",
    action: "holud",
  });
  if (!live) return { draw: [], overlay };

  const c = holudCast(Math.max(0, f), reduced);
  // in Explore the sun is already in, so the bowl is there to tap
  const sunP = progress(f, B.sunIn, easeOut);
  const sun = ctx.guided.enabled && f < B.sunIn[1] ? 1 : sunP;
  const resting = c.bowl.x === HOLUD.bowlRest.x && c.bowl.y === HOLUD.bowlRest.y;

  const ops: DrawOp[] = [{ kind: "image", art: "courtyard", m: cam, alpha: 1 }];
  if (c.garlands > 0.002) ops.push({ kind: "image", art: "courtyard-garlands", m: cam, alpha: c.garlands });
  ops.push(...spriteOps(bowlMarigolds(), cam));
  if (resting) ops.push(spriteOp(c.bowl, cam));
  ops.push(...figureOps("bride", { ...c.titas, opacity: c.cast }, cam));
  ops.push(...figureOps("mother", { ...c.mother, opacity: c.cast }, cam));
  if (!resting) ops.push(spriteOp(c.bowl, cam));
  ops.push(...spriteOps(c.hands, cam));
  // the morning: shade lifting as a band of sun crosses the courtyard; then the evening coming on as the camera rises
  ops.push(...wash(SHADE, 0.42 * (1 - sun), cam));
  if (!reduced && sun < 1) ops.push(...wash(sunBand(lerp(-560, 1640, sunP)), Math.sin(Math.PI * sunP) * 0.7, cam));
  if (resting) ops.push(spriteOp({ name: "glow", x: HOLUD.bowlRest.x, y: HOLUD.bowlRest.y - 12, scale: 0.55, opacity: 0.25 * sun + 0.55 * bump(f, B.sunIn[0] + 12, B.sunIn[1] + 24) }, cam));
  ops.push(...wash(DUSK, 0.55 * progress(f, B.dusk), cam));
  ops.push(...spriteOps(c.ulu, I));
  return { draw: faded(visible(ops), reduced ? 1 : sceneFade("holud", f)), overlay };
};
