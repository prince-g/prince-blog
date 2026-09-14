import { afterEach, describe, expect, it, vi } from "vitest";
import { KeyRegistry } from "../src/features/keyboard/interaction/key-registry";
import { createPhysicalKeyboardHandlers } from "../src/features/keyboard/interaction/physical-keyboard";

const effectState = vi.hoisted(() => ({
  cleanup: undefined as (() => void) | undefined,
}));

vi.mock("react", () => ({
  useEffect: (effect: () => void | (() => void)) => {
    effectState.cleanup = effect() ?? undefined;
  },
}));

import { usePhysicalKeyboard } from "../src/features/keyboard/interaction/use-physical-keyboard";

const actuator = () => ({ press: vi.fn(), release: vi.fn(), reset: vi.fn() });

class ListenerTarget {
  private readonly listeners = new Map<string, Set<EventListener>>();

  addEventListener(type: string, listener: EventListener) {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string, event: unknown) {
    for (const listener of this.listeners.get(type) ?? []) listener(event as Event);
  }

  count(type: string) {
    return this.listeners.get(type)?.size ?? 0;
  }
}

afterEach(() => {
  effectState.cleanup?.();
  effectState.cleanup = undefined;
  vi.unstubAllGlobals();
});

describe("physical keyboard", () => {
  it("presses and releases only the matching key", () => {
    const registry = new KeyRegistry();
    const a = actuator(); const b = actuator();
    registry.register("KeyA", a); registry.register("KeyB", b);
    const handlers = createPhysicalKeyboardHandlers(registry);
    handlers.keydown({ code: "KeyA", repeat: false, target: null });
    handlers.keyup({ code: "KeyA", repeat: false, target: null });
    expect(a.press).toHaveBeenCalledOnce();
    expect(a.release).toHaveBeenCalledOnce();
    expect(b.press).not.toHaveBeenCalled();
  });

  it("ignores repeats and editable targets", () => {
    const registry = new KeyRegistry(); const a = actuator(); registry.register("KeyA", a);
    const handlers = createPhysicalKeyboardHandlers(registry);
    handlers.keydown({ code: "KeyA", repeat: true, target: null });
    handlers.keydown({ code: "KeyA", repeat: false, target: Object.assign(new EventTarget(), { tagName: "INPUT" }) });
    handlers.keydown({ code: "KeyA", repeat: false, target: Object.assign(new EventTarget(), { tagName: "TEXTAREA" }) });
    handlers.keydown({ code: "KeyA", repeat: false, target: Object.assign(new EventTarget(), { isContentEditable: true }) });
    expect(a.press).not.toHaveBeenCalled();
  });

  it("releases a mapped key on keyup even when it comes from an editable target", () => {
    const registry = new KeyRegistry(); const a = actuator(); registry.register("KeyA", a);
    const handlers = createPhysicalKeyboardHandlers(registry);
    handlers.keydown({ code: "KeyA", repeat: false, target: null });
    handlers.keyup({ code: "KeyA", repeat: true, target: Object.assign(new EventTarget(), { tagName: "INPUT" }) });
    expect(a.release).toHaveBeenCalledOnce();
  });

  it("releases every pressed key on blur and when the page becomes hidden", () => {
    const registry = new KeyRegistry(); const a = actuator(); const b = actuator();
    registry.register("KeyA", a); registry.register("KeyB", b);
    registry.press("KeyA"); registry.press("KeyB");
    const handlers = createPhysicalKeyboardHandlers(registry);
    handlers.blur();
    expect(a.reset).toHaveBeenCalledOnce(); expect(b.reset).toHaveBeenCalledOnce();

    registry.press("KeyA");
    handlers.visibilitychange({ visibilityState: "visible" });
    expect(a.reset).toHaveBeenCalledOnce();
    handlers.visibilitychange({ visibilityState: "hidden" });
    expect(a.reset).toHaveBeenCalledTimes(2);
  });

  it("releaseAll resets pressed keys once and permits a new press", () => {
    const registry = new KeyRegistry(); const a = actuator(); registry.register("KeyA", a);
    registry.press("KeyA");
    registry.press("KeyA");
    registry.releaseAll();
    registry.releaseAll();
    registry.press("KeyA");
    expect(a.press).toHaveBeenCalledTimes(2);
    expect(a.reset).toHaveBeenCalledOnce();
  });

  it("binds four listeners and removes them while releasing pressed keys on cleanup", () => {
    const windowTarget = new ListenerTarget();
    const documentTarget = Object.assign(new ListenerTarget(), { visibilityState: "hidden" });
    vi.stubGlobal("window", windowTarget);
    vi.stubGlobal("document", documentTarget);
    const registry = new KeyRegistry(); const a = actuator(); registry.register("KeyA", a);

    usePhysicalKeyboard(registry);
    expect(windowTarget.count("keydown")).toBe(1);
    expect(windowTarget.count("keyup")).toBe(1);
    expect(windowTarget.count("blur")).toBe(1);
    expect(documentTarget.count("visibilitychange")).toBe(1);

    windowTarget.dispatch("keydown", { code: "KeyA", repeat: false, target: null });
    effectState.cleanup?.();
    effectState.cleanup = undefined;

    expect(windowTarget.count("keydown")).toBe(0);
    expect(windowTarget.count("keyup")).toBe(0);
    expect(windowTarget.count("blur")).toBe(0);
    expect(documentTarget.count("visibilitychange")).toBe(0);
    expect(a.reset).toHaveBeenCalledOnce();
  });
});
