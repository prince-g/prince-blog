import type { Texture } from "three";
import type { KeyboardPresetId } from "./keyboard-types";

export type KeyboardAppearance = Readonly<{
  preset: KeyboardPresetId;
  imageTexture: Texture | null;
}>;

// Bounds of all 84 assembled caps, including their physical widths.
export const KEYCAP_IMAGE_BOUNDS = {
  minX: -15.16209888458252, maxX: 15.158718585968018,
  minZ: -5.6564337611198425, maxZ: 5.660042226314545,
} as const;
export const KEYCAP_IMAGE_ASPECT = (KEYCAP_IMAGE_BOUNDS.maxX - KEYCAP_IMAGE_BOUNDS.minX)
  / (KEYCAP_IMAGE_BOUNDS.maxZ - KEYCAP_IMAGE_BOUNDS.minZ);

export function getKeycapImageCrop(imageWidth: number, imageHeight: number) {
  if (![imageWidth, imageHeight].every((value) => Number.isFinite(value) && value > 0)) throw new Error("图片尺寸无效，请选择其他图片。");
  const sourceWidth = Math.min(imageWidth, imageHeight * KEYCAP_IMAGE_ASPECT);
  const sourceHeight = Math.min(imageHeight, imageWidth / KEYCAP_IMAGE_ASPECT);
  const width = Math.max(1, Math.min(2048, Math.round(sourceWidth)));
  return {
    sourceX: (imageWidth - sourceWidth) / 2, sourceY: (imageHeight - sourceHeight) / 2,
    sourceWidth, sourceHeight, width, height: Math.max(1, Math.round(width / KEYCAP_IMAGE_ASPECT)),
  };
}
