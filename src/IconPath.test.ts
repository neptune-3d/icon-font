import { describe, expect, test } from "vitest";
import { IconPath } from "./IconPath";

describe("IconPath", () => {
  test("alignToFont", () => {
    const folderPath = new IconPath(24)
      .m(0, 0)
      .roundedCorner("tl", 0, 0, 3, 3)
      .l(9, 0)
      .l(12, 3)
      .roundedCorner("tr", 24, 3, 3, 3)
      .roundedCorner("br", 24, 19, 3, 3)
      .roundedCorner("bl", 0, 19, 3, 3)
      .close();

    const descender = folderPath.clone().alignToFont(800, -200, "descender");

    const descenderBounds = descender.getCommandBounds();

    expect(descenderBounds.minY).toBe(5);
    expect(descenderBounds.maxY).toBe(24);
    expect(descenderBounds.minX).toBe(0);
    expect(descenderBounds.maxX).toBe(24);

    const ascender = folderPath.clone().alignToFont(800, -200, "ascender");

    const ascenderBounds = ascender.getCommandBounds();

    expect(ascenderBounds.minY).toBe(0);
    expect(ascenderBounds.maxY).toBe(19);
    expect(ascenderBounds.minX).toBe(0);
    expect(ascenderBounds.maxX).toBe(24);

    const center = folderPath.clone().alignToFont(800, -200, "center");

    const centerBounds = center.getCommandBounds();

    expect(centerBounds.minY).toBe(2.5);
    expect(centerBounds.maxY).toBe(21.5);
    expect(centerBounds.minX).toBe(0);
    expect(centerBounds.maxX).toBe(24);

    const baseline = folderPath.clone().alignToFont(800, -200, "baseline");

    const baselineBounds = baseline.getCommandBounds();

    expect(Math.round(baselineBounds.minY * 100) / 100).toBe(0.2);
    expect(Math.round(baselineBounds.maxY * 100) / 100).toBe(19.2);
    expect(baselineBounds.minX).toBe(0);
    expect(baselineBounds.maxX).toBe(24);
  });

  test("fit", () => {
    const folderPath = new IconPath(24)
      .m(0, 0)
      .roundedCorner("tl", 0, 0, 3, 3)
      .l(9, 0)
      .l(12, 3)
      .roundedCorner("tr", 24, 3, 3, 3)
      .roundedCorner("br", 24, 19, 3, 3)
      .roundedCorner("bl", 0, 19, 3, 3)
      .close();

    const preserveAspect = folderPath.clone().fit(true);

    const preserveAspectBounds = preserveAspect.getCommandBounds();

    expect(preserveAspectBounds.minY).toBe(2.5);
    expect(preserveAspectBounds.maxY).toBe(21.5);
    expect(preserveAspectBounds.minX).toBe(0);
    expect(preserveAspectBounds.maxX).toBe(24);

    const noAspect = folderPath.clone().fit(false);

    const noAspectBounds = noAspect.getCommandBounds();

    expect(noAspectBounds.minY).toBe(0);
    expect(noAspectBounds.maxY).toBe(24);
    expect(noAspectBounds.minX).toBe(0);
    expect(noAspectBounds.maxX).toBe(24);
  });
});
