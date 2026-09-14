import { useCallback, useRef, useState, type ReactNode } from "react";
import { KeyRegistry } from "../interaction/key-registry";
import { usePhysicalKeyboard } from "../interaction/use-physical-keyboard";
import { KEYCHRON_ASSET_ROOT } from "../model/asset-paths";
import { KeyboardCanvas } from "./KeyboardCanvas";
import { KeyboardErrorBoundary } from "./KeyboardErrorBoundary";

type KeyboardHeroStateProps = Readonly<
  | { state: "loading"; onRetry?: never }
  | { state: "error"; onRetry: () => void }
  | { state: "no-webgl"; onRetry?: never }
>;

const THUMBNAIL_URL = `${KEYCHRON_ASSET_ROOT}/models/keyboards/K_2_HE/thumbnail.jpg`;

type WebGLCanvas = Readonly<{ getContext(contextId: string): unknown }>;

export function canUseWebGL(createCanvas?: () => WebGLCanvas): boolean {
  try {
    const canvas = createCanvas?.()
      ?? (typeof document === "undefined" ? null : document.createElement("canvas"));
    return Boolean(canvas?.getContext("webgl2") || canvas?.getContext("webgl"));
  } catch {
    return false;
  }
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
  const [canvasKey, setCanvasKey] = useState(0);
  const [ready, setReady] = useState(false);
  const readySignaled = useRef(false);

  const handleReady = useCallback(() => {
    if (readySignaled.current) return;
    readySignaled.current = true;
    setReady(true);
  }, []);

  const handleError = useCallback(() => {
    readySignaled.current = false;
    registry.releaseAll();
    setReady(false);
  }, [registry]);

  const retry = useCallback(() => {
    readySignaled.current = false;
    registry.releaseAll();
    setReady(false);
    setCanvasKey((current) => current + 1);
  }, [registry]);

  if (!canUseWebGL()) return <KeyboardHeroState state="no-webgl" />;

  return (
    <section aria-label="Keychron K2 HE 交互式三维键盘">
      <KeyboardErrorBoundary
        key={canvasKey}
        onError={handleError}
        onRetry={retry}
      >
        <KeyboardCanvas
          key={canvasKey}
          registry={registry}
          onReady={handleReady}
        />
        {!ready && <KeyboardHeroState state="loading" />}
        <ReadyKeyboardBinding ready={ready} registry={registry} />
      </KeyboardErrorBoundary>
    </section>
  );
}
