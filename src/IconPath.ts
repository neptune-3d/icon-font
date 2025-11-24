import { Path } from "opentype.js";
import type {
  Corner,
  CubicCommand,
  IconPathBounds,
  IconPathCommand,
  OpenTypeCommand,
  Point,
  Rect,
  ScaleFactor,
} from "./types";

/**
 * IconPath is a builder/utility class for constructing and manipulating
 * vector path data in a declarative, chainable way.
 *
 * It encapsulates a list of drawing commands (`IconPathCommand[]`) along
 * with a `size` that defines the coordinate system the path was
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
 *   .scale({ x: 2 })
 *   .center();
 * ```
 *
 * @class IconPath
 */
export class IconPath {
  constructor(size: number = 24, commands: IconPathCommand[] = []) {
    this._size = size;
    this._commands = commands;
  }

  protected _size: number;
  protected _commands: IconPathCommand[];

  get size() {
    return this._size;
  }

  get commands() {
    return this._commands;
  }

  /**
   * Move the "pen" to an absolute position without drawing.
   *
   * Adds a `M` (move-to) command to the path, setting the current
   * drawing position to the given coordinates. This does not create
   * a visible line; it simply repositions the starting point for
   * subsequent commands. Returns `this` for fluent chaining.
   *
   * @param x X coordinate of the new starting point
   * @param y Y coordinate of the new starting point
   * @returns The IconPath instance for chaining
   */
  m(x: number, y: number) {
    this._commands.push({ type: "M", x, y });
    return this;
  }

  /**
   * Move the "pen" to an absolute position from a string input.
   *
   * This is a convenience wrapper around `m(x, y)` that accepts a
   * coordinate string (e.g. `"10 20"`) instead of separate numeric
   * arguments. The string is trimmed, split on whitespace, and parsed
   * into floats. If either value cannot be parsed into a valid number,
   * an error is thrown.
   *
   * Returns `this` for fluent chaining, just like `m`.
   *
   * @param coords A string containing two space-separated numbers ("x y")
   * @returns      The IconPath instance for chaining
   * @throws       Error if the string cannot be parsed into valid coordinates
   */
  ms(coords: string) {
    const [xStr, yStr] = coords.trim().split(" ");
    const x = parseFloat(xStr!);
    const y = parseFloat(yStr!);
    if (isNaN(x) || isNaN(y)) {
      throw new Error(`Invalid coordinates string: "${coords}"`);
    }
    return this.m(x, y);
  }

  /**
   * Draw a straight line from the current point to the given absolute coordinates.
   *
   * Adds an `L` (line-to) command to the path, creating a visible line segment
   * from the current pen position to `(x, y)`. Returns `this` for fluent chaining.
   *
   * @param x X coordinate of the line endpoint
   * @param y Y coordinate of the line endpoint
   * @returns The IconPath instance for chaining
   */
  l(x: number, y: number) {
    this._commands.push({ type: "L", x, y });
    return this;
  }

  /**
   * Draw a straight line from the current point to coordinates parsed from a string.
   *
   * This is a convenience wrapper around `l(x, y)` that accepts a coordinate string
   * (e.g. `"10 20"`) instead of separate numeric arguments. The string is trimmed,
   * split on whitespace, and parsed into floats. If either value cannot be parsed
   * into a valid number, an error is thrown.
   *
   * Returns `this` for fluent chaining, just like `l`.
   *
   * @param coords A string containing two space-separated numbers ("x y")
   * @returns      The IconPath instance for chaining
   * @throws       Error if the string cannot be parsed into valid coordinates
   */
  ls(coords: string) {
    const [xStr, yStr] = coords.trim().split(" ");
    const x = parseFloat(xStr!);
    const y = parseFloat(yStr!);
    if (isNaN(x) || isNaN(y)) {
      throw new Error(`Invalid coordinates string: "${coords}"`);
    }
    return this.l(x, y);
  }

  /**
   * Draw a quadratic Bézier curve from the current point to (x, y).
   *
   * Adds a `Q` (quadratic curve-to) command to the path, using (x1, y1)
   * as the control point and (x, y) as the endpoint. Returns `this` for
   * fluent chaining.
   *
   * @param x1 X coordinate of the control point
   * @param y1 Y coordinate of the control point
   * @param x  X coordinate of the curve endpoint
   * @param y  Y coordinate of the curve endpoint
   * @returns  The IconPath instance for chaining
   */
  q(x1: number, y1: number, x: number, y: number) {
    this._commands.push({ type: "Q", x1, y1, x, y });
    return this;
  }

  /**
   * Draw a quadratic Bézier curve from a string of coordinates.
   *
   * This is a convenience wrapper around `q(x1, y1, x, y)` that accepts
   * a coordinate string (e.g. `"10 20 30 40"` or `"10,20,30,40"`) instead
   * of separate numeric arguments. The string is normalized by replacing
   * commas with spaces, then split into four parts. Each part is parsed
   * into a float. If the string does not contain exactly four values, or
   * any value cannot be parsed into a valid number, an error is thrown.
   *
   * Returns `this` for fluent chaining, just like `q`.
   *
   * @param coords A string containing four numeric values ("x1 y1 x y")
   * @returns      The IconPath instance for chaining
   * @throws       Error if the string is malformed or contains invalid numbers
   */
  qs(coords: string) {
    const parts = coords.trim().replace(COMMA_REGEX, " ").split(SPACE_REGEX);

    if (parts.length !== 4) {
      throw new Error(`Invalid coordinates string for Q: "${coords}"`);
    }

    const [x1Str, y1Str, xStr, yStr] = parts;

    const x1 = parseFloat(x1Str!);
    const y1 = parseFloat(y1Str!);
    const x = parseFloat(xStr!);
    const y = parseFloat(yStr!);

    if ([x1, y1, x, y].some((n) => isNaN(n))) {
      throw new Error(`Invalid numeric values in Q string: "${coords}"`);
    }

    return this.q(x1, y1, x, y);
  }

