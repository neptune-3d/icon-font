import { Glyph } from "opentype.js";
import type { IconPath } from "./IconPath";
import type { IconFontGlyphOptions } from "./types";

/**
 * Represents a single glyph (icon) in a custom icon font.
 *
 * An IconFontGlyph encapsulates the metadata and vector path for an icon,
 * providing utilities to export it into different formats:
 *
 * - As an OpenType.js Glyph, suitable for inclusion in a generated font.
 * - As a CSS rule, enabling usage in web projects via pseudo-elements.
 *
 * Each IconFontGlyph stores:
 * - `name`: the human-readable identifier (used in CSS class names).
 * - `unicode`: the code point assigned to the glyph.
 * - `path`: the vector outline (IconPath) describing the shape.
 * - `advanceWidth`: the horizontal advance width (defaults to 1000, matching unitsPerEm).
 * - `leftSideBearing`: optional left bearing offset (defaults to 0 if not provided).
 * - `description`: optional descriptive metadata (e.g. category or notes).
 *
 * Typical usage:
 *   const icon = new IconFontGlyph({
 *     name: "home",
 *     unicode: 0xe001,
 *     path,
 *     advanceWidth: 1000,
 *     leftSideBearing: 0,
 *     description: "Home icon glyph"
 *   });
 *
 *   const glyph = icon.toOpenTypeGlyph();
 *   const css   = icon.toCssRule("icon");
 *
 * This class acts as a bridge between design-time icon paths
 * and runtime font/CSS representations, while supporting
 * per-glyph spacing and metadata overrides.
 */
export class IconFontGlyph {
  constructor(options: IconFontGlyphOptions) {
    this._name = options.name;
    this._unicode = options.unicode;
    this._path = options.path;
    this._advanceWidth = options.advanceWidth ?? 1000;
    this._leftSideBearing = options.leftSideBearing;
    this._description = options.description;
  }

  protected _name: string;
  protected _unicode: number;
  protected _path: IconPath;
  protected _advanceWidth: number;
  protected _leftSideBearing?: number;
  protected _description?: string;

  get name() {
    return this._name;
  }

  get unicode() {
    return this._unicode;
  }

  get path() {
    return this._path;
  }

  /**
   * Convert this icon into an OpenType.js Glyph.
   *
   * @param ascender     Ascender height (e.g. 800)
   * @param descender    Descender depth (e.g. -200)
   * @returns            A Glyph object ready for OpenType.js
   */
  toOpenTypeGlyph(ascender: number = 800, descender: number = -200): Glyph {
    const otPath = this.path.toOpenTypePath(ascender, descender);
    return new Glyph({
      name: this.name,
      unicode: this.unicode,
      advanceWidth: this._advanceWidth,
      path: otPath,
      leftSideBearing: this._leftSideBearing,
    });
  }

  /**
   * Generate a CSS class rule for this glyph that enables it to be rendered
   * as a pseudo-element in HTML.
   *
   * The rule uses the glyph’s Unicode code point as the `content` property,
   * allowing the icon to be displayed by applying the generated class to
   * any element. The `font-family` is set to the provided font family so
   * the browser knows which font to use when rendering the glyph.
   *
   * Example output for a glyph named "home" with unicode 0xe001:
   *   .icon-home::before {
   *     content: "\e001";
   *     font-family: "neptune";
   *   }
   *
   * This makes it possible to write markup like:
   *   <span class="icon-home"></span>
   * which will render the "home" icon from the font.
   *
   * @param prefix     CSS class prefix (e.g. "icon"), combined with the glyph name
   *                   to form the selector (e.g. ".icon-home").
   * @param fontFamily Font family name to reference in the rule (required).
   * @returns          A CSS class string that can be injected into a stylesheet.
   */
  toCssRule(prefix: string, fontFamily: string): string {
    const hex = this.unicode.toString(16);
    return `.${prefix}-${this.name}::before { content: "\\${hex}"; font-family: "${fontFamily}"; }`;
  }
}
