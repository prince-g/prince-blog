import * as THREE from "three";
import data from "../../../../public/models/keychron-k2-he/models/keyboards/K_2_HE/keyboardData.json";

export const KEYBOARD_TILT = THREE.MathUtils.degToRad(5.4);
export const FOCUSED_KEY = "KeyJ";
const FOCUS_TARGET = new THREE.Vector3(0, 12.5, 0);

export function assemblyPosition(name: string, assembly: number, target = new THREE.Vector3()): THREE.Vector3 {
  const entry = data.unfoldPosition[name as keyof typeof data.unfoldPosition];
  if (!entry) return target.set(0, 0, 0);
  const from = entry.from;
  const to = "target" in entry ? entry.target : from;
  return target.set(
    THREE.MathUtils.lerp(from.x, to.x, assembly),
    THREE.MathUtils.lerp(from.y, to.y, assembly),
    THREE.MathUtils.lerp(from.z, to.z, assembly),
  );
}
export function switchFlightOffset(key: string, random: number, progress: number): number {
  if (key === FOCUSED_KEY) return 0;
  const amount = THREE.MathUtils.clamp((progress - random * 0.3) / 0.7, 0, 1);
  return amount ** 3 * (50 + random * 10);
}
export function focusSwitchTransform(group: THREE.Group, start: THREE.Vector3, focus: number): void {
  group.position.lerpVectors(start, FOCUS_TARGET, focus);
  group.rotation.x = KEYBOARD_TILT * (1 - focus);
}
