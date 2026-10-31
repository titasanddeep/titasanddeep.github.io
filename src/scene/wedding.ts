/**
 * Scene 2, শুভদৃষ্টি ও মালাবদল, in the ছাদনাতলা: the camera coming down from the night sky as the lamps light round the
 * alpana where Deep waits; Titas carried in on the পিঁড়ি at shoulder height, her face behind two betel leaves, to her
 * place at his right; the first look through her eyes, her hands lowering the leaves to show his face; she garlands him first, then
 * he garlands her (as in the groom's film); a tableau in the ring of lamps; and the petal that becomes the card's ornament.
 */
import { apply, I, mul, scale, translate, type Mat } from "../render/mat";
import type { DrawOp } from "../render/ops";
import type { OverlayItem } from "../render/overlay";
import { closingAt, frontFigure, garlandField, lampRing, weddingCast, type Piri } from "../story/choreography";
import { cameraAlong, cameraMatrix, WEDDING_SHOTS } from "../story/camera";
import { progress } from "../story/anim";
import { CHHADNA, GAZE_GLOW, HOTSPOT_SIZE, LAMP_RING, ORNAMENT_POS, ORNAMENT_SCALE, RING_GLOW } from "../story/layout";
import { figurePoints, type FigureProps } from "../story/rig";
import { BEATS, SCENE_BEATS, sceneDuration } from "../story/timeline";
import { figureOps } from "./figure";
import type { FrameContext, FrameOutput } from "./frame";
import { invitationCard } from "./invitation";
import { faded, glowDisc, sceneFade, sceneLive, visible, wash } from "./kit";
import { emblemOps } from "./shapes/emblem";
import { spriteOp, spriteOps } from "./sprites";

const B = BEATS.wedding;
const LENGTH = sceneDuration("wedding");
/** Size of one garland flower (px). */
const GARLAND_FLOWER = 22 * 0.88;
/** The edge of her red veil at the corner of her view (screen px). */
const VEIL_EDGE = "M-40 1960C40 1700 120 1560 260 1480C330 1440 360 1520 300 1600C220 1700 180 1820 200 1960Z";

/** The পিঁড়ি, its bearers below it (backlit) and Titas seated on it. */
const piriOps = (piri: Piri, titas: FigureProps, cam: Mat): DrawOp[] => {
  const k = titas.scale ?? 1;
  const top = piri.floor - piri.lift;
  // the bearers stand on the floor below the plank (their figures are 440 tall), crouching as it is lowered
  const kb = Math.max(0.5, (piri.lift - 26 * k) / 440);
  return [
    { kind: "image", art: "bearers", m: mul(cam, mul(translate(piri.x, top + 26 * k), scale(kb))), alpha: 1 },
    ...figureOps("bride", titas, cam),
    { kind: "image", art: "piri", m: mul(cam, mul(translate(piri.x, top), scale(k))), alpha: 1 },
  ];
};

