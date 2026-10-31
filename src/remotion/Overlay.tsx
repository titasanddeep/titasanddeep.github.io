import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type SyntheticEvent } from "react";
import type { Lang } from "../content/translations";
import { FONT_BN_UI, FONT_EN } from "../render/fontStacks";
import type { FrameOutput } from "../scene/frame";
import type { HotspotAction, OverlayItem } from "../render/overlay";
import { TEXT_STYLES, textStyle } from "../render/textStyles";

interface Props {
  output: Pick<FrameOutput, "overlay">;
  lang: Lang;
  interactive: boolean;
  reducedMotion?: boolean;
  onActivate?: (action: HotspotAction, event: SyntheticEvent) => void;
}

type Kind = OverlayItem["kind"];

const UNITLESS = new Set(["fontWeight", "lineHeight", "opacity", "zIndex", "flex"]);
const kebab = (s: string): string => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** CSSProperties → a cssText string (numbers get px except unitless properties). */
const cssText = (css: CSSProperties): string =>
  Object.entries(css)
    .map(([k, v]) => `${kebab(k)}:${typeof v === "number" && !UNITLESS.has(k) ? `${v}px` : v}`)
    .join(";");

/** Every overlay element is placed from the frame origin and moved by transform only. */
const BASE_ABSOLUTE: CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  margin: 0,
  transformOrigin: "0 0",
  visibility: "hidden",
  pointerEvents: "none",
  fontSynthesis: "none",
};
const BASE_TEXT = cssText({ ...BASE_ABSOLUTE, width: "max-content", whiteSpace: "nowrap" });
const BASE_LINK = cssText({ ...BASE_ABSOLUTE, width: "max-content", cursor: "pointer", WebkitTapHighlightColor: "transparent" });

const HOTSPOT_CSS = `
@keyframes hs-pulse { 0% { transform: scale(.72); opacity: .95 } 100% { transform: scale(1.18); opacity: 0 } }
.hs-ring { opacity: .6 }
.hs-wrap[data-on="1"] .hs-ring { animation: hs-pulse 2.2s ease-out infinite }
.hs-wrap[data-reduced="1"] .hs-ring { animation: none !important; opacity: .6 }
.hs-btn:focus-visible { outline: 6px solid #f8ecd2; outline-offset: 6px }
.hs-btn:hover .hs-core { background: rgba(255,244,214,.34) }
.dt-map { transition: transform .18s ease, background-color .18s ease }
.dt-map:hover { background: #8f2433 !important; margin-top: -4px }
.dt-map:focus-visible { outline: 6px solid #c49a52; outline-offset: 8px }
`;

/** Last value written per element and property, so a frame writes only what changed. */
const lastWritten = new WeakMap<HTMLElement, Record<string, string>>();
const write = (el: HTMLElement, key: string, value: string, apply: () => void): void => {
  let rec = lastWritten.get(el);
  if (!rec) {
    rec = {};
    lastWritten.set(el, rec);
  }
  if (rec[key] === value) return;
  rec[key] = value;
  apply();
};
const writeStyle = (el: HTMLElement, prop: "transform" | "opacity" | "visibility" | "clipPath" | "textShadow" | "pointerEvents" | "width" | "height", value: string): void =>
  write(el, prop, value, () => {
    el.style[prop] = value;
  });
const writeText = (el: HTMLElement, value: string): void =>
  write(el, "text", value, () => {
    el.textContent = value;
  });

const n = (v: number): string => (Math.abs(v) < 1e-6 ? "0" : v.toFixed(3));
const ANCHOR_X = { left: "0%", center: "-50%", right: "-100%" } as const;

