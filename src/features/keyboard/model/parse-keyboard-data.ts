import type { KeyboardDefinition, KeyboardKeyDefinition, Vector3Data, KeycapPalette } from "./keyboard-types";

export class KeyboardDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KeyboardDataError";
  }
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new KeyboardDataError(`${path} must be a finite number`);
  }
  return value;
}

function stringValue(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new KeyboardDataError(`${path} must be a string`);
  }
  return value;
}

function vector3(value: unknown, path: string): Vector3Data {
  if (!isRecord(value)) {
    throw new KeyboardDataError(`${path} must be an object`);
  }
  return Object.freeze({
    x: finiteNumber(value.x, `${path}.x`),
    y: finiteNumber(value.y, `${path}.y`),
    z: finiteNumber(value.z, `${path}.z`),
  });
}

function numberTuple<const N extends number>(value: unknown, length: N, path: string): readonly number[] {
  if (!Array.isArray(value) || value.length !== length) {
    throw new KeyboardDataError(`${path} must contain exactly ${length} numbers`);
  }
  return Object.freeze(value.map((entry, index) => finiteNumber(entry, `${path}[${index}]`)));
}

function parseKey(value: unknown, modelKey: string): KeyboardKeyDefinition {
  const path = `keyPosition.${modelKey}`;
  if (!isRecord(value)) {
    throw new KeyboardDataError(`${path} must be an object`);
  }

  const key = stringValue(value.key, `${path}.key`);
  if (key !== modelKey) {
    throw new KeyboardDataError(`${path}.key must match key name ${modelKey}`);
  }

  return Object.freeze({
    key,
    position: vector3(value.position, `${path}.position`),
    capModel: stringValue(value.capModel, `${path}.capModel`),
    row: finiteNumber(value.row, `${path}.row`),
    isBump: typeof value.isBump === "boolean"
      ? value.isBump
      : (() => { throw new KeyboardDataError(`${path}.isBump must be a boolean`); })(),
    random: finiteNumber(value.random, `${path}.random`),
    colorRole: modelKey === "Escape" || modelKey === "Enter" ? "highlightColor" : "primaryColor",
  });
}

export function parseKeyboardData(input: unknown): KeyboardDefinition {
  if (!isRecord(input)) {
    throw new KeyboardDataError("keyboard data must be an object");
  }

  const keyboardOffsetValues = numberTuple(input.keyboardOffset, 3, "keyboardOffset");
  const keycapUVOffsetScaleValues = numberTuple(input.keycapUVOffsetScale, 4, "keycapUVOffsetScale");
  const switchOrientation = input.switchOrientation;
  if (switchOrientation !== "north" && switchOrientation !== "south") {
    throw new KeyboardDataError("switchOrientation must be north or south");
  }
  if (!isRecord(input.keyPosition)) {
    throw new KeyboardDataError("keyPosition must be an object");
  }

  const keyPosition: Record<string, KeyboardKeyDefinition> = {};
  for (const [modelKey, value] of Object.entries(input.keyPosition)) {
    keyPosition[modelKey] = parseKey(value, modelKey);
  }

  if (!isRecord(input.unfoldPosition)) throw new KeyboardDataError("unfoldPosition must be an object");
  const foldedPositions: Record<string, Vector3Data> = {};
  for (const [name, entry] of Object.entries(input.unfoldPosition)) {
    if (!isRecord(entry)) throw new KeyboardDataError(`unfoldPosition.${name} must be an object`);
    foldedPositions[name] = vector3(entry.from, `unfoldPosition.${name}.from`);
  }
  for (const name of ["keyCaps", "switches", "topCaseK", "bottomCase", "plate"]) {
    if (!foldedPositions[name]) throw new KeyboardDataError(`unfoldPosition.${name}.from is required`);
  }
  const sets = input.colorSets;
  if (!isRecord(sets) || !isRecord(sets.White) || !isRecord(sets.White.colorSet)) {
    throw new KeyboardDataError("colorSets.White.colorSet is required");
  }
  const colors = sets.White.colorSet;
  const color = (value: unknown, path: string): string => {
    if (typeof value !== "string" || !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
      throw new KeyboardDataError(`${path} must be a hex color`);
    }
    return value;
  };
  const palette = (name: string): KeycapPalette => {
    const entry = colors[name];
    if (!isRecord(entry)) throw new KeyboardDataError(`colorSet.${name} is required`);
    return Object.freeze({ keycapColor: color(entry.keycapColor, `${name}.keycapColor`), fontColor: color(entry.fontColor, `${name}.fontColor`) });
  };

  return Object.freeze({
    keyboardOffset: Object.freeze([
      keyboardOffsetValues[0],
      keyboardOffsetValues[1],
      keyboardOffsetValues[2],
    ]) as readonly [number, number, number],
    keycapUVOffsetScale: Object.freeze([
      keycapUVOffsetScaleValues[0],
      keycapUVOffsetScaleValues[1],
      keycapUVOffsetScaleValues[2],
      keycapUVOffsetScaleValues[3],
    ]) as readonly [number, number, number, number],
    switchOrientation,
    keyPosition: Object.freeze(keyPosition),
    foldedPositions: Object.freeze(foldedPositions),
    colorSet: Object.freeze({
      primaryColor: palette("primaryColor"),
      secondaryColor: palette("secondaryColor"),
      highlightColor: palette("highlightColor"),
      caseColor: color(colors.caseColor, "caseColor"),
      plateColor: color(colors.plateColor, "plateColor"),
    }),
  });
}
