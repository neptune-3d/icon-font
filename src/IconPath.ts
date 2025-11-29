import { Path, type PathCommand, type Point } from "@neptune3d/path";
import { Path as OpenTypePath } from "opentype.js";
import type { OpenTypeCommand } from "./types";

/**
 * IconPath is a builder/utility class for constructing and manipulating
 * vector path data in a declarative, chainable way.
 *
 * It encapsulates a list of drawing commands (`IconPathCommand[]`) along
 * with a `width` and `height` that define the coordinate system the path was
 * authored in (commonly an icon grid such as 24×24).
 *
 * Key responsibilities:
 * - Store and expose the underlying command list (`commands` getter).
 * - Provide fluent, mutable methods for path construction (e.g. move, line,
 *   curve, close).
 * - Offer geometric transforms such as `scale`, `translate`, `center`.
 * - Support composition (`merge`) and conversion into other formats
 *   (e.g. OpenType.js `Path` via `toOpenTypePath`).
 *
 * The design emphasizes:
 * - **Consistency**: mutable by default, with explicit cloning available when needed.
 * - **Ergonomics**: chainable API for concise path building.
 * - **Extensibility**: commands are stored as plain objects, making it easy
 *   to add new path operations or export formats.
 *
 * Typical usage:
 * ```ts
 * const path = new IconPath(24)
 *   .m(0, 0)
 *   .l(10, 0)
 *   .scale(2)
 *   .center();
 * ```
 *
 * @class IconPath
 */
export class IconPath extends Path {
  constructor(width = 24, height = width, commands: PathCommand[] = []) {
    super(width, height, commands);
  }

  /**
   * Align this path vertically in design space relative to font metrics.
   *
   * Operates entirely in design units (top=0, bottom=designHeight).
   * Returns `this` for chaining.
   *
   * @param ascender   Font ascender (e.g. 800)
   * @param descender  Font descender (e.g. -200)
   * @param mode       Alignment mode: "baseline" | "ascender" | "descender" | "center"
   */
  alignToFont(
    ascender: number,
    descender: number,
    mode: "baseline" | "ascender" | "descender" | "center"
  ): IconPath {
    const designHeight = this._height; // e.g., 24

    // Map font-space Y → design-space Y (0..designHeight, top=0, bottom=designHeight)
    const fontYToDesign = (yFont: number) =>
      designHeight -
      ((yFont - descender) / (ascender - descender)) * designHeight;

    const ascenderDesign = fontYToDesign(ascender); // → 0
    const descenderDesign = fontYToDesign(descender); // → designHeight
    const baselineDesign = fontYToDesign(0);
    const emMidDesign = fontYToDesign((ascender + descender) / 2);

    const { minY: pathTop, maxY: pathBottom } = this.getBounds();
    const pathMid = (pathTop + pathBottom) / 2;

    let offsetY = 0;
    switch (mode) {
      case "ascender":
        offsetY = ascenderDesign - pathTop;
        break;
      case "descender":
        offsetY = descenderDesign - pathBottom;
        break;
      case "baseline":
        offsetY = baselineDesign - pathBottom;
        break;
      case "center":
        offsetY = emMidDesign - pathMid;
        break;
    }

    return this.translate(0, offsetY);
  }

