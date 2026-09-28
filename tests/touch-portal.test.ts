import { describe, expect, it } from "vitest";
import { portalContour } from "../src/features/portrait/TouchPortal";

describe("touch portal geometry", () => {
  it.each([[1440, 900], [390, 844], [2560, 1080]])("opens from the fingertip center and covers a %ix%i viewport", (width, height) => {
    expect(portalContour(0, width, height).every(({ x, y }) => x === width / 2 && y === height / 2)).toBe(true);
    // Every edge of the final convex-ish contour is beyond all four viewport corners.
    const points = portalContour(1, width, height);
    for (const corner of [[0, 0], [width, 0], [0, height], [width, height]]) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[i], b = points[j];
        if ((a.y > corner[1]) !== (b.y > corner[1]) && corner[0] < (b.x - a.x) * (corner[1] - a.y) / (b.y - a.y) + a.x) inside = !inside;
      }
      expect(inside).toBe(true);
    }
  });
});
