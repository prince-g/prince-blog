import { afterEach, describe, expect, it, vi } from "vitest";
import { KeyRegistry } from "../src/features/keyboard/interaction/key-registry";
import { createPhysicalKeyboardHandlers } from "../src/features/keyboard/interaction/physical-keyboard";

const effectState = vi.hoisted(() => ({
  cleanup: undefined as (() => void) | undefined,
  dependencies: undefined as readonly unknown[] | undefined,
  ref: undefined as { current: unknown } | undefined,
}));

vi.mock("react", () => ({
  useRef: <T,>(initial: T) => {
    effectState.ref ??= { current: initial };
    return effectState.ref as { current: T };
  },
  useEffect: (effect: () => void | (() => void), dependencies: readonly unknown[]) => {
    if (effectState.dependencies?.length === dependencies.length
      && dependencies.every((dependency, index) => Object.is(dependency, effectState.dependencies![index]))) return;
    effectState.cleanup?.();
    effectState.dependencies = dependencies;
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
  effectState.dependencies = undefined;
  effectState.ref = undefined;
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

  it("ignores repeats and animates keys typed in editable targets", () => {
    const registry = new KeyRegistry(); const a = actuator(); registry.register("KeyA", a);
    const handlers = createPhysicalKeyboardHandlers(registry);
    handlers.keydown({ code: "KeyA", repeat: true, target: null });
    handlers.keydown({ code: "KeyA", repeat: false, target: Object.assign(new EventTarget(), { tagName: "INPUT" }) });
    handlers.keydown({ code: "KeyA", repeat: false, target: Object.assign(new EventTarget(), { tagName: "TEXTAREA" }) });
    handlers.keydown({ code: "KeyA", repeat: false, target: Object.assign(new EventTarget(), { isContentEditable: true }) });
    expect(a.press).toHaveBeenCalledOnce();
  });

  it("forwards non-editable typing to the text input callback", () => {
    const registry = new KeyRegistry();
    const onTextInput = vi.fn();
    const handlers = createPhysicalKeyboardHandlers(registry, onTextInput);

    handlers.keydown({ code: "KeyA", key: "a", repeat: false, target: null });
    handlers.keydown({ code: "Backspace", key: "Backspace", repeat: false, target: null });
    handlers.keydown({ code: "KeyB", key: "b", repeat: false, target: Object.assign(new EventTarget(), { tagName: "TEXTAREA" }) });

    expect(onTextInput).toHaveBeenNthCalledWith(1, { key: "a" });
    expect(onTextInput).toHaveBeenNthCalledWith(2, { key: "Backspace" });
    expect(onTextInput).toHaveBeenCalledTimes(2);
  });

  it.each([
    { isComposing: true },
    { ctrlKey: true },
    { metaKey: true },
    { altKey: true },
  ])("animates composing or shortcut keys without appending text: %j", (modifiers) => {
    const registry = new KeyRegistry();
    const a = actuator();
    const onTextInput = vi.fn();
    registry.register("KeyA", a);
    const handlers = createPhysicalKeyboardHandlers(registry, onTextInput);
    handlers.keydown({ code: "KeyA", key: "a", repeat: false, target: null, ...modifiers });
    handlers.keyup({ code: "KeyA", repeat: false, target: null });

    expect(onTextInput).not.toHaveBeenCalled();
    expect(a.press).toHaveBeenCalledOnce();
    expect(a.release).toHaveBeenCalledOnce();
    handlers.keydown({ code: "KeyA", key: "A", repeat: false, target: null });
    expect(onTextInput).toHaveBeenCalledExactlyOnceWith({ key: "A" });
  });

  it("keeps simultaneous keys held while using the latest text callback after a render", () => {
    const windowTarget = new ListenerTarget();
    vi.stubGlobal("window", windowTarget);
    vi.stubGlobal("document", Object.assign(new ListenerTarget(), { visibilityState: "visible" }));
    const registry = new KeyRegistry();
    const a = actuator(); const b = actuator();
    registry.register("KeyA", a); registry.register("KeyB", b);
    const initialText = vi.fn(); const updatedText = vi.fn();

    usePhysicalKeyboard(registry, initialText);
    windowTarget.dispatch("keydown", { code: "KeyA", key: "a", repeat: false, target: null });
    usePhysicalKeyboard(registry, updatedText);
    windowTarget.dispatch("keydown", { code: "KeyB", key: "b", repeat: false, target: null });
    windowTarget.dispatch("keydown", { code: "KeyA", key: "a", repeat: true, target: null });

    expect(initialText).toHaveBeenCalledExactlyOnceWith({ key: "a" });
    expect(updatedText).toHaveBeenCalledExactlyOnceWith({ key: "b" });
    expect(a.press).toHaveBeenCalledOnce();
    expect(b.press).toHaveBeenCalledOnce();
    expect(a.reset).not.toHaveBeenCalled();
    expect(b.reset).not.toHaveBeenCalled();
    expect(windowTarget.count("keydown")).toBe(1);
    windowTarget.dispatch("keyup", { code: "KeyA", repeat: false, target: null });
    windowTarget.dispatch("keyup", { code: "KeyB", repeat: false, target: null });
    expect(a.release).toHaveBeenCalledOnce();
    expect(b.release).toHaveBeenCalledOnce();
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
