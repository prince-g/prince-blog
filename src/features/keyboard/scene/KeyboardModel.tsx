import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ExperiencePhase, SceneMotion } from "../animation/experience";
import type { KeyRegistry } from "../interaction/key-registry";
import type { AssemblyPlan, KeyboardDefinition } from "../model/keyboard-types";
import { useKeyboardAssets } from "../model/use-keyboard-assets";
import { KeycapMesh } from "./KeycapMesh";
import { SwitchInstances } from "./SwitchInstances";
import { FocusedSwitch } from "./FocusedSwitch";
import { assemblyPosition, FOCUSED_KEY, KEYBOARD_TILT } from "../model/assembly-motion";
import { createDissolveEffect } from "../model/dissolve-material";

type KeyboardModelProps = Readonly<{ plan: AssemblyPlan; registry: KeyRegistry; motion?: SceneMotion; phase?: ExperiencePhase; autoRotate?: boolean }>;
const TILT = KEYBOARD_TILT;
// KSA sockets sit 0.48 units above the common keycap/switch mounting plane.
const KEYCAP_SOCKET_OFFSET = 0.48;
const BOTTOM_PARTS = new Set(["bottomCase", "battery", "feet", "rubberFeet", "acousticPad"]);
const PART_ALIASES: Record<string, string> = {
  topCaseL: "topCaseK_L", topCaseR: "topCaseK_R", topCaseF: "topCaseK_F", topCaseB: "topCaseK_B", misc: "topCaseK",
};
// The reference runtime supplies these four side fasteners outside keyboardData.json.
const SIDE_SCREWS = [
  [-16.03, 2.05, -4.79931, -Math.PI / 2], [16.03, 2.05, -4.98, Math.PI / 2],
  [-16.03, 2.05, 4.99569, -Math.PI / 2], [16.03, 2.05, 4.99569, Math.PI / 2],
] as const;

function keycapMesh(scene: THREE.Group, name: string): THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]> {
  const node = scene.getObjectByName(name);
  if (!(node instanceof THREE.Mesh)) throw new Error(`Missing keycap mesh: ${name}`);
  return node;
}

function foldedKeyboardScene(source: THREE.Group, definition: KeyboardDefinition, common?: THREE.Group) {
  const keyboard = source.clone(true);
  const upper = new THREE.Group();
  upper.name = "assembledUpperCase";
  upper.rotation.x = TILT;
  const frame = new THREE.Group();
  frame.name = "assembledTopCase";
  upper.add(frame);
  const materials: THREE.Material[] = [];
  const dissolves: ReturnType<typeof createDissolveEffect>[] = [];
  const parts: Array<{ object: THREE.Object3D; name: string }> = [];
  for (const node of [...keyboard.children]) {
    if (node.name === "shadowPlane" || node.name === "foam") { node.visible = false; continue; }
    const position = definition.foldedPositions[PART_ALIASES[node.name] ?? node.name];
    if (position) node.position.set(position.x, position.y, position.z);
    // Exported transforms belong to the exploded scene; folded geometry is positioned by JSON.
    node.rotation.set(node.name === "feet" || node.name === "bottomCase" ? TILT : 0, 0, 0);
    if (node.name === "topCaseK") { keyboard.remove(node); continue; }
    if (node.name in PART_ALIASES) frame.add(node);
    else if (!BOTTOM_PARTS.has(node.name)) upper.add(node);
    if (node.name !== "misc") parts.push({ object: node, name: PART_ALIASES[node.name] ?? node.name });
    if (!(node instanceof THREE.Mesh)) continue;
    const color = node.name === "plate" ? definition.colorSet.plateColor
      : ["topCaseF", "topCaseB", "bottomCase", "feet"].includes(node.name) ? definition.colorSet.caseColor : null;
    const tint = (sourceMaterial: THREE.Material) => {
      const material = sourceMaterial.clone();
      materials.push(material);
      const dissolve = createDissolveEffect(material);
      dissolves.push(dissolve);
      node.customDepthMaterial ??= dissolve.depthMaterial;
      if (color && material instanceof THREE.MeshStandardMaterial) {
        material.color.set(color);
        if (node.name === "bottomCase") { material.aoMap = material.map; material.aoMapIntensity = 0.3; material.map = null; }
      }
      return material;
    };
    node.material = Array.isArray(node.material) ? node.material.map(tint) : tint(node.material);
  }
  const screw = common?.getObjectByName("screwKSide");
  if (screw instanceof THREE.Mesh) {
    const screwMaterials = (Array.isArray(screw.material) ? screw.material : [screw.material]).map((material) => material.clone());
    materials.push(...screwMaterials);
    const screwDissolves = screwMaterials.map((material) => createDissolveEffect(material));
    dissolves.push(...screwDissolves);
    for (const [x, y, z, angle] of SIDE_SCREWS) {
      const mesh = new THREE.Mesh(screw.geometry, Array.isArray(screw.material) ? screwMaterials : screwMaterials[0]);
      mesh.name = "sideScrew";
      mesh.position.set(x, y, z);
      mesh.rotation.z = angle;
      mesh.customDepthMaterial = screwDissolves[0].depthMaterial;
      frame.add(mesh);
    }
  }
  keyboard.add(upper);
  parts.push({ object: frame, name: "topCaseK" });
  return { keyboard, materials, dissolves, upper, parts };
}

