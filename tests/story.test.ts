import { describe, expect, it } from "vitest";
import { t } from "../src/content/translations";
import { wedding } from "../src/content/wedding";
import { describeFrame, type FrameContext } from "../src/scene/frame";
import type { DrawOp } from "../src/render/ops";
import { cameraAlong, COURTYARD_HOLUD, WEDDING_SHOTS } from "../src/story/camera";
import { atmosphereKind, atmosphereSprites, EXCHANGE, holudCast, KIND_SWITCH, petalIntensity, piriAt, weddingCast } from "../src/story/choreography";
import { HOLUD, PIRI } from "../src/story/layout";
import { figurePoints, type FigureProps, type Who } from "../src/story/rig";
import { beatsToFrames, BEATS, LAST_FRAME, SCENE_BEATS, SCENE_ORDER, SCENE_OVERLAP, sceneDuration } from "../src/story/timeline";

const ctx = (reducedMotion = false): FrameContext => ({ lang: "bn", text: t("bn"), wedding, reducedMotion, interactive: false, guided: { enabled: false, awaiting: null } });
const flat = (ops: readonly DrawOp[]): DrawOp[] => ops.flatMap((o) => (o.kind === "group" ? [o, ...flat(o.ops)] : [o]));
const images = (f: number, art: string, reduced = false) => flat(describeFrame(f, ctx(reduced)).draw).filter((o) => o.kind === "image" && o.art === art).length;
const W = (beat: number) => beatsToFrames(SCENE_BEATS.wedding.start + beat);
const range = (a: number, b: number, step = 0.5) => Array.from({ length: Math.floor((b - a) / step) }, (_, i) => a + i * step);

