import { useEffect } from "react";
import { ART, type ArtName } from "../../art/manifest";
import { asset, AUDIO_PATH } from "../../content/assets";
import { ALL_ART } from "../../scene/frame";
import { FONT_FACES, FONT_SAMPLE } from "../lib/fontFaces";
import { preloadAll, type LoadItem } from "../loader/preload";

const HAS_AUDIO = typeof __HAS_AUDIO__ !== "undefined" && __HAS_AUDIO__;
/** The loader stays at least this long, so it never flashes by. */
const MIN_MS = 900;
const FADE_MS = 650;

/** Everything the story needs (fonts, every image any frame can draw, the soundtrack), weighted by size. */
export const loadList = (base: string, hasAudio: boolean, art: readonly ArtName[] = ALL_ART): LoadItem[] => [
  ...FONT_FACES.map((f, i) => ({ id: `font-${i}`, kind: "font" as const, src: f, weight: 45_000 })),
  ...art.map((n) => ({ id: n, kind: "image" as const, src: asset(base, ART[n].src), weight: ART[n].bytes })),
  ...(hasAudio ? [{ id: "audio", kind: "audio" as const, src: asset(base, AUDIO_PATH), weight: 1_000_000, optional: true }] : []),
];

/**
 * Drives the boot screen that index.html paints before any script runs (#boot): it loads every asset, shows real
 * progress, then fades away and hands over to the story. It updates the DOM directly, with no React re-render per tick.
 */
export const Loader = ({ onReady }: { onReady: () => void }) => {
  useEffect(() => {
    const boot = document.getElementById("boot");
    const bar = document.getElementById("boot-bar");
    const pct = document.getElementById("boot-pct");
    const started = performance.now();
    let shown = 0;
    let cancelled = false;
    const set = (p: number) => {
      shown = Math.max(shown, p);
      if (bar) bar.style.transform = `scaleX(${shown.toFixed(4)})`;
      if (pct) pct.textContent = `${Math.round(shown * 100)}%`;
      boot?.setAttribute("aria-valuenow", String(Math.round(shown * 100)));
    };
    preloadAll(loadList(import.meta.env.BASE_URL, HAS_AUDIO), set, { fontSample: FONT_SAMPLE }).then(() => {
      if (cancelled) return;
      set(1);
      const wait = Math.max(0, MIN_MS - (performance.now() - started));
      window.setTimeout(() => {
        if (cancelled) return;
        onReady();
        boot?.classList.add("boot--done");
        window.setTimeout(() => boot?.remove(), FADE_MS + 50);
      }, wait);
    });
    return () => {
      cancelled = true;
    };
  }, [onReady]);
  return null;
};
