/**
 * Asset URL helper. `base` is the public base path of the deployed site (Vite's BASE_URL, "/" in production).
 * Composition code receives it through the `assetBase` input prop (never `import.meta.env`).
 */
export const asset = (base: string, src: string): string => {
  const b = base.endsWith("/") ? base : `${base}/`;
  return `${b}${src.replace(/^\/+/, "")}`;
};

export const AUDIO_PATH = "audio/soundtrack.mp3";
