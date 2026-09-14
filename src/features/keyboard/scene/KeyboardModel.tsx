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

function keycapMesh(scene: THREE.Group, name: string): THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]> {
  const node = scene.getObjectByName(name);
  if (!(node instanceof THREE.Mesh)) throw new Error(`Missing keycap mesh: ${name}`);
  return node;
}

export function KeyboardModel({ plan, registry }: KeyboardModelProps) {
  const assets = useKeyboardAssets();
  const keyboard = useMemo(() => assets.keyboardScene.clone(true), [assets.keyboardScene]);
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
