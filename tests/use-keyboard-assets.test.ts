import { describe, expect, it } from "vitest";
import { KeyboardDataError } from "../src/features/keyboard/model/parse-keyboard-data";
import { loadKeyboardDefinition } from "../src/features/keyboard/model/use-keyboard-assets";

const definitionFile = "models/keyboards/K_2_HE/keyboardData.json";

describe("keyboard definition loading errors", () => {
  it("includes the relative asset name when the network request rejects", async () => {
    const networkError = new TypeError("offline");

    await expect(loadKeyboardDefinition(definitionFile, async () => Promise.reject(networkError))).rejects.toMatchObject({
      message: expect.stringContaining(definitionFile),
      cause: networkError,
    });
  });

  it("includes the relative asset name when JSON decoding rejects", async () => {
    await expect(loadKeyboardDefinition(definitionFile, async () => new Response("{"))).rejects.toMatchObject({
      message: expect.stringContaining(definitionFile),
      cause: expect.any(SyntaxError),
    });
  });

  it("includes the relative asset name when definition validation rejects", async () => {
    await expect(loadKeyboardDefinition(definitionFile, async () => new Response("{}"))).rejects.toMatchObject({
      message: expect.stringContaining(definitionFile),
      cause: expect.any(KeyboardDataError),
    });
  });
});
