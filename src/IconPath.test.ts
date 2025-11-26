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

    const descenderBounds = descender.getBounds();

    expect(descenderBounds.minY).toBe(5);
    expect(descenderBounds.maxY).toBe(24);
    expect(descenderBounds.minX).toBe(0);
    expect(descenderBounds.maxX).toBe(24);

    const ascender = folderPath.clone().alignToFont(800, -200, "ascender");

    const ascenderBounds = ascender.getBounds();

    expect(ascenderBounds.minY).toBe(0);
    expect(ascenderBounds.maxY).toBe(19);
    expect(ascenderBounds.minX).toBe(0);
    expect(ascenderBounds.maxX).toBe(24);

    const center = folderPath.clone().alignToFont(800, -200, "center");

    const centerBounds = center.getBounds();

    expect(centerBounds.minY).toBe(2.5);
    expect(centerBounds.maxY).toBe(21.5);
    expect(centerBounds.minX).toBe(0);
    expect(centerBounds.maxX).toBe(24);

    const baseline = folderPath.clone().alignToFont(800, -200, "baseline");

    const baselineBounds = baseline.getBounds();

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
      .close()
      .center(0, 0, 24, 24);

    const folderPathBounds = folderPath.getBounds();

    expect(folderPathBounds.minY).toBe(2.5);
    expect(folderPathBounds.maxY).toBe(21.5);
    expect(folderPathBounds.minX).toBe(0);
    expect(folderPathBounds.maxX).toBe(24);

    const preserveAspect = folderPath.clone().fit();

    const preserveAspectBounds = preserveAspect.getBounds();

    // no change expected
    expect(preserveAspectBounds.minY).toBe(2.5);
    expect(preserveAspectBounds.maxY).toBe(21.5);
    expect(preserveAspectBounds.minX).toBe(0);
    expect(preserveAspectBounds.maxX).toBe(24);

    const noAspect = folderPath
      .clone()
      .fit(folderPath.width, folderPath.height, false);

    const noAspectBounds = noAspect.getBounds();

    expect(noAspectBounds.minY).toBe(0);
    expect(noAspectBounds.maxY).toBe(24);
    expect(noAspectBounds.minX).toBe(0);
    expect(noAspectBounds.maxX).toBe(24);
  });

  test("toOpenTypePath", () => {
    const path = new IconPath().rect({
      x: 0,
      y: 0,
      width: 24,
      height: 24,
    });

    const otPath = path.clone().toOpenTypePath(800, -200);

    const otPathBounds = otPath.getBoundingBox();

    expect(otPathBounds.x1).toBe(0);
    expect(otPathBounds.y1).toBe(-200);
    expect(otPathBounds.x2).toBe(1000);
    expect(otPathBounds.y2).toBe(800);

    const otHalfPath = path.clone().scale(0.5).toOpenTypePath(800, -200);

    const otHalfPathBounds = otHalfPath.getBoundingBox();

    expect(otHalfPathBounds.x1).toBe(250);
    expect(otHalfPathBounds.y1).toBe(50);
    expect(otHalfPathBounds.x2).toBe(750);
    expect(otHalfPathBounds.y2).toBe(550);

    const bottomMiddlePath = path.clone().scale(1 / 10);

    bottomMiddlePath.translate(0, 24 - bottomMiddlePath.getBounds().maxY);

    const otBottomMiddlePath = bottomMiddlePath.toOpenTypePath(800, -200);

    const otBottomMiddleBounds = otBottomMiddlePath.getBoundingBox();

    expect(Math.round(otBottomMiddleBounds.x1 * 100) / 100).toBe(450);
    expect(Math.round(otBottomMiddleBounds.y1 * 100) / 100).toBe(-200);
    expect(Math.round(otBottomMiddleBounds.x2 * 100) / 100).toBe(550);
    expect(Math.round(otBottomMiddleBounds.y2 * 100) / 100).toBe(-100);
  });
});
