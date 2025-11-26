import type {
  CloseCommand,
  CubicCommand,
  LineCommand,
  MoveCommand,
  QuadCommand,
} from "@neptune3d/path";
import type { IconGlyph } from "./IconGlyph";
import type { IconPath } from "./IconPath";

export type OpenTypeCommand =
  | MoveCommand
  | LineCommand
  | QuadCommand
  | CubicCommand
  | CloseCommand;

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
  icons: IconGlyph[];
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
 * Options for constructing an IconGlyph.
 *
 * Encapsulates the glyph’s identity, Unicode code point,
 * and vector outline path.
 */
export type IconGlyphOptions = {
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
