import { useCallback, useReducer, useState } from "react";
import { KeyRegistry } from "../interaction/key-registry";
import { resetKeyboardAssetCaches } from "../model/use-keyboard-assets";
import { KeyboardHeroContent, KeyboardHeroState } from "./KeyboardHeroContent";
import { resetKeyboardSceneAssetCache } from "./KeyboardScene";

export { KeyboardHeroContent, KeyboardHeroState, ReadyKeyboardBinding } from "./KeyboardHeroContent";

type WebGLCanvas = Readonly<{ getContext(contextId: string): unknown }>;
type WebGLContext = Readonly<{
  getExtension?: (name: string) => Readonly<{ loseContext?: () => void }> | null;
}>;

export type KeyboardHeroRuntimeState = Readonly<{
  status: "loading" | "ready" | "error";
  canvasKey: number;
}>;

type KeyboardHeroRuntimeEvent = "ready" | "error" | "retry";

export const initialKeyboardHeroRuntimeState: KeyboardHeroRuntimeState = {
  status: "loading",
  canvasKey: 0,
};

export function updateKeyboardHeroRuntimeState(
  state: KeyboardHeroRuntimeState,
  event: KeyboardHeroRuntimeEvent,
): KeyboardHeroRuntimeState {
  if (event === "ready") {
    return state.status === "loading" ? { ...state, status: "ready" } : state;
  }
  if (event === "error") return { ...state, status: "error" };
  return { status: "loading", canvasKey: state.canvasKey + 1 };
}

type KeyboardHeroCacheResetters = Readonly<{
  resetKeyboardAssets: () => void;
  resetKeyboardScene: () => void;
}>;

const keyboardHeroCacheResetters: KeyboardHeroCacheResetters = {
  resetKeyboardAssets: resetKeyboardAssetCaches,
  resetKeyboardScene: resetKeyboardSceneAssetCache,
};

export type KeyboardHeroOrchestration = Readonly<{
  state: KeyboardHeroRuntimeState;
  onReady: () => boolean;
  onRuntimeError: (cause: unknown) => boolean;
  onRetry: () => boolean;
}>;

export function createKeyboardHeroOrchestration(
  registry: KeyRegistry,
  cacheResetters: KeyboardHeroCacheResetters = keyboardHeroCacheResetters,
): KeyboardHeroOrchestration {
  let state = initialKeyboardHeroRuntimeState;
  let runtimeErrorReported = false;

  return {
    get state() {
      return state;
    },
    onReady() {
      const nextState = updateKeyboardHeroRuntimeState(state, "ready");
      if (nextState === state) return false;
      state = nextState;
      return true;
    },
    onRuntimeError() {
      if (runtimeErrorReported) return false;
      runtimeErrorReported = true;
      registry.releaseAll();
      state = updateKeyboardHeroRuntimeState(state, "error");
      return true;
    },
    onRetry() {
      cacheResetters.resetKeyboardAssets();
      cacheResetters.resetKeyboardScene();
      registry.releaseAll();
      runtimeErrorReported = false;
      state = updateKeyboardHeroRuntimeState(state, "retry");
      return true;
    },
  };
}

export function canUseWebGL(createCanvas?: () => WebGLCanvas): boolean {
  try {
    const canvas = createCanvas?.()
      ?? (typeof document === "undefined" ? null : document.createElement("canvas"));
    const context = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
    if (!context) return false;

    try {
      (context as WebGLContext).getExtension?.("WEBGL_lose_context")?.loseContext?.();
    } catch {
      // The context is usable even when an optional cleanup extension is unavailable.
    }
    return true;
  } catch {
    return false;
  }
}

export function createWebGLCapabilityProbe(createCanvas?: () => WebGLCanvas): () => boolean {
  let result: boolean | undefined;

  return () => {
    if (result === undefined) result = canUseWebGL(createCanvas);
    return result;
  };
}

export function KeyboardHero() {
  const [registry] = useState(() => new KeyRegistry());
  const [orchestration] = useState(() => createKeyboardHeroOrchestration(registry));
  const [, rerender] = useReducer((version: number) => version + 1, 0);
  const [probeWebGL] = useState(() => createWebGLCapabilityProbe());

  const handleReady = useCallback(() => {
    if (orchestration.onReady()) rerender();
  }, [orchestration]);

  const handleRuntimeError = useCallback((cause: unknown) => {
    if (orchestration.onRuntimeError(cause)) rerender();
  }, [orchestration]);

  const retry = useCallback(() => {
    if (orchestration.onRetry()) rerender();
  }, [orchestration]);

  if (!probeWebGL()) return <KeyboardHeroState state="no-webgl" />;

  return (
    <KeyboardHeroContent
      registry={registry}
      state={orchestration.state}
      onReady={handleReady}
      onRetry={retry}
      onRuntimeError={handleRuntimeError}
    />
  );
}
