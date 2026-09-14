import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

type CameraTarget = { yaw: number; pitch: number; distance: number };
type CameraParallax = { yaw: number; pitch: number };

export type CameraInputState = {
  target: CameraTarget;
  parallax: CameraParallax;
};

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

export function bindCameraInput(element: HTMLCanvasElement, input: CameraInputState): () => void {
  let activePointer: { id: number; x: number; y: number } | null = null;
  const wheelOptions = { passive: false } as const;

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
  const wheel = (event: WheelEvent) => {
    event.preventDefault();
    input.target.distance = clamp(
      input.target.distance + event.deltaY * WHEEL_DISTANCE_PER_PIXEL,
      DISTANCE_RANGE,
    );
  };
  const dblclick = () => { resetInput(input); };

  element.addEventListener("pointerdown", pointerdown);
  element.addEventListener("pointermove", pointermove);
  element.addEventListener("pointerup", endPointer);
  element.addEventListener("pointercancel", endPointer);
  element.addEventListener("pointerleave", pointerleave);
  element.addEventListener("wheel", wheel, wheelOptions);
  element.addEventListener("dblclick", dblclick);

  return () => {
    if (activePointer && element.hasPointerCapture(activePointer.id)) {
      element.releasePointerCapture(activePointer.id);
    }
    activePointer = null;
    element.removeEventListener("pointerdown", pointerdown);
    element.removeEventListener("pointermove", pointermove);
    element.removeEventListener("pointerup", endPointer);
    element.removeEventListener("pointercancel", endPointer);
    element.removeEventListener("pointerleave", pointerleave);
    element.removeEventListener("wheel", wheel);
    element.removeEventListener("dblclick", dblclick);
  };
}

export function CameraRig() {
  const camera = useThree((state) => state.camera);
  const canvas = useThree((state) => state.gl.domElement);
  const input = useRef<CameraInputState | null>(null);
  const current = useRef<CameraTarget>({ ...DEFAULT_TARGET });
  if (!input.current) input.current = createCameraInputState();

  useEffect(() => bindCameraInput(canvas, input.current!), [canvas]);

  useFrame((_, delta) => {
    const controls = input.current!;
    const yaw = clamp(controls.target.yaw + controls.parallax.yaw, YAW_RANGE);
    const pitch = clamp(controls.target.pitch + controls.parallax.pitch, PITCH_RANGE);
    current.current.yaw = THREE.MathUtils.damp(current.current.yaw, yaw, 8, delta);
    current.current.pitch = THREE.MathUtils.damp(current.current.pitch, pitch, 8, delta);
    current.current.distance = THREE.MathUtils.damp(
      current.current.distance,
      controls.target.distance,
      8,
      delta,
    );

    const horizontalDistance = current.current.distance * Math.cos(current.current.pitch);
    camera.position.set(
      horizontalDistance * Math.sin(current.current.yaw),
      current.current.distance * Math.sin(current.current.pitch),
      horizontalDistance * Math.cos(current.current.yaw),
    );
    camera.lookAt(0, 0, 0);
  });

  return null;
}
