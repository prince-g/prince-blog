import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { ExperiencePhase, SceneMotion } from "../animation/experience";

type CameraTarget = { yaw: number; pitch: number; roll: number; distance: number };
type CameraParallax = { yaw: number; pitch: number };

export type CameraInputState = {
  target: CameraTarget;
  parallax: CameraParallax;
};

export type CameraErrorReporter = (cause: unknown) => void;

type WindowEventTarget = Pick<Window, "addEventListener" | "removeEventListener">;

const DEFAULT_TARGET: Readonly<CameraTarget> = { yaw: 0, pitch: 1.02, roll: 0, distance: 64 };
const DISTANCE_RANGE = [44, 92] as const;
const CAMERA_FOCUS_Y = 3;
const DRAG_RADIANS_PER_PIXEL = 0.004;
const WHEEL_DISTANCE_PER_PIXEL = 0.008;

export const INITIAL_CAMERA_POSITION = [
  DEFAULT_TARGET.distance * Math.cos(DEFAULT_TARGET.pitch) * Math.sin(DEFAULT_TARGET.yaw),
  CAMERA_FOCUS_Y + DEFAULT_TARGET.distance * Math.sin(DEFAULT_TARGET.pitch),
  DEFAULT_TARGET.distance * Math.cos(DEFAULT_TARGET.pitch) * Math.cos(DEFAULT_TARGET.yaw),
] as const;

export function fitKeyboardCamera(camera: THREE.Camera, width: number, height: number): void {
  if (!(camera instanceof THREE.PerspectiveCamera) || width <= 0 || height <= 0) return;
  // Keep the full board visible in portrait without changing the orbit or scroll distance.
  camera.zoom = Math.min(1, width / height / 1.15);
  camera.updateProjectionMatrix();
}

function clamp(value: number, [minimum, maximum]: readonly [number, number]): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function resetInput(input: CameraInputState): void {
  Object.assign(input.target, DEFAULT_TARGET);
  input.parallax.yaw = 0;
  input.parallax.pitch = 0;
}

export function createCameraInputState(): CameraInputState {
  return {
    target: { ...DEFAULT_TARGET },
    parallax: { yaw: 0, pitch: 0 },
  };
}

export function bindCameraInput(
  element: HTMLCanvasElement,
  input: CameraInputState,
  onError: CameraErrorReporter = () => {},
  windowTarget: WindowEventTarget | undefined = typeof window === "undefined" ? undefined : window,
): () => void {
  let activePointer: { id: number; x: number; y: number } | null = null;
  const wheelOptions = { passive: false } as const;
  const safely = <EventType extends Event>(handler: (event: EventType) => void) => (event: Event) => {
    try {
      handler(event as EventType);
    } catch (cause) {
      onError(cause);
    }
  };

  const pointerdown = (event: PointerEvent) => {
    activePointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    element.setPointerCapture(event.pointerId);
  };
  const pointermove = (event: PointerEvent) => {
    if (!activePointer || activePointer.id !== event.pointerId) return;
    const deltaX = event.clientX - activePointer.x;
    const deltaY = event.clientY - activePointer.y;
    if (event.shiftKey) {
      input.target.roll = input.target.roll - deltaX * DRAG_RADIANS_PER_PIXEL;
    } else {
      input.target.yaw = input.target.yaw - deltaX * DRAG_RADIANS_PER_PIXEL;
      input.target.pitch = input.target.pitch + deltaY * DRAG_RADIANS_PER_PIXEL;
    }
    activePointer.x = event.clientX;
    activePointer.y = event.clientY;
  };
  const endPointer = (event: PointerEvent) => {
    if (!activePointer || activePointer.id !== event.pointerId) return;
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    activePointer = null;
  };
  const pointerleave = () => {
    input.parallax.yaw = 0;
    input.parallax.pitch = 0;
  };
  const lostpointercapture = (event: PointerEvent) => {
    if (activePointer?.id === event.pointerId) activePointer = null;
  };
  const blur = () => {
    activePointer = null;
  };
  const wheel = (event: WheelEvent) => {
    event.preventDefault();
    input.target.distance = clamp(
      input.target.distance + event.deltaY * WHEEL_DISTANCE_PER_PIXEL,
      DISTANCE_RANGE,
    );
  };
  const dblclick = () => { resetInput(input); };

  const safePointerdown = safely(pointerdown);
  const safePointermove = safely(pointermove);
  const safeEndPointer = safely(endPointer);
  const safePointerleave = safely(pointerleave);
  const safeLostPointerCapture = safely(lostpointercapture);
  const safeBlur = safely(blur);
  const safeWheel = safely(wheel);
  const safeDblclick = safely(dblclick);

  element.addEventListener("pointerdown", safePointerdown);
  element.addEventListener("pointermove", safePointermove);
  element.addEventListener("pointerup", safeEndPointer);
  element.addEventListener("pointercancel", safeEndPointer);
  element.addEventListener("pointerleave", safePointerleave);
  element.addEventListener("lostpointercapture", safeLostPointerCapture);
  element.addEventListener("wheel", safeWheel, wheelOptions);
  element.addEventListener("dblclick", safeDblclick);
  windowTarget?.addEventListener("blur", safeBlur);

  return () => {
    if (activePointer && element.hasPointerCapture(activePointer.id)) {
      element.releasePointerCapture(activePointer.id);
    }
    activePointer = null;
    element.removeEventListener("pointerdown", safePointerdown);
    element.removeEventListener("pointermove", safePointermove);
    element.removeEventListener("pointerup", safeEndPointer);
    element.removeEventListener("pointercancel", safeEndPointer);
    element.removeEventListener("pointerleave", safePointerleave);
    element.removeEventListener("lostpointercapture", safeLostPointerCapture);
    element.removeEventListener("wheel", safeWheel);
    element.removeEventListener("dblclick", safeDblclick);
    windowTarget?.removeEventListener("blur", safeBlur);
  };
}