  /**
   * Draw a cubic Bézier curve from the current point to (x, y).
   *
   * Adds a `C` (cubic curve-to) command to the path, using (x1, y1) and
   * (x2, y2) as the two control points, and (x, y) as the endpoint.
   * Returns `this` for fluent chaining.
   *
   * @param x1 X coordinate of the first control point
   * @param y1 Y coordinate of the first control point
   * @param x2 X coordinate of the second control point
   * @param y2 Y coordinate of the second control point
   * @param x  X coordinate of the curve endpoint
   * @param y  Y coordinate of the curve endpoint
   * @returns  The IconPath instance for chaining
   */
  c(x1: number, y1: number, x2: number, y2: number, x: number, y: number) {
    this._commands.push({ type: "C", x1, y1, x2, y2, x, y });
    return this;
  }

  /**
   * Draw a cubic Bézier curve from a string of coordinates.
   *
   * This is a convenience wrapper around `c(x1, y1, x2, y2, x, y)` that accepts
   * a coordinate string (e.g. `"10 20 30 40 50 60"` or `"10,20,30,40,50,60"`)
   * instead of separate numeric arguments. The string is normalized by replacing
   * commas with spaces, then split into six parts. Each part is parsed into a float.
   *
   * Validation:
   * - The string must contain exactly six numeric values.
   * - If any value cannot be parsed into a valid number, an error is thrown.
   *
   * Returns `this` for fluent chaining, just like `c`.
   *
   * @param coords A string containing six numeric values ("x1 y1 x2 y2 x y")
   * @returns      The IconPath instance for chaining
   * @throws       Error if the string is malformed or contains invalid numbers
   */
  cs(coords: string) {
    const parts = coords.trim().replace(COMMA_REGEX, " ").split(SPACE_REGEX);

    if (parts.length !== 6) {
      throw new Error(`Invalid coordinates string for C: "${coords}"`);
    }

    const [x1Str, y1Str, x2Str, y2Str, xStr, yStr] = parts;

    const x1 = parseFloat(x1Str!);
    const y1 = parseFloat(y1Str!);
    const x2 = parseFloat(x2Str!);
    const y2 = parseFloat(y2Str!);
    const x = parseFloat(xStr!);
    const y = parseFloat(yStr!);

    if ([x1, y1, x2, y2, x, y].some((n) => isNaN(n))) {
      throw new Error(`Invalid numeric values in C string: "${coords}"`);
    }

    return this.c(x1, y1, x2, y2, x, y);
  }

  /**
   * Draw a horizontal line from the current point to the given X coordinate.
   *
   * Adds an `H` (horizontal line-to) command to the path, creating a straight
   * line segment along the X axis from the current pen position to `x`.
   * The Y coordinate remains unchanged. Returns `this` for fluent chaining.
   *
   * @param x X coordinate of the line endpoint
   * @returns The IconPath instance for chaining
   */
  h(x: number) {
    this._commands.push({ type: "H", x });
    return this;
  }

  /**
   * Draw a vertical line from the current point to the given Y coordinate.
   *
   * Adds a `V` (vertical line-to) command to the path, creating a straight
   * line segment along the Y axis from the current pen position to `y`.
   * The X coordinate remains unchanged. Returns `this` for fluent chaining.
   *
   * @param y Y coordinate of the line endpoint
   * @returns The IconPath instance for chaining
   */
  v(y: number) {
    this._commands.push({ type: "V", y });
    return this;
  }

  /**
   * Draw a smooth quadratic Bézier curve to (x, y).
   *
   * Adds a `T` (shorthand quadratic curve-to) command to the path. This relies
   * on the previous quadratic control point (from a `Q` or `T` command) to
   * calculate the reflected control point automatically. If no prior quadratic
   * exists, it behaves like a straight line to `(x, y)`.
   *
   * Returns `this` for fluent chaining.
   *
   * @param x X coordinate of the curve endpoint
   * @param y Y coordinate of the curve endpoint
   * @returns The IconPath instance for chaining
   */
  t(x: number, y: number) {
    this._commands.push({ type: "T", x, y });
    return this;
  }

  /**
   * Draw a smooth quadratic Bézier curve to coordinates parsed from a string.
   *
   * This is a convenience wrapper around `t(x, y)` that accepts a coordinate
   * string (e.g. `"10 20"` or `"10,20"`) instead of separate numeric arguments.
   * The string is normalized by replacing commas with spaces, then split into
   * two parts. Each part is parsed into a float. If the string does not contain
   * exactly two values, or either value cannot be parsed into a valid number,
   * an error is thrown.
   *
   * Returns `this` for fluent chaining, just like `t`.
   *
   * @param coords A string containing two numeric values ("x y")
   * @returns      The IconPath instance for chaining
   * @throws       Error if the string is malformed or contains invalid numbers
   */
  ts(coords: string) {
    const parts = coords.trim().replace(COMMA_REGEX, " ").split(SPACE_REGEX);

    if (parts.length !== 2) {
      throw new Error(`Invalid coordinates string for T: "${coords}"`);
    }

    const [xStr, yStr] = parts;

    const x = parseFloat(xStr!);
    const y = parseFloat(yStr!);

    if (isNaN(x) || isNaN(y)) {
      throw new Error(`Invalid numeric values in T string: "${coords}"`);
    }

    return this.t(x, y);
  }

  /**
   * Draw a smooth cubic Bézier curve to (x, y).
   *
   * Adds an `S` (smooth cubic curve-to) command to the path. This is the
   * shorthand cubic form: the first control point is inferred by reflecting
   * the previous cubic control point (from a `C` or `S` command). If no
   * previous cubic exists, the current point is used as the first control.
   *
   * @param x2 X coordinate of the second control point
   * @param y2 Y coordinate of the second control point
   * @param x  X coordinate of the curve endpoint
   * @param y  Y coordinate of the curve endpoint
   * @returns  The IconPath instance for chaining
   */
  s(x2: number, y2: number, x: number, y: number) {
    this._commands.push({ type: "S", x2, y2, x, y });
    return this;
  }