  /**
   * Canonicalize smooth SVG path commands (S/T/H/V) into explicit
   * OpenType-compatible commands (L/Q/C). This prepares the path
   * for reliable font export (TTF/CFF).
   *
   * - Converts T → Q with reflected control point
   * - Converts S → C with reflected control point
   * - Expands H/V into L with both coordinates
   * - Leaves only M/L/Q/C/Z in the command list
   *
   * @returns The canonicalized commands array.
   */
  getOpenTypeCommands(): OpenTypeCommand[] {
    const out: OpenTypeCommand[] = [];

    let cx = 0,
      cy = 0;
    let lastQuadCtrlX: number | null = null,
      lastQuadCtrlY: number | null = null;
    let lastCubicCtrlX: number | null = null,
      lastCubicCtrlY: number | null = null;

    for (const c of this._commands) {
      switch (c.type) {
        case "M":
          cx = c.x;
          cy = c.y;
          out.push({ type: "M", x: cx, y: cy });
          lastQuadCtrlX = lastQuadCtrlY = null;
          lastCubicCtrlX = lastCubicCtrlY = null;
          break;

        case "L":
          cx = c.x;
          cy = c.y;
          out.push({ type: "L", x: cx, y: cy });
          lastQuadCtrlX = lastQuadCtrlY = null;
          lastCubicCtrlX = lastCubicCtrlY = null;
          break;

        case "H":
          cx = c.x;
          out.push({ type: "L", x: cx, y: cy });
          lastQuadCtrlX = lastQuadCtrlY = null;
          lastCubicCtrlX = lastCubicCtrlY = null;
          break;

        case "V":
          cy = c.y;
          out.push({ type: "L", x: cx, y: cy });
          lastQuadCtrlX = lastQuadCtrlY = null;
          lastCubicCtrlX = lastCubicCtrlY = null;
          break;

        case "Q":
          out.push({ type: "Q", x1: c.x1, y1: c.y1, x: c.x, y: c.y });
          cx = c.x;
          cy = c.y;
          lastQuadCtrlX = c.x1;
          lastQuadCtrlY = c.y1;
          lastCubicCtrlX = lastCubicCtrlY = null;
          break;

        case "T": {
          const rx: number =
            lastQuadCtrlX !== null ? 2 * cx - lastQuadCtrlX : cx;
          const ry: number =
            lastQuadCtrlY !== null ? 2 * cy - lastQuadCtrlY : cy;
          out.push({ type: "Q", x1: rx, y1: ry, x: c.x, y: c.y });
          cx = c.x;
          cy = c.y;
          lastQuadCtrlX = rx;
          lastQuadCtrlY = ry;
          lastCubicCtrlX = lastCubicCtrlY = null;
          break;
        }

        case "C":
          out.push({
            type: "C",
            x1: c.x1,
            y1: c.y1,
            x2: c.x2,
            y2: c.y2,
            x: c.x,
            y: c.y,
          });
          cx = c.x;
          cy = c.y;
          lastCubicCtrlX = c.x2;
          lastCubicCtrlY = c.y2;
          lastQuadCtrlX = lastQuadCtrlY = null;
          break;

        case "S": {
          const rxC = lastCubicCtrlX !== null ? 2 * cx - lastCubicCtrlX : cx;
          const ryC = lastCubicCtrlY !== null ? 2 * cy - lastCubicCtrlY : cy;
          out.push({
            type: "C",
            x1: rxC,
            y1: ryC,
            x2: c.x2,
            y2: c.y2,
            x: c.x,
            y: c.y,
          });
          cx = c.x;
          cy = c.y;
          lastCubicCtrlX = c.x2;
          lastCubicCtrlY = c.y2;
          lastQuadCtrlX = lastQuadCtrlY = null;
          break;
        }

        case "Z":
          out.push({ type: "Z" });
          lastQuadCtrlX = lastQuadCtrlY = null;
          lastCubicCtrlX = lastCubicCtrlY = null;
          break;
      }
    }

    return out;
  }

  /**
   * Compute the signed area of a subpath in font space.
   *
   * Y coordinates are flipped (IconPath height - y) to match font coordinate system.
   * The polygonal area is computed from the endpoints of each segment.
   *
   * @param sub A subpath command array (from splitSubpaths), restricted to OpenTypeCommand[]
   * @returns   Signed area: negative = clockwise, positive = counter‑clockwise
   */
  getSignedAreaFontSpace(sub: OpenTypeCommand[]): number {
    const pts: Point[] = [];
    let cx = 0,
      cy = 0;

    for (const c of sub) {
      switch (c.type) {
        case "M":
        case "L":
        case "Q":
        case "C":
          cx = c.x;
          cy = this._height - c.y; // flip Y against height
          pts.push({ x: cx, y: cy });
          break;
        case "Z":
          // closure, no new point
          break;
      }
    }

    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if (!a || !b) continue;
      area += a.x * b.y - b.x * a.y;
    }

