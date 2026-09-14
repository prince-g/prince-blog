import { afterEach, describe, expect, it, vi } from "vitest";
import { KeyboardDataError } from "../src/features/keyboard/model/parse-keyboard-data";
import {
  getKeyboardDefinition,
  loadKeyboardDefinition,
  resetKeyboardAssetCaches,
} from "../src/features/keyboard/model/use-keyboard-assets";

const definitionFile = "models/keyboards/K_2_HE/keyboardData.json";
const validDefinition = {
  keyboardOffset: [0, 0, 0],
  keycapUVOffsetScale: [0, 0, 1, 1],
  switchOrientation: "north",
  keyPosition: {},
};

afterEach(() => {
  resetKeyboardAssetCaches();
});

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

  it("starts a fresh definition request after retry clears a rejected cache entry", async () => {
    const offline = new TypeError("offline");
    const fetcher = vi.fn()
      .mockRejectedValueOnce(offline)
      .mockResolvedValueOnce(new Response(JSON.stringify(validDefinition)));

    await expect(getKeyboardDefinition(definitionFile, fetcher)).rejects.toMatchObject({ cause: offline });
    await expect(getKeyboardDefinition(definitionFile, fetcher)).rejects.toMatchObject({ cause: offline });
    expect(fetcher).toHaveBeenCalledOnce();

    resetKeyboardAssetCaches();

    await expect(getKeyboardDefinition(definitionFile, fetcher)).resolves.toMatchObject(validDefinition);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