  /**
   * Draw a smooth cubic Bézier curve from a string of coordinates.
   *
   * Convenience wrapper around `s(x2, y2, x, y)` that accepts a coordinate
   * string (e.g. `"10 20 30 40"` or `"10,20,30,40"`) instead of separate
   * numeric arguments. The string is normalized by replacing commas with
   * spaces, then split into four parts. Each part is parsed into a float.
   *
   * @param coords A string containing four numeric values ("x2 y2 x y")
   * @returns      The IconPath instance for chaining
   * @throws       Error if the string is malformed or contains invalid numbers
   */
  ss(coords: string) {
    const parts = coords.trim().replace(COMMA_REGEX, " ").split(SPACE_REGEX);

    if (parts.length !== 4) {
      throw new Error(`Invalid coordinates string for S: "${coords}"`);
    }

    const [x2Str, y2Str, xStr, yStr] = parts;

    const x2 = parseFloat(x2Str!);
    const y2 = parseFloat(y2Str!);
    const x = parseFloat(xStr!);
    const y = parseFloat(yStr!);

    if ([x2, y2, x, y].some((n) => isNaN(n))) {
      throw new Error(`Invalid numeric values in S string: "${coords}"`);
    }

    return this.s(x2, y2, x, y);
  }

  /**
   * Draw an elliptical arc from the current point to (x, y).
   *
   * Converts the arc into cubic Bézier segments using arcToCubic(),
   * and immediately inserts those `C` commands into the path.
   * This ensures only OpenType-compatible commands are stored.
   *
   * @param rx            X radius of the ellipse
   * @param ry            Y radius of the ellipse
   * @param xAxisRotation Rotation of the ellipse’s x-axis in degrees
   * @param largeArcFlag  0 = smaller arc, 1 = larger arc
   * @param sweepFlag     0 = counter-clockwise, 1 = clockwise
   * @param x             X coordinate of the arc endpoint
   * @param y             Y coordinate of the arc endpoint
   * @returns             The IconPath instance for chaining
   */
  a(
    rx: number,
    ry: number,
    xAxisRotation: number,
    largeArcFlag: 0 | 1,
    sweepFlag: 0 | 1,
    x: number,
    y: number
  ): IconPath {
    // Use helper to get current point
    const { x: x0, y: y0 } = this.getCurrentPoint();

    // Convert arc to cubic segments
    const beziers: CubicCommand[] = this.arcToCubic(
      x0,
      y0,
      rx,
      ry,
      xAxisRotation,
      largeArcFlag,
      sweepFlag,
      x,
      y
    );

    // Push each cubic segment into commands
    for (const seg of beziers) {
      this._commands.push(seg);
    }

    return this;
  }

  /**
   * Draw an elliptical arc from a string of parameters, as found in
   * an SVG path `d` attribute after a lowercase `a` command.
   *
   * Example: "2 2 0 1 0 14 14" or "2,2,0,1,0,14,14"
   *
   * Convenience wrapper around `a(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y)`.
   * The string is normalized by replacing commas with spaces, then split into
   * seven parts. Each part is parsed into a float or integer flag.
   *
   * @param params A string containing seven numeric values ("rx ry xAxisRotation largeArcFlag sweepFlag x y")
   * @returns      The IconPath instance for chaining
   * @throws       Error if the string is malformed or contains invalid numbers
   */
  as(params: string): IconPath {
    const parts = params.trim().replace(COMMA_REGEX, " ").split(SPACE_REGEX);

    if (parts.length !== 7) {
      throw new Error(`Invalid parameter string for A: "${params}"`);
    }

    const [rxStr, ryStr, rotStr, largeStr, sweepStr, xStr, yStr] = parts;

    const rx = parseFloat(rxStr!);
    const ry = parseFloat(ryStr!);
    const xAxisRotation = parseFloat(rotStr!);
    const largeArcFlag = parseInt(largeStr!, 10) as 0 | 1;
    const sweepFlag = parseInt(sweepStr!, 10) as 0 | 1;
    const x = parseFloat(xStr!);
    const y = parseFloat(yStr!);

    if (
      [rx, ry, xAxisRotation, x, y].some((n) => isNaN(n)) ||
      ![0, 1].includes(largeArcFlag) ||
      ![0, 1].includes(sweepFlag)
    ) {
      throw new Error(`Invalid numeric values in A string: "${params}"`);
    }

    return this.a(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y);
  }

  /**
   * Close the current subpath.
   *
   * Adds a `Z` (close-path) command to the path, which draws a straight
   * line from the current point back to the starting point of the
   * current subpath. This effectively closes the shape, ensuring that
   * fills and strokes are rendered as a complete polygon. Returns `this`
   * for fluent chaining.
   *
   * @returns The IconPath instance for chaining
   */
  close() {
    this._commands.push({ type: "Z" });
    return this;
  }

  /**
   * Scale all commands in this path in place.
   *
   * This mutates the current IconPath by multiplying all coordinates
   * by the given scale factors. If only `x` is provided, both axes
   * are scaled uniformly. Returns `this` for chaining.
   *
   * @param factor ScaleFactor object with { x, y? }
   * @returns      The IconPath instance for chaining
   */
  scale(factor: ScaleFactor): IconPath {
    const sx = factor.x;
    const sy = factor.y ?? factor.x;

    this._commands = this._commands.map((cmd) => {
      switch (cmd.type) {
        case "M":
        case "L":
        case "T":
          return { type: cmd.type, x: cmd.x * sx, y: cmd.y * sy };

        case "H":
          return { type: "H", x: cmd.x * sx };

        case "V":
          return { type: "V", y: cmd.y * sy };

        case "Q":
          return {
            type: "Q",
            x1: cmd.x1 * sx,
            y1: cmd.y1 * sy,
            x: cmd.x * sx,
            y: cmd.y * sy,
          };

        case "C":
          return {
            type: "C",
            x1: cmd.x1 * sx,
            y1: cmd.y1 * sy,
            x2: cmd.x2 * sx,
            y2: cmd.y2 * sy,
            x: cmd.x * sx,
            y: cmd.y * sy,
          };

        case "S":
          return {
            type: "S",
            x2: cmd.x2 * sx,
            y2: cmd.y2 * sy,
            x: cmd.x * sx,
            y: cmd.y * sy,
          };

        case "Z":
          return { type: "Z" };
      }
    });

    return this;
  }

