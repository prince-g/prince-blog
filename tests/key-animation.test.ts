import { describe, expect, it } from "vitest";
import { createKeyAnimationState, stepKeyAnimation } from "../src/features/keyboard/animation/key-animation";

describe("key animation", () => {
  it("moves only the pressed state toward -0.16 and glow 1", () => {
    const pressed = createKeyAnimationState();
    const neighbor = createKeyAnimationState();
    pressed.pressed = true;

    stepKeyAnimation(pressed, 1 / 60);
    stepKeyAnimation(neighbor, 1 / 60);

    expect(pressed.offsetY).toBeLessThan(0);
    expect(pressed.glow).toBeGreaterThan(0);
    expect(neighbor.offsetY).toBe(0);
    expect(neighbor.glow).toBe(0);
  });

  it("is independent of the number of frames used for the same elapsed time", () => {
    const oneFrame = createKeyAnimationState();
    const sixtyFrames = createKeyAnimationState();
    oneFrame.pressed = true;
    sixtyFrames.pressed = true;

    stepKeyAnimation(oneFrame, 1);
    for (let frame = 0; frame < 60; frame += 1) {
      stepKeyAnimation(sixtyFrames, 1 / 60);
    }

    expect(sixtyFrames.offsetY).toBeCloseTo(oneFrame.offsetY, 10);
    expect(sixtyFrames.glow).toBeCloseTo(oneFrame.glow, 10);
  });

  it("returns released state to neutral values and snaps tiny tails to zero", () => {
    const state = createKeyAnimationState();
    state.pressed = true;
    stepKeyAnimation(state, 1);
    state.pressed = false;

    for (let frame = 0; frame < 240; frame += 1) {
      stepKeyAnimation(state, 1 / 60);
    }

    expect(state.offsetY).toBe(0);
    expect(state.glow).toBe(0);
  });
});