export function applyCameraFrame(
  camera: Pick<THREE.Camera, "position" | "lookAt"> & Partial<Pick<THREE.Camera, "rotateZ">>,
  controls: CameraInputState,
  current: CameraTarget,
  delta: number,
  onError: CameraErrorReporter,
  motion?: SceneMotion,
): void {
  try {
    const yaw = controls.target.yaw + controls.parallax.yaw;
    const pitch = controls.target.pitch + controls.parallax.pitch;
    current.yaw = THREE.MathUtils.damp(current.yaw, yaw, 8, delta);
    current.pitch = THREE.MathUtils.damp(current.pitch, pitch, 8, delta);
    current.roll = THREE.MathUtils.damp(current.roll, controls.target.roll, 8, delta);
    current.distance = THREE.MathUtils.damp(current.distance, controls.target.distance, 8, delta);

    const assembly = motion?.assembly ?? 0;
    const focus = motion?.focus ?? 0;
    const viewYaw = THREE.MathUtils.lerp(current.yaw, 0.62, assembly);
    const viewPitch = THREE.MathUtils.lerp(current.pitch - focus * 0.47, 0.68, assembly);
    const distance = THREE.MathUtils.lerp(current.distance * (1 - focus * (1 - 18 / 64)), 95, assembly);
    const focusY = THREE.MathUtils.lerp(THREE.MathUtils.lerp(CAMERA_FOCUS_Y, 12.6, focus), 14, assembly);
    const horizontalDistance = distance * Math.cos(viewPitch);
    camera.position.set(
      horizontalDistance * Math.sin(viewYaw),
      focusY + distance * Math.sin(viewPitch),
      horizontalDistance * Math.cos(viewYaw),
    );
    camera.lookAt(0, focusY, 0);
    camera.rotateZ?.(current.roll);
  } catch (cause) {
    onError(cause);
  }
}

type CameraRigProps = Readonly<{
  onError: CameraErrorReporter;
  resetRequest?: number;
  phase?: ExperiencePhase;
  motion?: SceneMotion;
}>;

export function CameraRig({ onError, resetRequest = 0, phase = "ready", motion }: CameraRigProps) {
  const camera = useThree((state) => state.camera);
  const canvas = useThree((state) => state.gl.domElement);
  const size = useThree((state) => state.size);
  const input = useRef<CameraInputState | null>(null);
  const current = useRef<CameraTarget>({ ...DEFAULT_TARGET });
  const errorReported = useRef(false);
  if (!input.current) input.current = createCameraInputState();

  const reportError = useCallback((cause: unknown) => {
    if (errorReported.current) return;
    errorReported.current = true;
    onError(cause);
  }, [onError]);

  useEffect(() => {
    if (phase !== "ready" && phase !== "switch") return;
    return bindCameraInput(canvas, input.current!, reportError);
  }, [canvas, phase, reportError]);

  useEffect(() => {
    if (phase === "exiting" || phase === "returning") resetInput(input.current!);
  }, [phase]);

  useLayoutEffect(() => {
    fitKeyboardCamera(camera, size.width, size.height);
  }, [camera, size.width, size.height]);

  useEffect(() => {
    resetInput(input.current!);
    Object.assign(current.current, DEFAULT_TARGET);
  }, [resetRequest]);

  useFrame((_, delta) => {
    applyCameraFrame(camera, input.current!, current.current, delta, reportError, motion);
    if (camera instanceof THREE.PerspectiveCamera) {
      const zoom = THREE.MathUtils.lerp(Math.min(1, size.width / size.height / 1.15), Math.min(1, size.width / size.height / 0.85), motion?.focus ?? 0);
      if (camera.zoom !== zoom) { camera.zoom = zoom; camera.updateProjectionMatrix(); }
    }
  }, -0.5);

  return null;
}