  /**
   * Translate this path by absolute offsets, mutating in place.
   *
   * This method applies a uniform shift to all coordinates in the path,
   * regardless of the underlying coordinate system (e.g. SVG viewBox units,
   * font em-square units, or any other grid). It does not perform scaling,
   * axis inversion, or baseline adjustments — it simply adds dx and dy to
   * every relevant coordinate.
   *
   * @param dx Offset in X (units depend on the current coordinate system)
   * @param dy Offset in Y (units depend on the current coordinate system)
   * @returns The IconPath instance for chaining
   */
  translate(dx: number, dy: number): IconPath {
    this._commands = this._commands.map((cmd) => {
      switch (cmd.type) {
        case "M":
        case "L":
        case "T":
          return { type: cmd.type, x: cmd.x + dx, y: cmd.y + dy };

        case "H":
          return { type: "H", x: cmd.x + dx };

        case "V":
          return { type: "V", y: cmd.y + dy };

        case "Q":
          return {
            type: "Q",
            x1: cmd.x1 + dx,
            y1: cmd.y1 + dy,
            x: cmd.x + dx,
            y: cmd.y + dy,
          };

        case "C":
          return {
            type: "C",
            x1: cmd.x1 + dx,
            y1: cmd.y1 + dy,
            x2: cmd.x2 + dx,
            y2: cmd.y2 + dy,
            x: cmd.x + dx,
            y: cmd.y + dy,
          };

        case "S":
          return {
            type: "S",
            x2: cmd.x2 + dx,
            y2: cmd.y2 + dy,
            x: cmd.x + dx,
            y: cmd.y + dy,
          };

        case "Z":
          return { type: "Z" };
      }
    });

    return this;
  }

  /**
   * Center this path inside a target bounding box, mutating in place.
   *
   * Computes the bounding box of the current path commands and translates
   * the path so that its shape is centered within the specified target box.
   *
   * - If `targetBounds` is omitted, the default box is (0,0) → (size,size).
   * - `targetBounds` may be partial: any missing values fall back to the defaults.
   * - This allows centering inside arbitrary rectangles, including offset boxes,
   *   enabling both centering and translation in one step.
   *
   * @param targetBounds Optional partial bounding box { minX, minY, maxX, maxY }.
   *                     Defaults to { minX:0, minY:0, maxX:size, maxY:size }.
   * @returns The IconPath instance for chaining
   */
  center(targetBounds?: Partial<IconPathBounds>): IconPath {
    const bounds = this.getCommandBounds();

    const shapeWidth = bounds.maxX - bounds.minX;
    const shapeHeight = bounds.maxY - bounds.minY;

    // Default target box is (0,0) to (size,size)
    const minX = targetBounds?.minX ?? 0;
    const minY = targetBounds?.minY ?? 0;
    const maxX = targetBounds?.maxX ?? this._size;
    const maxY = targetBounds?.maxY ?? this._size;

    const targetWidth = maxX - minX;
    const targetHeight = maxY - minY;

    const dx = minX + (targetWidth - shapeWidth) / 2 - bounds.minX;
    const dy = minY + (targetHeight - shapeHeight) / 2 - bounds.minY;

    return this.translate(dx, dy);
  }

  /**
   * Compute the axis-aligned bounding box of the path commands.
   *
   * Iterates over all stored commands and collects any coordinate values
   * they define (`x`, `y`, `x1`, `y1`, `x2`, `y2`). The minimum and maximum
   * values across both axes are tracked to determine the rectangular bounds
   * that enclose the path geometry.
   *
   * @returns { minX, minY, maxX, maxY } for the drawn path
   */
  getCommandBounds(): IconPathBounds {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const cmd of this._commands) {
      const xs: number[] = [];
      const ys: number[] = [];
      if ("x" in cmd) xs.push(cmd.x);
      if ("y" in cmd) ys.push(cmd.y);
      if ("x1" in cmd) xs.push(cmd.x1);
      if ("y1" in cmd) ys.push(cmd.y1);
      if ("x2" in cmd) xs.push(cmd.x2);
      if ("y2" in cmd) ys.push(cmd.y2);
      for (const x of xs) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
      for (const y of ys) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    return { minX, minY, maxX, maxY };
  }

  /**
   * Return the full canvas bounds.
   *
   * This is the design-space rectangle the path is defined in,
   * typically from (0,0) to (IconPath size,IconPath size).
   *
   * @returns { minX, minY, maxX, maxY } for the canvas box
   */
  getCanvasBounds(): IconPathBounds {
    return { minX: 0, minY: 0, maxX: this._size, maxY: this._size };
  }

