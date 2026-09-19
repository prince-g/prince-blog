import { describe, expect, it } from "vitest";
import { computeLegendTransform } from "../src/features/keyboard/model/legend-transform";

describe("legend transform", () => {
  it("maps KeyA board coordinates into normalized atlas coordinates", () => {
    const value = computeLegendTransform(
      { x: -10.928000450134277, z: 0.9500422477722168 },
      [0.5, 0.49, 32.04, 12.79],
    );

    // 0.5 + (-10.928000450134277 / 32.04) = 0.158997...;
    // 0.49 - (0.9500422477722168 / 12.79) = 0.415684...
    expect(value.offsetX).toBeCloseTo(0.1589, 3);
    expect(value.offsetY).toBeCloseTo(0.4157, 3);
    // A 1.82-unit key covers only its own patch of the full keyboard atlas.
    expect(value.scaleX * 1.82).toBeCloseTo(0.056804, 5);
    expect(value.scaleY * 1.82).toBeCloseTo(-0.142299, 5);
  });

  it("uses each axis scale and preserves finite boundary values", () => {
    const value = computeLegendTransform(
      { x: Number.MAX_VALUE, z: -Number.MAX_VALUE },
      [0, 0, Number.MAX_VALUE, Number.MAX_VALUE],
    );

    // 0 + (MAX_VALUE / MAX_VALUE) = 1; 0 - (-MAX_VALUE / MAX_VALUE) = 1.
    expect(value.offsetX).toBe(1);
    expect(value.offsetY).toBe(1);
    expect(Number.isFinite(value.offsetX)).toBe(true);
    expect(Number.isFinite(value.offsetY)).toBe(true);
  });

  it.each([
    [0, 12.79],
    [32.04, 0],
    [0, 0],
  ])("rejects a zero atlas scale (%s, %s)", (scaleX, scaleY) => {
    expect(() => computeLegendTransform({ x: 0, z: 0 }, [0.5, 0.49, scaleX, scaleY])).toThrow(/scale/i);
  });

  it("rejects a transform that would produce a non-finite result", () => {
    expect(() => computeLegendTransform({ x: Number.MAX_VALUE, z: 0 }, [0.5, 0.49, Number.MIN_VALUE, 1])).toThrow(/finite/i);
  });
});
