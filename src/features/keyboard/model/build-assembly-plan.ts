import type { AssemblyPlan, KeyboardDefinition } from "./keyboard-types";

const KEYCAP_MODEL_KEYS = [
  "r6_space",
  "r2_backspace",
  "r2",
  "r1",
  "r3_tab",
  "r3",
  "r4_enter",
  "r4_capslock",
  "r4",
  "r5_lshift",
  "r5_rshift",
  "r6_meta",
  "r6",
  "r5",
] as const;

export function buildAssemblyPlan(definition: KeyboardDefinition): AssemblyPlan {
  const keys = Object.freeze(Object.entries(definition.keyPosition).map(([modelKey, key]) =>
    Object.freeze({ ...key, modelKey })));

  return Object.freeze({
    keys,
    keycapModels: new Set(KEYCAP_MODEL_KEYS),
  });
}