  /**
   * Append a rectangular subpath, equivalent to an SVG <rect>,
   * with optional global radii and/or per-corner configuration.
   *
   * - If `corners` are provided, each corner can be styled independently
   *   (sharp, rounded, chamfer).
   * - If no corner config is given, global `rx`/`ry` are applied to all corners.
   * - Individual corner config takes precedence over global radii.
   * - If both global radii are 0 and no corner config is given, all corners are sharp.
   *
   * @param config RectConfig object with base rect fields, optional rx/ry,
   *               and optional per-corner overrides.
   * @returns      The IconPath instance for chaining
   */
  rect(config: Rect): IconPath {
    const { x, y, width, height } = config;
    let rx = config.rx ?? 0;
    let ry = config.ry ?? rx;

    // Clamp radii to half the dimensions, per SVG spec
    rx = Math.min(rx, width / 2);
    ry = Math.min(ry, height / 2);

    // Helper to resolve a corner: prefer explicit config, else global radii, else sharp
    const resolveCorner = (corner?: Corner): Corner => {
      if (corner) return corner;
      return rx === 0 && ry === 0
        ? { kind: "sharp" }
        : { kind: "rounded", rx, ry };
    };

    const tl = resolveCorner(config.corners?.tl);
    const tr = resolveCorner(config.corners?.tr);
    const br = resolveCorner(config.corners?.br);
    const bl = resolveCorner(config.corners?.bl);

    // Start at TL inset if rounded/chamfer, else sharp
    if (tl.kind === "rounded" || tl.kind === "chamfer") {
      this.m(x + (tl.rx ?? 0), y);
    } else {
      this.m(x, y);
    }

    // Top edge → TR corner
    this.corner("tr", x + width, y, tr);

    // Right edge → BR corner
    this.corner("br", x + width, y + height, br);

    // Bottom edge → BL corner
    this.corner("bl", x, y + height, bl);

    // Left edge → TL corner
    this.corner("tl", x, y, tl);

    return this.close();
  }

  /**
   * Append a corner segment to the current path.
   *
   * This method abstracts the drawing of a single rectangle corner, based on its
   * position (`side` = "tl" | "tr" | "br" | "bl") and the desired corner style.
   *
   * - For `corner.kind === "rounded"`: draws a quadratic Bézier curve from the
   *   inset point into the corner and out along the adjacent edge, using the
   *   provided radii (`rx`, `ry`).
   * - For `corner.kind === "chamfer"`: draws two straight line segments that
   *   cut diagonally across the corner, offset by (`rx`, `ry`).
   * - For `corner.kind === "sharp"`: simply draws a straight line directly to
   *   the corner coordinate (`x`, `y`).
   *
   * The caller supplies the absolute corner coordinates (`x`, `y`) and the
   * configuration object (`Corner`). This method ensures the correct inset
   * line and curve/diagonal are emitted, so the caller does not need to compute
   * inset points manually.
   *
   * @param side Which corner of the rectangle is being drawn ("tl", "tr", "br", "bl")
   * @param x    Absolute x coordinate of the corner
   * @param y    Absolute y coordinate of the corner
   * @param corner Corner configuration (sharp, rounded with rx/ry, or chamfer with rx/ry)
   * @returns The IconPath instance for chaining
   */
  corner(
    side: "tl" | "tr" | "br" | "bl",
    x: number,
    y: number,
    corner: Corner
  ): IconPath {
    switch (corner.kind) {
      case "rounded":
        switch (side) {
          case "tr":
            this.l(x - corner.rx, y);
            this.q(x, y, x, y + corner.ry);
            break;
          case "br":
            this.l(x, y - corner.ry);
            this.q(x, y, x - corner.rx, y);
            break;
          case "bl":
            this.l(x + corner.rx, y);
            this.q(x, y, x, y - corner.ry);
            break;
          case "tl":
            this.l(x, y + corner.ry);
            this.q(x, y, x + corner.rx, y);
            break;
        }
        break;

      case "chamfer":
        switch (side) {
          case "tr":
            this.l(x - corner.rx, y);
            this.l(x, y + corner.ry);
            break;
          case "br":
            this.l(x, y - corner.ry);
            this.l(x - corner.rx, y);
            break;
          case "bl":
            this.l(x + corner.rx, y);
            this.l(x, y - corner.ry);
            break;
          case "tl":
            this.l(x, y + corner.ry);
            this.l(x + corner.rx, y);
            break;
        }
        break;

      case "sharp":
        // nothing special, just line directly to the corner
        this.l(x, y);
        break;
    }
    return this;
  }

  /**
   * Convenience wrapper for drawing a rounded corner.
   *
   * Delegates to the generic `corner` method with a Corner
   * of kind `"rounded"`. This avoids duplicating logic and keeps
   * the API ergonomic when you only need rounded corners.
   *
   * @param side Which corner of the rectangle ("tl" | "tr" | "br" | "bl")
   * @param x    Absolute x coordinate of the corner
   * @param y    Absolute y coordinate of the corner
   * @param rx   Horizontal radius
   * @param ry   Vertical radius
   * @returns The IconPath instance for chaining
   */
  roundedCorner(
    side: "tl" | "tr" | "br" | "bl",
    x: number,
    y: number,
    rx: number,
    ry: number
  ): IconPath {
    return this.corner(side, x, y, { kind: "rounded", rx, ry });
  }

  /**
   * Convenience wrapper for drawing a chamfered corner.
   *
   * Delegates to the generic `corner` method with a Corner
   * of kind `"chamfer"`. This avoids duplicating logic and keeps
   * the API ergonomic when you only need chamfered corners.
   *
   * @param side Which corner of the rectangle ("tl" | "tr" | "br" | "bl")
   * @param x    Absolute x coordinate of the corner
   * @param y    Absolute y coordinate of the corner
   * @param rx   Horizontal chamfer offset
   * @param ry   Vertical chamfer offset
   * @returns The IconPath instance for chaining
   */
  chamferCorner(
    side: "tl" | "tr" | "br" | "bl",
    x: number,
    y: number,
    rx: number,
    ry: number
  ): IconPath {
    return this.corner(side, x, y, { kind: "chamfer", rx, ry });
  }

