import { describe, expect, it } from "vitest";
import { initialStoryState, storyReducer, type StoryAction, type StoryState } from "../src/app/state/storyMachine";

const run = (actions: StoryAction[], from: StoryState = initialStoryState) => actions.reduce(storyReducer, from);

describe("storyReducer", () => {
  it("starts on the cover", () => {
    expect(initialStoryState).toEqual({ phase: "intro", mode: null, step: "holud", awaiting: null });
  });

  it("cinematic follows scenes and ends finished", () => {
    let s = run([{ type: "START_CINEMATIC" }]);
    expect(s).toEqual({ phase: "playing", mode: "cinematic", step: "holud", awaiting: null });
    s = run([{ type: "SCENE", scene: "wedding" }], s);
    expect(s.step).toBe("wedding");
    expect(run([{ type: "ENDED" }], s)).toEqual({ phase: "finished", mode: "cinematic", step: "invitation", awaiting: null });
    expect(storyReducer(s, { type: "BOUNDARY", scene: "wedding" })).toBe(s);
  });

  it("guided walks the haldi bowl, the betel leaves, the ornament", () => {
    let s = run([{ type: "START_GUIDED" }]);
    expect(s).toEqual({ phase: "awaiting", mode: "guided", step: "holud", awaiting: "holud" });
    const order = ["holud", "wedding", "invitation"] as const;
    order.forEach((scene, i) => {
      s = storyReducer(s, { type: "ACTIVATE", target: scene });
      expect(s).toEqual({ phase: "playing", mode: "guided", step: scene, awaiting: null });
      s = storyReducer(s, { type: "BOUNDARY", scene });
      if (i < order.length - 1) expect(s).toMatchObject({ phase: "awaiting", awaiting: order[i + 1] });
      else expect(s).toMatchObject({ phase: "finished", awaiting: null });
    });
  });

  it("taps cannot skip ahead or repeat", () => {
    const s = run([{ type: "START_GUIDED" }]);
    expect(storyReducer(s, { type: "ACTIVATE", target: "wedding" })).toBe(s);
    expect(storyReducer(s, { type: "ACTIVATE", target: "invitation" })).toBe(s);
    const playing = storyReducer(s, { type: "ACTIVATE", target: "holud" });
    expect(storyReducer(playing, { type: "ACTIVATE", target: "holud" })).toBe(playing);
    expect(storyReducer(playing, { type: "BOUNDARY", scene: "wedding" })).toBe(playing);
    expect(storyReducer(playing, { type: "SCENE", scene: "wedding" })).toBe(playing);
  });

  it("skip, replay, reset and ignored actions", () => {
    for (const from of [initialStoryState, run([{ type: "START_CINEMATIC" }]), run([{ type: "START_GUIDED" }])]) {
      expect(storyReducer(from, { type: "SKIP" })).toMatchObject({ phase: "finished", step: "invitation", awaiting: null });
    }
    const fin = run([{ type: "SKIP" }]);
    expect(storyReducer(fin, { type: "REPLAY" })).toEqual({ phase: "playing", mode: "cinematic", step: "holud", awaiting: null });
    expect(storyReducer(initialStoryState, { type: "ENDED" })).toBe(initialStoryState);
    expect(storyReducer(initialStoryState, { type: "SCENE", scene: "wedding" })).toBe(initialStoryState);
    expect(storyReducer(fin, { type: "RESET" })).toBe(initialStoryState);
  });
});
