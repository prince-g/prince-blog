import { beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import keyboardData from "../public/models/keychron-k2-he/models/keyboards/K_2_HE/keyboardData.json";
import { buildAssemblyPlan } from "../src/features/keyboard/model/build-assembly-plan";
import { parseKeyboardData } from "../src/features/keyboard/model/parse-keyboard-data";
import { SwitchInstances } from "../src/features/keyboard/scene/SwitchInstances";

const effectHarness = vi.hoisted(() => {
  const cleanups: Array<() => void> = [];
  return {
    mount(effect: () => void | (() => void)) {
      const cleanup = effect();
      if (typeof cleanup === "function") cleanups.push(cleanup);
    },
    reset() { cleanups.length = 0; },
    cleanup() { cleanups.forEach((cleanup) => cleanup()); },
  };
});

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    useEffect: effectHarness.mount,
    useMemo: <Value>(factory: () => Value) => factory(),
  };
});

const switchPartNames = [
  "upperhousing",
  "stem",
  "housingbase",
  "spring",
  "stem_magnet",
  "lightRefractor",
] as const;

function createSwitchScene() {
  const scene = new THREE.Group();

  for (const name of switchPartNames) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
    ], 3));

    if (name === "spring") {
      geometry.morphAttributes.position = [new THREE.Float32BufferAttribute([
        0, 0, 0,
        1, 0.1, 0,
        0, 1.1, 0,
      ], 3)];
    }

    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    mesh.name = name;
    scene.add(mesh);
  }

  return scene;
}

beforeEach(() => effectHarness.reset());

describe("SwitchInstances", () => {
  it("copies source morph weights to every spring instance", () => {
    const plan = buildAssemblyPlan(parseKeyboardData(keyboardData));
    const switchScene = createSwitchScene();
    const source = switchScene.getObjectByName("spring") as THREE.Mesh;
    source.morphTargetInfluences![0] = 0.37;
    const elements = SwitchInstances({
      keyboardOffset: [0, 0, 0],
      orientation: "south",
      plan,
      switchScene,
    }) as Array<{ props: { object: THREE.InstancedMesh } }>;
    const spring = elements
      .map((element) => element.props.object)
      .find((instance) => instance.name === "springInstances");

    expect(spring?.morphTexture).not.toBeNull();
    expect(spring?.morphTexture?.version).toBeGreaterThan(0);
    for (let index = 0; index < plan.keys.length; index += 1) {
      const target = new THREE.Mesh(source.geometry, source.material);
      spring?.getMorphAt(index, target);
      expect(target.morphTargetInfluences?.[0]).toBeCloseTo(0.37);
    }
  });

  it("initializes zero-valued morph data when a source exposes targets without weights", () => {
    const plan = buildAssemblyPlan(parseKeyboardData(keyboardData));
    const switchScene = createSwitchScene();
    const source = switchScene.getObjectByName("spring") as THREE.Mesh;
    source.morphTargetInfluences = undefined;

    const elements = SwitchInstances({
      keyboardOffset: [0, 0, 0],
      orientation: "south",
      plan,
      switchScene,
    }) as Array<{ props: { object: THREE.InstancedMesh } }>;
    const spring = elements
      .map((element) => element.props.object)
      .find((instance) => instance.name === "springInstances");
    const target = new THREE.Mesh(source.geometry, source.material);

    expect(spring?.morphTexture).not.toBeNull();
    spring?.getMorphAt(0, target);
    expect(target.morphTargetInfluences?.[0]).toBe(0);
  });

  it("keeps instanced morph data through React's development effect replay", () => {
    const plan = buildAssemblyPlan(parseKeyboardData(keyboardData));
    const elements = SwitchInstances({
      keyboardOffset: [0, 0, 0],
      orientation: "south",
      plan,
      switchScene: createSwitchScene(),
    }) as Array<{ props: { object: THREE.InstancedMesh } }>;
    const spring = elements
      .map((element) => element.props.object)
      .find((instance) => instance.name === "springInstances");

    effectHarness.cleanup();

    expect(spring?.morphTexture).not.toBeNull();
  });
});