const applyText = (el: HTMLElement, item: Extract<OverlayItem, { kind: "text" }>, lang: Lang): void => {
  const styleKey = `${item.style}/${lang}`;
  write(el, "style", styleKey, () => {
    el.style.cssText = BASE_TEXT + ";" + cssText(textStyle(item.style, lang));
    lastWritten.set(el, { style: styleKey });
  });
  writeText(el, item.text);
  const reveal = item.reveal;
  const hidden = item.opacity <= 0.002 || (reveal !== undefined && reveal <= 0);
  writeStyle(el, "visibility", hidden ? "hidden" : "visible");
  if (hidden) return;
  const m = item.m ?? [1, 0, 0, 1, 0, 0];
  writeStyle(
    el,
    "transform",
    `matrix(${m.map(n).join(",")}) translate(${n(item.x)}px,${n(item.y)}px) translate(${ANCHOR_X[item.anchor]},-50%)`,
  );
  writeStyle(el, "opacity", n(item.opacity));
  const p = reveal === undefined ? 1 : Math.min(1, reveal);
  if (reveal !== undefined) {
    const edge = p * 120 - 10; // % of the width revealed
    writeStyle(el, "clipPath", p >= 1 ? "none" : `inset(-20% ${Math.max(0, 100 - edge).toFixed(2)}% -20% 0)`);
  }
  if (item.glow !== undefined) {
    const g = Math.max(0, Math.min(1, item.glow));
    writeStyle(el, "textShadow", g > 0 ? `0 0 ${(30 * g).toFixed(2)}px rgba(233,201,126,${(0.9 * g).toFixed(3)})` : "none");
  } else if (TEXT_STYLES[item.style]?.glow) {
    const glowA = Math.max(0, 1 - Math.abs(p - 0.55) * 2.2);
    writeStyle(el, "textShadow", `0 0 ${(24 + glowA * 28).toFixed(1)}px rgba(233,201,126,${(0.15 + glowA * 0.7).toFixed(2)})`);
  }
};

const applyHotspot = (el: HTMLElement, item: Extract<OverlayItem, { kind: "hotspot" }>, interactive: boolean): void => {
  const on = item.visible && interactive;
  writeStyle(el, "visibility", on ? "visible" : "hidden");
  writeStyle(el, "pointerEvents", on ? "auto" : "none");
  write(el, "on", on ? "1" : "0", () => {
    el.dataset.on = on ? "1" : "0";
  });
  if (!on) return;
  const s = item.size;
  writeStyle(el, "width", `${s}px`);
  writeStyle(el, "height", `${s}px`);
  writeStyle(el, "transform", `translate(${n(item.x - s / 2)}px,${n(item.y - s / 2)}px)`);
  const button = el.firstElementChild as HTMLElement;
  const core = button.lastElementChild as HTMLElement;
  const label = el.lastElementChild as HTMLElement;
  write(el, "aria", item.ariaLabel, () => button.setAttribute("aria-label", item.ariaLabel));
  write(el, "core", String(s), () => {
    core.style.inset = `${s * 0.22}px`;
  });
  writeText(label, item.label);
  write(el, "pos", `${item.labelPosition}/${s}`, () => {
    label.style.top = item.labelPosition === "below" ? `${s + 6}px` : "auto";
    label.style.bottom = item.labelPosition === "above" ? `${s + 6}px` : "auto";
  });
};

const applyLink = (el: HTMLElement, item: Extract<OverlayItem, { kind: "link" }>, lang: Lang, interactive: boolean): void => {
  const styleKey = `${item.style}/${lang}`;
  write(el, "style", styleKey, () => {
    el.style.cssText = BASE_LINK + ";" + cssText(textStyle(item.style, lang));
    lastWritten.set(el, { style: styleKey });
  });
  const on = item.visible && item.opacity > 0.002;
  writeStyle(el, "visibility", on ? "visible" : "hidden");
  writeStyle(el, "pointerEvents", on && interactive ? "auto" : "none");
  if (!on) return;
  write(el, "href", interactive ? item.href : "", () => {
    if (interactive) el.setAttribute("href", item.href);
    else el.removeAttribute("href");
  });
  writeText(el.lastElementChild as HTMLElement, item.text);
  writeStyle(el, "transform", `translate(${n(item.x)}px,${n(item.y)}px) translate(-50%,-50%)`);
  writeStyle(el, "opacity", n(item.opacity));
};

