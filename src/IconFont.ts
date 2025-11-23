import { Font } from "opentype.js";
import ttf2woff from "ttf2woff";
import ttf2woff2 from "ttf2woff2";
import type { IconFontGlyph } from "./IconFontGlyph";
import type { IconFontOptions } from "./types";

/**
 * Represents a complete icon font family composed of multiple IconFontGlyphs.
 *
 * An IconFont bundles together:
 * - Core metadata: `familyName`, `prefix`, `unitsPerEm`, `ascender`, `descender`.
 * - A collection of IconFontGlyph instances (`icons`) that define the glyph set.
 * - Extended OpenType.js font metadata such as `styleName`, `copyright`,
 *   `trademark`, `manufacturer`, `designer`, `designerURL`, `manufacturerURL`,
 *   `version`, `description`, `license`, and `licenseURL`.
 * - Utilities to export the font into different formats (TTF, WOFF, WOFF2).
 * - CSS generation helpers for `@font-face` rules and icon class definitions.
 *
 * Key responsibilities:
 * - Construct an OpenType.js Font object (`toOpenTypeFont`) with all glyphs and metadata.
 * - Serialize the font to ArrayBuffer and cache it (`getBuffer`).
 * - Provide binary outputs (`toTTF`, `toWoff`, `toWoff2`) for distribution.
 * - Generate CSS rules (`toCssFontFaceRule`, `toCssBaseClassRule`, `toCss`)
 *   so the font can be used directly in web projects.
 *
 * Typical usage:
 * ```ts
 *   const font = new IconFont({
 *     familyName: "neptune",
 *     prefix: "ni",
 *     icons: [new IconFontGlyph(...)],
 *     unitsPerEm: 1000,
 *     ascender: 800,
 *     descender: -200,
 *     copyright: "© 2025 Neptune Icons",
 *     license: "MIT"
 *   });
 *
 *   const ttf  = font.toTTF();
 *   const woff = font.toWoff();
 *   const css  = font.toCss("/path/neptune.woff2", "/path/neptune.woff", "/path/neptune.ttf");
 *```
 *
 * This class acts as the bridge between a set of vector icons and their
 * packaged representation as a usable web font with accompanying CSS,
 * while also supporting rich font metadata for OpenType.js export.
 */
export class IconFont {
  constructor(options: IconFontOptions) {
    this._familyName = options.familyName;
    this._prefix = options.prefix;
    this._icons = options.icons;
    this._unitsPerEm = options.unitsPerEm ?? 1000;
    this._ascender = options.ascender ?? 800;
    this._descender = options.descender ?? -200;

    this._styleName = options.styleName ?? "Regular";
    this._copyright = options.copyright;
    this._trademark = options.trademark;
    this._manufacturer = options.manufacturer;
    this._designer = options.designer;
    this._designerURL = options.designerURL;
    this._manufacturerURL = options.manufacturerURL;
    this._version = options.version;
    this._description = options.description;
    this._license = options.license;
    this._licenseURL = options.licenseURL;
  }

  protected _familyName: string;
  protected _prefix: string;
  protected _icons: IconFontGlyph[];
  protected _unitsPerEm: number;
  protected _ascender: number;
  protected _descender: number;

  protected _styleName: string;
  protected _copyright?: string;
  protected _trademark?: string;
  protected _manufacturer?: string;
  protected _designer?: string;
  protected _designerURL?: string;
  protected _manufacturerURL?: string;
  protected _version?: string;
  protected _description?: string;
  protected _license?: string;
  protected _licenseURL?: string;

  protected _buffer?: ArrayBuffer;

  get familyName() {
    return this._familyName;
  }

  get prefix() {
    return this._prefix;
  }

  get icons() {
    return this._icons;
  }

  get unitsPerEm() {
    return this._unitsPerEm;
  }

  get ascender() {
    return this._ascender;
  }

  get descender() {
    return this._descender;
  }

  /**
   * Retrieve the raw TrueType font (TTF) buffer for this icon font.
   *
   * - Builds the OpenType.js Font object and serializes it to an ArrayBuffer
   *   the first time it is called.
   * - Caches the result internally (`_buffer`) so subsequent calls return
   *   the same buffer without rebuilding the font.
   * - Used as the common source for generating TTF, WOFF, and WOFF2 binaries.
   *
   * @protected
   * @returns {ArrayBuffer} The cached TrueType font data as an ArrayBuffer.
   */
  getBuffer(): ArrayBuffer {
    if (!this._buffer) {
      this._buffer = this.toOpenTypeFont().toArrayBuffer();
    }
    return this._buffer;
  }

