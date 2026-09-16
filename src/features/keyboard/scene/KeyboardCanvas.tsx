import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import type { KeyRegistry } from "../interaction/key-registry";
import { INITIAL_CAMERA_POSITION, type CameraErrorReporter } from "./CameraRig";
import { KeyboardScene } from "./KeyboardScene";

type KeyboardCanvasProps = Readonly<{
  attempt: number;
  registry: KeyRegistry;
  onReady: () => void;
  onRuntimeError: CameraErrorReporter;
}>;

export function KeyboardCanvas({ attempt, registry, onReady, onRuntimeError }: KeyboardCanvasProps) {
  return (
    <Canvas
      key={attempt}
      dpr={[1, 1.75]}
      camera={{ fov: 32, near: 0.1, far: 120, position: [...INITIAL_CAMERA_POSITION] }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      shadows
    >
      <Suspense fallback={null}>
        <KeyboardScene registry={registry} onReady={onReady} onRuntimeError={onRuntimeError} />
      </Suspense>
    </Canvas>
  );
}
