import { useMemo } from "react";
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
  const instances = useMemo(() => {
    switchScene.updateMatrixWorld(true);
    const offsetMatrix = new THREE.Matrix4().makeTranslation(...keyboardOffset);
    const orientationMatrix = new THREE.Matrix4().makeRotationY(orientation === "south" ? Math.PI : 0);

    return SWITCH_PARTS.map((name) => {
      const source = switchMesh(switchScene, name);
      if (source.morphTargetInfluences === undefined && hasMorphTargets(source)) {
        source.updateMorphTargets();
      }
      const instance = new THREE.InstancedMesh(source.geometry, source.material, plan.keys.length);
      const matrix = new THREE.Matrix4();

      plan.keys.forEach((key, index) => {
        matrix
          .copy(offsetMatrix)
          .multiply(new THREE.Matrix4().makeTranslation(key.position.x, key.position.y, key.position.z))
          .multiply(orientationMatrix)
          .multiply(source.matrixWorld);
        instance.setMatrixAt(index, matrix);
        if (source.morphTargetInfluences) instance.setMorphAt(index, source);
      });
      instance.instanceMatrix.needsUpdate = true;
      if (instance.morphTexture) instance.morphTexture.needsUpdate = true;
      instance.name = `${name}Instances`;
      return instance;
    });
  }, [keyboardOffset, orientation, plan.keys, switchScene]);

  return instances.map((instance) => <primitive key={instance.name} object={instance} />);
}
