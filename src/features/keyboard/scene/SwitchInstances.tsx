import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { AssemblyPlan, KeyboardDefinition } from "../model/keyboard-types";

const SWITCH_PARTS = [
  "upperhousing",
  "stem",
  "housingbase",
  "spring",
  "stem_magnet",
  "lightRefractor",
] as const;

type SwitchInstancesProps = Readonly<{
  keyboardOffset: KeyboardDefinition["keyboardOffset"];
  orientation: KeyboardDefinition["switchOrientation"];
  plan: AssemblyPlan;
  switchScene: THREE.Group;
}>;

function switchMesh(scene: THREE.Group, name: string): THREE.Mesh {
  const node = scene.getObjectByName(name);
  if (!(node instanceof THREE.Mesh)) throw new Error(`Missing switch mesh: ${name}`);
  return node;
}

function hasMorphTargets(mesh: THREE.Mesh): boolean {
  const { morphAttributes } = mesh.geometry;
  return Boolean(
    morphAttributes.position?.length
    || morphAttributes.normal?.length
    || morphAttributes.color?.length,
  );
}

export function SwitchInstances({ keyboardOffset, orientation, plan, switchScene }: SwitchInstancesProps) {
  return SWITCH_PARTS.map((name) => (
    <SwitchPartInstances
      key={name}
      keyboardOffset={keyboardOffset}
      name={name}
      orientation={orientation}
      plan={plan}
      source={switchMesh(switchScene, name)}
      switchScene={switchScene}
    />
  ));
}

type SwitchPartInstancesProps = SwitchInstancesProps & Readonly<{
  name: (typeof SWITCH_PARTS)[number];
  source: THREE.Mesh;
}>;

function SwitchPartInstances({
  keyboardOffset,
  name,
  orientation,
  plan,
  source,
  switchScene,
}: SwitchPartInstancesProps) {
  const instance = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    switchScene.updateMatrixWorld(true);
    const offsetMatrix = new THREE.Matrix4().makeTranslation(...keyboardOffset);
    const orientationMatrix = new THREE.Matrix4().makeRotationY(orientation === "south" ? Math.PI : 0);
    if (source.morphTargetInfluences === undefined && hasMorphTargets(source)) {
      source.updateMorphTargets();
    }
    const mesh = instance.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();

    plan.keys.forEach((key, index) => {
      matrix
        .copy(offsetMatrix)
        .multiply(new THREE.Matrix4().makeTranslation(key.position.x, key.position.y, key.position.z))
        .multiply(orientationMatrix)
        .multiply(source.matrixWorld);
      mesh.setMatrixAt(index, matrix);
      if (source.morphTargetInfluences) mesh.setMorphAt(index, source);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.morphTexture) mesh.morphTexture.needsUpdate = true;
  }, [keyboardOffset, orientation, plan.keys, source, switchScene]);

  return (
    <instancedMesh
      ref={instance}
      args={[source.geometry, source.material, plan.keys.length]}
      name={`${name}Instances`}
    />
  );
}
