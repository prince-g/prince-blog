import type { KeyRegistry } from "./key-registry";
import type { KeyboardTextInputHandler } from "./physical-keyboard";

type PointerInput = Pick<PointerEvent, "pointerId" | "clientX" | "clientY">
  & Partial<Pick<PointerEvent, "button" | "isPrimary" | "shiftKey" | "ctrlKey" | "altKey" | "metaKey">>;

const punctuation: Record<string, readonly [string, string]> = {
  Backquote: ["`", "~"], Minus: ["-", "_"], Equal: ["=", "+"],
  BracketLeft: ["[", "{"], BracketRight: ["]", "}"], Backslash: ["\\", "|"],
  Semicolon: [";", ":"], Quote: ["'", '"'], Comma: [",", "<"], Period: [".", ">"], Slash: ["/", "?"],
};

export function modelKeyToText(modelKey: string, shift = false): string | undefined {
  if (/^Key[A-Z]$/.test(modelKey)) return shift ? modelKey.slice(3) : modelKey.slice(3).toLowerCase();
  if (/^Digit[0-9]$/.test(modelKey)) return shift ? ")!@#$%^&*("[Number(modelKey.slice(5))] : modelKey.slice(5);
  if (modelKey === "Space") return " ";
  if (modelKey === "Enter" || modelKey === "Backspace") return modelKey;
  return punctuation[modelKey]?.[shift ? 1 : 0];
}

/** A press is immediate; only a short completed gesture commits text. */
export function createPointerKeyHandlers(
  registry: KeyRegistry,
  modelKey: string,
  onTextInput?: KeyboardTextInputHandler,
  enabled: () => boolean = () => true,
) {
  let pointer: { id: number; x: number; y: number; dragged: boolean } | null = null;
  const source = (id: number) => `pointer:${id}`;
  const reset = () => {
    if (pointer) registry.release(modelKey, source(pointer.id), true);
    pointer = null;
  };
  const pointermove = (event: PointerInput) => {
    if (!pointer || pointer.id !== event.pointerId || pointer.dragged) return;
    if (!enabled() || Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 8) {
      pointer.dragged = true;
      registry.release(modelKey, source(pointer.id));
    }
  };
  return {
    pointerdown(event: PointerInput) {
      if (pointer || !enabled() || event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, dragged: false };
      registry.press(modelKey, source(event.pointerId));
    },
    pointermove,
    pointerup(event: PointerInput) {
      if (!pointer || pointer.id !== event.pointerId) return;
      pointermove(event);
      const clicked = !pointer.dragged && enabled();
      registry.release(modelKey, source(pointer.id));
      pointer = null;
      if (!clicked || event.ctrlKey || event.altKey || event.metaKey) return;
      const shift = event.shiftKey || registry.isPressed("ShiftLeft") || registry.isPressed("ShiftRight");
      const key = modelKeyToText(modelKey, shift);
      if (key !== undefined) onTextInput?.({ key });
    },
    pointercancel(event: Pick<PointerInput, "pointerId">) {
      if (pointer?.id === event.pointerId) reset();
    },
    reset,
  };
}
