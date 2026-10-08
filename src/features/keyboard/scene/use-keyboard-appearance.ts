import { useEffect, useRef, useState } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { getKeycapImageCrop, type KeyboardAppearance } from "../model/keycap-appearance";
import type { KeyboardPresetId } from "../model/keyboard-types";

type UploadedImage = { texture: CanvasTexture; previewUrl: string };

export type KeyboardAppearanceController = KeyboardAppearance & Readonly<{
  customImageUrl: string | null;
  uploading: boolean;
  error: string | null;
  selectPreset: (preset: KeyboardPresetId) => void;
  selectImage: () => void;
  uploadImage: (file: File) => Promise<void>;
  removeImage: () => void;
}>;

function releaseImage(image: UploadedImage | null) {
  if (!image) return;
  image.texture.dispose();
  URL.revokeObjectURL(image.previewUrl);
}

export async function loadKeycapImage(file: File): Promise<UploadedImage> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("请选择 PNG、JPG 或 WebP 图片。");
  if (file.size > 10 * 1024 * 1024) throw new Error("图片超过 10 MB，请压缩后重试。");
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();
    const crop = getKeycapImageCrop(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = crop.width;
    canvas.height = crop.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法处理图片，请换一张图片重试。");
    // Flatten transparency so the printed caps remain opaque and cast solid shadows.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, crop.sourceX, crop.sourceY, crop.sourceWidth, crop.sourceHeight, 0, 0, canvas.width, canvas.height);
    const preview = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("无法读取图片，请换一张图片重试。")), "image/webp", 0.8,
    ));
    const previewUrl = URL.createObjectURL(preview);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
    return { texture, previewUrl };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export function useKeyboardAppearance(): KeyboardAppearanceController {
  const [preset, setPreset] = useState<KeyboardPresetId>("White");
  const [custom, setCustom] = useState(false);
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current += 1; };
  }, []);
  useEffect(() => () => releaseImage(image), [image]);

  const cancelUpload = () => { request.current += 1; setUploading(false); setError(null); };
  return {
    preset, imageTexture: custom ? image?.texture ?? null : null,
    customImageUrl: image?.previewUrl ?? null, uploading, error,
    selectPreset: (next) => { cancelUpload(); setPreset(next); setCustom(false); },
    selectImage: () => { cancelUpload(); if (image) setCustom(true); },
    removeImage: () => { cancelUpload(); setCustom(false); setImage(null); },
    async uploadImage(file) {
      const currentRequest = ++request.current;
      setUploading(true);
      setError(null);
      try {
        const uploaded = await loadKeycapImage(file);
        if (!mounted.current || request.current !== currentRequest) { releaseImage(uploaded); return; }
        setImage(uploaded);
        setCustom(true);
      } catch (cause) {
        if (mounted.current && request.current === currentRequest) setError(cause instanceof Error && !(cause instanceof DOMException)
          ? cause.message : "图片无法打开，请选择其他图片重试。");
      } finally {
        if (mounted.current && request.current === currentRequest) setUploading(false);
      }
    },
  };
}