describe("the family's revised outline (spec/story.md §0)", () => {
  it("plays গায়ে হলুদ, then the wedding, then the card, back to back, in about 53 seconds", () => {
    expect(SCENE_ORDER).toEqual(["holud", "wedding", "invitation"]);
    SCENE_ORDER.slice(1).forEach((id, i) => expect(SCENE_BEATS[id].start).toBe(SCENE_BEATS[SCENE_ORDER[i]].end));
    expect(SCENE_BEATS.holud.start).toBe(0);
    expect(SCENE_BEATS.invitation.end).toBe(1590);
  });

  it("keeps each ritual's own order inside its scene", () => {
    const H = BEATS.holud;
    expect(H.title[1]).toBeLessThanOrEqual(H.titleOut[0]); // the names, then the gaye holud
    expect(H.titleOut[1]).toBeLessThanOrEqual(H.coupleIn[0] + 10);
    expect(H.coupleIn[1]).toBeLessThanOrEqual(H.cheek[0]);
    expect(H.cheek[1]).toBeLessThanOrEqual(H.arm[0]); // cheeks, forearms, feet
    expect(H.arm[1]).toBeLessThanOrEqual(H.feet[0]);
    expect(H.feet[1]).toBeLessThanOrEqual(H.rise[0]);
    const WB = BEATS.wedding;
    expect(WB.descend[1]).toBeLessThanOrEqual(WB.piriIn[0] + 10); // he is waiting before she is carried in
    expect(WB.piriIn[1]).toBeLessThanOrEqual(WB.lower[0]);
    expect(WB.piriIn[1]).toBeLessThanOrEqual(WB.leavesDown[0]); // the পিঁড়ি, then শুভদৃষ্টি
    expect(WB.gaze[1]).toBeLessThanOrEqual(WB.exchange[0]); // শুভদৃষ্টি, then মালাবদল
    expect(EXCHANGE.bride.release[1]).toBeLessThanOrEqual(EXCHANGE.groom.lift[0]); // she garlands him first
    expect(EXCHANGE.groom.stepBack[1]).toBeLessThanOrEqual(WB.tableau[0]);
  });

  it("carries her in on the পিঁড়ি straight to her place at his right, never round him (no সাত পাক)", () => {
    for (const reduced of [false, true]) {
      expect(piriAt(BEATS.wedding.piriIn[1], reduced).x).toBeCloseTo(PIRI.rest.x);
      let last = Infinity;
      for (const f of range(0, sceneDuration("wedding"), 1)) {
        const p = piriAt(f, reduced);
        expect(p.x, `beat ${f}`).toBeLessThanOrEqual(last + 1e-9);
        expect(p.x, `beat ${f}`).toBeGreaterThanOrEqual(PIRI.rest.x - 1e-9);
        last = p.x;
      }
    }
    // no counter of seven lamps, and no "seven" in the Explore caption
    expect(t("en").noteWedding).not.toMatch(/seven/i);
    expect(t("bn").noteWedding).not.toMatch(/সাত/);
  });

  it("hides her face behind the betel leaves until the first look; the garlands appear only after it", () => {
    for (const b of [BEATS.wedding.piriIn[0] + 40, BEATS.wedding.piriIn[1], BEATS.wedding.lower[0]]) expect(images(W(b), "paan"), `beat ${b}`).toBe(2);
    for (const b of range(0, BEATS.wedding.gaze[0], 37)) expect(images(W(b), "rose"), `beat ${b}`).toBe(0);
    expect(images(W(BEATS.wedding.exchange[0] + 40), "rose")).toBeGreaterThan(0);
    expect(images(W(BEATS.wedding.exchange[0] + 40), "paan")).toBe(0);
  });

  it("shows the first look through her eyes: her own hands hold the leaves over his face, then lower them out of view", () => {
    const WB = BEATS.wedding;
    const leafTip = (s: { y: number; scale?: number; rot?: number }) => s.y - 118 * (s.scale ?? 1) * Math.cos(((s.rot ?? 0) * Math.PI) / 180);
    for (const reduced of [false, true]) {
      const held = weddingCast(WB.leavesDown[0] + 2, reduced);
      expect(held.pov).toBe(true);
      // the leaves stand over his face (about screen y 850–1040), and her two forearms hold them
      for (const l of held.leaves) {
        expect(l.y).toBeGreaterThan(1040);
        expect(leafTip(l)).toBeLessThan(850);
      }
      expect(held.hands.map((h) => [h.name, h.opacity])).toEqual([
        ["bride-fore-l", 1],
        ["bride-fore-r", 1],
      ]);
      expect(images(W(WB.leavesDown[0] + 2), "bride-fore-r", reduced)).toBe(1);
      // once revealed, leaves and hands are below the frame, and he is seen
      const after = weddingCast(WB.reveal[1] + 2, reduced);
      for (const l of after.leaves) expect(leafTip(l)).toBeGreaterThan(1920);
    }
  });

  it("draws nothing of the rituals left out (spec/story.md §5), nor the tattva trays", () => {
    for (const f of range(0, LAST_FRAME, 97)) {
      for (const op of flat(describeFrame(f, ctx()).draw)) if (op.kind === "image") expect(op.art).not.toMatch(/fire|yajna|sindoor|sampradan|basar|tray|kolshi|bangle|borondala|pond/);
    }
  });

  it("has the haldi bowl on the floor among marigolds from the first frame, then in her mother's hand", () => {
    expect(holudCast(0, false).bowl).toMatchObject({ x: HOLUD.bowlRest.x, y: HOLUD.bowlRest.y });
    const held = holudCast(BEATS.holud.cheek[0], false);
    expect(held.bowl.x).not.toBe(HOLUD.bowlRest.x);
    for (const reduced of [false, true]) expect(images(0, "haldi-bowl", reduced)).toBe(1);
    expect(images(0, "marigold-a")).toBeGreaterThan(0);
  });
});

