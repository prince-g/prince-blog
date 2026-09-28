import { describe, expect, it } from "vitest";
import data from "../public/models/keychron-k2-he/models/keyboards/K_2_HE/keyboardData.json";
import { parseKeyboardData } from "../src/features/keyboard/model/parse-keyboard-data";

describe("K2 HE rendering data", () => {
  it("preserves the supplied closed assembly positions instead of the exploded targets", () => {
    const definition = parseKeyboardData(data);
    expect(definition.foldedPositions.keyCaps).toEqual({ x: 0, y: 2.6, z: 0 });
    expect(definition.foldedPositions.plate).toEqual({ x: 0, y: 2.42, z: 0 });
    expect(definition.foldedPositions.siliconeAcousticPad).toEqual({ x: 0, y: 3, z: 0 });
    expect(definition.foldedPositions.topCaseK_L).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("keeps the white-gold palette and identifies the two gold accent keys", () => {
    const definition = parseKeyboardData(data);
    expect(definition.colorSet).toMatchObject({
      highlightColor: { keycapColor: "#D9AE74", fontColor: "#fff" },
      primaryColor: { keycapColor: "#F2F2F0", fontColor: "#000" },
      caseColor: "#F2F2F0",
      plateColor: "#eee",
    });
    expect(Object.values(definition.keyPosition).filter((key) => key.colorRole === "highlightColor").map((key) => key.key)).toEqual(["Enter", "Escape"]);
    expect(definition.keyPosition.KeyA.colorRole).toBe("primaryColor");
  });

  it("rejects malformed closed positions and colors at the JSON boundary", () => {
    const invalidPosition = structuredClone(data);
    invalidPosition.unfoldPosition.keyCaps.from.y = Number.NaN;
    expect(() => parseKeyboardData(invalidPosition)).toThrow(/unfoldPosition.keyCaps.from.y/);
    const invalidColor = structuredClone(data);
    invalidColor.colorSets.White.colorSet.caseColor = "not-a-color";
    expect(() => parseKeyboardData(invalidColor)).toThrow(/caseColor/);
  });
});
