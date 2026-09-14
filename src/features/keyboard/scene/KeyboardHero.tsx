import { useCallback, useMemo, useReducer, useState, type ReactNode } from "react";
import { KeyRegistry } from "../interaction/key-registry";
import { usePhysicalKeyboard } from "../interaction/use-physical-keyboard";
import { KEYCHRON_ASSET_ROOT } from "../model/asset-paths";
import { resetKeyboardAssetCaches } from "../model/use-keyboard-assets";
import { KeyboardCanvas } from "./KeyboardCanvas";
import { KeyboardErrorBoundary } from "./KeyboardErrorBoundary";
import { resetKeyboardSceneAssetCache } from "./KeyboardScene";

type KeyboardHeroStateProps = Readonly<
  | { state: "loading"; onRetry?: never }
  | { state: "error"; onRetry: () => void }
  | { state: "no-webgl"; onRetry?: never }
>;

const THUMBNAIL_URL = `${KEYCHRON_ASSET_ROOT}/models/keyboards/K_2_HE/thumbnail.jpg`;

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

export function createKeyboardRuntimeErrorReporter(
  registry: KeyRegistry,
  onError: (cause: unknown) => void,
): (cause: unknown) => void {
  let reported = false;

  return (cause) => {
    if (reported) return;
    reported = true;
    registry.releaseAll();
    onError(cause);
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

export function KeyboardHeroState(props: KeyboardHeroStateProps) {
  let title: string;
  let description: string;
  let action: ReactNode = null;

  if (props.state === "loading") {
    title = "正在装配键盘";
    description = "正在加载 Keychron K2 HE 三维模型与材质。";
  } else if (props.state === "error") {
    title = "键盘模型加载失败";
    description = "请检查资源连接后重新加载。";
    action = <button type="button" onClick={props.onRetry}>重新加载</button>;
  } else {
    title = "当前浏览器无法启动 3D 场景";
    description = "已保留 Keychron K2 HE 产品预览图。";
  }

  return (
    <div role={props.state === "error" ? "alert" : "status"} aria-live="polite">
      <img src={THUMBNAIL_URL} alt="Keychron K2 HE 键盘产品预览" />
      <p>KEYCHRON K2 HE</p>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}

type ReadyKeyboardBindingProps = Readonly<{
  ready: boolean;
  registry: KeyRegistry;
}>;

function PhysicalKeyboardBinding({ registry }: Pick<ReadyKeyboardBindingProps, "registry">) {
  usePhysicalKeyboard(registry);
  return null;
}

export function ReadyKeyboardBinding({ ready, registry }: ReadyKeyboardBindingProps) {
  return ready ? <PhysicalKeyboardBinding registry={registry} /> : null;
}

export function KeyboardHero() {
  const [registry] = useState(() => new KeyRegistry());
  const [state, dispatch] = useReducer(updateKeyboardHeroRuntimeState, initialKeyboardHeroRuntimeState);
  const [probeWebGL] = useState(() => createWebGLCapabilityProbe());
  const reportRuntimeError = useMemo(
    () => createKeyboardRuntimeErrorReporter(registry, () => dispatch("error")),
    [registry, state.canvasKey],
  );

  const handleReady = useCallback(() => {
    dispatch("ready");
  }, []);

  const retry = useCallback(() => {
    resetKeyboardAssetCaches();
    resetKeyboardSceneAssetCache();
    registry.releaseAll();
    dispatch("retry");
  }, [registry]);

  if (!probeWebGL()) return <KeyboardHeroState state="no-webgl" />;

  if (state.status === "error") {
    return (
      <section aria-label="Keychron K2 HE 交互式三维键盘">
        <KeyboardHeroState state="error" onRetry={retry} />
      </section>
    );
  }

  return (
    <section aria-label="Keychron K2 HE 交互式三维键盘">
      <KeyboardErrorBoundary
        key={state.canvasKey}
        onError={reportRuntimeError}
        onRetry={retry}
      >
        <KeyboardCanvas
          key={state.canvasKey}
          attempt={state.canvasKey}
          registry={registry}
          onReady={handleReady}
          onRuntimeError={reportRuntimeError}
        />
        {state.status === "loading" && <KeyboardHeroState state="loading" />}
        <ReadyKeyboardBinding ready={state.status === "ready"} registry={registry} />
      </KeyboardErrorBoundary>
    </section>
  );
}
