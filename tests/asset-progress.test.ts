import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getAssetProgress,
  keyboardLoadingManager,
  resetAssetProgress,
  subscribeAssetProgress,
} from "../src/features/keyboard/model/asset-progress";

beforeEach(resetAssetProgress);
afterEach(resetAssetProgress);

describe("keyboard resource progress", () => {
  it("advances only when real manager items finish and leaves 100 for scene readiness", () => {
    const published: number[] = [];
    const unsubscribe = subscribeAssetProgress(() => published.push(getAssetProgress()));
    try {
      keyboardLoadingManager.itemStart("keyboard.glb");
      keyboardLoadingManager.itemStart("legends.jpg");
      expect(getAssetProgress()).toBe(0);
      keyboardLoadingManager.itemEnd("keyboard.glb");
      expect(getAssetProgress()).toBe(49);
      keyboardLoadingManager.itemEnd("legends.jpg");
      expect(getAssetProgress()).toBe(99);
      expect(published).toEqual([49, 99]);
      unsubscribe();
      resetAssetProgress();
      expect(published).toEqual([49, 99]);
    } finally { unsubscribe(); }
  });

  it("never moves backward when a GLB reveals additional embedded resources", () => {
    keyboardLoadingManager.itemStart("keyboard.glb");
    keyboardLoadingManager.itemStart("keycaps.glb");
    keyboardLoadingManager.itemEnd("keycaps.glb");
    expect(getAssetProgress()).toBe(49);

    keyboardLoadingManager.itemStart("wood.jpg");
    keyboardLoadingManager.itemStart("metal.jpg");
    keyboardLoadingManager.itemEnd("wood.jpg");
    expect(getAssetProgress()).toBe(49);
    keyboardLoadingManager.itemEnd("metal.jpg");
    expect(getAssetProgress()).toBe(74);
    keyboardLoadingManager.itemEnd("keyboard.glb");
    expect(getAssetProgress()).toBe(99);
  });

  it("does not count a failed item as success when Three closes the item afterwards", () => {
    keyboardLoadingManager.itemStart("keyboard.glb");
    keyboardLoadingManager.itemStart("legends.jpg");
    keyboardLoadingManager.itemEnd("legends.jpg");
    keyboardLoadingManager.itemError("keyboard.glb");
    keyboardLoadingManager.itemEnd("keyboard.glb");
    expect(getAssetProgress()).toBe(49);
  });

  it("starts retry from zero and ignores late completions from the previous attempt", () => {
    const previous = keyboardLoadingManager;
    previous.itemStart("old-keyboard.glb");
    previous.itemStart("old-legends.jpg");
    previous.itemEnd("old-legends.jpg");
    resetAssetProgress();
    expect(getAssetProgress()).toBe(0);

    keyboardLoadingManager.itemStart("retry-keyboard.glb");
    keyboardLoadingManager.itemStart("retry-legends.jpg");
    previous.itemError("old-keyboard.glb");
    previous.itemEnd("old-keyboard.glb");
    expect(getAssetProgress()).toBe(0);
    keyboardLoadingManager.itemEnd("retry-legends.jpg");
    expect(getAssetProgress()).toBe(49);
    keyboardLoadingManager.itemEnd("retry-keyboard.glb");
    expect(getAssetProgress()).toBe(99);
  });
});
