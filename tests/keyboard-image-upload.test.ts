import { act, createRoot } from "@react-three/fiber";
import { createElement, StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SRGBColorSpace, PCFShadowMap } from "three";
import { loadKeycapImage, useKeyboardAppearance, type KeyboardAppearanceController } from "../src/features/keyboard/scene/use-keyboard-appearance";

const decodes: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];
const created: string[] = [], revoked: string[] = [];
const drawImage = vi.fn();

beforeEach(() => {
  decodes.length = created.length = revoked.length = 0;
  drawImage.mockClear();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
    const url = `blob:keyboard-test-${created.length}`;
    created.push(url);
    return url;
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation((url) => { revoked.push(url); });
  vi.stubGlobal("Image", class {
    src = "";
    naturalWidth = 4000;
    naturalHeight = 2000;
    decode() { return new Promise<void>((resolve, reject) => decodes.push({ resolve, reject })); }
  });
  vi.stubGlobal("document", { createElement: () => ({
    width: 0, height: 0,
    getContext: () => ({ fillStyle: "", fillRect() {}, drawImage }),
    toBlob: (callback: BlobCallback) => callback(new Blob(["preview"], { type: "image/webp" })),
  }) });
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const file = () => new File(["image"], "photo.png", { type: "image/png" });

async function mountAppearance() {
  let controller: KeyboardAppearanceController;
  function Probe() { controller = useKeyboardAppearance(); return null; }
  const root = createRoot({} as HTMLCanvasElement);
  await root.configure({
    frameloop: "never",
    gl: {
      render() {}, setAnimationLoop() {}, setPixelRatio() {}, setSize() {},
      shadowMap: { enabled: false, needsUpdate: false, type: PCFShadowMap },
      renderLists: { dispose() {} }, forceContextLoss() {},
    } as never,
    size: { width: 390, height: 844, top: 0, left: 0 },
  });
  await act(async () => { root.render(createElement(StrictMode, null, createElement(Probe))); });
  return {
    get current() { return controller!; },
    async unmount() {
      await act(async () => { root.unmount(); });
      await new Promise<void>((resolve) => setTimeout(resolve, 510));
    },
  };
}

describe("uploaded keyboard image ownership", () => {
  it("rejects unsupported or oversized files before creating browser resources", async () => {
    await expect(loadKeycapImage(new File(["svg"], "x.svg", { type: "image/svg+xml" }))).rejects.toThrow(/PNG/);
    await expect(loadKeycapImage(new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.jpg", { type: "image/jpeg" }))).rejects.toThrow(/10 MB/);
    expect(created).toEqual([]);
  });

  it("flattens and crops once into an sRGB texture and releases a failed source URL", async () => {
    const pending = loadKeycapImage(file());
    decodes[0].resolve();
    const image = await pending;
    expect(image.texture.image).toMatchObject({ width: 2048, height: 764 });
    expect(image.texture.colorSpace).toBe(SRGBColorSpace);
    expect(image.texture.flipY).toBe(true);
    const crop = drawImage.mock.calls[0];
    expect(crop.slice(1, 2)).toEqual([0]);
    expect(crop[2]).toBeCloseTo(253.55073, 4);
    expect(crop.slice(5)).toEqual([0, 0, 2048, 764]);
    expect(revoked).toEqual([created[0]]);
    const broken = loadKeycapImage(file());
    decodes[1].reject(new Error("decode failed"));
    await expect(broken).rejects.toThrow(/decode/);
    expect(revoked).toContain(created[2]);
    image.texture.dispose();
    URL.revokeObjectURL(image.previewUrl);
  });

  it("keeps the latest upload across preset changes and releases stale and unmounted uploads in StrictMode", async () => {
    const mounted = await mountAppearance();
    let first: Promise<void>, second: Promise<void>;
    await act(async () => {
      first = mounted.current.uploadImage(file());
      second = mounted.current.uploadImage(file());
    });
    await act(async () => { decodes[1].resolve(); await second; });
    const selected = mounted.current.imageTexture!;
    const preview = mounted.current.customImageUrl!;
    const disposed = vi.fn();
    selected.addEventListener("dispose", disposed);
    await act(async () => { decodes[0].resolve(); await first; });
    expect(mounted.current.imageTexture).toBe(selected);
    expect(revoked).toContain(created[3]);
    await act(async () => { mounted.current.selectPreset("Black"); });
    expect(mounted.current.imageTexture).toBeNull();
    expect(mounted.current.customImageUrl).toBe(preview);
    expect(disposed).not.toHaveBeenCalled();
    expect(revoked).not.toContain(preview);
    await act(async () => { mounted.current.selectImage(); });
    expect(mounted.current.imageTexture).toBe(selected);
    let pending: Promise<void>;
    await act(async () => { pending = mounted.current.uploadImage(file()); });
    await mounted.unmount();
    expect(disposed).toHaveBeenCalledOnce();
    expect(revoked).toContain(preview);
    decodes[2].resolve();
    await pending!;
    expect(new Set(revoked)).toEqual(new Set(created));
  });
});
