import { useCallback, useReducer, useState } from "react";
import { KeyRegistry } from "../interaction/key-registry";
import type { KeyboardTextInputHandler } from "../interaction/physical-keyboard";
import { resetKeyboardAssetCaches } from "../model/use-keyboard-assets";
import { KeyboardHeroContent } from "./KeyboardHeroContent";
import { KeyboardHeroState } from "./KeyboardHeroState";
import { resetKeyboardSceneAssetCache } from "./KeyboardScene";
import { canEnterSwitch, createSceneMotion, type ExperiencePhase } from "../animation/experience";

export { KeyboardHeroContent, ReadyKeyboardBinding } from "./KeyboardHeroContent";
export { KeyboardHeroState } from "./KeyboardHeroState";

type WebGLCanvas = Readonly<{ getContext(contextId: string): unknown }>;
type WebGLContext = Readonly<{
  getExtension?: (name: string) => Readonly<{ loseContext?: () => void }> | null;
}>;

export type KeyboardHeroRuntimeState = Readonly<{
  status: ExperiencePhase | "error";
  canvasKey: number;
}>;

type KeyboardHeroRuntimeEvent = "ready" | "assembled" | "enter" | "switch" | "back" | "returned" | "error" | "retry";

export const initialKeyboardHeroRuntimeState: KeyboardHeroRuntimeState = {
  status: "loading",
  canvasKey: 0,
};

export function updateKeyboardHeroRuntimeState(
  state: KeyboardHeroRuntimeState,
  event: KeyboardHeroRuntimeEvent,
): KeyboardHeroRuntimeState {
  if (event === "ready") {
    return state.status === "loading" ? { ...state, status: "assembling" } : state;
  }
  if (event === "error") return { ...state, status: "error" };
  if (event === "retry") return { status: "loading", canvasKey: state.canvasKey + 1 };
  const transitions = { assembled: ["assembling", "ready"], enter: ["ready", "exiting"], switch: ["exiting", "switch"], back: ["switch", "returning"], returned: ["returning", "ready"] } as const;
  const [from, to] = transitions[event];
  return state.status === from ? { ...state, status: to } : state;
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
  transition: (event: KeyboardHeroRuntimeEvent) => boolean;
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
    transition(event) {
      const next = updateKeyboardHeroRuntimeState(state, event);
      if (next === state) return false;
      state = next;
      return true;
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

type KeyboardHeroProps = Readonly<{
  onTextInput?: KeyboardTextInputHandler;
  resetRequest?: number;
}>;

export function KeyboardHero({ onTextInput, resetRequest }: KeyboardHeroProps) {
  const [registry] = useState(() => new KeyRegistry());
  const [orchestration] = useState(() => createKeyboardHeroOrchestration(registry));
  const [, rerender] = useReducer((version: number) => version + 1, 0);
  const [probeWebGL] = useState(() => createWebGLCapabilityProbe());
  const [motion] = useState(createSceneMotion);
  const [typedText, setTypedText] = useState("");
  const [autoRotate, setAutoRotate] = useState(true);

  const enter = useCallback((source: "button" | "keyboard") => {
    if (orchestration.state.status === "error" || !canEnterSwitch(orchestration.state.status, typedText, source)) return;
    registry.releaseAll();
    if (orchestration.transition("enter")) rerender();
  }, [orchestration, registry, typedText]);

  const assembled = useCallback(() => {
    if (orchestration.transition("assembled")) rerender();
  }, [orchestration]);
  const showSwitch = useCallback(() => {
    if (orchestration.transition("switch")) rerender();
  }, [orchestration]);
  const back = useCallback(() => {
    if (!orchestration.transition("back")) return;
    registry.releaseAll();
    rerender();
  }, [orchestration, registry]);
  const returned = useCallback(() => {
    if (orchestration.transition("returned")) rerender();
  }, [orchestration]);
  const appendText = useCallback(({ key }: Pick<KeyboardEvent, "key">) => {
    onTextInput?.({ key });
    if (key === "Enter") { enter("keyboard"); return; }
    setTypedText((current) => key === "Backspace" ? Array.from(current).slice(0, -1).join("") : key.length === 1 ? current + key : current);
  }, [enter, onTextInput]);

  const handleReady = useCallback(() => {
    if (orchestration.onReady()) rerender();
  }, [orchestration]);

  const handleRuntimeError = useCallback((cause: unknown) => {
    if (orchestration.onRuntimeError(cause)) rerender();
  }, [orchestration]);

  const retry = useCallback(() => {
    Object.assign(motion, createSceneMotion());
    if (orchestration.onRetry()) rerender();
  }, [motion, orchestration]);

  if (!probeWebGL()) return <KeyboardHeroState state="no-webgl" />;

  return (
    <KeyboardHeroContent
      registry={registry}
      state={orchestration.state}
      onReady={handleReady}
      onRetry={retry}
      onRuntimeError={handleRuntimeError}
      onTextInput={appendText}
      resetRequest={resetRequest}
      motion={motion}
      typedText={typedText}
      onTextChange={setTypedText}
      onAssembled={assembled}
      onEnter={enter}
      onSwitch={showSwitch}
      onBack={back}
      onReturned={returned}
      autoRotate={autoRotate}
      onToggleAutoRotate={() => setAutoRotate((value) => !value)}
    />
  );
}
