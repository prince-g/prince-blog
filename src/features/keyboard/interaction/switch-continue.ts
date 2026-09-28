type KeyInput = Pick<KeyboardEvent, "key" | "repeat" | "isComposing" | "ctrlKey" | "metaKey" | "altKey" | "keyCode" | "target" | "preventDefault">;
type PointerInput = Pick<PointerEvent, "pointerId" | "clientX" | "clientY" | "isPrimary" | "target">;

function isControl(target: EventTarget | null) {
  const element = target as Element | null;
  return Boolean(element?.closest?.("button,a,input,textarea,select,[contenteditable],[role='button'],[role='link']"));
}

/** Keep the focused switch draggable; only a fresh key or a click completes the scene. */
export function createSwitchContinueHandlers(onContinue: () => void) {
  let completed = false;
  let pointer: { id: number; x: number; y: number; dragged: boolean } | null = null;
  const complete = () => {
    if (completed) return;
    completed = true;
    pointer = null;
    onContinue();
  };
  const moved = (event: PointerInput) => {
    if (pointer?.id === event.pointerId && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 8) pointer.dragged = true;
  };
  return {
    keydown(event: KeyInput) {
      if (completed || event.repeat || event.isComposing || event.keyCode === 229
        || event.ctrlKey || event.metaKey || event.altKey || isControl(event.target)
        || /^(Tab|Shift|Control|Alt|Meta|OS|ContextMenu|Unidentified|Process|Dead|F\d{1,2})$/.test(event.key)) return;
      event.preventDefault();
      complete();
    },
    pointerdown(event: PointerInput) {
      if (completed || !event.isPrimary || isControl(event.target)) { pointer = null; return; }
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, dragged: false };
    },
    pointermove: moved,
    pointerup(event: PointerInput) {
      moved(event);
      const clicked = pointer?.id === event.pointerId && !pointer.dragged && !isControl(event.target);
      pointer = null;
      if (clicked) complete();
    },
    reset() { pointer = null; },
  };
}