export const wedding = (beat: number, ctx: FrameContext): FrameOutput => {
  const f = beat;
  const reduced = ctx.reducedMotion;
  const live = sceneLive("wedding", f);
  const c = weddingCast(Math.max(0, f), reduced);
  const cam = cameraMatrix(cameraAlong(WEDDING_SHOTS, Math.max(0, f), reduced));
  const close = closingAt(live ? f : 0, reduced, LENGTH);
  const showCard = live && close.cardVisible;
  const card = invitationCard(0, { top: close.cardTop, border: close.edge, idPrefix: "card-w", m: cam, visible: showCard }, ctx);

  const T = figurePoints("bride", c.titas);
  const leavesAt = apply(cam, { x: T.mouth.x, y: T.mouth.y - 30 });
  const ornamentAt = apply(cam, ORNAMENT_POS);
  const overlay: OverlayItem[] = [
    ...card.overlay,
    {
      kind: "hotspot",
      id: "hotspot-wedding",
      x: leavesAt.x,
      y: leavesAt.y,
      size: HOTSPOT_SIZE.leaves,
      label: ctx.text.hintLeaves,
      ariaLabel: ctx.text.hintLeaves,
      labelPosition: "below",
      visible: live && f >= B.piriIn[1] - 2 && f < B.lower[0] + 4 && ctx.interactive && ctx.guided.awaiting === "wedding",
      action: "wedding",
    },
    {
      kind: "hotspot",
      id: "hotspot-invitation",
      x: ornamentAt.x,
      y: ornamentAt.y,
      size: HOTSPOT_SIZE.ornament * cam[0],
      label: ctx.text.hintOrnament,
      ariaLabel: ctx.text.hintOrnament,
      labelPosition: "below",
      visible: live && f >= LENGTH - 2 && f < LENGTH && ctx.interactive && ctx.guided.awaiting === "invitation",
      action: "invitation",
    },
  ];
  if (!live) return { draw: [], overlay };

  const ops: DrawOp[] = [{ kind: "image", art: "chhadnatala", m: cam, alpha: 1 }];
  const lit = progress(f, B.lampsIn);
  ops.push(...glowDisc(RING_GLOW.x, RING_GLOW.y, RING_GLOW.r, 0.32 * lit + 0.25 * c.gaze, cam));
  const ring = lampRing(f, f + SCENE_BEATS.wedding.start);
  const back = ring.filter((_, i) => LAMP_RING[Math.floor(i / 3)].y < CHHADNA.cy);
  const front = ring.filter((_, i) => LAMP_RING[Math.floor(i / 3)].y >= CHHADNA.cy);
  ops.push(...spriteOps(back, cam));

  // the couple: she is carried in to his right; at rest she sits there, and whoever garlands is drawn in front
  const groom = figureOps("groom", c.groom, cam);
  const piri = c.pov ? [] : piriOps(c.piri, c.titas, cam);
  const resting = f >= B.lower[1];
  if (resting) {
    const [bearers, ...rest] = piri;
    const her = rest;
    ops.push(...(bearers ? [bearers] : []));
    ops.push(...(frontFigure(f) === "bride" ? [...groom, ...her] : [...her, ...groom]));
  } else ops.push(...piri, ...groom);

  ops.push(...spriteOps(garlandField(c.garlands, GARLAND_FLOWER), cam));
  ops.push(...spriteOps(front, cam));
  ops.push(...glowDisc(GAZE_GLOW.x, GAZE_GLOW.y, GAZE_GLOW.r, c.gaze, cam));
  if (c.pov) ops.push(...glowDisc(540, 1020, 220, 0.5 * progress(f, [B.reveal[1] - 14, B.reveal[1] + 6]), cam));
  ops.push(...wash("rgb(16,8,10)", 0.25 * progress(f, [B.tableau[0], LENGTH]), I));
  // the closing: the petal crosses, becomes the ornament, and the card's edge rises (as in the groom's film)
  ops.push(spriteOp({ name: "petal-marigold", x: close.petal.x, y: close.petal.y, rot: close.petal.rot, scale: close.petalScale, opacity: close.petalOpacity }, cam));
  if (showCard) {
    ops.push(...card.draw);
    ops.push(...emblemOps(ORNAMENT_POS.x, ORNAMENT_POS.y, ORNAMENT_SCALE * close.ornamentGrow, close.ornamentOpacity, cam));
  }
  ops.push({ kind: "image", art: "chhadnatala-front", m: mul(cam, translate(0, 40 * progress(f, [LENGTH - 50, LENGTH + 20]))), alpha: 1 - progress(f, [LENGTH - 50, LENGTH + 10]) * 0.9 });
  // her view: the edge of her veil; the betel leaves over his face, in her own hands, lowering away from it
  if (c.pov) {
    ops.push({ kind: "path", d: VEIL_EDGE, m: I, alpha: 0.92, fill: { linear: [0, 1480, 300, 1960], stops: [[0, "#c8313f"], [1, "#6e0c1a"]] }, stroke: { paint: "#d2a74e", width: 10 } });
    ops.push(...spriteOps(c.leaves, I), ...spriteOps(c.hands, I));
  }
  return { draw: faded(visible(ops), reduced ? 1 : sceneFade("wedding", f)), overlay };
};
