import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { createKeyAnimationState, stepKeyAnimation } from "../animation/key-animation";
import type { KeyRegistry } from "../interaction/key-registry";
import { computeLegendTransform } from "../model/legend-transform";
import type { AssemblyKey } from "../model/keyboard-types";

const KEYCAP_COLOR = new THREE.Color("#F2F2F0");
const LEGEND_COLOR = new THREE.Color("#000000");
const PRESS_EMISSIVE = new THREE.Color("#caff6a");

type KeycapMaterial = THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;

type KeycapMeshProps = Readonly<{
  assemblyHeight?: number;
  atlasTransform: readonly [number, number, number, number];
  bumpMap: THREE.Texture;
  keyboardOffset: readonly [number, number, number];
  keycap: AssemblyKey;
  legendAtlas: THREE.Texture;
  registry: KeyRegistry;
  source: THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>;
}>;

function cloneMaterial(source: THREE.Material | THREE.Material[]): KeycapMaterial {
  const material = Array.isArray(source) ? source[0] : source;
  if (!(material instanceof THREE.MeshStandardMaterial) && !(material instanceof THREE.MeshPhysicalMaterial)) {
    throw new Error("Keycap source material must be MeshStandardMaterial or MeshPhysicalMaterial");
  }
  return material.clone();
}

export function KeycapMesh({
  assemblyHeight = 0,
  atlasTransform,
  bumpMap,
  keyboardOffset,
  keycap,
  legendAtlas,
  registry,
  source,
}: KeycapMeshProps) {
  const mesh = useRef<THREE.Mesh>(null);
  const animation = useRef(createKeyAnimationState());
  const baseY = keyboardOffset[1] + keycap.position.y + assemblyHeight;
  const material = useMemo(() => {
    const next = cloneMaterial(source.material);
    const legend = computeLegendTransform(keycap.position, atlasTransform);

    next.color.set(0xffffff);
    next.map = legendAtlas;
    next.bumpMap = bumpMap;
    next.onBeforeCompile = (shader) => {
      shader.uniforms.legendOffset = { value: new THREE.Vector2(legend.offsetX, legend.offsetY) };
      shader.uniforms.keycapColor = { value: KEYCAP_COLOR };
      shader.uniforms.legendColor = { value: LEGEND_COLOR };
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <map_pars_fragment>",
          `#include <map_pars_fragment>
uniform vec2 legendOffset;
uniform vec3 keycapColor;
uniform vec3 legendColor;`,
        )
        .replace(
          "#include <map_fragment>",
          `#ifdef USE_MAP
  vec4 legendSample = texture2D(map, vMapUv + legendOffset);
  diffuseColor.rgb = mix(legendColor, keycapColor, legendSample.r);
  diffuseColor.a *= legendSample.a;
#endif`,
        );
    };
    next.customProgramCacheKey = () => "keychron-legend-mask-v1";
    next.needsUpdate = true;
    return next;
  }, [atlasTransform, bumpMap, keycap.position, legendAtlas, source.material]);

  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    const unregister = registry.register(keycap.modelKey, {
      press: () => { animation.current.pressed = true; },
      release: () => { animation.current.pressed = false; },
      reset: () => {
        animation.current = createKeyAnimationState();
        if (mesh.current) mesh.current.position.y = baseY;
        material.emissive.copy(KEYCAP_COLOR);
        material.emissiveIntensity = 0;
      },
    });
    return () => { unregister(); };
  }, [baseY, keycap.modelKey, material, registry]);

  useFrame((_, delta) => {
    stepKeyAnimation(animation.current, delta);
    if (mesh.current) mesh.current.position.y = baseY + animation.current.offsetY;
    material.emissive.copy(KEYCAP_COLOR).lerp(PRESS_EMISSIVE, animation.current.glow);
    material.emissiveIntensity = animation.current.glow * 0.85;
  });

  return (
    <mesh
      ref={mesh}
      geometry={source.geometry}
      material={material}
      position={[
        keyboardOffset[0] + keycap.position.x,
        baseY,
        keyboardOffset[2] + keycap.position.z,
      ]}
    />
  );
}
