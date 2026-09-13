import type { KeyboardDefinition, KeyboardKeyDefinition, Vector3Data } from "./keyboard-types";

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
  });
}
