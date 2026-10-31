import type { SceneId } from "../story/timeline";
import type { Mat } from "./mat";

/** Keys of TEXT_STYLES in src/render/textStyles.ts. */
export type TextStyleId = string;
/** A hotspot starts (or, mid-scene, continues into) the scene of the same name. */
export type HotspotAction = SceneId;

export type OverlayItem =
  /**
   * A line of text; the box is sized to its content. (x, y) is a point in LOCAL coordinates under `m` (default
   * identity = frame coordinates): x is the left edge / centre / right edge according to `anchor`, y is the vertical
   * centre of the text's line box. `reveal` wipes the text in left to right (0..1; undefined or 1 = all shown).
   */
  | {
      kind: "text";
      id: string;
      text: string;
      x: number;
      y: number;
      anchor: "center" | "left" | "right";
      style: TextStyleId;
      opacity: number;
      m?: Mat;
      reveal?: number;
      /** 0..1 gold glow (the card names' shimmer): text-shadow 0 0 30g px rgba(233,201,126,.9g). */
      glow?: number;
    }
  /** A tap target (guided hotspot). Centred on (x, y), `size` px across. Only these receive pointer events. */
  | {
      kind: "hotspot";
      id: string;
      x: number;
      y: number;
      size: number;
      label: string;
      ariaLabel: string;
      labelPosition: "above" | "below";
      visible: boolean;
      action: HotspotAction;
    }
  /** The map button: a link opening `href` in a new tab, centred on (x, y). */
  | { kind: "link"; id: string; href: string; text: string; x: number; y: number; style: TextStyleId; opacity: number; visible: boolean };