  /**
   * Construct an OpenType.js Font object from this IconFont instance.
   *
   * - Uses the configured `familyName`, `unitsPerEm`, `ascender`, and `descender`
   *   metrics to define the font.
   * - Populates the font's glyph set by calling `buildGlyphs()`, which converts
   *   all associated Icon objects into OpenType.js Glyphs.
   * - The resulting Font object can be serialized to ArrayBuffer (`toArrayBuffer()`),
   *   exported to TTF/WOFF/WOFF2, or used directly for further processing.
   *
   * @returns {Font} A new OpenType.js Font instance containing all glyphs and metrics.
   */
  toOpenTypeFont(): Font {
    return new Font({
      familyName: this.familyName,
      styleName: this._styleName,
      unitsPerEm: this.unitsPerEm,
      ascender: this.ascender,
      descender: this.descender,
      glyphs: this.buildGlyphs(),
      copyright: this._copyright,
      trademark: this._trademark,
      description: this._description,
      license: this._license,
      licenseURL: this._licenseURL,
      designer: this._designer,
      designerURL: this._designerURL,
      manufacturer: this._manufacturer,
      manufacturerURL: this._manufacturerURL,
      version: this._version,
    });
  }

  protected buildGlyphs() {
    return this.icons.map((icon) =>
      icon.toOpenTypeGlyph(this.ascender, this.descender)
    );
  }

  /**
   * Generate the TrueType Font (TTF) binary for this icon font.
   *
   * - Wraps the raw ArrayBuffer returned by `getBuffer()` into a Uint8Array
   *   for easier consumption and export.
   * - Provides the standard TTF representation, suitable for saving to disk
   *   or embedding in web projects.
   *
   * @returns {Uint8Array} The TrueType font data as a byte array.
   */
  toTTF(): Uint8Array {
    return new Uint8Array(this.getBuffer());
  }

  /**
   * Generate the Web Open Font Format (WOFF) binary for this icon font.
   *
   * - Converts the cached TrueType font buffer (`getBuffer()`) into WOFF format
   *   using the `ttf2woff` utility.
   * - Returns the result as a Uint8Array, suitable for saving to disk or
   *   embedding in web projects.
   *
   * @returns {Uint8Array} The WOFF font data as a byte array.
   */
  toWoff(): Uint8Array {
    return ttf2woff(new Uint8Array(this.getBuffer()));
  }

  /**
   * Generate the Web Open Font Format 2 (WOFF2) binary for this icon font.
   *
   * - Converts the cached TrueType font buffer (`getBuffer()`) into WOFF2 format
   *   using the `ttf2woff2` utility.
   * - Returns the result as a Uint8Array, suitable for saving to disk or
   *   embedding in modern web projects.
   * - WOFF2 offers better compression than WOFF, making it the preferred
   *   format for web font delivery.
   *
   * @returns {Uint8Array} The WOFF2 font data as a byte array.
   */
  toWoff2(): Uint8Array {
    return ttf2woff2(new Uint8Array(this.getBuffer()));
  }

  /**
   * Generate only the @font-face CSS rule for this font.
   *
   * @param woff2Path Optional path/URL to the WOFF2 font file
   * @param woffPath  Optional path/URL to the WOFF font file
   * @param ttfPath   Optional path/URL to the TTF font file
   * @returns         CSS @font-face rule string
   */
  toCssFontFaceRule(
    woff2Path?: string,
    woffPath?: string,
    ttfPath?: string
  ): string {
    const srcEntries: string[] = [];
    if (woff2Path) srcEntries.push(`url("${woff2Path}") format("woff2")`);
    if (woffPath) srcEntries.push(`url("${woffPath}") format("woff")`);
    if (ttfPath) srcEntries.push(`url("${ttfPath}") format("truetype")`);

    const srcBlock =
      srcEntries.length > 0 ? `  src: ${srcEntries.join(",\n       ")};\n` : "";

    return `@font-face {
  font-family: "${this.familyName}";
${srcBlock}  font-weight: normal;
  font-style: normal;
}`;
  }

  /**
   * Generate the base CSS class rule for this font prefix.
   *
   * Example:
   * .ni {
   *   font-family: "neptune";
   *   font-style: normal;
   *   font-weight: normal;
   *   speak: none;
   *   display: inline-block;
   *   line-height: 1;
   *   text-transform: none;
   *   -webkit-font-smoothing: antialiased;
   *   -moz-osx-font-smoothing: grayscale;
   * }
   *
   * @returns CSS base class rule string
   */
  toCssBaseClassRule(): string {
    return `.${this.prefix} {
  font-family: "${this.familyName}";
  font-style: normal;
  font-weight: normal;
  speak: none;
  display: inline-block;
  line-height: 1;
  text-transform: none;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`;
  }

  /**
   * Generate full CSS stylesheet including @font-face and icon classes.
   *
   * @param woff2Path Optional path/URL to the WOFF2 font file
   * @param woffPath  Optional path/URL to the WOFF font file
   * @param ttfPath   Optional path/URL to the TTF font file
   * @returns         CSS stylesheet string
   */
  toCss(woff2Path?: string, woffPath?: string, ttfPath?: string): string {
    const cssRules = this.icons
      .map((icon) => icon.toCssRule(this.prefix, this.familyName))
      .join("\n");

    return `${this.toCssFontFaceRule(woff2Path, woffPath, ttfPath)}

${this.toCssBaseClassRule()}

${cssRules}`;
  }
}
