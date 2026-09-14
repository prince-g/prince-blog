import { useEffect } from "react";
import { type KeyRegistry } from "./key-registry";
import { createPhysicalKeyboardHandlers } from "./physical-keyboard";

export function usePhysicalKeyboard(registry: KeyRegistry) {
  useEffect(() => {
    const handlers = createPhysicalKeyboardHandlers(registry);
    const visibilitychange = () => handlers.visibilitychange(document);

    window.addEventListener("keydown", handlers.keydown);
    window.addEventListener("keyup", handlers.keyup);
    window.addEventListener("blur", handlers.blur);
    document.addEventListener("visibilitychange", visibilitychange);

    return () => {
      window.removeEventListener("keydown", handlers.keydown);
      window.removeEventListener("keyup", handlers.keyup);
      window.removeEventListener("blur", handlers.blur);
      document.removeEventListener("visibilitychange", visibilitychange);
      registry.releaseAll();
    };
  }, [registry]);
}
