export type Vector3Data = Readonly<{ x: number; y: number; z: number }>;
export type KeycapPalette = Readonly<{ keycapColor: string; fontColor: string }>;
export type KeyboardColorSet = Readonly<{
  highlightColor: KeycapPalette;
  primaryColor: KeycapPalette;
  secondaryColor: KeycapPalette;
  caseColor: string;
  plateColor: string;
}>;

export type KeyboardKeyDefinition = Readonly<{
  key: string;
  position: Vector3Data;
  capModel: string;
  row: number;
  isBump: boolean;
  random: number;
  colorRole: "primaryColor" | "highlightColor";
}>;

export type KeyboardDefinition = Readonly<{
  keyboardOffset: readonly [number, number, number];
  keycapUVOffsetScale: readonly [number, number, number, number];
  switchOrientation: "north" | "south";
  keyPosition: Readonly<Record<string, KeyboardKeyDefinition>>;
  colorSet: KeyboardColorSet;
  foldedPositions: Readonly<Record<string, Vector3Data>>;
}>;

export type AssemblyKey = KeyboardKeyDefinition & Readonly<{ modelKey: string }>;

export type AssemblyPlan = Readonly<{
  keys: readonly AssemblyKey[];
  keycapModels: ReadonlySet<string>;
}>;
