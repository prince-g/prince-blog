import { afterEach, describe, expect, it, vi } from "vitest";
import { useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KEYCHRON_ASSET_ROOT } from "../src/features/keyboard/model/asset-paths";
import { getAssetProgress, keyboardLoadingManager } from "../src/features/keyboard/model/asset-progress";
import { KeyboardDataError } from "../src/features/keyboard/model/parse-keyboard-data";
import {
  getKeyboardDefinition,
  loadKeyboardDefinition,
  resetKeyboardAssetCaches,
} from "../src/features/keyboard/model/use-keyboard-assets";
import { resetKeyboardSceneAssetCache } from "../src/features/keyboard/scene/KeyboardScene";
import data from "../public/models/keychron-k2-he/models/keyboards/K_2_HE/keyboardData.json";

const definitionFile = "models/keyboards/K_2_HE/keyboardData.json";
const validDefinition = {
  keyboardOffset: [0, 0, 0],
  keycapUVOffsetScale: [0, 0, 1, 1],
  switchOrientation: "north",
  keyPosition: {},
  colorSets: data.colorSets,
  unfoldPosition: data.unfoldPosition,
};

afterEach(() => {
  resetKeyboardAssetCaches();
});

describe("keyboard definition loading errors", () => {
  it("counts a validated definition once and leaves a cache hit without synthetic loading", async () => {
    resetKeyboardAssetCaches();
    keyboardLoadingManager.itemStart("pending-keyboard.glb");
    await getKeyboardDefinition(definitionFile, async () => new Response(JSON.stringify(validDefinition)));
    expect(getAssetProgress()).toBe(49);
    await getKeyboardDefinition(definitionFile, async () => { throw new Error("cached definition was fetched again"); });
    expect(getAssetProgress()).toBe(49);
    keyboardLoadingManager.itemEnd("pending-keyboard.glb");
    expect(getAssetProgress()).toBe(99);
    resetKeyboardAssetCaches();
    expect(getAssetProgress()).toBe(0);
  });

  it("does not report a failed JSON definition as completed progress", async () => {
    resetKeyboardAssetCaches();
    await expect(loadKeyboardDefinition(definitionFile, async () => new Response("{}"))).rejects.toThrow();
    expect(getAssetProgress()).toBe(0);
  });

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

    await expect(getKeyboardDefinition(definitionFile, fetcher)).resolves.toMatchObject({ keyboardOffset: [0, 0, 0], keyPosition: {} });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("clears every R3F loader cache required before a scene retry", () => {
    const clear = vi.spyOn(useLoader, "clear").mockImplementation(() => {});
    const glbUrls = [
      `${KEYCHRON_ASSET_ROOT}/models/keyboards/K_2_HE/Keyboard.glb`,
      `${KEYCHRON_ASSET_ROOT}/models/keycaps/KSA/keycaps.glb`,
      `${KEYCHRON_ASSET_ROOT}/models/switches/Gateron Double-Rail Magnetic Nebula Switch/switch.glb`,
      `${KEYCHRON_ASSET_ROOT}/models/common/common.glb`,
    ];
    const textureUrls = [
      `${KEYCHRON_ASSET_ROOT}/models/keyboards/K_2_HE/textures/keycap_font_mac.jpg`,
      `${KEYCHRON_ASSET_ROOT}/models/keycaps/KSA/keycap-bump-n.jpg`,
    ];

    try {
      resetKeyboardAssetCaches();
      resetKeyboardSceneAssetCache();

      expect(clear).toHaveBeenCalledWith(GLTFLoader, glbUrls);
      expect(clear).toHaveBeenCalledWith(TextureLoader, textureUrls);
      expect(clear).toHaveBeenCalledWith(
        TextureLoader,
        `${KEYCHRON_ASSET_ROOT}/textures/hdr/potsdamer_platz_1k_compressed.jpg`,
      );
    } finally {
      clear.mockRestore();
    }
  });
});
