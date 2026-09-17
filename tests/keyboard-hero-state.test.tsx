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
  createWebGLCapabilityProbe,
  KeyboardHero,
  KeyboardHeroState,
  ReadyKeyboardBinding,
} from "../src/features/keyboard/scene/KeyboardHero";
import { KeyboardModel } from "../src/features/keyboard/scene/KeyboardModel";

type CapturedHeroProps = Readonly<{
  onReady: () => void;
  onRetry: () => void;
  onRuntimeError: (cause: unknown) => void;
}>;

const rootHarness = vi.hoisted(() => {
  const slots: unknown[] = [];
  let cursor = 0;
  let rerender: (() => void) | undefined;
  let output: ReactNode = null;

  const useState = <T,>(initial: T | (() => T)) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === "function" ? (initial as () => T)() : initial;
    return [slots[index] as T, (next: T) => { slots[index] = next; }] as const;
  };

  const useReducer = <State, Action>(
    reducer: (state: State, action: Action) => State,
    initial: State,
  ) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index] as State, (action: Action) => {
      slots[index] = reducer(slots[index] as State, action);
      rerender?.();
    }] as const;
  };

  const useCallback = <Callback extends (...args: never[]) => unknown>(callback: Callback) => callback;

  return {
    useState,
    useReducer,
    useCallback,
    render(root: () => ReactNode) {
      rerender = () => {
        cursor = 0;
        output = root();
      };
      rerender();
      return output;
    },
    get output() { return output; },
    reset() {
      slots.length = 0;
      cursor = 0;
      rerender = undefined;
      output = null;
    },
  };
});

vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useState: rootHarness.useState,
  useReducer: rootHarness.useReducer,
  useCallback: rootHarness.useCallback,
}));

const assetMocks = vi.hoisted(() => ({
  useKeyboardAssets: vi.fn(),
  resetKeyboardAssetCaches: vi.fn(),
}));
const sceneMocks = vi.hoisted(() => ({ resetKeyboardSceneAssetCache: vi.fn() }));
const physicalKeyboardMock = vi.hoisted(() => vi.fn());
const heroContentMocks = vi.hoisted(() => ({
  props: null as CapturedHeroProps | null,
  view: null as ReactNode,
}));

