import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { stepKeyAnimation } from "../animation/key-animation";
import type { KeyRegistry } from "../interaction/key-registry";
import { createKeycapMaterial } from "../model/keycap-material";
import type { AssemblyKey, KeycapPalette } from "../model/keyboard-types";

type KeycapMeshProps = Readonly<{
  assemblyHeight?: number;
  atlasTransform: readonly [number, number, number, number];
  bumpMap: THREE.Texture;
  keyboardOffset: readonly [number, number, number];
  keycap: AssemblyKey;
  legendAtlas: THREE.Texture;
  palette: KeycapPalette;
  registry: KeyRegistry;
  source: THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>;
}>;

export function KeycapMesh({ assemblyHeight = 0, atlasTransform, bumpMap, keyboardOffset, keycap, legendAtlas, palette, registry, source }: KeycapMeshProps) {
  const mesh = useRef<THREE.Mesh>(null);
  const animation = registry.getAnimation(keycap.modelKey);
  const baseY = keyboardOffset[1] + keycap.position.y + assemblyHeight;
  const material = useMemo(
    () => createKeycapMaterial(keycap, palette, legendAtlas, bumpMap, atlasTransform),
    [keycap, palette, legendAtlas, bumpMap, atlasTransform],
  );
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => registry.register(keycap.modelKey, {
    reset: () => { if (mesh.current) mesh.current.position.y = baseY; },
  }), [baseY, keycap.modelKey, registry]);

  useFrame((_, delta) => {
    stepKeyAnimation(animation, delta);
    if (mesh.current) mesh.current.position.y = baseY + animation.offsetY;
  }, -2);

  return <mesh
    ref={mesh}
    name={keycap.modelKey}
    geometry={source.geometry}
    material={material}
    position={[keyboardOffset[0] + keycap.position.x, baseY, keyboardOffset[2] + keycap.position.z]}
    castShadow
    receiveShadow
  />;
}