  /**
   * Append an elliptical subpath, equivalent to an SVG <ellipse>.
   *
   * Approximates the ellipse using four cubic Bézier curves.
   * The approximation uses the constant kappa = 4*(√2 - 1)/3 ≈ 0.5522847498,
   * which gives a visually accurate ellipse when applied to both radii.
   *
   * @param cx Center x coordinate
   * @param cy Center y coordinate
   * @param rx Horizontal radius
   * @param ry Vertical radius
   * @returns  This IconPath with the ellipse appended
   */
  ellipse(cx: number, cy: number, rx: number, ry: number): IconPath {
    const kappa = 0.5522847498307936;

    const ox = rx * kappa;
    const oy = ry * kappa;

    const x0 = cx - rx;
    const y0 = cy;
    const x1 = cx;
    const y1 = cy - ry;
    const x2 = cx + rx;
    const y3 = cy + ry;

    this.m(x0, y0);

    // Top-left quadrant
    this.c(x0, y0 - oy, x1 - ox, y1, x1, y1);

    // Top-right quadrant
    this.c(x1 + ox, y1, x2, y0 - oy, x2, y0);

    // Bottom-right quadrant
    this.c(x2, y0 + oy, x1 + ox, y3, x1, y3);

    // Bottom-left quadrant
    this.c(x1 - ox, y3, x0, y0 + oy, x0, y0);

    return this.close();
  }

  /**
   * Append a circular subpath, equivalent to an SVG <circle>.
   *
   * Internally delegates to `ellipse` with equal radii for x and y.
   * Approximates the circle using four cubic Bézier curves via the
   * kappa constant, ensuring a visually accurate circle.
   *
   * @param cx Center x coordinate
   * @param cy Center y coordinate
   * @param r  Radius of the circle
   * @returns  This IconPath with the circle appended
   */
  circle(cx: number, cy: number, r: number): IconPath {
    return this.ellipse(cx, cy, r, r);
  }

  /**
   * Convert an SVG elliptical arc into one or more cubic Bézier segments.
   *
   * Implements the algorithm from the SVG spec:
   * https://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes
   *
   * @param x0 Starting x coordinate (current point)
   * @param y0 Starting y coordinate (current point)
   * @param rx X radius of the ellipse
   * @param ry Y radius of the ellipse
   * @param xAxisRotation Rotation of the ellipse’s x-axis in degrees
   * @param largeArcFlag 0 = smaller arc, 1 = larger arc
   * @param sweepFlag    0 = counter-clockwise, 1 = clockwise
   * @param x End x coordinate
   * @param y End y coordinate
   * @returns Array of cubic Bézier segments (CubicCommand[])
   */
  arcToCubic(
    x0: number,
    y0: number,
    rx: number,
    ry: number,
    xAxisRotation: number,
    largeArcFlag: 0 | 1,
    sweepFlag: 0 | 1,
    x: number,
    y: number
  ): CubicCommand[] {
    // Degenerate: same point -> nothing to draw
    if (x0 === x && y0 === y) return [];

    // Degenerate: zero radii -> straight line
    if (rx === 0 || ry === 0) {
      return [
        {
          type: "C",
          x1: x0,
          y1: y0,
          x2: x,
          y2: y,
          x,
          y,
        },
      ];
    }

    // Rotation in radians
    const phi = (Math.PI / 180) * xAxisRotation;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    // Step 1: transform to ellipse space
    const dx2 = (x0 - x) / 2;
    const dy2 = (y0 - y) / 2;
    let x1p = cosPhi * dx2 + sinPhi * dy2;
    let y1p = -sinPhi * dx2 + cosPhi * dy2;

    // Compensate out-of-range radii
    rx = Math.abs(rx);
    ry = Math.abs(ry);
    const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lambda > 1) {
      const scale = Math.sqrt(lambda);
      rx *= scale;
      ry *= scale;
    }

    // Step 2: center calculation in ellipse space
    const rxSq = rx * rx;
    const rySq = ry * ry;
    const x1pSq = x1p * x1p;
    const y1pSq = y1p * y1p;

    let radicant = rxSq * rySq - rxSq * y1pSq - rySq * x1pSq;
    if (radicant < 0) radicant = 0;

    radicant /= rxSq * y1pSq + rySq * x1pSq;
    radicant = Math.sqrt(radicant) * (largeArcFlag === sweepFlag ? -1 : 1);

    const cxp = (radicant * rx * y1p) / ry;
    const cyp = (radicant * -ry * x1p) / rx;

    // Step 3: transform center back to original coords
    const cx = cosPhi * cxp - sinPhi * cyp + (x0 + x) / 2;
    const cy = sinPhi * cxp + cosPhi * cyp + (y0 + y) / 2;

    // Step 4: angles
    const unitAngle = (ux: number, uy: number, vx: number, vy: number) => {
      const sign = ux * vy - uy * vx < 0 ? -1 : 1;
      let dot = ux * vx + uy * vy;
      if (dot > 1) dot = 1;
      if (dot < -1) dot = -1;
      return sign * Math.acos(dot);
    };

    const v1x = (x1p - cxp) / rx;
    const v1y = (y1p - cyp) / ry;
    const v2x = (-x1p - cxp) / rx;
    const v2y = (-y1p - cyp) / ry;

    let theta1 = unitAngle(1, 0, v1x, v1y);
    let deltaTheta = unitAngle(v1x, v1y, v2x, v2y);

    if (sweepFlag === 0 && deltaTheta > 0) deltaTheta -= Math.PI * 2;
    if (sweepFlag === 1 && deltaTheta < 0) deltaTheta += Math.PI * 2;

    // Segment splitting (<= 90° each)
    const segments = Math.max(
      Math.ceil(Math.abs(deltaTheta) / (Math.PI / 2)),
      1
    );
    const dTheta = deltaTheta / segments;

    const result: CubicCommand[] = [];

