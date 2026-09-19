import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { KeyRegistry } from "../interaction/key-registry";
import type { AssemblyPlan, KeyboardDefinition } from "../model/keyboard-types";
import { useKeyboardAssets } from "../model/use-keyboard-assets";
import { KeycapMesh } from "./KeycapMesh";
import { SwitchInstances } from "./SwitchInstances";

type KeyboardModelProps = Readonly<{ plan: AssemblyPlan; registry: KeyRegistry }>;
const TILT = THREE.MathUtils.degToRad(5.4);
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
  const materials: THREE.Material[] = [];
  for (const node of [...keyboard.children]) {
    if (node.name === "shadowPlane" || node.name === "foam") { node.visible = false; continue; }
    const position = definition.foldedPositions[PART_ALIASES[node.name] ?? node.name];
    if (position) node.position.set(position.x, position.y, position.z);
    // Exported transforms belong to the exploded scene; folded geometry is positioned by JSON.
    node.rotation.set(node.name === "feet" || node.name === "bottomCase" ? TILT : 0, 0, 0);
    if (!BOTTOM_PARTS.has(node.name)) upper.add(node);
    if (!(node instanceof THREE.Mesh)) continue;
    const color = node.name === "plate" ? definition.colorSet.plateColor
      : ["topCaseF", "topCaseB", "bottomCase", "feet"].includes(node.name) ? definition.colorSet.caseColor : null;
    if (!color) continue;
    const tint = (sourceMaterial: THREE.Material) => {
      const material = sourceMaterial.clone();
      materials.push(material);
      if (material instanceof THREE.MeshStandardMaterial) {
        material.color.set(color);
        if (node.name === "bottomCase") { material.aoMap = material.map; material.aoMapIntensity = 0.3; material.map = null; }
      }
      return material;
    };
    node.material = Array.isArray(node.material) ? node.material.map(tint) : tint(node.material);
  }
  const screw = common?.getObjectByName("screwKSide");
  if (screw instanceof THREE.Mesh) {
    for (const [x, y, z, angle] of SIDE_SCREWS) {
      const mesh = new THREE.Mesh(screw.geometry, screw.material);
      mesh.name = "sideScrew";
      mesh.position.set(x, y, z);
      mesh.rotation.z = angle;
      upper.add(mesh);
    }
  }
  keyboard.add(upper);
  return { keyboard, materials };
}

export function KeyboardModel({ plan, registry }: KeyboardModelProps) {
  const assets = useKeyboardAssets();
  const { keyboard, materials } = useMemo(() => foldedKeyboardScene(assets.keyboardScene, assets.definition, assets.commonScene), [assets.keyboardScene, assets.definition, assets.commonScene]);
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);
  const keycapSources = useMemo(() => new Map(
    [...plan.keycapModels].map((name) => [name, keycapMesh(assets.keycapScene, name)]),
  ), [assets.keycapScene, plan.keycapModels]);
  return (
    <group position={assets.definition.keyboardOffset}>
      <primitive object={keyboard} />
      <group rotation={[TILT, 0, 0]}>
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
        />)}
        <SwitchInstances
          assemblyHeight={assets.definition.foldedPositions.switches.y}
          keyboardOffset={[0, 0, 0]}
          orientation={assets.definition.switchOrientation}
          plan={plan}
          registry={registry}
          switchScene={assets.switchScene}
        />
      </group>
    </group>
  );
}
