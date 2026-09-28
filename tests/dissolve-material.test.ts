import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createDissolveEffect } from "../src/features/keyboard/model/dissolve-material";
import { createKeycapMaterial } from "../src/features/keyboard/model/keycap-material";
import { buildAssemblyPlan } from "../src/features/keyboard/model/build-assembly-plan";
import { parseKeyboardData } from "../src/features/keyboard/model/parse-keyboard-data";
import keyboardData from "../public/models/keychron-k2-he/models/keyboards/K_2_HE/keyboardData.json";

function compile(material: THREE.Material, kind: "standard" | "depth") {
  const shader = { ...THREE.ShaderLib[kind], uniforms: { ...THREE.ShaderLib[kind].uniforms } } as Parameters<THREE.Material["onBeforeCompile"]>[0];
  material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
  return shader;
}

describe("patterned keyboard dissolve", () => {
  it("keeps cap depth opaque while dissolving both the color and shadow with the same live value", () => {
    const definition = parseKeyboardData(keyboardData);
    const key = buildAssemblyPlan(definition).keys.find((entry) => entry.modelKey === "KeyA")!;
    const material = createKeycapMaterial(key, definition.colorSet.primaryColor, new THREE.Texture(), new THREE.Texture(), definition.keycapUVOffsetScale);
    const effect = createDissolveEffect(material, true);
    const color = compile(material, "standard");
    const depth = compile(effect.depthMaterial, "depth");
    effect.progress.value = 0.6;
    expect(color.uniforms.dissolveProgress.value).toBe(0.6);
    expect(depth.uniforms.dissolveProgress).toBe(color.uniforms.dissolveProgress);
    expect(color.fragmentShader).toContain("discard");
    expect(depth.fragmentShader).toContain("discard");
    expect(material.transparent).toBe(false);
    expect(material.depthWrite).toBe(true);
    expect(material.opacity).toBe(1);
    // Applying the effect must retain the existing physical-position letter projection.
    expect(color.uniforms.legendProjection).toBeDefined();
    expect(color.fragmentShader).toContain("texture2D(map, vLegendUv)");
    effect.progress.value = 0;
    expect(color.uniforms.dissolveProgress.value).toBe(0);
  });

  it("preserves a source switch's optical properties and uses separate progress for each clone", () => {
    const original = new THREE.MeshPhysicalMaterial({ transparent: true, opacity: 0.4, transmission: 0.5, depthWrite: false });
    const clone = original.clone();
    const effect = createDissolveEffect(clone);
    const second = createDissolveEffect(original.clone());
    effect.progress.value = 0.8;
    expect(second.progress.value).toBe(0);
    expect(clone.transparent).toBe(true);
    expect(clone.opacity).toBe(0.4);
    expect(clone.transmission).toBe(0.5);
    expect(clone.depthWrite).toBe(false);
    expect(compile(original, "standard").uniforms.dissolveProgress).toBeUndefined();
    expect(materialKey(clone)).not.toEqual(materialKey(original));
  });
});

const materialKey = (material: THREE.Material) => material.customProgramCacheKey();
