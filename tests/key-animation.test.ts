import { describe, expect, it } from "vitest";
import { createKeyAnimationState, stepKeyAnimation } from "../src/features/keyboard/animation/key-animation";
import { KeyRegistry } from "../src/features/keyboard/interaction/key-registry";

describe("mechanical key travel", () => {
  it("moves only the held key down and holds at the switch travel", () => {
    const key = createKeyAnimationState();
    const neighbor = createKeyAnimationState();
    key.pressed = true;
    stepKeyAnimation(key, 0.035);
    stepKeyAnimation(neighbor, 0.035);
    expect(key.offsetY).toBeLessThan(-0.15);
    expect(key.offsetY).toBeGreaterThanOrEqual(-0.25);
    expect(neighbor.offsetY).toBe(0);
    stepKeyAnimation(key, 1);
    expect(key.offsetY).toBeCloseTo(-0.25, 5);
  });
  it("keeps held travel independent of frame rate", () => {
    const a = createKeyAnimationState(), b = createKeyAnimationState();
    a.pressed = b.pressed = true;
    stepKeyAnimation(a, 0.1);
    for (let i = 0; i < 6; i++) stepKeyAnimation(b, 1 / 60);
    expect(a.offsetY).toBeCloseTo(b.offsetY, 8);
  });
  it("latches a quick tap occurring between two render frames and releases naturally", () => {
    const registry = new KeyRegistry();
    registry.press("KeyA");
    registry.release("KeyA");
    const key = registry.getAnimation("KeyA");
    stepKeyAnimation(key, 1 / 60);
    expect(key.offsetY).toBeLessThan(-0.05);
    for (let i = 0; i < 60; i++) stepKeyAnimation(key, 1 / 60);
    expect(key.offsetY).toBe(0);
  });
  it("resets both a held key and a released key that is still rebounding on blur", () => {
    const registry = new KeyRegistry();
    registry.press("KeyA"); registry.press("Space");
    const a = registry.getAnimation("KeyA"), space = registry.getAnimation("Space");
    stepKeyAnimation(a, 0.1); stepKeyAnimation(space, 0.1);
    registry.release("KeyA");
    registry.releaseAll();
    expect(a.offsetY).toBe(0); expect(space.offsetY).toBe(0);
    expect(a.pressed).toBe(false); expect(space.pressed).toBe(false);
    stepKeyAnimation(a, 1 / 60);
    expect(a.offsetY).toBe(0);
  });
});