    for (let i = 0; i < segments; i++) {
      const t1 = theta1;
      const t2 = t1 + dTheta;

      const cosT1 = Math.cos(t1);
      const sinT1 = Math.sin(t1);
      const cosT2 = Math.cos(t2);
      const sinT2 = Math.sin(t2);

      // Position on rotated/scaled ellipse
      const p1x = cx + rx * (cosPhi * cosT1) - ry * (sinPhi * sinT1);
      const p1y = cy + rx * (sinPhi * cosT1) + ry * (cosPhi * sinT1);
      const p2x = cx + rx * (cosPhi * cosT2) - ry * (sinPhi * sinT2);
      const p2y = cy + rx * (sinPhi * cosT2) + ry * (cosPhi * sinT2);

      // Derivative vectors (R * rot * [-sin t, cos t])
      const d1x = -rx * cosPhi * sinT1 - ry * sinPhi * cosT1;
      const d1y = -rx * sinPhi * sinT1 + ry * cosPhi * cosT1;
      const d2x = -rx * cosPhi * sinT2 - ry * sinPhi * cosT2;
      const d2y = -rx * sinPhi * sinT2 + ry * cosPhi * cosT2;

      // Control points using alpha
      const alpha = (4 / 3) * Math.tan((t2 - t1) / 4);

      const c1x = p1x + alpha * d1x;
      const c1y = p1y + alpha * d1y;
      const c2x = p2x - alpha * d2x;
      const c2y = p2y - alpha * d2y;

      result.push({
        type: "C",
        x1: c1x,
        y1: c1y,
        x2: c2x,
        y2: c2y,
        x: p2x,
        y: p2y,
      });

      theta1 = t2;
    }

