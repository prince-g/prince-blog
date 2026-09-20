import { MODEL_KEY_BY_CODE } from "../data/keyboard-key-map";
import { type KeyRegistry } from "./key-registry";

type KeyboardEventData = Pick<KeyboardEvent, "code" | "repeat" | "target">
  & Partial<Pick<KeyboardEvent, "key" | "isComposing" | "ctrlKey" | "metaKey" | "altKey">>;
type DocumentVisibility = Pick<Document, "visibilityState">;

export type KeyboardTextInputHandler = (event: Pick<KeyboardEvent, "key">) => void;

const editableTags = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isEditableTarget(target: EventTarget | null) {
  if (!target || typeof target !== "object") return false;
  const candidate = target as { tagName?: unknown; isContentEditable?: unknown };
  return candidate.isContentEditable === true
    || (typeof candidate.tagName === "string" && editableTags.has(candidate.tagName));
}

function modelKeyFor(code: string) {
  return (MODEL_KEY_BY_CODE as Record<string, string | undefined>)[code];
}

export function createPhysicalKeyboardHandlers(
  registry: KeyRegistry,
  onTextInput?: KeyboardTextInputHandler,
) {
  return {
    keydown(event: KeyboardEventData) {
      if (event.repeat) return;
      if (!isEditableTarget(event.target) && !event.isComposing && !event.ctrlKey && !event.metaKey && !event.altKey) onTextInput?.({ key: event.key ?? "" });
      const modelKey = modelKeyFor(event.code);
      if (modelKey) registry.press(modelKey);
    },
    keyup(event: KeyboardEventData) {
      const modelKey = modelKeyFor(event.code);
      if (modelKey) registry.release(modelKey);
    },
    blur() {
      registry.releaseAll();
    },
    visibilitychange(document: DocumentVisibility) {
      if (document.visibilityState === "hidden") registry.releaseAll();
    },
  };
}
