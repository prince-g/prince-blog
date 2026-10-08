import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { stepKeyAnimation } from "../animation/key-animation";
import type { SceneMotion } from "../animation/experience";
import type { KeyRegistry } from "../interaction/key-registry";
import { createKeycapMaterial } from "../model/keycap-material";
import type { AssemblyKey, KeycapPalette } from "../model/keyboard-types";
import { FOCUSED_KEY } from "../model/assembly-motion";
import { createDissolveEffect } from "../model/dissolve-material";
import { createPointerKeyHandlers } from "../interaction/pointer-keyboard";
import type { KeyboardTextInputHandler } from "../interaction/physical-keyboard";

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
  motion?: SceneMotion;
  assemblyLift?: number;
  imageTexture?: THREE.Texture | null;
  interactive?: boolean;
  onTextInput?: KeyboardTextInputHandler;
}>;

export function KeycapMesh({ assemblyHeight = 0, atlasTransform, bumpMap, keyboardOffset, keycap, legendAtlas, palette, registry, source, motion, assemblyLift = 0,
  imageTexture = null, interactive = true, onTextInput }: KeycapMeshProps) {
  const mesh = useRef<THREE.Mesh>(null);
  const input = useRef({ interactive, onTextInput });
  input.current = { interactive, onTextInput };
  const pointer = useMemo(() => createPointerKeyHandlers(registry, keycap.modelKey,
    (event) => input.current.onTextInput?.(event), () => input.current.interactive), [registry, keycap.modelKey]);
  useEffect(() => {
    if (!interactive || typeof window === "undefined") { pointer.reset(); return; }
    const hidden = () => { if (document.hidden) pointer.reset(); };
    window.addEventListener("pointermove", pointer.pointermove);
    window.addEventListener("pointerup", pointer.pointerup);
    window.addEventListener("pointercancel", pointer.pointercancel);
    window.addEventListener("blur", pointer.reset);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("pointermove", pointer.pointermove);
      window.removeEventListener("pointerup", pointer.pointerup);
      window.removeEventListener("pointercancel", pointer.pointercancel);
      window.removeEventListener("blur", pointer.reset);
      document.removeEventListener("visibilitychange", hidden);
      pointer.reset();
    };
  }, [interactive, pointer]);
  const animation = registry.getAnimation(keycap.modelKey);
  const baseY = keyboardOffset[1] + keycap.position.y + assemblyHeight;
  const { material, dissolve } = useMemo(
    () => {
      const material = createKeycapMaterial(keycap, palette, legendAtlas, bumpMap, atlasTransform, imageTexture);
      return { material, dissolve: createDissolveEffect(material, true) };
    },
    [keycap, palette, legendAtlas, bumpMap, atlasTransform, imageTexture],
  );
  useEffect(() => () => { material.dispose(); dissolve.depthMaterial.dispose(); }, [material, dissolve]);
  useEffect(() => registry.register(keycap.modelKey, {
    reset: () => { if (mesh.current) mesh.current.position.y = baseY; },
  }), [baseY, keycap.modelKey, registry]);

  useFrame((_, delta) => {
    // The detached J switch becomes the sole animation owner during focus.
    if (!(motion && motion.focus > 0 && keycap.modelKey === FOCUSED_KEY)) stepKeyAnimation(animation, delta);
    if (mesh.current) {
      mesh.current.position.y = baseY + animation.offsetY + (motion ? motion.assembly * assemblyLift + motion.capExit * 0.65 : 0);
      if (motion) {
        const visibility = motion.reveal * (1 - motion.capExit) * (1 - motion.boardExit);
        mesh.current.visible = visibility > 0.001;
        dissolve.progress.value = 1 - visibility;
      }
    }
  }, -2);

  return <mesh
    ref={mesh}
    name={keycap.modelKey}
    onPointerDown={(event) => { if (interactive) { event.stopPropagation(); pointer.pointerdown(event.nativeEvent); } }}
    onPointerUp={(event) => pointer.pointerup(event.nativeEvent)}
    onPointerCancel={(event) => pointer.pointercancel(event.nativeEvent)}
    geometry={source.geometry}
    material={material}
    customDepthMaterial={dissolve.depthMaterial}
    position={[keyboardOffset[0] + keycap.position.x, baseY, keyboardOffset[2] + keycap.position.z]}
    castShadow
    receiveShadow
  />;
}
