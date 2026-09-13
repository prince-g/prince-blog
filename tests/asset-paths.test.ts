import { describe, expect, it } from "vitest";
import { KEYCHRON_ASSET_ROOT } from "../src/features/keyboard/model/asset-paths";

describe("Keychron asset paths", () => {
  it("exports the browser resource root", () => {
    expect(KEYCHRON_ASSET_ROOT).toBe("/models/keychron-k2-he");
  });
});