describe("the turn of the day: holud to wedding", () => {
  it("rises in the day and comes down into the night from the same framing", () => {
    const H = BEATS.holud;
    const top = cameraAlong(COURTYARD_HOLUD, H.rise[1], false);
    expect(cameraAlong(WEDDING_SHOTS, 0, false)).toEqual(top);
    // the holud only goes up as it rises; it holds there under the wedding's fade-in
    let y = Infinity;
    for (const f of range(H.rise[0], sceneDuration("holud") + SCENE_OVERLAP.holud)) {
      const c = cameraAlong(COURTYARD_HOLUD, f, false);
      expect(c.y, `holud beat ${f}`).toBeLessThanOrEqual(y + 1e-9);
      y = c.y;
    }
    // the wedding only comes down while it descends
    y = -Infinity;
    for (const f of range(0, BEATS.wedding.descend[1])) {
      const c = cameraAlong(WEDDING_SHOTS, f, false);
      expect(c.y, `wedding beat ${f}`).toBeGreaterThanOrEqual(y - 1e-9);
      y = c.y;
    }
    // the cross-fade happens up there, over sky and garlands, not over the people
    expect(SCENE_OVERLAP.holud).toBeLessThanOrEqual(BEATS.wedding.descend[1]);
  });

  it("never changes a petal's kind in flight (the switch falls where no petals are in the air)", () => {
    expect(petalIntensity(KIND_SWITCH)).toBe(0);
    for (const b of range(0, SCENE_BEATS.invitation.end, 0.5)) {
      if (atmosphereKind(b) === atmosphereKind(b - 0.5)) continue;
      expect(petalIntensity(b - 0.5), `beat ${b}`).toBe(0);
      expect(petalIntensity(b), `beat ${b}`).toBe(0);
    }
    // petals carry across the cross itself
    expect(atmosphereSprites(SCENE_BEATS.holud.end + SCENE_OVERLAP.holud / 2, false).some((s) => s.name.startsWith("petal") && (s.opacity ?? 0) > 0.1)).toBe(true);
  });
});

describe("one cast, continuous motion", () => {
  /** Largest per-beat movement (px) of a figure's head across a run of beats. */
  const maxStep = (pose: (f: number) => FigureProps, who: Who, from: number, to: number): number => {
    let worst = 0;
    let prev = figurePoints(who, pose(from)).headTop;
    for (const f of range(from + 0.5, to)) {
      const p = figurePoints(who, pose(f)).headTop;
      worst = Math.max(worst, Math.hypot(p.x - prev.x, p.y - prev.y) * 2);
      prev = p;
    }
    return worst;
  };

  it("moves every figure smoothly (no jumps between beats)", () => {
    const end = sceneDuration("wedding") + SCENE_OVERLAP.wedding;
    expect(maxStep((f) => holudCast(f, false).titas, "bride", 0, 580)).toBeLessThan(8);
    expect(maxStep((f) => holudCast(f, false).mother, "mother", 0, 580)).toBeLessThan(12);
    expect(maxStep((f) => weddingCast(f, false).groom, "groom", 0, end)).toBeLessThan(20);
    // carried in at an even walking pace, never faster
    expect(maxStep((f) => weddingCast(f, false).titas, "bride", 0, end)).toBeLessThan(30);
  });

  it("moves the camera smoothly between cuts and never leaves the set", () => {
    const WB = BEATS.wedding;
    const runs = [
      [COURTYARD_HOLUD, 0, sceneDuration("holud") + SCENE_OVERLAP.holud],
      [WEDDING_SHOTS, 0, WB.leavesDown[0]],
      [WEDDING_SHOTS, WB.leavesDown[0], WB.gaze[0]],
      [WEDDING_SHOTS, WB.gaze[0], sceneDuration("wedding") + SCENE_OVERLAP.wedding],
    ] as const;
    for (const [list, a, b] of runs) {
      let prev = cameraAlong(list, a, false);
      for (const f of range(a + 0.5, b)) {
        const c = cameraAlong(list, f, false);
        expect(Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.z)).toBe(true);
        expect(Math.abs(c.x - prev.x) + Math.abs(c.y - prev.y), `beat ${f}`).toBeLessThan(40);
        expect(c.x - 540 / c.z).toBeGreaterThanOrEqual(-0.001);
        expect(c.y - 960 / c.z).toBeGreaterThanOrEqual(-0.001);
        expect(c.y + 960 / c.z).toBeLessThanOrEqual(1920.001);
        prev = c;
      }
    }
  });

  it("draws the groom once and Titas at most once in every frame of the wedding", () => {
    for (const b of range(1, sceneDuration("wedding"), 13)) {
      const ops = flat(describeFrame(W(b), ctx()).draw);
      expect(ops.filter((o) => o.kind === "image" && o.art === "groom-head").length, `beat ${b}`).toBe(1);
      expect(ops.filter((o) => o.kind === "image" && o.art === "bride-head").length, `beat ${b}`).toBeLessThanOrEqual(1);
    }
  });
});
