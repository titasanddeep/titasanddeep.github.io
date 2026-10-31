// @vitest-environment jsdom
import { Thumbnail } from "@remotion/player";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FrameOutput } from "../src/scene/frame";
import type { OverlayItem } from "../src/render/overlay";
import { translate } from "../src/render/mat";
import { Overlay } from "../src/remotion/Overlay";
import { StoryCanvas } from "../src/remotion/StoryCanvas";
import { WeddingComposition } from "../src/remotion/WeddingComposition";
import { defaultWeddingProps } from "../src/remotion/props";

vi.mock("../src/remotion/FontGate", () => ({ FontGate: ({ children }: { children: unknown }) => children }));
vi.mock("../src/scene/frame", () => ({
  ALL_ART: [],
  describeFrame: (frame: number) => fake(frame),
}));

/** The same ids on every frame; values vary with the frame. */
const fake = (frame: number): FrameOutput => ({
  draw: [{ kind: "rect", rect: { x: 0, y: 0, w: 10, h: 10 }, m: [1, 0, 0, 1, 0, 0], alpha: 1, fill: "red" }],
  overlay: [
    { kind: "text", id: "title", text: "তিতাস ও দীপ", x: 540, y: 400, anchor: "center", style: "title", opacity: frame > 100 ? 1 : 0, reveal: Math.min(1, frame / 200) },
    { kind: "text", id: "heading", text: "Heading", x: 540, y: 196, anchor: "center", style: "heading-ink", opacity: 1, m: translate(0, frame / 10) },
    { kind: "hotspot", id: "hs", x: 540, y: 1010, size: 330, label: "Tap", ariaLabel: "Open", labelPosition: "below", visible: frame > 50, action: "holud" },
    { kind: "link", id: "map", href: "https://maps.example/x", text: "View", x: 540, y: 1500, style: "map-link", opacity: 1, visible: frame > 2000 },
  ] satisfies OverlayItem[],
});

// jsdom has no 2D context: report none (StoryCanvas guards for it)
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;

afterEach(cleanup);

const autoElements = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>("*")].filter((e) => e.style.pointerEvents === "auto");

describe("StoryCanvas + Overlay", () => {
  it("is one canvas, no img or svg, constant overlay set, pointer events only on hotspot/link", () => {
    const counts: number[] = [];
    const view = (frame: number) => {
      const out = fake(frame);
      return (
        <div>
          <StoryCanvas output={out} assetBase="/" interactive />
          <Overlay output={out} lang="bn" interactive />
        </div>
      );
    };
    const { container, rerender } = render(view(0));
    for (const f of [0, 60, 150, 2500]) {
      rerender(view(f));
      expect(container.querySelectorAll("canvas")).toHaveLength(1);
      expect(container.querySelectorAll("img, svg")).toHaveLength(0);
      counts.push(container.querySelectorAll("[data-overlay]").length);
      for (const e of autoElements(container)) {
        expect(e.closest("[data-overlay]")?.getAttribute("data-overlay")).toMatch(/hotspot|link/);
      }
    }
    expect(new Set(counts)).toEqual(new Set([4]));
    const c = container.querySelector("canvas")!;
    expect(c.width).toBe(1080);
    expect(c.style.height).toBe("1920px");
  });

  it("writes text values straight to the DOM and keeps elements mounted", () => {
    const { container, rerender } = render(<Overlay output={fake(0)} lang="en" interactive />);
    const title = container.querySelector<HTMLElement>('[data-id="title"]')!;
    expect(title.style.visibility).toBe("hidden");
    rerender(<Overlay output={fake(120)} lang="en" interactive />);
    expect(container.querySelector('[data-id="title"]')).toBe(title);
    expect(title.style.visibility).toBe("visible");
    expect(title.textContent).toBe("তিতাস ও দীপ");
    expect(title.style.clipPath).toContain("inset(");
    expect(title.style.transform).toContain("translate(540.000px,400.000px)");
    expect(title.style.transform).toContain("translate(-50%,-50%)");
  });

  it("writes the glow as a text-shadow", () => {
    const item = (glow: number): FrameOutput => ({
      draw: [],
      overlay: [{ kind: "text", id: "n", text: "x", x: 0, y: 0, anchor: "left", style: "card-names", opacity: 1, glow }],
    });
    const { container, rerender } = render(<Overlay output={item(0.5)} lang="en" interactive />);
    const el = container.querySelector<HTMLElement>('[data-id="n"]')!;
    expect(el.style.textShadow).toBe("0 0 15.00px rgba(233,201,126,0.450)");
    rerender(<Overlay output={item(0)} lang="en" interactive />);
    expect(el.style.textShadow).toBe("none");
  });

  it("hotspot calls onActivate with its action; link is hidden until visible", () => {
    const onActivate = vi.fn();
    const { container } = render(<Overlay output={fake(100)} lang="bn" interactive onActivate={onActivate} />);
    fireEvent.click(container.querySelector("button")!);
    expect(onActivate).toHaveBeenCalledWith("holud", expect.anything());
    expect(container.querySelector<HTMLElement>('[data-id="map"]')!.style.visibility).toBe("hidden");
    expect(container.querySelector<HTMLElement>('[data-id="hs"]')!.style.pointerEvents).toBe("auto");
  });

  it("link opens in a new tab with its href when visible", () => {
    const { container } = render(<Overlay output={fake(2500)} lang="bn" interactive />);
    const a = container.querySelector<HTMLAnchorElement>('[data-id="map"]')!;
    expect(a.getAttribute("href")).toBe("https://maps.example/x");
    expect(a.target).toBe("_blank");
    expect(a.style.pointerEvents).toBe("auto");
  });
});

describe("WeddingComposition", () => {
  it("renders a single canvas at several frames via Thumbnail", () => {
    for (const f of [0, 300, 7199]) {
      const { container, unmount } = render(
        <Thumbnail
          component={WeddingComposition}
          compositionWidth={1080}
          compositionHeight={1920}
          frameToDisplay={f}
          durationInFrames={7200}
          fps={60}
          inputProps={{ ...defaultWeddingProps, interactive: true }}
          style={{ width: 270 }}
        />,
      );
      expect(container.querySelectorAll("canvas")).toHaveLength(1);
      expect(container.querySelectorAll("img, svg")).toHaveLength(0);
      expect(container.querySelectorAll("[data-overlay]")).toHaveLength(4);
      unmount();
    }
  });
});
