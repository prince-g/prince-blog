import data from "../public/models/keychron-k2-he/models/keyboards/K_2_HE/keyboardData.json";
import { describe, expect, it } from "vitest";
import { buildAssemblyPlan } from "../src/features/keyboard/model/build-assembly-plan";
import { MODEL_KEY_BY_CODE, NON_DETECTABLE_MODEL_KEYS } from "../src/features/keyboard/data/keyboard-key-map";
import { parseKeyboardData } from "../src/features/keyboard/model/parse-keyboard-data";

describe("keyboard assembly plan", () => {
  it("creates 84 unique keys using existing keycap node names", () => {
    const plan = buildAssemblyPlan(parseKeyboardData(data));
    expect(plan.keys).toHaveLength(84);
    expect(new Set(plan.keys.map((key) => key.modelKey)).size).toBe(84);
    expect(plan.keys.every((key) => plan.keycapModels.has(key.capModel))).toBe(true);
  });

  it("maps every browser-detectable key and documents two exceptions", () => {
    const keys = Object.keys(data.keyPosition);
    const mapped = new Set(Object.values(MODEL_KEY_BY_CODE));
    expect(keys.filter((key) => !mapped.has(key))).toEqual([...NON_DETECTABLE_MODEL_KEYS]);
    expect([...NON_DETECTABLE_MODEL_KEYS]).toEqual(["Fn", "LightMode"]);
  });
});