vi.mock("../src/features/keyboard/model/use-keyboard-assets", () => assetMocks);
vi.mock("../src/features/keyboard/scene/KeyboardScene", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/features/keyboard/scene/KeyboardScene")>(),
  resetKeyboardSceneAssetCache: sceneMocks.resetKeyboardSceneAssetCache,
}));
vi.mock("../src/features/keyboard/scene/KeyboardHeroContent", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/features/keyboard/scene/KeyboardHeroContent")>();
  return {
    ...actual,
    KeyboardHeroContent: (props: Parameters<typeof actual.KeyboardHeroContent>[0]) => {
      heroContentMocks.props = props;
      heroContentMocks.view = actual.KeyboardHeroContent(props);
      return heroContentMocks.view;
    },
  };
});
vi.mock("../src/features/keyboard/interaction/use-physical-keyboard", () => ({
  usePhysicalKeyboard: physicalKeyboardMock,
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  rootHarness.reset();
  heroContentMocks.props = null;
  heroContentMocks.view = null;
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

  it("drives ready, runtime error and retry through the KeyboardHero root", () => {
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => ({}) }) });
    const root = rootHarness.render(() => <KeyboardHero />);
    renderToStaticMarkup(root);

    expect(heroContentMocks.props).not.toBeNull();
    const initialProps = heroContentMocks.props!;
    initialProps.onReady!();
    renderToStaticMarkup(rootHarness.output);

    const readyBinding = findElement(heroContentMocks.view, ReadyKeyboardBinding);
    expect(readyBinding).not.toBeNull();
    expect((readyBinding!.props as { ready: boolean }).ready).toBe(true);

    heroContentMocks.props!.onRuntimeError!(new Error("frame failed"));
    renderToStaticMarkup(rootHarness.output);
    expect(renderToStaticMarkup(heroContentMocks.view)).toContain("键盘模型加载失败");
    expect(findElement(heroContentMocks.view, ReadyKeyboardBinding)).toBeNull();

    const errorState = findElement(heroContentMocks.view, KeyboardHeroState);
    expect(errorState).not.toBeNull();
    (errorState!.props as { onRetry: () => void }).onRetry();
    renderToStaticMarkup(rootHarness.output);
    expect(assetMocks.resetKeyboardAssetCaches).toHaveBeenCalledOnce();
    expect(sceneMocks.resetKeyboardSceneAssetCache).toHaveBeenCalledOnce();
    const retryCanvas = findElement(heroContentMocks.view, KeyboardCanvas);

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

  it("frees yaw and clamps pitch and distance, restores defaults and removes every listener", () => {
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
    expect(input.target.distance).toBeCloseTo(49.8);
    expect(wheel.preventDefault).toHaveBeenCalledOnce();

    element.dispatch("pointermove", { clientX: 10000, clientY: 10000, pointerId: 1 });
    element.dispatch("wheel", { deltaY: 10000, preventDefault() {} });
    expect(input.target.yaw).toBeLessThan(-0.38);
    expect(input.target.pitch).toBe(Math.PI / 2);
    expect(input.target.distance).toBe(62);

    element.dispatch("dblclick", {});
    expect(input.target).toEqual({ yaw: 0.08, pitch: 0.62, distance: 49 });
    expect(input.parallax).toEqual({ yaw: 0, pitch: 0 });

    cleanup();
    for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel", "pointerleave", "wheel", "dblclick"]) {
      expect(element.count(type)).toBe(0);
    }
  });

  it("accumulates yaw past a full revolution when dragged horizontally", () => {
    const element = new CameraEventTarget();
    const input = createCameraInputState();
    const cleanup = bindCameraInput(element as unknown as HTMLCanvasElement, input);

    element.dispatch("pointerdown", { clientX: 0, clientY: 50, pointerId: 1 });
    element.dispatch("pointermove", { clientX: 2000, clientY: 50, pointerId: 1 });

    expect(input.target.yaw).toBeCloseTo(0.08 - 2000 * 0.004, 10);
    expect(Math.abs(input.target.yaw - 0.08)).toBeGreaterThan(2 * Math.PI);

    cleanup();
  });

  it("clamps pitch at the full lower bound (looking up from below)", () => {
    const element = new CameraEventTarget();
    const input = createCameraInputState();
    const cleanup = bindCameraInput(element as unknown as HTMLCanvasElement, input);

    element.dispatch("pointerdown", { clientX: 100, clientY: 50, pointerId: 1 });
    element.dispatch("pointermove", { clientX: 100, clientY: -10000, pointerId: 1 });

    expect(input.target.pitch).toBe(-Math.PI / 2);

    cleanup();
  });

  it("frames the desktop keyboard below the title's visual lane", () => {
    const camera = {
      position: { set: vi.fn() },
      lookAt: vi.fn(),
    };
    const input = createCameraInputState();

    applyCameraFrame(camera as never, input, { ...input.target }, 1 / 60, vi.fn());

    expect(camera.position.set).toHaveBeenCalledWith(
      expect.any(Number),
      expect.closeTo(33.47, 2),
      expect.any(Number),
    );
    expect(camera.lookAt).toHaveBeenCalledWith(0, 5, 0);
  });

  it("does not clamp yaw when framing, so a full revolution renders", () => {
    const camera = {
      position: { set: vi.fn() },
      lookAt: vi.fn(),
    };
    const input = createCameraInputState();
    input.target.yaw = 3.5; // > π: only reachable when applyCameraFrame leaves yaw unclamped
    applyCameraFrame(camera as never, input, { ...input.target }, 1 / 60, vi.fn());

    const horizontalDistance = input.target.distance * Math.cos(input.target.pitch);
    expect(camera.position.set).toHaveBeenCalledWith(
      horizontalDistance * Math.sin(3.5),
      expect.any(Number),
      horizontalDistance * Math.cos(3.5),
    );
    expect(camera.lookAt).toHaveBeenCalledWith(0, 5, 0);
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
