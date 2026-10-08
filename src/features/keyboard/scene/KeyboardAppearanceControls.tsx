import { useRef } from "react";
import { KEYBOARD_PRESETS } from "../model/keyboard-types";
import type { KeyboardAppearanceController } from "./use-keyboard-appearance";
import "./KeyboardAppearanceControls.css";

const PRESET_NAMES = { White: "白金", PureWhite: "纯白", Black: "黑金", PureBlack: "纯黑" } as const;

export function KeyboardAppearanceControls({ appearance }: { appearance: KeyboardAppearanceController }) {
  const fileInput = useRef<HTMLInputElement>(null);
  return <div className="keyboard-appearance" aria-label="键盘配色" role="group"
    onKeyDown={(event) => event.stopPropagation()}>
    <div className="keyboard-appearance-options">
      {KEYBOARD_PRESETS.map((preset) => <button key={preset} type="button" className="keyboard-swatch"
        aria-label={`${PRESET_NAMES[preset]}配色`} title={PRESET_NAMES[preset]}
        aria-pressed={!appearance.imageTexture && appearance.preset === preset}
        onClick={() => appearance.selectPreset(preset)}>
        <span className={`keyboard-swatch-color is-${preset}`} aria-hidden="true" />
      </button>)}
      {appearance.customImageUrl && <button type="button" className="keyboard-swatch keyboard-image-swatch"
        aria-label="使用已上传图片" title="使用已上传图片" aria-pressed={!!appearance.imageTexture}
        onClick={appearance.selectImage}>
        <img src={appearance.customImageUrl} alt="" />
      </button>}
      <span className="keyboard-appearance-divider" aria-hidden="true" />
      <button type="button" className="keyboard-image-upload" aria-label={appearance.customImageUrl ? "更换键帽图片" : "上传键帽图片"}
        disabled={appearance.uploading} onClick={() => fileInput.current?.click()}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3.5" y="3.5" width="17" height="17" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m4 17 5-5 3 3 3-5 5 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{appearance.uploading ? "处理中…" : appearance.customImageUrl ? "更换图片" : "上传图片"}</span>
      </button>
      {appearance.customImageUrl && <button type="button" className="keyboard-image-remove" aria-label="移除键帽图片" title="移除图片" onClick={appearance.removeImage}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" /></svg>
      </button>}
      <input ref={fileInput} hidden type="file" accept="image/png,image/jpeg,image/webp" aria-label="选择键帽图片"
        onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void appearance.uploadImage(file); }} />
    </div>
    <p className={`keyboard-appearance-note${appearance.error ? " is-error" : ""}`} aria-live="polite">
      {appearance.error ?? (appearance.imageTexture ? "图片居中裁切，仅在本次体验中保留" : "选择配色，或用一张图片铺满键帽")}
    </p>
  </div>;
}
