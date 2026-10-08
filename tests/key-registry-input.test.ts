import { describe, expect, it, vi } from "vitest";
import { KeyRegistry } from "../src/features/keyboard/interaction/key-registry";

describe("shared keyboard input sources", () => {
  it("can reset key travel at a phase boundary while the last audio sample finishes", () => {
    const registry = new KeyRegistry();
    const audio = { unlock: vi.fn(), play: vi.fn(), stop: vi.fn() };
    registry.setAudio(audio);
    registry.press("Enter");
    registry.releaseAll(false);
    expect(registry.getAnimation("Enter").pressed).toBe(false);
    expect(registry.getAnimation("Enter").holdRemaining).toBe(0);
    expect(audio.stop).not.toHaveBeenCalled();
    registry.release("Enter");
    expect(audio.play).toHaveBeenCalledExactlyOnceWith("Enter", "press");
    registry.releaseAll();
    expect(audio.stop).toHaveBeenCalledOnce();
  });

  it("keeps a key held until its last source releases and plays only state edges", () => {
    const registry = new KeyRegistry();
    const audio = { unlock: vi.fn(), play: vi.fn(), stop: vi.fn() };
    registry.setAudio(audio);
    registry.press("KeyD");
    registry.press("KeyD");
    registry.press("KeyD", "pointer:1");
    registry.release("KeyD", "pointer:2");
    registry.release("KeyD");
    expect(registry.getAnimation("KeyD").pressed).toBe(true);
    expect(audio.play).toHaveBeenCalledExactlyOnceWith("KeyD", "press");
    registry.release("KeyD", "pointer:1");
    registry.release("KeyD", "pointer:1");
    expect(registry.getAnimation("KeyD").pressed).toBe(false);
    expect(audio.play.mock.calls).toEqual([["KeyD", "press"], ["KeyD", "up"]]);
  });

  it("resets silently on blur, stops voices, and tolerates unavailable audio", () => {
    const registry = new KeyRegistry();
    const audio = { unlock: vi.fn(), play: vi.fn(), stop: vi.fn() };
    registry.setAudio(audio);
    registry.press("KeyH", "pointer:1");
    registry.releaseAll();
    registry.release("KeyH", "pointer:1");
    expect(registry.getAnimation("KeyH").pressed).toBe(false);
    expect(audio.play).toHaveBeenCalledExactlyOnceWith("KeyH", "press");
    expect(audio.stop).toHaveBeenCalledOnce();
    registry.setAudio({ unlock() { throw new Error("blocked"); }, play() { throw new Error("missing"); }, stop() {} });
    expect(() => registry.press("Space")).not.toThrow();
    expect(registry.getAnimation("Space").pressed).toBe(true);
    expect(() => registry.release("Space")).not.toThrow();
  });
});