export function KeyboardModel({ plan, registry, motion, phase, autoRotate }: KeyboardModelProps) {
  const assets = useKeyboardAssets();
  const { keyboard, materials, dissolves, upper, parts } = useMemo(() => foldedKeyboardScene(assets.keyboardScene, assets.definition, assets.commonScene), [assets.keyboardScene, assets.definition, assets.commonScene]);
  const board = useRef<THREE.Group>(null);
  const keyDeck = useRef<THREE.Group>(null);
  const previous = useRef("");
  useEffect(() => () => {
    materials.forEach((material) => material.dispose());
    dissolves.forEach((entry) => entry.depthMaterial.dispose());
  }, [materials, dissolves]);
  const keycapSources = useMemo(() => new Map(
    [...plan.keycapModels].map((name) => [name, keycapMesh(assets.keycapScene, name)]),
  ), [assets.keycapScene, plan.keycapModels]);
  const focusOrigin = useMemo(() => {
    const key = assets.definition.keyPosition[FOCUSED_KEY];
    if (!key) return new THREE.Vector3();
    return new THREE.Vector3(key.position.x, key.position.y + assets.definition.foldedPositions.switches.y, key.position.z)
      .applyAxisAngle(new THREE.Vector3(1, 0, 0), TILT)
      .add(new THREE.Vector3(...assets.definition.keyboardOffset));
  }, [assets.definition]);
  useFrame(() => {
    if (!motion || !board.current || !keyDeck.current) return;
    const signature = `${motion.assembly}/${motion.reveal}/${motion.boardExit}`;
    if (signature === previous.current) return;
    previous.current = signature;
    const fade = motion.reveal * (1 - motion.boardExit);
    board.current.visible = fade > 0.001;
    board.current.position.y = assets.definition.keyboardOffset[1] - 35 * motion.boardExit;
    upper.rotation.x = keyDeck.current.rotation.x = TILT * (1 - motion.assembly);
    for (const { object, name } of parts) {
      assemblyPosition(name, motion.assembly, object.position);
      if (name === "feet" || name === "rubberFeet") object.position.y += 3 * motion.assembly;
    }
    dissolves.forEach((entry) => { entry.progress.value = 1 - fade; });
  }, -3);
  const keyboardView = (
    <group ref={board} position={assets.definition.keyboardOffset} visible={!motion || motion.reveal > 0}>
      <primitive object={keyboard} />
      <group ref={keyDeck} rotation={[TILT, 0, 0]}>
        {plan.keys.map((keycap) => <KeycapMesh
          assemblyHeight={assets.definition.foldedPositions.keyCaps.y + KEYCAP_SOCKET_OFFSET}
          key={keycap.modelKey}
          atlasTransform={assets.definition.keycapUVOffsetScale}
          bumpMap={assets.bumpMap}
          keyboardOffset={[0, 0, 0]}
          keycap={keycap}
          palette={assets.definition.colorSet[keycap.colorRole]}
          legendAtlas={assets.legendAtlas}
          registry={registry}
          source={keycapSources.get(keycap.capModel)!}
          motion={motion}
          assemblyLift={assemblyPosition("keyCaps", 1).y - assets.definition.foldedPositions.keyCaps.y}
        />)}
        <SwitchInstances
          assemblyHeight={assets.definition.foldedPositions.switches.y}
          keyboardOffset={[0, 0, 0]}
          orientation={assets.definition.switchOrientation}
          plan={plan}
          registry={registry}
          switchScene={assets.switchScene}
          motion={motion}
          assemblyLift={assemblyPosition("switches", 1).y - assets.definition.foldedPositions.switches.y}
        />
      </group>
    </group>
  );
  if (!motion) return keyboardView;
  return <>{keyboardView}<FocusedSwitch motion={motion} registry={registry} switchScene={assets.switchScene} orientation={assets.definition.switchOrientation} position={focusOrigin} phase={phase} autoRotate={autoRotate} /></>;
}
