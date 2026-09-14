import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeyRegistry } from "../src/features/keyboard/interaction/key-registry";
import {
  applyCameraFrame,
  bindCameraInput,
  createCameraInputState,
} from "../src/features/keyboard/scene/CameraRig";
import { KeyboardCanvas } from "../src/features/keyboard/scene/KeyboardCanvas";
import { KeyboardErrorBoundary } from "../src/features/keyboard/scene/KeyboardErrorBoundary";
import {
  canUseWebGL,
  createKeyboardHeroOrchestration,
  createWebGLCapabilityProbe,
  KeyboardHero,
  KeyboardHeroContent,
  KeyboardHeroState,
  ReadyKeyboardBinding,
} from "../src/features/keyboard/scene/KeyboardHero";
import { KeyboardModel } from "../src/features/keyboard/scene/KeyboardModel";

const assetMocks = vi.hoisted(() => ({
  useKeyboardAssets: vi.fn(),
  resetKeyboardAssetCaches: vi.fn(),
}));
const sceneMocks = vi.hoisted(() => ({ resetKeyboardSceneAssetCache: vi.fn() }));
const physicalKeyboardMock = vi.hoisted(() => vi.fn());

vi.mock("../src/features/keyboard/model/use-keyboard-assets", () => assetMocks);
vi.mock("../src/features/keyboard/scene/KeyboardScene", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/features/keyboard/scene/KeyboardScene")>(),
  resetKeyboardSceneAssetCache: sceneMocks.resetKeyboardSceneAssetCache,
}));
vi.mock("../src/features/keyboard/interaction/use-physical-keyboard", () => ({
  usePhysicalKeyboard: physicalKeyboardMock,
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

class CameraEventTarget {
  private readonly listeners = new Map<string, Set<EventListener>>();
  private readonly capturedPointers = new Set<number>();

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

  setPointerCapture(pointerId: number) { this.capturedPointers.add(pointerId); }
  releasePointerCapture(pointerId: number) { this.capturedPointers.delete(pointerId); }
  hasPointerCapture(pointerId: number) { return this.capturedPointers.has(pointerId); }

  losePointerCapture(pointerId: number) {
    if (!this.capturedPointers.delete(pointerId)) return;
    this.dispatch("lostpointercapture", { pointerId });
  }
}

function findElement(node: ReactNode, type: unknown): ReactElement | null {
  if (!isValidElement(node)) return null;
  if (node.type === type) return node;

  let found: ReactElement | null = null;
  const children = (node.props as { children?: ReactNode }).children;
  Children.forEach(children, (child) => {
    if (!found) found = findElement(child, type);
  });
  return found;
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

  it("orchestrates ready, runtime error and retry through the Hero view", () => {
    const registry = new KeyRegistry();
    const reset = vi.fn();
    registry.register("KeyA", { press() {}, release() {}, reset });
    registry.press("KeyA");
    const orchestration = createKeyboardHeroOrchestration(registry);

    expect(orchestration.onReady()).toBe(true);
    const readyView = KeyboardHeroContent({
      registry,
      state: orchestration.state,
      onReady: orchestration.onReady,
      onRetry: orchestration.onRetry,
      onRuntimeError: orchestration.onRuntimeError,
    });
    const readyBinding = findElement(readyView, ReadyKeyboardBinding);
    expect(readyBinding).not.toBeNull();
    expect((readyBinding!.props as { ready: boolean }).ready).toBe(true);

    expect(orchestration.onRuntimeError(new Error("frame failed"))).toBe(true);
    expect(orchestration.onRuntimeError(new Error("frame failed again"))).toBe(false);

    expect(reset).toHaveBeenCalledOnce();
    const errorView = KeyboardHeroContent({
      registry,
      state: orchestration.state,
      onReady: orchestration.onReady,
      onRetry: orchestration.onRetry,
      onRuntimeError: orchestration.onRuntimeError,
    });
    expect(renderToStaticMarkup(errorView)).toContain("键盘模型加载失败");
    expect(findElement(errorView, ReadyKeyboardBinding)).toBeNull();

    expect(orchestration.onRetry()).toBe(true);
    expect(assetMocks.resetKeyboardAssetCaches).toHaveBeenCalledOnce();
    expect(sceneMocks.resetKeyboardSceneAssetCache).toHaveBeenCalledOnce();
    const retryView = KeyboardHeroContent({
      registry,
      state: orchestration.state,
      onReady: orchestration.onReady,
      onRetry: orchestration.onRetry,
      onRuntimeError: orchestration.onRuntimeError,
    });
    const retryCanvas = findElement(retryView, KeyboardCanvas);

    expect(retryCanvas).not.toBeNull();
    expect(retryCanvas!.key).toBe("1");
    expect((retryCanvas!.props as { attempt: number }).attempt).toBe(1);
  });
});

describe("keyboard scene capability and camera input", () => {
  it("accepts WebGL2 or WebGL and treats context errors as unavailable", () => {
    expect(canUseWebGL(() => ({ getContext: (name) => name === "webgl2" ? {} : null }))).toBe(true);
    expect(canUseWebGL(() => ({ getContext: (name) => name === "webgl" ? {} : null }))).toBe(true);
    expect(canUseWebGL(() => ({ getContext: () => null }))).toBe(false);
    expect(canUseWebGL(() => { throw new Error("canvas unavailable"); })).toBe(false);
  });

  it("memoizes a WebGL capability probe and releases its temporary context", () => {
    const loseContext = vi.fn();
    const createCanvas = vi.fn(() => ({
      getContext: (name: string) => name === "webgl2"
        ? { getExtension: () => ({ loseContext }) }
        : null,
    }));
    const probe = createWebGLCapabilityProbe(createCanvas);

    expect(probe()).toBe(true);
    expect(probe()).toBe(true);
    expect(createCanvas).toHaveBeenCalledOnce();
    expect(loseContext).toHaveBeenCalledOnce();
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

  it("stops dragging after capture loss or a window blur", () => {
    const element = new CameraEventTarget();
    const windowTarget = new CameraEventTarget();
    const input = createCameraInputState();
    const cleanup = bindCameraInput(
      element as unknown as HTMLCanvasElement,
      input,
      undefined,
      windowTarget as unknown as Window,
    );

    element.dispatch("pointerdown", { clientX: 100, clientY: 50, pointerId: 1 });
    element.dispatch("pointermove", { clientX: 110, clientY: 50, pointerId: 1 });
    expect(input.target.yaw).toBeCloseTo(0.04);

    element.losePointerCapture(1);
    element.dispatch("pointermove", { clientX: 190, clientY: 50, pointerId: 1 });
    expect(input.target.yaw).toBeCloseTo(0.04);

    element.dispatch("pointerdown", { clientX: 100, clientY: 50, pointerId: 2 });
    element.dispatch("pointermove", { clientX: 90, clientY: 50, pointerId: 2 });
    expect(input.target.yaw).toBeCloseTo(0.08);

    windowTarget.dispatch("blur", {});
    element.dispatch("pointermove", { clientX: 10, clientY: 50, pointerId: 2 });
    expect(input.target.yaw).toBeCloseTo(0.08);

    cleanup();
    expect(element.count("lostpointercapture")).toBe(0);
    expect(windowTarget.count("blur")).toBe(0);
  });

  it("reports native camera event failures instead of leaking them past the Hero", () => {
    const failure = new Error("bounds unavailable");
    const element = new CameraEventTarget();
    element.getBoundingClientRect = () => { throw failure; };
    const reportError = vi.fn();
    const cleanup = bindCameraInput(
      element as unknown as HTMLCanvasElement,
      createCameraInputState(),
      reportError,
      new CameraEventTarget() as unknown as Window,
    );

    expect(() => element.dispatch("pointermove", { clientX: 100, clientY: 50, pointerId: 1 })).not.toThrow();
    expect(reportError).toHaveBeenCalledWith(failure);
    cleanup();
  });

  it("reports frame-loop camera failures through the same error path", () => {
    const failure = new Error("camera write failed");
    const reportError = vi.fn();
    const camera = {
      position: { set() { throw failure; } },
      lookAt() {},
    };

    expect(() => applyCameraFrame(
      camera as never,
      createCameraInputState(),
      { yaw: 0.08, pitch: 0.62, distance: 18 },
      1 / 60,
      reportError,
    )).not.toThrow();
    expect(reportError).toHaveBeenCalledWith(failure);
  });
});
