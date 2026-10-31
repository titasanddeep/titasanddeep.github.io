/**
 * Loads everything the story needs before the website starts: every webfont face, every baked image (fetched AND
 * decoded, so nothing pops in mid-story) and the soundtrack. Progress is weighted by size. A missing or failing
 * soundtrack is ignored: the story works without it.
 */
import { artImage } from "../../render/images";

export interface LoadItem {
  id: string;
  kind: "font" | "image" | "audio";
  /** URL for images/audio; CSS font shorthand for fonts. */
  src: string;
  /** Relative cost, in bytes (approximate for fonts). */
  weight: number;
  /** Failure is tolerated (the audio). */
  optional?: boolean;
}

/** Weighted progress 0..1 given each item's own progress (0..1). Pure, for tests. */
export const weightedProgress = (items: readonly LoadItem[], done: ReadonlyMap<string, number>): number => {
  const total = items.reduce((n, it) => n + it.weight, 0);
  if (total <= 0) return 1;
  const got = items.reduce((n, it) => n + it.weight * Math.min(1, Math.max(0, done.get(it.id) ?? 0)), 0);
  return got / total;
};

/** Fetches and decodes through the renderer's shared image cache, so the canvas draws these very images. */
const loadImage = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const img = artImage(src);
    img
      .decode()
      .then(() => resolve())
      .catch(() => (img.complete && img.naturalWidth > 0 ? resolve() : reject(new Error(`image ${src}`))));
  });

/** Streams a file so progress is reported by bytes; the response lands in the HTTP cache for later playback. */
const loadStream = async (src: string, onBytes: (fraction: number) => void): Promise<void> => {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`${res.status} ${src}`);
  const total = Number(res.headers.get("content-length")) || 0;
  if (!res.body || !total) {
    await res.arrayBuffer();
    onBytes(1);
    return;
  }
  const reader = res.body.getReader();
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    got += value.byteLength;
    onBytes(Math.min(1, got / total));
  }
  onBytes(1);
};

export interface PreloadOptions {
  fontSample: string;
  /** After this long, stop waiting and start anyway (slow networks): whatever is missing streams in later. */
  timeoutMs?: number;
}

/** Loads all items (6 at a time), reporting overall progress. Resolves when done or on timeout. */
export const preloadAll = (items: readonly LoadItem[], onProgress: (p: number) => void, opts: PreloadOptions): Promise<void> => {
  const done = new Map<string, number>();
  const report = () => onProgress(weightedProgress(items, done));
  const finish = (id: string) => {
    done.set(id, 1);
    report();
  };

  const run = (it: LoadItem): Promise<void> => {
    const p =
      it.kind === "font"
        ? document.fonts.load(it.src, opts.fontSample).then(() => undefined)
        : it.kind === "image"
          ? loadImage(it.src)
          : loadStream(it.src, (f) => {
              done.set(it.id, f);
              report();
            });
    return p.then(
      () => finish(it.id),
      (err) => {
        if (!it.optional) console.warn("Preload failed", err);
        finish(it.id); // never block the guest on one asset
      },
    );
  };

  const queue = [...items];
  const worker = async () => {
    for (let it = queue.shift(); it; it = queue.shift()) await run(it);
  };
  const all = Promise.all(Array.from({ length: 6 }, worker)).then(() => undefined);
  const timeout = new Promise<void>((r) => setTimeout(r, opts.timeoutMs ?? 25000));
  report();
  return Promise.race([all, timeout]);
};
