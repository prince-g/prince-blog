import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AssemblyPlan, KeyboardDefinition } from "../model/keyboard-types";
import type { KeyRegistry } from "../interaction/key-registry";
import { KEY_TRAVEL } from "../animation/key-animation";
import type { SceneMotion } from "../animation/experience";
import { FOCUSED_KEY, switchFlightOffset } from "../model/assembly-motion";

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
  motion?: SceneMotion;
  assemblyLift?: number;
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
  motion,
  assemblyLift,
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
      motion={motion}
      assemblyLift={assemblyLift}
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
  motion,
  assemblyLift = 0,
}: SwitchPartInstancesProps) {
  const instance = useRef<THREE.InstancedMesh>(null);
  const baseMatrices = useRef<THREE.Matrix4[]>([]);
  const previousOffsets = useRef<number[]>([]);
  const previousFlights = useRef<number[]>([]);
  const previousHidden = useRef<boolean[]>([]);
  const scratch = useMemo(() => new THREE.Matrix4(), []);
  const morph = useMemo(() => new THREE.Mesh(source.geometry, source.material), [source]);
  const material = useMemo(() => !motion ? source.material
    : Array.isArray(source.material) ? source.material.map((entry) => entry.clone()) : source.material.clone(), [motion, source.material]);
  const materialList = useMemo(() => Array.isArray(material) ? material : [material], [material]);
  const opacities = useMemo(() => materialList.map((entry) => entry.opacity), [materialList]);
  const depthWrites = useMemo(() => materialList.map((entry) => entry.depthWrite), [materialList]);
  useEffect(() => () => { if (motion) materialList.forEach((entry) => entry.dispose()); }, [motion, materialList]);

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
    previousFlights.current = [];
    previousHidden.current = [];
    if (mesh.morphTexture) mesh.morphTexture.needsUpdate = true;
  }, [assemblyHeight, keyboardOffset, orientation, plan.keys, source, switchScene]);

  useFrame(() => {
    const mesh = instance.current;
    if (!mesh) return;
    const moving = name === "stem" || name === "stem_magnet" || name === "spring";
    if (!motion && !moving) return;
    if (motion) {
      const fade = motion.reveal * (1 - motion.boardExit);
      mesh.visible = fade > 0.001;
      materialList.forEach((entry, index) => {
        entry.opacity = opacities[index] * fade;
        entry.transparent = entry.opacity < 1;
        entry.depthWrite = fade >= 0.99 && depthWrites[index];
      });
    }
    let changed = false;
    plan.keys.forEach((key, index) => {
      const offset = moving ? registry.getAnimation(key.modelKey).offsetY : 0;
      const flight = motion ? motion.assembly * assemblyLift + switchFlightOffset(key.modelKey, key.random, motion.switchExit) : 0;
      const hidden = Boolean(motion && motion.focus > 0 && key.modelKey === FOCUSED_KEY);
      if (previousOffsets.current[index] === offset && previousFlights.current[index] === flight && previousHidden.current[index] === hidden) return;
      previousOffsets.current[index] = offset;
      previousFlights.current[index] = flight;
      previousHidden.current[index] = hidden;
      changed = true;
      if (name === "spring" && morph.morphTargetInfluences) {
        morph.morphTargetInfluences[0] = THREE.MathUtils.clamp(-offset / KEY_TRAVEL, 0, 1);
        mesh.setMorphAt(index, morph);
      }
      scratch.copy(baseMatrices.current[index]);
      scratch.elements[13] += flight + (name === "stem" || name === "stem_magnet" ? offset : 0);
      if (hidden) scratch.scale(new THREE.Vector3(0, 0, 0));
      mesh.setMatrixAt(index, scratch);
    });
    if (changed) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.morphTexture) mesh.morphTexture.needsUpdate = true;
    }
  }, -1);

  return (
    <instancedMesh
      ref={instance}
      args={[source.geometry, material, plan.keys.length]}
      name={`${name}Instances`}
      frustumCulled={!motion}
    />
  );
}
