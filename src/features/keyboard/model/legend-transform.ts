export type LegendPosition = Readonly<{ x: number; z: number }>;
export type LegendTransform = Readonly<{ offsetX: number; offsetY: number }>;

export function computeLegendTransform(
  position: LegendPosition,
  keycapUVOffsetScale: readonly [number, number, number, number],
): LegendTransform {
  const [atlasOffsetX, atlasOffsetY, atlasScaleX, atlasScaleY] = keycapUVOffsetScale;
  if (atlasScaleX === 0 || atlasScaleY === 0) {
    throw new Error("atlas scale must not be zero");
  }
  if (![position.x, position.z, atlasOffsetX, atlasOffsetY, atlasScaleX, atlasScaleY].every(Number.isFinite)) {
    throw new Error("legend transform inputs must be finite");
  }

  const offsetX = atlasOffsetX + position.x / atlasScaleX;
  const offsetY = atlasOffsetY - position.z / atlasScaleY;
  if (!Number.isFinite(offsetX) || !Number.isFinite(offsetY)) {
    throw new Error("legend transform result must be finite");
  }

  return { offsetX, offsetY };
}
