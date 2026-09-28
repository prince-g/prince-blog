import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ExperiencePhase, SceneMotion } from "../animation/experience";
import { KEY_TRAVEL, stepKeyAnimation } from "../animation/key-animation";
import type { KeyRegistry } from "../interaction/key-registry";
import { FOCUSED_KEY, focusSwitchTransform } from "../model/assembly-motion";

export function stepFocusedSwitchSpin(angle: number, delta: number, phase: ExperiencePhase, active = true): number {
  if (phase !== "switch" || !active) return angle;
  const next = angle + THREE.MathUtils.clamp(delta, 0, 0.1) * 0.28;
  return THREE.MathUtils.euclideanModulo(next + Math.PI, Math.PI * 2) - Math.PI;
}

export function createFocusedSwitchScene(source: THREE.Group, orientation: "north" | "south") {
  const group = new THREE.Group();
  group.name = "focusedSwitch";
  group.visible = false;
  const spinner = new THREE.Group();
  spinner.name = "focusedSwitchSpin";
  group.add(spinner);
  const oriented = new THREE.Group();
  oriented.rotation.y = orientation === "south" ? Math.PI : 0;
  spinner.add(oriented);
  const parts = new Map<string, THREE.Mesh>();
  const materials: THREE.Material[] = [];
  for (const name of ["upperhousing", "housingbase", "stem", "spring", "stem_magnet", "lightRefractor"]) {
    const node = source.getObjectByName(name);
    if (!(node instanceof THREE.Mesh)) throw new Error(`Missing focused switch mesh: ${name}`);
    const sourceMaterial = Array.isArray(node.material) ? node.material[0] : node.material;
    const material = name === "stem_magnet"
      ? new THREE.MeshStandardMaterial({ color: "#45434f", metalness: 1, roughness: 0.3 })
      : sourceMaterial.clone();
    if (material.transparent) material.depthWrite = false;
    materials.push(material);
    const mesh = new THREE.Mesh(node.geometry, material);
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    oriented.add(mesh);
    parts.set(name, mesh);
  }
  return { group, spinner, parts, materials };
}

type FocusedSwitchProps = Readonly<{
  motion: SceneMotion;
  registry: KeyRegistry;
  switchScene: THREE.Group;
  orientation: "north" | "south";
  /** Initial assembled switch origin, already transformed into world coordinates. */
  position: THREE.Vector3;
  phase?: ExperiencePhase;
  autoRotate?: boolean;
}>;

export function FocusedSwitch({ motion, registry, switchScene, orientation, position, phase = "ready", autoRotate = true }: FocusedSwitchProps) {
  const { group, spinner, parts, materials } = useMemo(() => createFocusedSwitchScene(switchScene, orientation), [switchScene, orientation]);
  const canvas = useThree((state) => state.gl.domElement);
  const spin = useRef({ angle: 0, pointers: new Set<number>(), resumeAt: 0, hidden: false, reducedMotion: false });
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined" || !canvas) return;
    const state = spin.current;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const visibilityChanged = () => { state.hidden = document.hidden; };
    const preferenceChanged = () => { state.reducedMotion = media.matches; };
    const pointerDown = (event: PointerEvent) => { state.pointers.add(event.pointerId); };
    const pointerReleased = (event: PointerEvent) => {
      if (state.pointers.delete(event.pointerId)) state.resumeAt = performance.now() + 800;
    };
    const blur = () => {
      state.pointers.clear();
      state.resumeAt = performance.now() + 800;
    };
    visibilityChanged();
    preferenceChanged();
    canvas.addEventListener("pointerdown", pointerDown, { passive: true });
    canvas.addEventListener("pointerup", pointerReleased, { passive: true });
    canvas.addEventListener("pointercancel", pointerReleased, { passive: true });
    canvas.addEventListener("lostpointercapture", pointerReleased, { passive: true });
    window.addEventListener("pointerup", pointerReleased, { passive: true });
    window.addEventListener("pointercancel", pointerReleased, { passive: true });
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibilityChanged);
    media.addEventListener("change", preferenceChanged);
    return () => {
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointerup", pointerReleased);
      canvas.removeEventListener("pointercancel", pointerReleased);
      canvas.removeEventListener("lostpointercapture", pointerReleased);
      window.removeEventListener("pointerup", pointerReleased);
      window.removeEventListener("pointercancel", pointerReleased);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibilityChanged);
      media.removeEventListener("change", preferenceChanged);
      state.pointers.clear();
    };
  }, [canvas]);
  const animation = registry.getAnimation(FOCUSED_KEY);
  useFrame((_, delta) => {
    group.visible = motion.focus > 0;
    const state = spin.current;
    if (!group.visible) {
      state.angle = spinner.rotation.y = 0;
      return;
    }
    focusSwitchTransform(group, position, motion.focus);
    const active = autoRotate && !state.hidden && !state.reducedMotion
      && state.pointers.size === 0 && performance.now() >= state.resumeAt;
    state.angle = stepFocusedSwitchSpin(state.angle, delta, phase, active);
    // Keep the held angle while returning; focus smoothly restores the original switch orientation.
    spinner.rotation.y = state.angle * motion.focus;
    stepKeyAnimation(animation, delta);
    parts.get("stem")!.position.y = animation.offsetY;
    parts.get("stem_magnet")!.position.y = animation.offsetY;
    const spring = parts.get("spring")!;
    if (spring.morphTargetInfluences) spring.morphTargetInfluences[0] = THREE.MathUtils.clamp(-animation.offsetY / KEY_TRAVEL, 0, 1);
  }, -2);

  return <primitive
    object={group}
    onPointerDown={() => { if (motion.focus >= 1) registry.press(FOCUSED_KEY); }}
    onPointerUp={() => registry.release(FOCUSED_KEY)}
    onPointerOut={() => registry.release(FOCUSED_KEY)}
  />;
}
