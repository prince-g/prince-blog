import { useLoader, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { KeyRegistry } from "../interaction/key-registry";
import { KEYCHRON_ASSET_ROOT } from "../model/asset-paths";
import { buildAssemblyPlan } from "../model/build-assembly-plan";
import { useKeyboardAssets } from "../model/use-keyboard-assets";
import { CameraRig, type CameraErrorReporter } from "./CameraRig";
import { KeyboardModel } from "./KeyboardModel";

const ENVIRONMENT_URL = `${KEYCHRON_ASSET_ROOT}/textures/hdr/potsdamer_platz_1k_compressed.jpg`;

type KeyboardSceneProps = Readonly<{
  registry: KeyRegistry;
  onReady: () => void;
  onRuntimeError: CameraErrorReporter;
}>;

export function resetKeyboardSceneAssetCache(): void {
  useLoader.clear(THREE.TextureLoader, ENVIRONMENT_URL);
}

function ReadySignal({ onReady }: Pick<KeyboardSceneProps, "onReady">) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    onReady();
  }, [onReady]);

  return null;
}

export function KeyboardScene({ registry, onReady, onRuntimeError }: KeyboardSceneProps) {
  const { definition } = useKeyboardAssets();
  const plan = useMemo(() => buildAssemblyPlan(definition), [definition]);
  const environment = useLoader(THREE.TextureLoader, ENVIRONMENT_URL);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const product = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    const previousToneMapping = gl.toneMapping;
    const previousOutputColorSpace = gl.outputColorSpace;
    const previousEnvironment = scene.environment;
    const previousEnvironmentIntensity = scene.environmentIntensity;
    const previousMapping = environment.mapping;
    const previousColorSpace = environment.colorSpace;

    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    environment.mapping = THREE.EquirectangularReflectionMapping;
    environment.colorSpace = THREE.SRGBColorSpace;
    scene.environment = environment;
    scene.environmentIntensity = 0.72;

    return () => {
      gl.toneMapping = previousToneMapping;
      gl.outputColorSpace = previousOutputColorSpace;
      scene.environment = previousEnvironment;
      scene.environmentIntensity = previousEnvironmentIntensity;
      environment.mapping = previousMapping;
      environment.colorSpace = previousColorSpace;
    };
  }, [environment, gl, scene]);

  useLayoutEffect(() => {
    product.current?.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
    });
  }, [plan]);

  return (
    <>
      <directionalLight
        castShadow
        color="#fff4e8"
        intensity={3.4}
        position={[7, 12, 9]}
        shadow-bias={-0.0002}
        shadow-camera-bottom={-10}
        shadow-camera-far={45}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={10}
        shadow-mapSize-height={2048}
        shadow-mapSize-width={2048}
      />
      <spotLight
        color="#caff6a"
        intensity={18}
        position={[-12, 6, -8]}
        angle={0.52}
        penumbra={1}
      />
      <group ref={product}>
        <KeyboardModel plan={plan} registry={registry} />
      </group>
      <mesh position={[0, -0.62, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[38, 18]} />
        <shadowMaterial transparent opacity={0.28} />
      </mesh>
      <CameraRig onError={onRuntimeError} />
      <ReadySignal onReady={onReady} />
    </>
  );
}
