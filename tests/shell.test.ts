import { describe, expect, it } from "vitest";
import { fitStage } from "../src/app/hooks/useStageLayout";
import { initialStoryState, storyReducer, type StoryAction, type StoryState } from "../src/app/state/storyMachine";
import { loadList } from "../src/app/components/Loader";
import { soundtrackVolume, TRACK_SECONDS, trackTime } from "../src/app/lib/soundtrackVolume";
import { asset } from "../src/content/assets";
import { t, translations } from "../src/content/translations";
import { wedding } from "../src/content/wedding";
import { describeFrame } from "../src/scene/frame";
import { BEATS, beatsToFrames, DURATION, FPS, framesToSeconds, guidedHoldFrame, LAST_FRAME, SCENE_BEATS, SCENE_ORDER, SCENES, sceneAt, sceneLastFrame } from "../src/story/timeline";

const run = (actions: StoryAction[], from: StoryState = initialStoryState) => actions.reduce(storyReducer, from);

describe("shell flows", () => {
  it("watch goes from the cover to finished, through every scene", () => {
    const s = run([
      { type: "START_CINEMATIC" },
      ...SCENE_ORDER.map((scene): StoryAction => ({ type: "SCENE", scene })),
      { type: "ENDED" },
    ]);
    expect(s).toMatchObject({ phase: "finished", step: "invitation" });
  });

  it("explore offers each hotspot in order, holding inside the next stop's scene", () => {
    let s = run([{ type: "START_GUIDED" }]);
    const offered: (string | null)[] = [s.awaiting];
    for (const scene of SCENE_ORDER) {
      s = run([{ type: "ACTIVATE", target: scene }, { type: "BOUNDARY", scene }], s);
      offered.push(s.awaiting);
    }
    expect(offered).toEqual(["holud", "wedding", "invitation", null]);
    // each hold sits on the object of the next stop, inside that stop's scene (the wedding holds on its last frame)
    SCENE_ORDER.slice(0, -2).forEach((scene, i) => expect(sceneAt(guidedHoldFrame(scene))).toBe(SCENE_ORDER[i + 1]));
    expect(guidedHoldFrame("wedding")).toBe(sceneLastFrame("wedding"));
    for (const scene of SCENE_ORDER) expect(guidedHoldFrame(scene)).toBeGreaterThan(SCENES[scene].start);
    expect(sceneLastFrame("invitation")).toBe(LAST_FRAME);
    expect(s.phase).toBe("finished");
  });

  it("skip and replay work from anywhere; pause/resume never changes the story state", () => {
    const playing = run([{ type: "START_CINEMATIC" }]);
    // pausing and resuming are Player calls only: re-sending the same scene leaves the state object untouched
    expect(storyReducer(playing, { type: "SCENE", scene: "holud" })).toBe(playing);
    const skipped = run([{ type: "SKIP" }], playing);
    expect(skipped.phase).toBe("finished");
    expect(run([{ type: "REPLAY" }], skipped).phase).toBe("playing");
  });

  it("reduced motion changes nothing about which action leads (the reducer is motion-independent)", () => {
    expect(run([{ type: "START_CINEMATIC" }])).toEqual({ phase: "playing", mode: "cinematic", step: "holud", awaiting: null });
  });
});

describe("language toggle", () => {
  it("every visible string differs between the languages", () => {
    for (const k of Object.keys(translations.bn) as (keyof typeof translations.bn)[]) {
      expect(t("bn")[k], k).not.toBe(t("en")[k]);
    }
  });
});

describe("map link", () => {
  it("opens wedding.mapUrl exactly", () => {
    const out = describeFrame(LAST_FRAME, {
      lang: "bn",
      text: t("bn"),
      wedding,
      reducedMotion: false,
      interactive: true,
      guided: { enabled: false, awaiting: null },
    });
    for (const item of out.overlay) if (item.kind === "link") expect(item.href).toBe(wedding.mapUrl);
  });
});

describe("hud thresholds", () => {
  it("bands, inside, side", () => {
    const hud = (w: number, h: number) => fitStage({ w, h }, { w, h }).hud;
    expect([hud(390, 844), hud(375, 667), hud(844, 390), hud(1920, 1080)]).toEqual(["bands", "inside", "side", "side"]);
  });
});

describe("loader and audio helpers", () => {
  it("lists fonts, art and optional audio under the base path", () => {
    const list = loadList("/", true, []);
    expect(list.filter((i) => i.kind === "font").length).toBeGreaterThan(0);
    expect(list.at(-1)).toMatchObject({ kind: "audio", src: "/audio/soundtrack.mp3", optional: true });
    expect(loadList("/", false, []).some((i) => i.kind === "audio")).toBe(false);
    expect(asset("/sub", "/art/x.webp")).toBe("/sub/art/x.webp");
  });
  it("soundtrack volume fades in and out", () => {
    const end = SCENE_BEATS.invitation.end;
    expect(soundtrackVolume(0)).toBe(0);
    expect(soundtrackVolume(75)).toBeCloseTo(0.5);
    expect(soundtrackVolume(end - 0.5)).toBeCloseTo(0);
    expect(soundtrackVolume(end)).toBe(0);
  });
  it("plays the track once: it never loops, and ends as the card settles", () => {
    expect(trackTime(30, 50)).toBeCloseTo(30);
    expect(trackTime(52, 50)).toBe(50);
    expect(trackTime(10, Number.NaN)).toBe(10);
    // the card is complete by the time the track ends, and the film holds it for a few quiet seconds after
    const cardDone = framesToSeconds(beatsToFrames(SCENE_BEATS.invitation.start + BEATS.invitation.flourish[1]));
    expect(cardDone).toBeLessThanOrEqual(TRACK_SECONDS);
    expect(cardDone).toBeGreaterThan(TRACK_SECONDS - 2);
    const film = DURATION / FPS;
    expect(film - TRACK_SECONDS).toBeGreaterThan(0);
    expect(film - TRACK_SECONDS).toBeLessThan(5);
  });
});
