import { describe, expect, it } from "vitest";
import { Euler, Matrix4, PerspectiveCamera, Quaternion, Vector3 } from "three";
import { computeTypingPanelTransforms } from "../src/features/keyboard/scene/TypingPanelProjection";

function cameraAt(yaw: number, width = 1440, height = 900) {
  const camera = new PerspectiveCamera(32, width / height, 0.1, 120);
  camera.position.set(Math.sin(yaw) * 40, 33, Math.cos(yaw) * 40);
  camera.lookAt(0, 5, 0);
  camera.zoom = Math.min(1, width / height / 1.35);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return camera;
}

function cssMatrix(transform: string) {
  const values = transform.match(/matrix3d\(([^)]+)\)/)?.[1];
  if (!values) throw new Error("Expected a CSS 3D matrix");
  return new Matrix4().fromArray(values.split(",").map(Number));
}

describe("typing panel camera projection", () => {
  it.each([[0, 1440, 900], [0.9, 1440, 900], [0, 390, 844]])(
    "matches WebGL coordinates at yaw %s and %s×%s, including portrait zoom",
    (yaw, width, height) => {
      const camera = cameraAt(yaw, width, height);
      const transforms = computeTypingPanelTransforms(camera, width, height);
      const cameraMatrix = cssMatrix(transforms.cameraTransform);
      const panelMatrix = cssMatrix(transforms.panelTransform);
      const worldMatrix = new Matrix4().compose(
        new Vector3(0, 12, -7),
        new Quaternion().setFromEuler(new Euler(-1.02, 0, 0)),
        new Vector3(0.035, 0.035, 0.035),
      );

      for (const x of [-200, 200]) for (const y of [-74, 74]) {
        const cssPoint = new Vector3(x, y, 0).applyMatrix4(panelMatrix).applyMatrix4(cameraMatrix);
        const perspective = Number.parseFloat(transforms.perspective);
        const worldPoint = new Vector3(x, -y, 0).applyMatrix4(worldMatrix).project(camera);
        expect(width / 2 + cssPoint.x * perspective / -cssPoint.z).toBeCloseTo((worldPoint.x + 1) * width / 2, 7);
        expect(height / 2 + cssPoint.y * perspective / -cssPoint.z).toBeCloseTo((1 - worldPoint.y) * height / 2, 7);
      }
      expect(transforms.visible).toBe(true);
    },
  );

  it("keeps the panel fixed in the board's world while the orbit changes its perspective", () => {
    const front = computeTypingPanelTransforms(cameraAt(0), 1440, 900);
    const side = computeTypingPanelTransforms(cameraAt(0.9), 1440, 900);
    expect(side.panelTransform).toBe(front.panelTransform);
    expect(side.cameraTransform).not.toBe(front.cameraTransform);
    const matrix = cssMatrix(front.cameraTransform);
    const left = new Vector3(-200, 0, 0).applyMatrix4(cssMatrix(front.panelTransform)).applyMatrix4(matrix);
    const right = new Vector3(200, 0, 0).applyMatrix4(cssMatrix(front.panelTransform)).applyMatrix4(matrix);
    expect(left.x).toBeCloseTo(-right.x, 8);
    expect(left.y).toBeCloseTo(right.y, 8);
    expect(left.z).toBeCloseTo(right.z, 8);
  });

  it("hides behind the camera and when the panel's back is facing the camera", () => {
    const camera = cameraAt(0);
    camera.lookAt(0, 100, 100);
    camera.updateMatrixWorld();
    expect(computeTypingPanelTransforms(camera, 1440, 900).visible).toBe(false);

    camera.position.set(0, -20, -40);
    camera.lookAt(0, 12, -7);
    camera.updateMatrixWorld();
    expect(computeTypingPanelTransforms(camera, 1440, 900).visible).toBe(false);
  });
});
