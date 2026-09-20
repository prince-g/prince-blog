import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { KeyRegistry } from "../interaction/key-registry";
import { KEYCHRON_ASSET_ROOT } from "../model/asset-paths";
import { buildAssemblyPlan } from "../model/build-assembly-plan";
import { useKeyboardAssets } from "../model/use-keyboard-assets";
import { CameraRig, type CameraErrorReporter } from "./CameraRig";
import { KeyboardModel } from "./KeyboardModel";
import { keyboardLoadingManager } from "../model/asset-progress";
import { assemblyTimeline, exitTimeline } from "../animation/experience";
import type { SceneExperience } from "./experience-props";
import { TypingPanelProjection } from "./TypingPanelProjection";

gsap.registerPlugin(useGSAP);

const ENVIRONMENT_URL = `${KEYCHRON_ASSET_ROOT}/textures/hdr/potsdamer_platz_1k_compressed.jpg`;

type KeyboardSceneProps = Readonly<{
  registry: KeyRegistry;
  resetRequest?: number;
  onReady: () => void;
  onRuntimeError: CameraErrorReporter;
  experience?: SceneExperience;
}>;

export function resetKeyboardSceneAssetCache(): void {
  useLoader.clear(THREE.TextureLoader, ENVIRONMENT_URL);
}

function ReadySignal({ onReady, onRuntimeError }: Pick<KeyboardSceneProps, "onReady" | "onRuntimeError">) {
  const sent = useRef(false);
  const compiled = useRef(false);
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    let active = true;
    gl.compileAsync(scene, camera).then(() => { if (active) compiled.current = true; }).catch(onRuntimeError);
    return () => { active = false; };
  }, [camera, gl, onRuntimeError, scene]);
  useFrame(() => {
    if (sent.current || !compiled.current) return;
    sent.current = true;
    onReady();
  });

  return null;
}

function ExperienceDirector({ experience }: { experience: SceneExperience }) {
  const { phase, motion, onAssembled, onSwitch } = experience;
  useGSAP(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (phase === "assembling") assemblyTimeline(motion, onAssembled, reduced);
    if (phase === "exiting") exitTimeline(motion, onSwitch, reduced);
  }, { dependencies: [phase] });
  return null;
}

export function KeyboardScene({ registry, resetRequest, onReady, onRuntimeError, experience }: KeyboardSceneProps) {
  const { definition } = useKeyboardAssets();
  const plan = useMemo(() => buildAssemblyPlan(definition), [definition]);
  const environment = useLoader(THREE.TextureLoader, ENVIRONMENT_URL, (loader) => { loader.manager = keyboardLoadingManager; });
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
        color="#ffffff"
        intensity={2}
        position={[0, 40, 10]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.035}
        shadow-camera-bottom={-10}
        shadow-camera-far={90}
        shadow-radius={4}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={10}
        shadow-mapSize-height={2048}
        shadow-mapSize-width={2048}
      />
      <hemisphereLight color="#ffffff" groundColor="#dad2c5" intensity={0.35} />
      <group ref={product}>
        <KeyboardModel plan={plan} registry={registry} motion={experience?.motion} />
      </group>
      <mesh position={[0, -0.62, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow visible={experience?.phase !== "switch"}>
        <planeGeometry args={[200, 200]} />
        <shadowMaterial transparent opacity={0.16} />
      </mesh>
      <CameraRig onError={onRuntimeError} resetRequest={resetRequest} phase={experience?.phase} motion={experience?.motion} />
      {experience && <>
        <ExperienceDirector experience={experience} />
        <TypingPanelProjection {...experience.textPanel} visible={experience.phase === "ready"} />
      </>}
      <ReadySignal onReady={onReady} onRuntimeError={onRuntimeError} />
    </>
  );
}
