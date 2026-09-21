import { useEffect, useRef } from "react";
import { usePhysicalKeyboard } from "../interaction/use-physical-keyboard";
import type { KeyboardTextInputHandler } from "../interaction/physical-keyboard";
import { useAssetProgress } from "../model/asset-progress";
import type { SceneMotion } from "../animation/experience";
import { KeyboardCanvas } from "./KeyboardCanvas";
import { KeyboardErrorBoundary } from "./KeyboardErrorBoundary";
import { KeyboardHeroState } from "./KeyboardHeroState";
import type { KeyRegistry } from "../interaction/key-registry";
import type { KeyboardHeroRuntimeState } from "./KeyboardHero";

type ReadyKeyboardBindingProps = Readonly<{
  ready: boolean;
  registry: KeyRegistry;
  onTextInput?: KeyboardTextInputHandler;
}>;

function PhysicalKeyboardBinding({ registry, onTextInput }: Omit<ReadyKeyboardBindingProps, "ready">) {
  usePhysicalKeyboard(registry, onTextInput);
  return null;
}

export function ReadyKeyboardBinding({ ready, registry, onTextInput }: ReadyKeyboardBindingProps) {
  return ready ? <PhysicalKeyboardBinding registry={registry} onTextInput={onTextInput} /> : null;
}

function SwitchKeyboardBinding({ registry }: { registry: KeyRegistry }) {
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat || event.isComposing || (event.target instanceof Element && event.target.closest("button,input,textarea"))) return;
      event.preventDefault();
      registry.press("KeyJ");
    };
    const up = (event: KeyboardEvent) => { if (event.code === "Space") registry.release("KeyJ"); };
    const reset = () => registry.releaseAll();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", reset);
    return () => {
      window.removeEventListener("keydown", down); window.removeEventListener("keyup", up);
      window.removeEventListener("blur", reset); document.removeEventListener("visibilitychange", reset);
      reset();
    };
  }, [registry]);
  return null;
}

type KeyboardHeroContentProps = Readonly<{
  state: KeyboardHeroRuntimeState;
  registry: KeyRegistry;
  onReady: () => void;
  onRetry: () => void;
  onRuntimeError: (cause: unknown) => void;
  onTextInput?: KeyboardTextInputHandler;
  resetRequest?: number;
  motion: SceneMotion;
  typedText: string;
  onTextChange: (text: string) => void;
  onAssembled: () => void;
  onEnter: (source: "button" | "keyboard") => void;
  onSwitch: () => void;
  onBack: () => void;
  onReturned: () => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
}>;

export function KeyboardHeroContent({ state, registry, onReady, onRetry, onRuntimeError, onTextInput, resetRequest,
  motion, typedText, onTextChange, onAssembled, onEnter, onSwitch, onBack, onReturned, autoRotate, onToggleAutoRotate }: KeyboardHeroContentProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const cameraLayer = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const progress = useAssetProgress();
  const phase = state.status;
  useEffect(() => {
    if (phase === "ready" && !matchMedia("(pointer: coarse)").matches) textarea.current?.focus({ preventScroll: true });
    else if (phase !== "ready") textarea.current?.blur();
  }, [phase]);

  if (phase === "error") return <section aria-label="Keychron K2 HE 交互式三维键盘"><KeyboardHeroState state="error" onRetry={onRetry} /></section>;

  return <section aria-label={phase === "switch" ? "磁轴交互展示" : "Keychron K2 HE 交互式三维键盘"} data-experience-phase={phase}>
    <KeyboardErrorBoundary key={state.canvasKey} onError={onRuntimeError} onRetry={onRetry}>
      <div className="switch-backdrop" ref={backdrop} aria-hidden="true">
        <img src="/images/switch-fresco/creation-hands.webp" alt="" draggable={false} />
      </div>
      <KeyboardCanvas key={state.canvasKey} attempt={state.canvasKey} registry={registry} resetRequest={resetRequest}
        onReady={onReady} onRuntimeError={onRuntimeError}
        experience={{ phase, motion, onAssembled, onSwitch, onReturned, autoRotate, backdrop, textPanel: { viewport, cameraLayer, panel } }} />
      {(phase === "loading" || phase === "assembling") && <div className={`keyboard-loader${phase === "assembling" ? " is-complete" : ""}`}
        role="progressbar" aria-label="加载键盘模型" aria-valuemin={0} aria-valuemax={100} aria-valuenow={phase === "loading" ? progress : 100}>
        <span>{String(phase === "loading" ? progress : 100).padStart(3, "0")}</span>
      </div>}
      <div className="typing-viewport" ref={viewport} aria-hidden={phase !== "ready"}>
        <div className="typing-camera" ref={cameraLayer}>
          <div className="typing-panel" ref={panel}>
            <textarea ref={textarea} aria-label="键盘输入内容" className="keyboard-text-input" placeholder="Typing on the keyboard ..."
              value={typedText} spellCheck={false} disabled={phase !== "ready"} tabIndex={phase === "ready" ? 0 : -1}
              onChange={(event) => onTextChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || event.keyCode === 229) return;
                event.preventDefault();
                if (!event.repeat) onEnter("keyboard");
              }} />
          </div>
        </div>
      </div>
      <ReadyKeyboardBinding ready={phase === "ready"} registry={registry} onTextInput={onTextInput} />
      {phase === "ready" && <button className="start-button" aria-label="进入磁轴展示" title="进入磁轴展示" type="button" onClick={() => onEnter("button")}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 4.5 19 12 8 19.5Z" fill="currentColor" /></svg>
      </button>}
      {phase === "switch" && <>
        <SwitchKeyboardBinding registry={registry} />
        <button className="back-button" type="button" onClick={onBack} aria-label="返回键盘"><span aria-hidden="true">←</span> 返回键盘</button>
        <div className="switch-controls">
          <p className="switch-hint">拖动查看 · 点击或空格按压</p>
          <button className="spin-button" type="button" onClick={onToggleAutoRotate} aria-label={autoRotate ? "暂停自转" : "继续自转"} title={autoRotate ? "暂停自转" : "继续自转"}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              {autoRotate ? <path d="M8 5v14M16 5v14" stroke="currentColor" strokeWidth="2" /> : <path d="m8 5 11 7-11 7Z" fill="currentColor" />}
            </svg>
          </button>
        </div>
      </>}
    </KeyboardErrorBoundary>
  </section>;
}
