import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { KeyRegistry } from "../src/features/keyboard/interaction/key-registry";
import { KeyboardModel } from "../src/features/keyboard/scene/KeyboardModel";

vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useMemo: <Value>(factory: () => Value) => factory(),
}));

const assetMocks = vi.hoisted(() => ({ useKeyboardAssets: vi.fn() }));

vi.mock("../src/features/keyboard/model/use-keyboard-assets", () => assetMocks);

function node(name: string, y: number) {
  const part = new THREE.Group();
  part.name = name;
  part.position.y = y;
  return part;
}

describe("KeyboardModel stage", () => {
  it("uses a folded clone of the source keyboard instead of its exploded GLB layout", () => {
    const source = new THREE.Group();
    source.add(
      node("bottomCase", 49.5),
      node("stablizer", 7),
      node("misc", -8),
      node("shadowPlane", 0),
    );
    assetMocks.useKeyboardAssets.mockReturnValue({
      keyboardScene: source,
      keycapScene: new THREE.Group(),
      definition: {
        keyboardOffset: [0, -0.37, 0],
        keycapUVOffsetScale: [0.5, 0.49, 32.04, 12.79],
        switchOrientation: "north",
      },
      bumpMap: new THREE.Texture(),
      legendAtlas: new THREE.Texture(),
    });

    const view = KeyboardModel({ plan: { keys: [], keycapModels: new Set() }, registry: new KeyRegistry() });
    const children = view.props.children as Array<{ props: { object?: THREE.Group } }>;
    const keyboard = children[0].props.object!;

    expect(source.getObjectByName("bottomCase")!.position.y).toBe(49.5);
    expect(keyboard.getObjectByName("bottomCase")!.position.y).toBe(0);
    expect(keyboard.getObjectByName("stablizer")!.position.y).toBe(2);
    expect(keyboard.getObjectByName("misc")!.position.y).toBe(-0.03);
    expect(keyboard.getObjectByName("shadowPlane")!.visible).toBe(false);
  });
});
