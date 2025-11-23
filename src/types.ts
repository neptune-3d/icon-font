import type { IconFontGlyph } from "./IconFontGlyph";
import type { IconPath } from "./IconPath";

export type MoveCommand = { type: "M"; x: number; y: number };

export type LineCommand = { type: "L"; x: number; y: number };

export type HCommand = { type: "H"; x: number };

export type VCommand = { type: "V"; y: number };

export type QuadCommand = {
  type: "Q";
  x1: number;
  y1: number;
  x: number;
  y: number;
};

export type CubicCommand = {
  type: "C";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x: number;
  y: number;
};

export type SmoothQuadCommand = { type: "T"; x: number; y: number };

export type SmoothCubicCommand = {
  type: "S";
  x2: number;
  y2: number;
  x: number;
  y: number;
};

export type CloseCommand = { type: "Z" };

export type IconPathCommand =
  | MoveCommand
  | LineCommand
  | HCommand
  | VCommand
  | QuadCommand
  | CubicCommand
  | SmoothQuadCommand
  | SmoothCubicCommand
  | CloseCommand;

export type OpenTypeCommand =
  | MoveCommand
  | LineCommand
  | QuadCommand
  | CubicCommand
  | CloseCommand;

export type Corner =
  | { kind: "sharp" }
  | { kind: "rounded"; rx: number; ry: number }
  | { kind: "chamfer"; rx: number; ry: number };

export type IconPathBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type Point = { x: number; y: number };

export type ScaleFactor = {
  /** horizontal scale factor */
  x: number;
  /** optional vertical scale factor (defaults to x) */
  y?: number;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
  ry?: number;
  corners?: {
    tl?: Corner;
    tr?: Corner;
    br?: Corner;
    bl?: Corner;
  };
};

/**
 * Options for constructing an IconFont.
 *
 * Includes both required metadata (familyName, prefix, icons)
 * and optional OpenType.js Font properties.
 */
export type IconFontOptions = {
  familyName: string; // Font family name
  /** CSS class prefix */
  prefix: string;
  icons: IconFontGlyph[];
  /** Default: 1000 */
  unitsPerEm?: number;
  /** Default: 800 */
  ascender?: number;
  /** Default: -200 */
  descender?: number;
  /** Default: "Regular" */
  styleName?: string;
  copyright?: string;
  trademark?: string;
  manufacturer?: string;
  designer?: string;
  designerURL?: string;
  manufacturerURL?: string;
  version?: string;
  description?: string;
  license?: string;
  licenseURL?: string;
};

/**
 * Options for constructing an IconFontGlyph.
 *
 * Encapsulates the glyph’s identity, Unicode code point,
 * and vector outline path.
 */
export type IconFontGlyphOptions = {
  /** Human‑readable name of the glyph (used in CSS class names). */
  name: string;
  /** Unicode code point assigned to this glyph. */
  unicode: number;
  /** Vector outline path describing the glyph shape. */
  path: IconPath;
  /** Optional advance width override (defaults to 1000). */
  advanceWidth?: number;
  /** Optional left side bearing override (defaults to 0). */
  leftSideBearing?: number;
  /** Optional descriptive metadata (e.g. category or tags). */
  description?: string;
};
