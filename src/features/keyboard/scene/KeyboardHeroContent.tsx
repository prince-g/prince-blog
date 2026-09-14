import { usePhysicalKeyboard } from "../interaction/use-physical-keyboard";
import { KEYCHRON_ASSET_ROOT } from "../model/asset-paths";
import { KeyboardCanvas } from "./KeyboardCanvas";
import { KeyboardErrorBoundary } from "./KeyboardErrorBoundary";
import type { KeyRegistry } from "../interaction/key-registry";
import type { KeyboardHeroRuntimeState } from "./KeyboardHero";
import type { ReactNode } from "react";

type KeyboardHeroStateProps = Readonly<
  | { state: "loading"; onRetry?: never }
  | { state: "error"; onRetry: () => void }
  | { state: "no-webgl"; onRetry?: never }
>;

const THUMBNAIL_URL = `${KEYCHRON_ASSET_ROOT}/models/keyboards/K_2_HE/thumbnail.jpg`;

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

type KeyboardHeroContentProps = Readonly<{
  state: KeyboardHeroRuntimeState;
  registry: KeyRegistry;
  onReady: () => void;
  onRetry: () => void;
  onRuntimeError: (cause: unknown) => void;
}>;

export function KeyboardHeroContent({
  state,
  registry,
  onReady,
  onRetry,
  onRuntimeError,
}: KeyboardHeroContentProps) {
  if (state.status === "error") {
    return (
      <section aria-label="Keychron K2 HE 交互式三维键盘">
        <KeyboardHeroState state="error" onRetry={onRetry} />
      </section>
    );
  }

  return (
    <section aria-label="Keychron K2 HE 交互式三维键盘">
      <KeyboardErrorBoundary
        key={state.canvasKey}
        onError={onRuntimeError}
        onRetry={onRetry}
      >
        <KeyboardCanvas
          key={state.canvasKey}
          attempt={state.canvasKey}
          registry={registry}
          onReady={onReady}
          onRuntimeError={onRuntimeError}
        />
        {state.status === "loading" && <KeyboardHeroState state="loading" />}
        <ReadyKeyboardBinding ready={state.status === "ready"} registry={registry} />
      </KeyboardErrorBoundary>
    </section>
  );
}
