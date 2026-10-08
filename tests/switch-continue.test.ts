import { describe, expect, it, vi } from "vitest";
import { createSwitchContinueHandlers } from "../src/features/keyboard/interaction/switch-continue";

const key = (overrides: Partial<KeyboardEvent> = {}) => ({
  key: "a", code: "KeyA", repeat: false, isComposing: false, ctrlKey: false, metaKey: false, altKey: false,
  keyCode: 65, target: null, preventDefault: vi.fn(), ...overrides,
});
const pointer = (overrides: Partial<PointerEvent> = {}) => ({
  pointerId: 1, clientX: 50, clientY: 50, isPrimary: true, target: null, ...overrides,
});

describe("continue from the focused switch", () => {
  it("continues only once for a safe key, even when another key or click follows", () => {
    const onContinue = vi.fn();
    const handlers = createSwitchContinueHandlers(onContinue);
    const event = key();
    handlers.keydown(event);
    handlers.keydown(key({ key: "Enter" }));
    handlers.pointerdown(pointer());
    handlers.pointerup(pointer());
    expect(onContinue).toHaveBeenCalledOnce();
    expect(onContinue).toHaveBeenCalledWith("keyboard");
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it("leaves controls, browser shortcuts, repeated keys and composition alone", () => {
    const onContinue = vi.fn();
    const handlers = createSwitchContinueHandlers(onContinue);
    const control = Object.assign(new EventTarget(), { closest: () => ({}) });
    for (const event of [
      key({ key: "Tab" }), key({ key: "Control" }), key({ key: "Shift" }), key({ key: "F5" }),
      key({ ctrlKey: true }), key({ metaKey: true }), key({ altKey: true }), key({ repeat: true }),
      key({ isComposing: true }), key({ keyCode: 229 }), key({ target: control }),
    ]) {
      handlers.keydown(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
    }
    handlers.pointerdown(pointer({ target: control }));
    handlers.pointerup(pointer());
    expect(onContinue).not.toHaveBeenCalled();
    handlers.keydown(key({ key: " " }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("distinguishes clicks from dragging, including a drag that returns to its origin", () => {
    const onContinue = vi.fn();
    const handlers = createSwitchContinueHandlers(onContinue);
    handlers.pointerdown(pointer());
    handlers.pointermove(pointer({ clientX: 70 }));
    handlers.pointerup(pointer());
    expect(onContinue).not.toHaveBeenCalled();
    handlers.pointerdown(pointer());
    handlers.pointerup(pointer({ clientX: 53 }));
    expect(onContinue).toHaveBeenCalledOnce();
    expect(onContinue).toHaveBeenCalledWith("pointer");
  });

  it("ignores unmatched releases, cancelled pointers and non-primary touches", () => {
    const onContinue = vi.fn();
    const handlers = createSwitchContinueHandlers(onContinue);
    handlers.pointerup(pointer());
    handlers.pointerdown(pointer());
    handlers.reset();
    handlers.pointerup(pointer());
    handlers.pointerdown(pointer({ isPrimary: false }));
    handlers.pointerup(pointer({ isPrimary: false }));
    expect(onContinue).not.toHaveBeenCalled();
  });
});
