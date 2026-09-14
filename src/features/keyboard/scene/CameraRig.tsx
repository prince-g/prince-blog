import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";

type CameraTarget = { yaw: number; pitch: number; distance: number };
type CameraParallax = { yaw: number; pitch: number };

export type CameraInputState = {
  target: CameraTarget;
  parallax: CameraParallax;
};

export type CameraErrorReporter = (cause: unknown) => void;

type WindowEventTarget = Pick<Window, "addEventListener" | "removeEventListener">;

const DEFAULT_TARGET: Readonly<CameraTarget> = { yaw: 0.08, pitch: 0.62, distance: 18 };
const YAW_RANGE = [-0.38, 0.38] as const;
const PITCH_RANGE = [0.34, 0.92] as const;
const DISTANCE_RANGE = [14, 23] as const;
const PARALLAX_LIMIT = 0.025;
const DRAG_RADIANS_PER_PIXEL = 0.004;
const WHEEL_DISTANCE_PER_PIXEL = 0.008;

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
    const bounds = element.getBoundingClientRect();
    const normalizedX = bounds.width ? ((event.clientX - bounds.left) / bounds.width) * 2 - 1 : 0;
    const normalizedY = bounds.height ? 1 - ((event.clientY - bounds.top) / bounds.height) * 2 : 0;
    input.parallax.yaw = clamp(normalizedX, [-1, 1]) * PARALLAX_LIMIT;
    input.parallax.pitch = clamp(normalizedY, [-1, 1]) * PARALLAX_LIMIT;

    if (!activePointer || activePointer.id !== event.pointerId) return;
    input.target.yaw = clamp(
      input.target.yaw - (event.clientX - activePointer.x) * DRAG_RADIANS_PER_PIXEL,
      YAW_RANGE,
    );
    input.target.pitch = clamp(
      input.target.pitch + (event.clientY - activePointer.y) * DRAG_RADIANS_PER_PIXEL,
      PITCH_RANGE,
    );
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
  camera: Pick<THREE.Camera, "position" | "lookAt">,
  controls: CameraInputState,
  current: CameraTarget,
  delta: number,
  onError: CameraErrorReporter,
): void {
  try {
    const yaw = clamp(controls.target.yaw + controls.parallax.yaw, YAW_RANGE);
    const pitch = clamp(controls.target.pitch + controls.parallax.pitch, PITCH_RANGE);
    current.yaw = THREE.MathUtils.damp(current.yaw, yaw, 8, delta);
    current.pitch = THREE.MathUtils.damp(current.pitch, pitch, 8, delta);
    current.distance = THREE.MathUtils.damp(current.distance, controls.target.distance, 8, delta);

    const horizontalDistance = current.distance * Math.cos(current.pitch);
    camera.position.set(
      horizontalDistance * Math.sin(current.yaw),
      current.distance * Math.sin(current.pitch),
      horizontalDistance * Math.cos(current.yaw),
    );
    camera.lookAt(0, 0, 0);
  } catch (cause) {
    onError(cause);
  }
}

type CameraRigProps = Readonly<{ onError: CameraErrorReporter }>;

export function CameraRig({ onError }: CameraRigProps) {
  const camera = useThree((state) => state.camera);
  const canvas = useThree((state) => state.gl.domElement);
  const input = useRef<CameraInputState | null>(null);
  const current = useRef<CameraTarget>({ ...DEFAULT_TARGET });
  const errorReported = useRef(false);
  if (!input.current) input.current = createCameraInputState();

  const reportError = useCallback((cause: unknown) => {
    if (errorReported.current) return;
    errorReported.current = true;
    onError(cause);
  }, [onError]);

  useEffect(() => bindCameraInput(canvas, input.current!, reportError), [canvas, reportError]);

  useFrame((_, delta) => {
    applyCameraFrame(camera, input.current!, current.current, delta, reportError);
  });

  return null;
}
