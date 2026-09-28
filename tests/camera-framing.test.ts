import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { fitKeyboardCamera, INITIAL_CAMERA_POSITION } from "../src/features/keyboard/scene/CameraRig";

describe("keyboard camera framing", () => {
  it.each([[390, 844], [768, 1024], [1440, 900]])("fits the assembled board at %sx%s without changing camera controls", (width, height) => {
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 120);
    camera.position.set(...INITIAL_CAMERA_POSITION);
    camera.lookAt(0, 5, 0);
    fitKeyboardCamera(camera, width, height);
    camera.updateMatrixWorld();
    for (const x of [-16.1, 16.1]) for (const y of [0, 5]) for (const z of [-6.7, 6.7]) {
      const point = new THREE.Vector3(x, y, z).project(camera);
      expect(Math.abs(point.x)).toBeLessThan(1);
      expect(Math.abs(point.y)).toBeLessThan(1);
    }
    expect(camera.position.toArray()).toEqual(INITIAL_CAMERA_POSITION);
  });
});
