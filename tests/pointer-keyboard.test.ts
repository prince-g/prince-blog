import { describe, expect, it, vi } from "vitest";
import { KeyRegistry } from "../src/features/keyboard/interaction/key-registry";
import { createPointerKeyHandlers, modelKeyToText } from "../src/features/keyboard/interaction/pointer-keyboard";

const pointer = (overrides: Partial<PointerEvent> = {}) => ({ pointerId: 1, clientX: 20, clientY: 30, button: 0, isPrimary: true, ...overrides });

describe("pointer keyboard", () => {
  it("presses immediately and commits exactly one character only on a matching tap release", () => {
    const registry = new KeyRegistry();
    const input = vi.fn();
    const handlers = createPointerKeyHandlers(registry, "KeyD", input);
    handlers.pointerdown(pointer());
    expect(registry.getAnimation("KeyD").pressed).toBe(true);
    expect(input).not.toHaveBeenCalled();
    handlers.pointerup(pointer({ pointerId: 2 }));
    expect(registry.getAnimation("KeyD").pressed).toBe(true);
    handlers.pointerup(pointer({ clientX: 23 }));
    handlers.pointerup(pointer());
    expect(registry.getAnimation("KeyD").pressed).toBe(false);
    expect(input).toHaveBeenCalledExactlyOnceWith({ key: "d" });
  });

  it("cancels text after a drag even when it returns to the original point", () => {
    const registry = new KeyRegistry();
    const input = vi.fn();
    const handlers = createPointerKeyHandlers(registry, "Space", input);
    handlers.pointerdown(pointer());
    handlers.pointermove(pointer({ clientX: 31 }));
    expect(registry.getAnimation("Space").pressed).toBe(false);
    handlers.pointerup(pointer());
    expect(input).not.toHaveBeenCalled();
  });

  it("cleans up a pointer without releasing a simultaneous physical key or making blur sounds", () => {
    const registry = new KeyRegistry();
    const audio = { unlock: vi.fn(), play: vi.fn(), stop: vi.fn() };
    registry.setAudio(audio);
    const input = vi.fn();
    const handlers = createPointerKeyHandlers(registry, "KeyH", input);
    handlers.pointerdown(pointer());
    handlers.reset();
    expect(audio.play).toHaveBeenCalledExactlyOnceWith("KeyH", "press");
    registry.press("KeyH");
    handlers.pointerdown(pointer());
    handlers.pointercancel(pointer({ pointerId: 2 }));
    handlers.pointercancel(pointer());
    expect(registry.getAnimation("KeyH").pressed).toBe(true);
    handlers.pointerup(pointer());
    expect(input).not.toHaveBeenCalled();
    registry.release("KeyH");
    expect(registry.getAnimation("KeyH").pressed).toBe(false);
  });

  it("ignores secondary presses and disabled phases, including a phase change before release", () => {
    const registry = new KeyRegistry();
    let enabled = false;
    const input = vi.fn();
    const handlers = createPointerKeyHandlers(registry, "Enter", input, () => enabled);
    handlers.pointerdown(pointer());
    enabled = true;
    handlers.pointerdown(pointer({ button: 2 }));
    expect(registry.getAnimation("Enter").pressed).toBe(false);
    handlers.pointerdown(pointer());
    enabled = false;
    handlers.pointerup(pointer());
    expect(registry.getAnimation("Enter").pressed).toBe(false);
    expect(input).not.toHaveBeenCalled();
  });

  it("maps letters, shifted digits, punctuation, space and editing keys without inserting model names", () => {
    expect(modelKeyToText("KeyL")).toBe("l");
    expect(modelKeyToText("KeyL", true)).toBe("L");
    expect(modelKeyToText("Digit1", true)).toBe("!");
    expect(modelKeyToText("BracketLeft")).toBe("[");
    expect(modelKeyToText("Slash", true)).toBe("?");
    expect(modelKeyToText("Space")).toBe(" ");
    expect(modelKeyToText("Enter")).toBe("Enter");
    expect(modelKeyToText("Backspace")).toBe("Backspace");
    for (const key of ["Fn", "LightMode", "ShiftLeft", "F1", "ArrowUp"]) expect(modelKeyToText(key)).toBeUndefined();
  });

  it("honors a held shift and browser shortcut modifiers", () => {
    const registry = new KeyRegistry();
    const input = vi.fn();
    const handlers = createPointerKeyHandlers(registry, "KeyD", input);
    registry.press("ShiftLeft");
    handlers.pointerdown(pointer()); handlers.pointerup(pointer());
    expect(input).toHaveBeenCalledExactlyOnceWith({ key: "D" });
    handlers.pointerdown(pointer({ ctrlKey: true })); handlers.pointerup(pointer({ ctrlKey: true }));
    expect(input).toHaveBeenCalledTimes(1);
  });
});
