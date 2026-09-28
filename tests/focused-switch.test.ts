import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createFocusedSwitchScene, stepFocusedSwitchSpin } from "../src/features/keyboard/scene/FocusedSwitch";

describe("focused magnetic switch resources", () => {
  it("shares the six source geometries but owns materials and preserves transparent housing", () => {
    const source = new THREE.Group();
    for (const name of ["upperhousing", "housingbase", "stem", "spring", "stem_magnet", "lightRefractor"]) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshPhysicalMaterial({
        transparent: name === "upperhousing", opacity: name === "upperhousing" ? 0.5 : 1,
        transmission: name === "upperhousing" ? 0.2 : 0,
      }));
      mesh.name = name;
      source.add(mesh);
    }
    const result = createFocusedSwitchScene(source, "north");
    expect(result.parts.size).toBe(6);
    expect(result.spinner.parent).toBe(result.group);
    expect(result.parts.get("stem")!.parent!.parent).toBe(result.spinner);
    for (const [name, mesh] of result.parts) {
      const original = source.getObjectByName(name) as THREE.Mesh;
      expect(mesh.geometry).toBe(original.geometry);
      expect(mesh.material).not.toBe(original.material);
    }
    const housing = result.parts.get("upperhousing")!.material as THREE.MeshPhysicalMaterial;
    expect(housing.opacity).toBe(0.5);
    expect(housing.transmission).toBeCloseTo(0.2);
    expect(housing.depthWrite).toBe(false);
    const geometryDispose = vi.fn();
    source.children.forEach((mesh) => (mesh as THREE.Mesh).geometry.addEventListener("dispose", geometryDispose));
    result.materials.forEach((material) => material.dispose());
    expect(geometryDispose).not.toHaveBeenCalled();
  });
});

describe("focused switch auto rotation", () => {
  it("turns gently only in the switch phase and holds during interaction or accessibility pauses", () => {
    let angle = 0;
    for (let frame = 0; frame < 60; frame++) angle = stepFocusedSwitchSpin(angle, 1 / 60, "switch");
    expect(angle).toBeCloseTo(0.28);
    for (const phase of ["loading", "assembling", "ready", "exiting", "returning"] as const) {
      expect(stepFocusedSwitchSpin(angle, 1 / 60, phase)).toBe(angle);
    }
    expect(stepFocusedSwitchSpin(angle, 1 / 60, "switch", false)).toBe(angle);
  });

  it("keeps the angle bounded for shortest-path return and ignores stalled-frame time", () => {
    let angle = Math.PI - 0.01;
    angle = stepFocusedSwitchSpin(angle, 0.1, "switch");
    expect(angle).toBeCloseTo(-Math.PI + 0.018);
    expect(stepFocusedSwitchSpin(0, 120, "switch")).toBeCloseTo(0.028);
    expect(stepFocusedSwitchSpin(0, -1, "switch")).toBe(0);
    let maximum = 0;
    for (let frame = 0; frame < 30_000; frame++) {
      angle = stepFocusedSwitchSpin(angle, 0.1, "switch");
      maximum = Math.max(maximum, Math.abs(angle));
    }
    expect(maximum).toBeLessThanOrEqual(Math.PI);
  });
});
