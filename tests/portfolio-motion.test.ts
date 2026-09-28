import { describe, expect, it } from "vitest";
import { sectionProgress, wrapIndex, galleryFrame } from "../src/features/portfolio/motion";

describe("portfolio inside the personal homepage scroller", () => {
  it("starts after the existing intro and supports reversing back to it", () => {
    expect(sectionProgress(700, 900, 3600, 900)).toBe(0);
    expect(sectionProgress(2250, 900, 3600, 900)).toBe(0.5);
    expect(sectionProgress(5000, 900, 3600, 900)).toBe(1);
    expect(sectionProgress(0, 900, 3600, 900)).toBe(0);
  });
  it("has a finite static layout when the section fits the viewport", () => {
    expect(sectionProgress(900, 900, 844, 844)).toBe(0);
  });
  it("cycles the artwork controls in both directions", () => {
    expect(wrapIndex(-1, 8)).toBe(7);
    expect(wrapIndex(8, 8)).toBe(0);
    expect(wrapIndex(-17, 8)).toBe(7);
  });
  it("brings every study into the readable plane before the finale", () => {
    for (let index = 0; index < 16; index++) {
      const frame = galleryFrame(index, index / 15, 16);
      expect(frame.opacity).toBe(1);
      expect(frame.z).toBe(0);
      expect(frame.interactive).toBe(true);
    }
    expect(galleryFrame(0, 1, 16).interactive).toBe(false);
    expect(galleryFrame(15, 0, 16).opacity).toBe(0);
  });
});