/** A map pin built from two spans (the composition holds no svg or img). */
const Pin = () => (
  <span aria-hidden="true" style={{ position: "relative", display: "inline-block", width: 48, height: 55, flex: "none" }}>
    <span
      style={{
        position: "absolute",
        left: 6,
        width: 36,
        height: 36,
        background: "#f8ecd2",
        borderRadius: "50% 50% 50% 0",
        transform: "rotate(-45deg)",
        transformOrigin: "50% 50%",
        top: 8,
      }}
    />
    <span style={{ position: "absolute", left: 16, top: 18, width: 16, height: 16, borderRadius: "50%", background: "#781f2b" }} />
  </span>
);

const idsOf = (items: readonly OverlayItem[]): [string, Kind][] => items.map((i) => [i.id, i.kind]);

/**
 * The text and tap targets over the picture: ONE element per overlay id, mounted once and never remounted. Per-frame
 * values (transform, opacity, reveal clip, text) are written straight to the DOM in a layout effect, so React never
 * re-diffs the overlay per frame. Only hotspots and the map link receive pointer events.
 */
export const Overlay = ({ output, lang, interactive, reducedMotion = false, onActivate }: Props) => {
  const refs = useRef(new Map<string, HTMLElement>());
  const actions = useRef(new Map<string, HotspotAction>());
  const activate = useRef(onActivate);
  activate.current = onActivate;
  const [ids, setIds] = useState<[string, Kind][]>(() => idsOf(output.overlay));

  const elements = useMemo(
    () =>
      ids.map(([id, kind]) => {
        const setRef = (el: HTMLElement | null) => {
          if (el) refs.current.set(id, el);
          else refs.current.delete(id);
        };
        if (kind === "text") return <div key={id} ref={setRef} data-overlay="text" data-id={id} style={BASE_ABSOLUTE} />;
        if (kind === "link") {
          return (
            <a key={id} ref={setRef} data-overlay="link" data-id={id} className="dt-map" target="_blank" rel="noopener noreferrer" style={BASE_ABSOLUTE}>
              <Pin />
              <span />
            </a>
          );
        }
        return (
          <div key={id} ref={setRef} data-overlay="hotspot" data-id={id} className="hs-wrap" style={BASE_ABSOLUTE}>
            <button
              type="button"
              className="hs-btn"
              onClick={(e) => {
                const action = actions.current.get(id);
                if (action) activate.current?.(action, e);
              }}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "none",
                background: "transparent",
                padding: 0,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span className="hs-ring" style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "5px solid #c49a52" }} />
              <span
                className="hs-core"
                style={{
                  position: "absolute",
                  inset: "22%",
                  borderRadius: "50%",
                  border: "4px solid #f8ecd2",
                  background: "rgba(255,244,214,.18)",
                  boxShadow: "0 0 0 3px rgba(120,31,43,.55)",
                }}
              />
            </button>
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                padding: "14px 34px",
                borderRadius: 60,
                background: "rgba(251,244,230,.96)",
                border: "3px solid #c49a52",
                color: "#781f2b",
                fontFamily: lang === "bn" ? FONT_BN_UI : FONT_EN,
                fontWeight: 600,
                fontSize: lang === "bn" ? 40 : 44,
                whiteSpace: "nowrap",
                pointerEvents: "none",
              }}
            />
          </div>
        );
      }),
    [ids, lang],
  );

  useLayoutEffect(() => {
    let unknown = false;
    for (const item of output.overlay) {
      const el = refs.current.get(item.id);
      if (!el) {
        unknown = true;
        continue;
      }
      if (item.kind === "text") applyText(el, item, lang);
      else if (item.kind === "hotspot") {
        actions.current.set(item.id, item.action);
        el.dataset.reduced = reducedMotion ? "1" : "0";
        applyHotspot(el, item, interactive);
      } else applyLink(el, item, lang, interactive);
    }
    if (unknown) setIds(idsOf(output.overlay));
  }, [output, lang, interactive, reducedMotion]);

  return (
    <div data-overlay-root style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, pointerEvents: "none" }}>
      <style>{HOTSPOT_CSS}</style>
      {elements}
    </div>
  );
};