    return area / 2;
  }

  /**
   * Normalize winding direction of all subpaths for font export.
   *
   * - Outer contour can be forced clockwise (outerShouldBeCW = true).
   * - Inner contours (holes) are reversed automatically to opposite winding.
   *
   * @param outerShouldBeCW Whether the outermost contour should be clockwise
   * @returns A new array of commands with normalized winding
   */
  getNormalizedWindingForFont(outerShouldBeCW: boolean): OpenTypeCommand[] {
    const subpaths = this.splitSubpaths(this.getOpenTypeCommands());
    const normalized: OpenTypeCommand[] = [];

    for (let idx = 0; idx < subpaths.length; idx++) {
      const sub = subpaths[idx];
      if (!sub) continue;

      const area = this.getSignedAreaFontSpace(sub);
      const isCW = area < 0; // after Y-flip, negative area => CW
      const shouldBeCW = outerShouldBeCW ? idx === 0 : false;
      const needsReverse = shouldBeCW ? !isCW : isCW;

      normalized.push(...(needsReverse ? this.reverseSubpath(sub) : sub));
    }

    return normalized;
  }

  /**
   * Convert this IconPath into an OpenType.js Path object.
   *
   * - Normalizes winding order for font export (outer contours clockwise).
   * - Scales design-space coordinates (width/height) into font-space units
   *   using the provided ascender/descender metrics.
   * - Flips the Y axis so that design-space top (y=0) maps to the font ascender
   *   and design-space bottom (y=height) maps to the font descender.
   * - Translates each canonical command (M/L/Q/C/Z) into the corresponding
   *   OpenType.js Path command.
   *
   * @param ascender   Ascender height in font units (e.g. 800)
   * @param descender  Descender depth in font units (e.g. -200)
   * @returns          A Path object ready for use with OpenType.js
   */
  toOpenTypePath(ascender: number, descender: number): OpenTypePath {
    const metricsHeight = ascender - descender; // full em height
    const factorX = metricsHeight / this._width;
    const factorY = metricsHeight / this._height;
    const path = new OpenTypePath();
    const cmds = this.getNormalizedWindingForFont(true);

    for (const cmd of cmds) {
      if (cmd.type === "Z") {
        path.close();
        continue;
      }

      const x = cmd.x * factorX;
      // Flip Y into font space: design 0 (top) → ascender, design height → descender
      const y = ascender - cmd.y * factorY;

      switch (cmd.type) {
        case "M":
          path.moveTo(x, y);
          break;
        case "L":
          path.lineTo(x, y);
          break;
        case "Q":
          path.quadraticCurveTo(
            cmd.x1 * factorX,
            ascender - cmd.y1 * factorY,
            x,
            y
          );
          break;
        case "C":
          path.curveTo(
            cmd.x1 * factorX,
            ascender - cmd.y1 * factorY,
            cmd.x2 * factorX,
            ascender - cmd.y2 * factorY,
            x,
            y
          );
          break;
      }
    }

    return path;
  }

  /**
   * Create a deep copy of this IconPath.
   *
   * This method duplicates the internal command list and source dimensions,
   * returning a new IconPath instance. Use this when you want to branch
   * or reuse a path without mutating the original.
   *
   * @returns A new IconPath with identical commands and source width/height
   */
  clone(): IconPath {
    const copiedCommands = this._commands.map((cmd) => ({ ...cmd }));
    return new IconPath(this._width, this._height, copiedCommands);
  }

  /**
   * Merge multiple IconPath instances into a single path.
   *
   * This static convenience method creates a new IconPath with the given
   * width/height (defaulting to 24×24) and appends the command lists from all
   * provided paths into its internal command array. The result is a single
   * composite path that contains the concatenated drawing instructions of
   * each input.
   *
   * Note: This performs a shallow merge of commands; it does not normalize
   * coordinate systems or apply transforms. All paths are assumed to share
   * the same source width/height and coordinate space.
   *
   * @param paths   Array of IconPath instances to merge
   * @param width   Optional source width for the merged path (default 24)
   * @param height  Optional source height for the merged path (defaults to width)
   * @returns       A new IconPath containing all commands from the input paths
   */
  static merge(
    paths: IconPath[],
    width: number = 24,
    height: number = width
  ): IconPath {
    const merged = new IconPath(width, height);
    for (const p of paths) {
      merged._commands.push(...p.commands);
    }
    return merged;
  }

  /**
   * Factory method to construct an IconPath from an SVG path data string.
   *
   * - Calls `Path.parsePathData` to normalize the raw string into absolute PathCommand objects.
   * - Returns a new IconPath instance with those commands.
   *
   * @param raw   SVG path data string (the `d` attribute)
   * @param width Optional width of the viewBox (default 24)
   * @param height Optional height of the viewBox (default = width)
   * @returns New IconPath instance containing parsed commands
   */
  static fromPathData(
    raw: string,
    width = 24,
    height: number = width
  ): IconPath {
    const commands = Path.parsePathData(raw);
    return new IconPath(width, height, commands);
  }
}
