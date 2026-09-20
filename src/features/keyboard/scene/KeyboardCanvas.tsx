import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { PCFShadowMap } from "three";
import type { KeyRegistry } from "../interaction/key-registry";
import { INITIAL_CAMERA_POSITION, type CameraErrorReporter } from "./CameraRig";
import { KeyboardScene } from "./KeyboardScene";
import type { SceneExperience } from "./experience-props";

type KeyboardCanvasProps = Readonly<{
  attempt: number;
  registry: KeyRegistry;
  resetRequest?: number;
  onReady: () => void;
  onRuntimeError: CameraErrorReporter;
  experience?: SceneExperience;
}>;

export function KeyboardCanvas({ attempt, registry, resetRequest, onReady, onRuntimeError, experience }: KeyboardCanvasProps) {
  return (
    <Canvas
      key={attempt}
      dpr={[1, 1.75]}
      camera={{ fov: 32, near: 0.1, far: 220, position: [...INITIAL_CAMERA_POSITION] }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      shadows={{ type: PCFShadowMap }}
    >
      <Suspense fallback={null}>
        <KeyboardScene
          registry={registry}
          resetRequest={resetRequest}
          onReady={onReady}
          onRuntimeError={onRuntimeError}
          experience={experience}
        />
      </Suspense>
    </Canvas>
  );
}
