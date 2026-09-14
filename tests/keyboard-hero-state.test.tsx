import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeyRegistry } from "../src/features/keyboard/interaction/key-registry";
import { bindCameraInput, createCameraInputState } from "../src/features/keyboard/scene/CameraRig";
import { KeyboardErrorBoundary } from "../src/features/keyboard/scene/KeyboardErrorBoundary";
import {
  canUseWebGL,
  KeyboardHero,
  KeyboardHeroState,
  ReadyKeyboardBinding,
} from "../src/features/keyboard/scene/KeyboardHero";
import { KeyboardModel } from "../src/features/keyboard/scene/KeyboardModel";

const assetMocks = vi.hoisted(() => ({ useKeyboardAssets: vi.fn() }));
const physicalKeyboardMock = vi.hoisted(() => vi.fn());

vi.mock("../src/features/keyboard/model/use-keyboard-assets", () => assetMocks);
vi.mock("../src/features/keyboard/interaction/use-physical-keyboard", () => ({
  usePhysicalKeyboard: physicalKeyboardMock,
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

class CameraEventTarget {
  private readonly listeners = new Map<string, Set<EventListener>>();

  addEventListener(type: string, listener: EventListener) {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string, event: object) {
    for (const listener of this.listeners.get(type) ?? []) listener(event as Event);
  }

  count(type: string) {
    return this.listeners.get(type)?.size ?? 0;
  }

  getBoundingClientRect() {
    return { left: 0, top: 0, width: 200, height: 100 } as DOMRect;
  }

  setPointerCapture() {}
  releasePointerCapture() {}
  hasPointerCapture() { return true; }
}

describe("KeyboardHeroState", () => {
  it("renders loading, error and WebGL fallback copy", () => {
    expect(renderToStaticMarkup(<KeyboardHeroState state="loading" />)).toContain("正在装配键盘");
    expect(renderToStaticMarkup(<KeyboardHeroState state="error" onRetry={() => {}} />)).toContain("重新加载");
    expect(renderToStaticMarkup(<KeyboardHeroState state="no-webgl" />)).toContain("当前浏览器无法启动 3D 场景");
  });

  it("keeps the real thumbnail and brand in every non-ready state", () => {
    const states = [
      <KeyboardHeroState state="loading" />,
      <KeyboardHeroState state="error" onRetry={() => {}} />,
      <KeyboardHeroState state="no-webgl" />,
    ];

    for (const state of states) {
      const markup = renderToStaticMarkup(state);
      expect(markup).toContain("/models/keychron-k2-he/models/keyboards/K_2_HE/thumbnail.jpg");
      expect(markup).toContain("KEYCHRON K2 HE");
    }
  });
});

describe("keyboard scene errors", () => {
  it("lets model resource failures reach the scene error boundary", () => {
    const failure = new Error("model failed");
    assetMocks.useKeyboardAssets.mockImplementationOnce(() => { throw failure; });

    expect(() => KeyboardModel({
      plan: { keys: [], keycapModels: new Set() },
      registry: new KeyRegistry(),
    })).toThrow(failure);
  });

  it("renders the outer error state and connects its retry action", () => {
    const onRetry = vi.fn();
    const boundary = new KeyboardErrorBoundary({ children: <span>scene</span>, onRetry });
    boundary.state = KeyboardErrorBoundary.getDerivedStateFromError();

    const fallback = boundary.render();
    expect(renderToStaticMarkup(fallback)).toContain("键盘模型加载失败");
    expect(isValidElement(fallback)).toBe(true);
    if (!isValidElement(fallback)) throw new Error("Expected an error state element");
    (fallback.props as { onRetry: () => void }).onRetry();
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe("keyboard scene capability and camera input", () => {
  it("accepts WebGL2 or WebGL and treats context errors as unavailable", () => {
    expect(canUseWebGL(() => ({ getContext: (name) => name === "webgl2" ? {} : null }))).toBe(true);
    expect(canUseWebGL(() => ({ getContext: (name) => name === "webgl" ? {} : null }))).toBe(true);
    expect(canUseWebGL(() => ({ getContext: () => null }))).toBe(false);
    expect(canUseWebGL(() => { throw new Error("canvas unavailable"); })).toBe(false);
  });

  it("does not create the Canvas when WebGL is unavailable", () => {
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => null }) });
    expect(renderToStaticMarkup(<KeyboardHero />)).toContain("当前浏览器无法启动 3D 场景");
    expect(physicalKeyboardMock).not.toHaveBeenCalled();
  });

  it("binds the physical keyboard only after the model is ready", () => {
    const registry = new KeyRegistry();
    renderToStaticMarkup(<ReadyKeyboardBinding ready={false} registry={registry} />);
    expect(physicalKeyboardMock).not.toHaveBeenCalled();

    renderToStaticMarkup(<ReadyKeyboardBinding ready registry={registry} />);
    expect(physicalKeyboardMock).toHaveBeenCalledOnce();
    expect(physicalKeyboardMock).toHaveBeenCalledWith(registry);
  });

  it("constrains camera input, restores defaults and removes every listener", () => {
    const element = new CameraEventTarget();
    const input = createCameraInputState();
    const cleanup = bindCameraInput(element as unknown as HTMLCanvasElement, input);

    element.dispatch("pointermove", { clientX: 200, clientY: 0, pointerId: 1 });
    expect(input.parallax).toEqual({ yaw: 0.025, pitch: 0.025 });

    element.dispatch("pointerdown", { clientX: 100, clientY: 50, pointerId: 1 });
    element.dispatch("pointermove", { clientX: 101, clientY: 52, pointerId: 1 });
    expect(input.target.yaw).toBeCloseTo(0.076);
    expect(input.target.pitch).toBeCloseTo(0.628);

    const wheel = { deltaY: 100, preventDefault: vi.fn() };
    element.dispatch("wheel", wheel);
    expect(input.target.distance).toBeCloseTo(18.8);
    expect(wheel.preventDefault).toHaveBeenCalledOnce();

    element.dispatch("pointermove", { clientX: 10000, clientY: 10000, pointerId: 1 });
    element.dispatch("wheel", { deltaY: 10000, preventDefault() {} });
    expect(input.target).toEqual({ yaw: -0.38, pitch: 0.92, distance: 23 });

    element.dispatch("dblclick", {});
    expect(input.target).toEqual({ yaw: 0.08, pitch: 0.62, distance: 18 });
    expect(input.parallax).toEqual({ yaw: 0, pitch: 0 });

    cleanup();
    for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel", "pointerleave", "wheel", "dblclick"]) {
      expect(element.count(type)).toBe(0);
    }
  });
});
