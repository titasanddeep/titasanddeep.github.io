import { staticFile } from "remotion";
import { asset } from "../content/assets";

/** Resolves a public-folder path for either the website (assetBase) or Remotion (staticFile). */
export const resolveAsset = (src: string, assetBase: string | null): string =>
  assetBase === null ? staticFile(src) : asset(assetBase, src);
