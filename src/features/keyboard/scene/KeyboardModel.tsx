import { useMemo } from "react";
import * as THREE from "three";
import type { KeyRegistry } from "../interaction/key-registry";
import type { AssemblyPlan } from "../model/keyboard-types";
import { useKeyboardAssets } from "../model/use-keyboard-assets";
import { KeycapMesh } from "./KeycapMesh";
import { SwitchInstances } from "./SwitchInstances";

type KeyboardModelProps = Readonly<{
  plan: AssemblyPlan;
  registry: KeyRegistry;
}>;

const FOLDED_PART_POSITIONS = {
  battery: [-0.5, 1, -1.9],
  bottomCase: [0, 0, 0],
  feet: [0, 0.6, 0],
  foam: [0, 2.37, 0],
  misc: [0, -0.03, 0],
  pcb: [0, 2.3, 0],
  plate: [0, 2.42, 0],
  plateFoam: [0, 2.3, 0],
  rubberFeet: [0, 0.35, 0],
  siliconeAcousticPad: [0, 3, 0],
  stablizer: [0, 2, 0],
  topCaseB: [0, 0, 0],
  topCaseF: [0, 0, 0],
  topCaseL: [0, 0, 0],
  topCaseR: [0, 0, 0],
} as const;

function keycapMesh(scene: THREE.Group, name: string): THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]> {
  const node = scene.getObjectByName(name);
  if (!(node instanceof THREE.Mesh)) throw new Error(`Missing keycap mesh: ${name}`);
  return node;
}

function foldedKeyboardScene(source: THREE.Group): THREE.Group {
  const keyboard = source.clone(true);

  keyboard.traverse((node) => {
    if (node.name === "shadowPlane") {
      node.visible = false;
      return;
    }
    const position = FOLDED_PART_POSITIONS[node.name as keyof typeof FOLDED_PART_POSITIONS];
    if (position) node.position.set(position[0], position[1], position[2]);
  });

  return keyboard;
}

export function KeyboardModel({ plan, registry }: KeyboardModelProps) {
  const assets = useKeyboardAssets();
  const keyboard = useMemo(() => foldedKeyboardScene(assets.keyboardScene), [assets.keyboardScene]);
  const keycapSources = useMemo(() => new Map(
    [...plan.keycapModels].map((name) => [name, keycapMesh(assets.keycapScene, name)]),
  ), [assets.keycapScene, plan.keycapModels]);

  return (
    <group>
      <primitive object={keyboard} position={assets.definition.keyboardOffset} />
      {plan.keys.map((keycap) => (
        <KeycapMesh
          key={keycap.modelKey}
          atlasTransform={assets.definition.keycapUVOffsetScale}
          bumpMap={assets.bumpMap}
          keyboardOffset={assets.definition.keyboardOffset}
          keycap={keycap}
          legendAtlas={assets.legendAtlas}
          registry={registry}
          source={keycapSources.get(keycap.capModel)!}
        />
      ))}
      <SwitchInstances
        keyboardOffset={assets.definition.keyboardOffset}
        orientation={assets.definition.switchOrientation}
        plan={plan}
        switchScene={assets.switchScene}
      />
    </group>
  );
}
