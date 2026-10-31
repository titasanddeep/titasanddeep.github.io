const cache = new Map<string, HTMLImageElement>();

/** One cached image element per URL (shared by the loader, the canvas renderer and the render gate). */
export const artImage = (url: string): HTMLImageElement => {
  let img = cache.get(url);
  if (!img) {
    img = new Image();
    img.decoding = "async";
    img.src = url;
    cache.set(url, img);
  }
  return img;
};

/** True once the image has loaded and has pixels to draw. */
export const imageReady = (img: HTMLImageElement): boolean => img.complete && img.naturalWidth > 0;

/** Resolves when the image is loaded and decoded (never rejects: a missing image just stays unready). */
export const whenDecoded = (img: HTMLImageElement): Promise<void> =>
  (typeof img.decode === "function" ? img.decode() : Promise.resolve()).catch(() => undefined);
