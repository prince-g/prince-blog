import { act, createRoot, extend } from "@react-three/fiber";
import { createElement, StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import keyboardData from "../public/models/keychron-k2-he/models/keyboards/K_2_HE/keyboardData.json";
import { buildAssemblyPlan } from "../src/features/keyboard/model/build-assembly-plan";
import { parseKeyboardData } from "../src/features/keyboard/model/parse-keyboard-data";
import { SwitchInstances } from "../src/features/keyboard/scene/SwitchInstances";

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

function createRenderer() {
  return {
    render() {},
    setAnimationLoop() {},
    setPixelRatio() {},
    setSize() {},
    shadowMap: { enabled: false, needsUpdate: false, type: THREE.PCFShadowMap },
    renderLists: { dispose() {} },
    forceContextLoss() {},
  };
}

function instanceMeshes(scene: THREE.Scene): THREE.InstancedMesh[] {
  return scene.children.filter((child): child is THREE.InstancedMesh => child instanceof THREE.InstancedMesh);
}

async function mountSwitches(switchScene = createSwitchScene()) {
  const root = createRoot({} as HTMLCanvasElement);
  await root.configure({
    frameloop: "never",
    gl: createRenderer() as never,
    size: { width: 1440, height: 900, top: 0, left: 0 },
  });
  const plan = buildAssemblyPlan(parseKeyboardData(keyboardData));
  let store: ReturnType<typeof root.render>;

  await act(async () => {
    store = root.render(createElement(
      StrictMode,
      null,
      createElement(SwitchInstances, {
        keyboardOffset: [0, 0, 0],
        orientation: "south",
        plan,
        switchScene,
      }),
    ));
    await Promise.resolve();
  });

  return {
    instances: instanceMeshes(store!.getState().scene),
    plan,
    switchScene,
    async unmount() {
      await act(async () => {
        root.unmount();
        await Promise.resolve();
      });
      await new Promise<void>((resolve) => setTimeout(resolve, 510));
    },
  };
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  extend(THREE as never);
});
afterEach(() => vi.unstubAllGlobals());

describe("SwitchInstances", () => {
  it("copies source morph weights to every spring instance", async () => {
    const switchScene = createSwitchScene();
    const source = switchScene.getObjectByName("spring") as THREE.Mesh;
    source.morphTargetInfluences![0] = 0.37;
    const mounted = await mountSwitches(switchScene);

    try {
      const spring = mounted.instances.find((instance) => instance.name === "springInstances");

      expect(spring?.morphTexture).not.toBeNull();
      expect(spring?.morphTexture?.version).toBeGreaterThan(0);
      for (let index = 0; index < mounted.plan.keys.length; index += 1) {
        const target = new THREE.Mesh(source.geometry, source.material);
        spring?.getMorphAt(index, target);
        expect(target.morphTargetInfluences?.[0]).toBeCloseTo(0.37);
      }
    } finally {
      await mounted.unmount();
    }
  });

  it("initializes zero-valued morph data when a source exposes targets without weights", async () => {
    const switchScene = createSwitchScene();
    const source = switchScene.getObjectByName("spring") as THREE.Mesh;
    source.morphTargetInfluences = undefined;
    const mounted = await mountSwitches(switchScene);

    try {
      const spring = mounted.instances.find((instance) => instance.name === "springInstances");
      const target = new THREE.Mesh(source.geometry, source.material);

      expect(spring?.morphTexture).not.toBeNull();
      spring?.getMorphAt(0, target);
      expect(target.morphTargetInfluences?.[0]).toBe(0);
    } finally {
      await mounted.unmount();
    }
  });

  it("keeps declarative instance morph data through Strict Mode effect replay", async () => {
    const mounted = await mountSwitches();

    try {
      expect(mounted.instances).toHaveLength(6);
      expect(mounted.instances.find((instance) => instance.name === "springInstances")?.morphTexture).not.toBeNull();
    } finally {
      await mounted.unmount();
    }
  });

  it("disposes every declarative instance and the spring texture on a real unmount", async () => {
    const mounted = await mountSwitches();
    const spring = mounted.instances.find((instance) => instance.name === "springInstances")!;
    const springTexture = spring.morphTexture!;
    const disposed = vi.fn();
    const disposedTexture = vi.fn();

    mounted.instances.forEach((instance) => instance.addEventListener("dispose", disposed));
    springTexture.addEventListener("dispose", disposedTexture);
    await mounted.unmount();

    expect(disposed).toHaveBeenCalledTimes(6);
    expect(disposedTexture).toHaveBeenCalledOnce();
    expect(spring.morphTexture).toBeNull();
  });
});