    return result;
  }

  /**
   * Returns the current drawing point of the path.
   *
   * Iterates through all recorded commands and determines the latest
   * endpoint coordinates, taking into account special cases:
   * - `M` sets a new subpath start and current point.
   * - `L`, `T`, `Q`, `C`, `S` update both x and y to their endpoint.
   * - `H` updates only the x coordinate.
   * - `V` updates only the y coordinate.
   * - `Z` closes the subpath and resets the current point to the last `M`.
   *
   * If no commands exist, the origin `{ x: 0, y: 0 }` is returned.
   *
   * This method is safe to expose publicly, as it provides a convenient way
   * to query the current pen position for building or inspecting paths.
   */
  getCurrentPoint(): Point {
    if (this._commands.length === 0) {
      return { x: 0, y: 0 };
    }

    let x = 0;
    let y = 0;
    let subpathStartX = 0;
    let subpathStartY = 0;

    for (const cmd of this._commands) {
      switch (cmd.type) {
        case "M":
          x = cmd.x;
          y = cmd.y;
          subpathStartX = x;
          subpathStartY = y;
          break;

        case "L":
        case "T":
          x = cmd.x;
          y = cmd.y;
          break;

        case "H":
          x = cmd.x;
          break;

        case "V":
          y = cmd.y;
          break;

        case "Q":
          x = cmd.x;
          y = cmd.y;
          break;

        case "C":
          x = cmd.x;
          y = cmd.y;
          break;

        case "S":
          x = cmd.x;
          y = cmd.y;
          break;

        case "Z":
          x = subpathStartX;
          y = subpathStartY;
          break;
      }
    }

    return { x, y };
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
   * Split the given command list ( by default the current commands ) into subpaths.
   *
   * Each subpath starts with an `M` and ends with a `Z`. If a new `M`
   * appears before a `Z`, the previous subpath is implicitly closed.
   *
   * This does not mutate `this._commands`; it just returns the split
   * subpaths for inspection or further processing.
   *
   * @returns Array of subpath command arrays
   */
  splitSubpaths<T extends IconPathCommand[]>(
    commands: T = this._commands as T
  ): T[] {
    const parts: IconPathCommand[][] = [];
    let current: IconPathCommand[] = [];

    for (const c of commands) {
      if (
        c.type === "M" &&
        current.length > 0 &&
        current[current.length - 1]?.type !== "Z"
      ) {
        parts.push(current);
        current = [];
      }

      current.push(c);

      if (c.type === "Z") {
        parts.push(current);
        current = [];
      }
    }

    if (current.length) parts.push(current);
    return parts as T[];
  }

  /**
   * Compute the signed area of a subpath in font space.
   *
   * Y coordinates are flipped (IconPath size - y) to match font coordinate system.
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
          cx = c.x;
          cy = this._size - c.y;
          pts.push({ x: cx, y: cy });
          break;

        case "L":
          cx = c.x;
          cy = this._size - c.y;
          pts.push({ x: cx, y: cy });
          break;

        case "Q":
          cx = c.x;
          cy = this._size - c.y;
          pts.push({ x: cx, y: cy });
          break;

        case "C":
          cx = c.x;
          cy = this._size - c.y;
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
   * Reverse the drawing direction of a subpath.
   *
   * Walks backwards through the commands, reconstructing reversed equivalents.
   * - L/H/V become L segments with swapped endpoints
   * - Q keeps its control point but swaps endpoints
   * - C swaps its control points and endpoint
   * - M/Z are handled implicitly
   *
   * @param sub A subpath command array (from splitSubpaths)
   * @returns   A new command array with reversed direction
   */
  reverseSubpath<T extends IconPathCommand[]>(sub: T): T {
    const out: IconPathCommand[] = [];

    // Precompute absolute endpoints for each command in authoring space
    const endpoints: (Point | null)[] = new Array(sub.length).fill(null);
    const verts: Point[] = [];
    let cx = 0,
      cy = 0;

    for (let i = 0; i < sub.length; i++) {
      const c = sub[i];
      if (!c) continue;
      switch (c.type) {
        case "M":
          cx = c.x;
          cy = c.y;
          endpoints[i] = { x: cx, y: cy };
          verts.push({ x: cx, y: cy });
          break;
        case "L":
          cx = c.x;
          cy = c.y;
          endpoints[i] = { x: cx, y: cy };
          verts.push({ x: cx, y: cy });
          break;
        case "H":
          cx = c.x;
          endpoints[i] = { x: cx, y: cy };
          verts.push({ x: cx, y: cy });
          break;
        case "V":
          cy = c.y;
          endpoints[i] = { x: cx, y: cy };
          verts.push({ x: cx, y: cy });
          break;
        case "Q":
          cx = c.x;
          cy = c.y;
          endpoints[i] = { x: cx, y: cy };
          verts.push({ x: cx, y: cy });
          break;
        case "C":
          cx = c.x;
          cy = c.y;
          endpoints[i] = { x: cx, y: cy };
          verts.push({ x: cx, y: cy });
          break;
        case "Z":
          endpoints[i] = null; // no endpoint added by Z
          break;
      }
    }

    if (verts.length === 0) return sub.slice() as T;

    // Start at last vertex
    const last = verts[verts.length - 1]!;
    out.push({ type: "M", x: last.x, y: last.y });

    // Helper: find previous endpoint from endpoints[]
    function prevEndpoint(i: number): Point {
      for (let j = i - 1; j >= 0; j--) {
        const ep = endpoints[j];
        if (ep) return ep;
      }
      // Fallback to first vertex (guaranteed by verts.length > 0)
      const first = verts[0]!;
      return { x: first.x, y: first.y };
    }

    // Walk backwards over commands, reconstruct reversed equivalents
    for (let i = sub.length - 1; i >= 0; i--) {
      const c = sub[i]!;
      const prev = prevEndpoint(i);

      switch (c.type) {
        case "L":
          out.push({ type: "L", x: prev.x, y: prev.y });
          break;

        case "H":
          // In reverse, convert to explicit L using prev endpoint
          out.push({
            type: "L",
            x: prev.x,
            y: (out[out.length - 1] as any)?.y ?? prev.y,
          });
          break;

        case "V":
          // In reverse, convert to explicit L using prev endpoint
          out.push({
            type: "L",
            x: (out[out.length - 1] as any)?.x ?? prev.x,
            y: prev.y,
          });
          break;

        case "Q":
          // Reverse quadratic: endpoint becomes prev; keep control point consistent
          out.push({ type: "Q", x1: c.x1, y1: c.y1, x: prev.x, y: prev.y });
          break;

        case "C":
          // Reverse cubic: swap control points; endpoint becomes prev
          out.push({
            type: "C",
            x1: c.x2,
            y1: c.y2,
            x2: c.x1,
            y2: c.y1,
            x: prev.x,
            y: prev.y,
          });
          break;

        case "M":
        case "Z":
          // Ignore; starting M already emitted; Z handled after loop
          break;
      }
    }

    if (sub.some((s) => s.type === "Z")) out.push({ type: "Z" });
    return out as T;
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
   * Convert this icon path into an OpenType.js Path object.
   *
   * - Normalizes winding for font export (outer contour clockwise).
   * - Works only with canonical commands (M/L/Q/C/Z).
   * - Scales coordinates from IconPath size to font metrics height.
   * - Flips Y axis into font space.
   * - Aligns the top of the icon’s bounding box to the ascender line,
   *   so the font reflects the design space faithfully.
   *
   * @param ascender    Ascender height (e.g. 800)
   * @param descender   Descender depth (e.g. -200)
   * @returns           A Path object ready for OpenType.js
   */
  toOpenTypePath(ascender: number, descender: number): Path {
    const metricsHeight = ascender - descender; // vertical band of the font
    const factor = metricsHeight / this._size; // scale design grid into font units
    const path = new Path();
    const cmds = this.getNormalizedWindingForFont(true);

    // Compute bounding box of the normalized path
    const bbox = this.getCommandBounds();

    // Align top of icon bbox to ascender
    const offsetY = ascender - bbox.maxY * factor;

    for (const cmd of cmds) {
      let x = 0,
        y = 0; // default safe values

      if (cmd.type !== "Z") {
        x = cmd.x * factor;
        y = offsetY + (this._size - cmd.y) * factor;
      }

      switch (cmd.type) {
        case "M":
          path.moveTo(x, y);
          break;
        case "L":
          path.lineTo(x, y);
          break;
        case "Q":
          path.quadraticCurveTo(
            cmd.x1 * factor,
            offsetY + (this._size - cmd.y1) * factor,
            x,
            y
          );
          break;
        case "C":
          path.curveTo(
            cmd.x1 * factor,
            offsetY + (this._size - cmd.y1) * factor,
            cmd.x2 * factor,
            offsetY + (this._size - cmd.y2) * factor,
            x,
            y
          );
          break;
        case "Z":
          path.close();
          break;
      }
    }

    return path;
  }

  /**
   * Create a deep copy of this IconPath.
   *
   * This method duplicates the internal command list and source size,
   * returning a new IconPath instance. Use this when you want to branch
   * or reuse a path without mutating the original.
   *
   * @returns A new IconPath with identical commands and source size
   */
  clone(): IconPath {
    const copiedCommands = this._commands.map((cmd) => ({ ...cmd }));
    return new IconPath(this._size, copiedCommands);
  }

  /**
   * Merge multiple IconPath instances into a single path.
   *
   * This static convenience method creates a new IconPath with the given
   * `IconPath size` (defaulting to 24) and appends the command lists from all
   * provided paths into its internal command array. The result is a single
   * composite path that contains the concatenated drawing instructions of
   * each input.
   *
   * Note: This performs a shallow merge of commands; it does not normalize
   * coordinate systems or apply transforms. All paths are assumed to share
   * the same source size and coordinate space.
   *
   * @param paths      Array of IconPath instances to merge
   * @param IconPath size Optional source size for the merged path (defaults to 24)
   * @returns          A new IconPath containing all commands from the input paths
   */
  static merge(paths: IconPath[], size: number = 24): IconPath {
    const merged = new IconPath(size);
    for (const p of paths) {
      merged._commands.push(...p.commands);
    }
    return merged;
  }
}

const COMMA_REGEX = /,/g;
const SPACE_REGEX = /\s+/;
