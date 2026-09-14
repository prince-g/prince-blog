import { usePhysicalKeyboard } from "../interaction/use-physical-keyboard";
import { KeyboardCanvas } from "./KeyboardCanvas";
import { KeyboardErrorBoundary } from "./KeyboardErrorBoundary";
import { KeyboardHeroState } from "./KeyboardHeroState";
import type { KeyRegistry } from "../interaction/key-registry";
import type { KeyboardHeroRuntimeState } from "./KeyboardHero";

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
