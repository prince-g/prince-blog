import { act, createRoot, extend } from "@react-three/fiber";
import { createElement, StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import keyboardData from "../public/models/keychron-k2-he/models/keyboards/K_2_HE/keyboardData.json";
import { KeyRegistry } from "../src/features/keyboard/interaction/key-registry";
import { createPhysicalKeyboardHandlers } from "../src/features/keyboard/interaction/physical-keyboard";
import { buildAssemblyPlan } from "../src/features/keyboard/model/build-assembly-plan";
import { parseKeyboardData } from "../src/features/keyboard/model/parse-keyboard-data";
import { KeycapMesh } from "../src/features/keyboard/scene/KeycapMesh";

async function mountKeys() {
  const root = createRoot({} as HTMLCanvasElement);
  // Only the GPU boundary is replaced; React, frame subscriptions, meshes,
  // materials, the input handlers and the registry are the real implementations.
  await root.configure({
    frameloop: "never",
    gl: {
      render() {}, setAnimationLoop() {}, setPixelRatio() {}, setSize() {},
      shadowMap: { enabled: false, needsUpdate: false, type: THREE.PCFShadowMap },
      renderLists: { dispose() {} }, forceContextLoss() {},
    } as never,
    size: { width: 1440, height: 900, top: 0, left: 0 },
  });
  const definition = parseKeyboardData(keyboardData);
  const keys = buildAssemblyPlan(definition).keys.filter((key) => ["KeyA", "Space"].includes(key.modelKey));
  const registry = new KeyRegistry();
  const source = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  const atlas = new THREE.Texture();
  const normal = new THREE.Texture();
  let store: ReturnType<typeof root.render>;

  await act(async () => {
    store = root.render(createElement(StrictMode, null, keys.map((keycap) => createElement(KeycapMesh, {
      key: keycap.modelKey,
      keycap,
      assemblyHeight: 4.5,
      keyboardOffset: definition.keyboardOffset,
      atlasTransform: definition.keycapUVOffsetScale,
      palette: definition.colorSet.primaryColor,
      legendAtlas: atlas,
      bumpMap: normal,
      source,
      registry,
    }))));
    await Promise.resolve();
  });

  const scene = store!.getState().scene;
  const a = scene.getObjectByName("KeyA") as THREE.Mesh;
  const space = scene.getObjectByName("Space") as THREE.Mesh;
  const handlers = createPhysicalKeyboardHandlers(registry);
  let time = 0;
  return {
    a, space, handlers,
    down(code: string, repeat = false) { handlers.keydown({ code, repeat, target: null }); },
    up(code: string) { handlers.keyup({ code, repeat: false, target: null }); },
    frame(count = 1) {
      for (let index = 0; index < count; index += 1) {
        time += 1 / 60;
        store!.getState().advance(time, false);
      }
    },
    async unmount() {
      await act(async () => { root.unmount(); await Promise.resolve(); });
      // R3F defers root disposal by 500 ms.
      await new Promise<void>((resolve) => setTimeout(resolve, 510));
      source.geometry.dispose(); source.material.dispose(); atlas.dispose(); normal.dispose();
    },
  };
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  extend(THREE as never);
});
afterEach(() => vi.unstubAllGlobals());

describe("physical keys through the KeycapMesh render loop", () => {
  it("renders intermediate depression, holds through repeat events, and releases only the active key", async () => {
    const mounted = await mountKeys();
    try {
      const restA = mounted.a.position.y;
      const restSpace = mounted.space.position.y;
      mounted.down("KeyA");
      mounted.frame();
      expect(mounted.a.position.y).toBeLessThan(restA - 0.1);
      expect(mounted.a.position.y).toBeGreaterThan(restA - 0.25);
      expect(mounted.space.position.y).toBe(restSpace);

      mounted.frame(12);
      const heldY = mounted.a.position.y;
      expect(heldY).toBeCloseTo(restA - 0.25, 6);
      for (let frame = 0; frame < 30; frame += 1) {
        mounted.down("KeyA", true);
        mounted.frame();
        expect(mounted.a.position.y).toBeCloseTo(heldY, 6);
      }
      mounted.up("KeyA");
      mounted.frame();
      expect(mounted.a.position.y).toBeGreaterThan(heldY);
      expect(mounted.a.position.y).toBeLessThan(restA);
      mounted.frame(60);
      expect(mounted.a.position.y).toBe(restA);
      expect(mounted.space.position.y).toBe(restSpace);
    } finally { await mounted.unmount(); }
  });

  it("releases A independently from held Space and resets both meshes on blur before another frame", async () => {
    const mounted = await mountKeys();
    try {
      const restA = mounted.a.position.y;
      const restSpace = mounted.space.position.y;
      mounted.down("KeyA"); mounted.down("Space");
      mounted.frame(12);
      expect(mounted.a.position.y).toBeCloseTo(restA - 0.25, 6);
      expect(mounted.space.position.y).toBeCloseTo(restSpace - 0.25, 6);

      mounted.up("KeyA");
      mounted.frame(3);
      expect(mounted.a.position.y).toBeGreaterThan(restA - 0.2);
      expect(mounted.a.position.y).toBeLessThan(restA);
      expect(mounted.space.position.y).toBeCloseTo(restSpace - 0.25, 6);

      mounted.handlers.blur();
      expect(mounted.a.position.y).toBe(restA);
      expect(mounted.space.position.y).toBe(restSpace);
      mounted.frame();
      expect(mounted.a.position.y).toBe(restA);
      expect(mounted.space.position.y).toBe(restSpace);
    } finally { await mounted.unmount(); }
  });

  it("renders a brief down/up pair between frames and then returns to its exact assembled height", async () => {
    const mounted = await mountKeys();
    try {
      const restA = mounted.a.position.y;
      const restSpace = mounted.space.position.y;
      mounted.down("KeyA"); mounted.up("KeyA");
      expect(mounted.a.position.y).toBe(restA);
      mounted.frame();
      expect(mounted.a.position.y).toBeLessThan(restA - 0.1);
      expect(mounted.space.position.y).toBe(restSpace);
      mounted.frame(90);
      expect(mounted.a.position.y).toBe(restA);
      expect(mounted.space.position.y).toBe(restSpace);
    } finally { await mounted.unmount(); }
  });
});
