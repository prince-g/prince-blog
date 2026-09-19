import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AssemblyPlan, KeyboardDefinition } from "../model/keyboard-types";
import type { KeyRegistry } from "../interaction/key-registry";
import { KEY_TRAVEL } from "../animation/key-animation";

const SWITCH_PARTS = [
  "upperhousing",
  "stem",
  "housingbase",
  "spring",
  "stem_magnet",
  "lightRefractor",
] as const;

type SwitchInstancesProps = Readonly<{
  assemblyHeight?: number;
  keyboardOffset: KeyboardDefinition["keyboardOffset"];
  orientation: KeyboardDefinition["switchOrientation"];
  plan: AssemblyPlan;
  switchScene: THREE.Group;
  registry: KeyRegistry;
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

export function SwitchInstances({
  assemblyHeight = 0,
  keyboardOffset,
  orientation,
  plan,
  switchScene,
  registry,
}: SwitchInstancesProps) {
  return SWITCH_PARTS.map((name) => (
    <SwitchPartInstances
      key={name}
      assemblyHeight={assemblyHeight}
      keyboardOffset={keyboardOffset}
      name={name}
      orientation={orientation}
      plan={plan}
      source={switchMesh(switchScene, name)}
      switchScene={switchScene}
      registry={registry}
    />
  ));
}

type SwitchPartInstancesProps = SwitchInstancesProps & Readonly<{
  name: (typeof SWITCH_PARTS)[number];
  source: THREE.Mesh;
}>;

function SwitchPartInstances({
  assemblyHeight = 0,
  keyboardOffset,
  name,
  orientation,
  plan,
  source,
  switchScene,
  registry,
}: SwitchPartInstancesProps) {
  const instance = useRef<THREE.InstancedMesh>(null);
  const baseMatrices = useRef<THREE.Matrix4[]>([]);
  const previousOffsets = useRef<number[]>([]);
  const scratch = useMemo(() => new THREE.Matrix4(), []);
  const morph = useMemo(() => new THREE.Mesh(source.geometry, source.material), [source]);

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
        .multiply(new THREE.Matrix4().makeTranslation(
          key.position.x,
          key.position.y + assemblyHeight,
          key.position.z,
        ))
        .multiply(orientationMatrix)
        .multiply(source.matrixWorld);
      mesh.setMatrixAt(index, matrix);
      baseMatrices.current[index] = matrix.clone();
      if (source.morphTargetInfluences) mesh.setMorphAt(index, source);
    });
    mesh.instanceMatrix.needsUpdate = true;
    previousOffsets.current = [];
    if (mesh.morphTexture) mesh.morphTexture.needsUpdate = true;
  }, [assemblyHeight, keyboardOffset, orientation, plan.keys, source, switchScene]);

  useFrame(() => {
    const mesh = instance.current;
    if (!mesh || !["stem", "stem_magnet", "spring"].includes(name)) return;
    let changed = false;
    plan.keys.forEach((key, index) => {
      const offset = registry.getAnimation(key.modelKey).offsetY;
      if (previousOffsets.current[index] === offset) return;
      previousOffsets.current[index] = offset;
      changed = true;
      if (name === "spring" && morph.morphTargetInfluences) {
        morph.morphTargetInfluences[0] = THREE.MathUtils.clamp(-offset / KEY_TRAVEL, 0, 1);
        mesh.setMorphAt(index, morph);
      } else {
        scratch.copy(baseMatrices.current[index]);
        scratch.elements[13] += offset;
        mesh.setMatrixAt(index, scratch);
      }
    });
    if (changed) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.morphTexture) mesh.morphTexture.needsUpdate = true;
    }
  }, -1);

  return (
    <instancedMesh
      ref={instance}
      args={[source.geometry, source.material, plan.keys.length]}
      name={`${name}Instances`}
    />
  );
}
