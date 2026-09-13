export type Vector3Data = Readonly<{ x: number; y: number; z: number }>;

export type KeyboardKeyDefinition = Readonly<{
  key: string;
  position: Vector3Data;
  capModel: string;
  row: number;
  isBump: boolean;
  random: number;
}>;

export type KeyboardDefinition = Readonly<{
  keyboardOffset: readonly [number, number, number];
  keycapUVOffsetScale: readonly [number, number, number, number];
  switchOrientation: "north" | "south";
  keyPosition: Readonly<Record<string, KeyboardKeyDefinition>>;
}>;

export type AssemblyKey = KeyboardKeyDefinition & Readonly<{ modelKey: string }>;

export type AssemblyPlan = Readonly<{
  keys: readonly AssemblyKey[];
  keycapModels: ReadonlySet<string>;
}>;
