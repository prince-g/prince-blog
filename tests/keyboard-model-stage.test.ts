import { beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { KeyRegistry } from "../src/features/keyboard/interaction/key-registry";
import keyboardData from "../public/models/keychron-k2-he/models/keyboards/K_2_HE/keyboardData.json";
import { parseKeyboardData } from "../src/features/keyboard/model/parse-keyboard-data";
import { buildAssemblyPlan } from "../src/features/keyboard/model/build-assembly-plan";
import { KeyboardModel } from "../src/features/keyboard/scene/KeyboardModel";
import type { SceneMotion } from "../src/features/keyboard/animation/experience";

const frames = vi.hoisted(() => ({ callbacks: [] as Array<() => void> }));

vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useMemo: <Value>(factory: () => Value) => factory(),
  useEffect: () => {},
  useRef: <Value>(value: Value) => ({ current: value }),
}));

vi.mock("@react-three/fiber", () => ({ useFrame: (callback: () => void) => frames.callbacks.push(callback) }));

const assetMocks = vi.hoisted(() => ({ useKeyboardAssets: vi.fn() }));

vi.mock("../src/features/keyboard/model/use-keyboard-assets", () => assetMocks);
beforeEach(() => { frames.callbacks = []; });

function node(name: string, y: number) {
  const part = new THREE.Group();
  part.name = name;
  part.position.y = y;
  return part;
}

