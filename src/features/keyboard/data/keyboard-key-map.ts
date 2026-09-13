const codes = [
  "Escape", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13",
  "Backquote", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal", "Backspace", "Delete", "Home", "End", "PageUp", "PageDown",
  "Tab", "KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight", "Backslash",
  "CapsLock", "KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote", "Enter",
  "ShiftLeft", "KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash", "ShiftRight", "ArrowUp",
  "ControlLeft", "MetaLeft", "AltLeft", "Space", "AltRight", "ControlRight", "ArrowLeft", "ArrowDown", "ArrowRight",
] as const;

export const NON_DETECTABLE_MODEL_KEYS = new Set(["Fn", "LightMode"]);

export const MODEL_KEY_BY_CODE = Object.freeze(
  Object.fromEntries(codes.map((code) => [code, code])) as Record<(typeof codes)[number], string>,
);
