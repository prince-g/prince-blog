import { describe, expect, it } from "vitest";
import * as THREE from "three";
import keyboardData from "../public/models/keychron-k2-he/models/keyboards/K_2_HE/keyboardData.json";
import { parseKeyboardData } from "../src/features/keyboard/model/parse-keyboard-data";
import { createKeycapMaterial } from "../src/features/keyboard/model/keycap-material";
import * as appearance from "../src/features/keyboard/model/keycap-appearance";

function imageShader(keyName: string, image: THREE.Texture | null = new THREE.Texture()) {
  const definition = parseKeyboardData(keyboardData);
  const key = { ...definition.keyPosition[keyName], modelKey: keyName };
  const material = createKeycapMaterial(key, definition.colorSet.primaryColor, new THREE.Texture(), new THREE.Texture(), definition.keycapUVOffsetScale, image);
  const shader = { ...THREE.ShaderLib.standard, uniforms: { ...THREE.ShaderLib.standard.uniforms } } as Parameters<THREE.Material["onBeforeCompile"]>[0];
  material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
  return { shader, material, key };
}

describe("keyboard appearance", () => {
  it("makes all supplied presets available while keeping white-gold as the default", () => {
    const definition = parseKeyboardData(keyboardData);
    expect(definition.colorSets).toBeDefined();
    expect(Object.keys(definition.colorSets)).toEqual(["White", "PureWhite", "Black", "PureBlack"]);
    expect(definition.colorSet).toBe(definition.colorSets.White);
    expect(definition.colorSets.Black.primaryColor.keycapColor).toBe("#222");
    expect(definition.colorSets.PureBlack.highlightColor.keycapColor).toBe("#222");
    expect(definition.colorSets.PureWhite.highlightColor.keycapColor).toBe("#F2F2F0");
  });

  it("rejects a malformed nondefault palette before it reaches a material", () => {
    const input = structuredClone(keyboardData);
    input.colorSets.Black.colorSet.caseColor = "broken";
    expect(() => parseKeyboardData(input)).toThrow(/Black.*caseColor/);
  });

  it("maps the whole image once across the board and keeps wide keys at their physical width", () => {
    const a = imageShader("KeyA"), j = imageShader("KeyJ"), space = imageShader("Space");
    for (const entry of [a, j, space]) expect(entry.shader.uniforms.imageProjection?.value).toBeInstanceOf(THREE.Matrix3);
    const uv = (entry: typeof a, x: number, z = 0) => new THREE.Vector3(x, z, 1).applyMatrix3(entry.shader.uniforms.imageProjection.value);
    // The same board point must sample the same pixel, whichever cap owns it.
    expect(uv(a, -a.key.position.x).x).toBeCloseTo(uv(j, -j.key.position.x).x, 10);
    expect(uv(j, 0).x).toBeGreaterThan(uv(a, 0).x);
    expect(uv(space, 5.89).x - uv(space, -5.89).x).toBeCloseTo(0.388512, 5);
    const topLeft = uv(a, -15.16209888458252 - a.key.position.x, -5.6564337611198425 - a.key.position.z);
    expect(topLeft.x).toBeCloseTo(0, 10);
    expect(topLeft.y).toBeCloseTo(1, 10);
    expect(uv(a, 15.158718585968018 - a.key.position.x, 5.660042226314545 - a.key.position.z).x).toBeCloseTo(1);
    expect(uv(a, 0, 5.660042226314545 - a.key.position.z).y).toBeCloseTo(0);
  });

  it("crops tall and wide images centrally without stretching or enlarging small images", () => {
    expect(appearance.getKeycapImageCrop).toBeTypeOf("function");
    const tall = appearance.getKeycapImageCrop(1000, 2000);
    expect(tall.sourceX).toBe(0);
    expect(tall.sourceY).toBeCloseTo(813.38768, 4);
    expect(tall.sourceWidth).toBe(1000);
    expect(tall.width).toBe(1000);
    expect(tall.height).toBe(373);
    const wide = appearance.getKeycapImageCrop(10000, 1000);
    expect(wide.sourceX).toBeCloseTo(3660.32423, 4);
    expect(wide.sourceY).toBe(0);
    expect(wide.width).toBe(2048);
    expect(wide.height).toBe(764);
    expect(() => appearance.getKeycapImageCrop(0, 100)).toThrow();
  });

  it("shares the upload texture and distinguishes its shader from the palette shader", () => {
    const image = new THREE.Texture();
    const custom = imageShader("Escape", image), preset = imageShader("Escape", null);
    expect(custom.shader.uniforms.keycapImage?.value).toBe(image);
    expect(custom.material.customProgramCacheKey()).not.toBe(preset.material.customProgramCacheKey());
    expect(custom.material.transparent).toBe(false);
    expect(custom.material.depthWrite).toBe(true);
    expect(custom.material.color.getHexString()).toBe("ffffff");
  });
});