describe("KeyboardModel stage", () => {
  it("animates complete layers including the top-case parent and hides the board outside focused-switch space", () => {
    const source = new THREE.Group();
    source.add(node("bottomCase", 49), node("topCaseF", 0), node("topCaseL", 0), node("misc", -8), node("plate", 20));
    assetMocks.useKeyboardAssets.mockReturnValue({ keyboardScene: source, keycapScene: new THREE.Group(), definition: parseKeyboardData(keyboardData) });
    const motion: SceneMotion = { assembly: 1, reveal: 0.5, capExit: 0, switchExit: 0, focus: 0, boardExit: 0 };
    const view = KeyboardModel({ plan: { keys: [], keycapModels: new Set() }, registry: new KeyRegistry(), motion });
    const boardElement = view.props.children[0];
    const board = new THREE.Group(), deck = new THREE.Group();
    boardElement.props.ref.current = board;
    boardElement.props.children[1].props.ref.current = deck;
    const keyboard = boardElement.props.children[0].props.object as THREE.Group;
    frames.callbacks[0]();
    expect(keyboard.getObjectByName("assembledTopCase")!.position.y).toBe(22.5);
    expect(keyboard.getObjectByName("topCaseF")!.parent!.name).toBe("assembledTopCase");
    expect(keyboard.getObjectByName("topCaseL")!.position.x).toBe(-3);
    expect(keyboard.getObjectByName("plate")!.position.y).toBe(21.3);
    expect(deck.rotation.x).toBe(0);
    motion.assembly = 0; motion.reveal = 1; motion.boardExit = 1;
    frames.callbacks[0]();
    expect(board.visible).toBe(false);
    expect(board.position.y).toBe(-35.37);
    expect(keyboard.getObjectByName("plate")!.position.y).toBe(2.42);
    expect(view.props.children[1].props.position.y).toBeGreaterThan(2);
    expect(source.getObjectByName("bottomCase")!.position.y).toBe(49);
  });
  it("uses a folded clone of the source keyboard instead of its exploded GLB layout", () => {
    const source = new THREE.Group();
    source.add(
      node("bottomCase", 49.5),
      node("battery", 20),
      node("siliconeAcousticPad", 20),
      node("pcb", 20),
      node("plateFoam", 20),
      node("plate", 20),
      node("stablizer", 7),
      node("misc", -8),
      node("shadowPlane", 0),
    );
    assetMocks.useKeyboardAssets.mockReturnValue({
      keyboardScene: source,
      keycapScene: new THREE.Group(),
      definition: parseKeyboardData(keyboardData),
      bumpMap: new THREE.Texture(),
      legendAtlas: new THREE.Texture(),
    });

    const view = KeyboardModel({ plan: { keys: [], keycapModels: new Set() }, registry: new KeyRegistry() });
    const children = view.props.children as Array<{ props: { object?: THREE.Group } }>;
    const keyboard = children[0].props.object!;

    expect(source.getObjectByName("bottomCase")!.position.y).toBe(49.5);
    expect(keyboard.getObjectByName("bottomCase")!.position.y).toBe(0);
    expect(keyboard.getObjectByName("battery")!.position.toArray()).toEqual([-0.5, 1, -1.9]);
    expect(keyboard.getObjectByName("siliconeAcousticPad")!.position.y).toBe(3);
    expect(keyboard.getObjectByName("pcb")!.position.y).toBe(2.3);
    expect(keyboard.getObjectByName("plateFoam")!.position.y).toBe(2.3);
    expect(keyboard.getObjectByName("plate")!.position.y).toBe(2.42);
    expect(keyboard.getObjectByName("stablizer")!.position.y).toBe(2);
    expect(keyboard.getObjectByName("misc")!.position.y).toBe(0);
    expect(keyboard.getObjectByName("plate")!.parent!.rotation.x).toBeCloseTo(0.09424778);
    expect(keyboard.getObjectByName("bottomCase")!.parent!.rotation.x).toBeCloseTo(0);
    expect(keyboard.getObjectByName("bottomCase")!.rotation.x).toBeCloseTo(0.09424778);
    expect(keyboard.getObjectByName("shadowPlane")!.visible).toBe(false);
  });

  it("assembles keycaps and switches at the JSON height with white-gold key palettes", () => {
    const definition = parseKeyboardData(keyboardData);
    const plan = buildAssemblyPlan(definition);
    const keycaps = new THREE.Group();
    for (const name of plan.keycapModels) {
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial());
      mesh.name = name;
      keycaps.add(mesh);
    }
    assetMocks.useKeyboardAssets.mockReturnValue({
      keyboardScene: new THREE.Group(),
      keycapScene: keycaps,
      definition,
      bumpMap: new THREE.Texture(),
      legendAtlas: new THREE.Texture(),
    });
    const registry = new KeyRegistry();
    const view = KeyboardModel({ plan, registry });
    const [keyViews, switches] = view.props.children[1].props.children;
    const keyProps = (name: string) => keyViews.find((key: { props: { keycap: { modelKey: string } } }) => key.props.keycap.modelKey === name).props;

    expect(keyProps("Escape").assemblyHeight).toBeCloseTo(3.08);
    expect(keyProps("Escape").palette).toEqual({ keycapColor: "#D9AE74", fontColor: "#fff" });
    expect(keyProps("Enter").palette).toEqual({ keycapColor: "#D9AE74", fontColor: "#fff" });
    expect(keyProps("KeyA").palette).toEqual({ keycapColor: "#F2F2F0", fontColor: "#000" });
    expect(switches.props.assemblyHeight).toBe(2.6);
    expect(switches.props.registry).toBe(registry);
  });

  it("colors the white case and plate without mutating cached materials or wood textures", () => {
    const source = new THREE.Group();
    const woodTexture = new THREE.Texture();
    const originalMaterial = new THREE.MeshStandardMaterial({ color: "#222222" });
    for (const name of ["topCaseF", "bottomCase", "plate", "topCaseL"]) {
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), originalMaterial);
      mesh.name = name;
      if (name === "topCaseL") mesh.material = new THREE.MeshStandardMaterial({ map: woodTexture });
      source.add(mesh);
    }
    assetMocks.useKeyboardAssets.mockReturnValue({
      keyboardScene: source,
      keycapScene: new THREE.Group(),
      definition: parseKeyboardData(keyboardData),
    });
    const view = KeyboardModel({ plan: { keys: [], keycapModels: new Set() }, registry: new KeyRegistry() });
    const keyboard = view.props.children[0].props.object as THREE.Group;
    const material = (name: string) => (keyboard.getObjectByName(name) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>).material;

    expect(material("topCaseF").color.getHexString()).toBe("f2f2f0");
    expect(material("bottomCase").color.getHexString()).toBe("f2f2f0");
    expect(material("plate").color.getHexString()).toBe("eeeeee");
    expect(material("topCaseL").map).toBe(woodTexture);
    expect(originalMaterial.color.getHexString()).toBe("222222");
    expect(material("topCaseF")).not.toBe(originalMaterial);
  });
});
