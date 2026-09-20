import { act, createRoot, extend } from "@react-three/fiber";
import { createElement, StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import keyboardData from "../public/models/keychron-k2-he/models/keyboards/K_2_HE/keyboardData.json";
import { buildAssemblyPlan } from "../src/features/keyboard/model/build-assembly-plan";
import { parseKeyboardData } from "../src/features/keyboard/model/parse-keyboard-data";
import { SwitchInstances } from "../src/features/keyboard/scene/SwitchInstances";
import { KeyRegistry } from "../src/features/keyboard/interaction/key-registry";
import type { SceneMotion } from "../src/features/keyboard/animation/experience";
import { FocusedSwitch } from "../src/features/keyboard/scene/FocusedSwitch";
import { KeycapMesh } from "../src/features/keyboard/scene/KeycapMesh";
import { createKeyAnimationState, stepKeyAnimation } from "../src/features/keyboard/animation/key-animation";

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

async function mountSwitches(switchScene = createSwitchScene(), motion?: SceneMotion, includeFocus = false) {
  const root = createRoot({} as HTMLCanvasElement);
  await root.configure({
    frameloop: "never",
    gl: createRenderer() as never,
    size: { width: 1440, height: 900, top: 0, left: 0 },
  });
  const definition = parseKeyboardData(keyboardData);
  const plan = buildAssemblyPlan(definition);
  const registry = new KeyRegistry();
  let store: ReturnType<typeof root.render>;

  await act(async () => {
    store = root.render(createElement(
      StrictMode,
      null,
      createElement(SwitchInstances, {
        keyboardOffset: [0, 0, 0],
        orientation: "south",
        plan,
        registry,
        switchScene,
        motion,
      }),
      includeFocus && motion && createElement(FocusedSwitch, {
        motion, registry, switchScene, orientation: "north", position: new THREE.Vector3(0.472, 2.13, 1.19),
      }),
      includeFocus && motion && createElement(KeycapMesh, {
        motion, registry, keycap: plan.keys.find((key) => key.modelKey === "KeyJ")!,
        assemblyHeight: 3.08, atlasTransform: definition.keycapUVOffsetScale, keyboardOffset: [0, 0, 0],
        bumpMap: new THREE.Texture(), legendAtlas: new THREE.Texture(), palette: definition.colorSet.primaryColor,
        source: new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()),
      }),
    ));
    await Promise.resolve();
  });

  return {
    instances: instanceMeshes(store!.getState().scene),
    plan,
    registry,
    frame: () => store!.getState().advance(1, true),
    switchScene,
    scene: store!.getState().scene,
    subscribers: store!.getState().internal.subscribers,
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
  it("keeps the focused switch in world space and advances a clicked J stroke exactly once", async () => {
    const motion: SceneMotion = { assembly: 0, reveal: 1, capExit: 1, switchExit: 1, focus: 1, boardExit: 1 };
    const mounted = await mountSwitches(createSwitchScene(), motion, true);
    try {
      const focused = mounted.scene.getObjectByName("focusedSwitch") as THREE.Group & { __r3f: { handlers: Record<string, () => void> } };
      focused.__r3f.handlers.onPointerDown();
      const expected = createKeyAnimationState();
      expected.pressed = true;
      expected.holdRemaining = 0.035;
      stepKeyAnimation(expected, 1 / 60);
      // Run the actual registered render callbacks with one known frame delta.
      for (const subscriber of mounted.subscribers) subscriber.ref.current({} as never, 1 / 60, undefined);
      expect(focused.position.toArray()).toEqual([0, 12.5, 0]);
      expect(focused.visible).toBe(true);
      expect(mounted.registry.getAnimation("KeyJ").offsetY).toBeCloseTo(expected.offsetY, 9);
      expect(focused.getObjectByName("stem")!.position.y).toBeCloseTo(expected.offsetY, 9);
      focused.__r3f.handlers.onPointerOut();
      expect(mounted.registry.getAnimation("KeyJ").pressed).toBe(false);
    } finally { await mounted.unmount(); }
  });
  it("flies every component out while retaining J until its focused replacement appears", async () => {
    const motion: SceneMotion = { assembly: 0, reveal: 1, capExit: 0, switchExit: 0, focus: 0, boardExit: 0 };
    const mounted = await mountSwitches(createSwitchScene(), motion);
    try {
      mounted.frame();
      const j = mounted.plan.keys.findIndex((key) => key.modelKey === "KeyJ");
      const a = mounted.plan.keys.findIndex((key) => key.modelKey === "KeyA");
      motion.switchExit = 1;
      mounted.frame();
      for (const instance of mounted.instances) {
        const matrix = new THREE.Matrix4();
        instance.getMatrixAt(a, matrix);
        expect(matrix.elements[13]).toBeGreaterThanOrEqual(50);
        instance.getMatrixAt(j, matrix);
        expect(matrix.elements[13]).toBe(0);
      }
      motion.focus = 0.1;
      mounted.frame();
      for (const instance of mounted.instances) {
        const matrix = new THREE.Matrix4();
        instance.getMatrixAt(j, matrix);
        expect(matrix.determinant()).toBe(0);
      }
      motion.reveal = 0.25;
      mounted.frame();
      expect((mounted.instances[0].material as THREE.Material).opacity).toBe(0.25);
      expect(((mounted.switchScene.children[0] as THREE.Mesh).material as THREE.Material).opacity).toBe(1);
    } finally { await mounted.unmount(); }
  });
  it("moves only the matching stem and compresses its spring with shared key travel", async () => {
    const mounted = await mountSwitches();
    try {
      const index = mounted.plan.keys.findIndex((key) => key.modelKey === "KeyA");
      const stem = mounted.instances.find((part) => part.name === "stemInstances")!;
      const spring = mounted.instances.find((part) => part.name === "springInstances")!;
      const before = new THREE.Matrix4(), after = new THREE.Matrix4(), neighbor = new THREE.Matrix4();
      stem.getMatrixAt(index, before);
      stem.getMatrixAt(0, neighbor);
      mounted.registry.getAnimation("KeyA").offsetY = -0.25;
      mounted.frame();
      stem.getMatrixAt(index, after);
      expect(after.elements[13] - before.elements[13]).toBeCloseTo(-0.25);
      stem.getMatrixAt(0, after);
      expect(after.elements).toEqual(neighbor.elements);
      const source = mounted.switchScene.getObjectByName("spring") as THREE.Mesh;
      const target = new THREE.Mesh(source.geometry, source.material);
      spring.getMorphAt(index, target);
      expect(target.morphTargetInfluences![0]).toBeCloseTo(1);
      mounted.registry.releaseAll();
      mounted.frame();
      stem.getMatrixAt(index, after);
      expect(after.elements).toEqual(before.elements);
    } finally { await mounted.unmount(); }
  });
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
