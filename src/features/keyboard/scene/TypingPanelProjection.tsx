import { useFrame } from "@react-three/fiber";
import type { RefObject } from "react";
import { Camera, Matrix4, PerspectiveCamera, Vector3 } from "three";

const PANEL_POSITION = new Vector3(0, 12, -7);
const PANEL_ROTATION_X = -1.02;
const PANEL_MATRIX = new Matrix4()
  .makeRotationX(PANEL_ROTATION_X)
  .setPosition(PANEL_POSITION)
  .scale(new Vector3(0.035, 0.035, 0.035));

// Match Three's CSS3DRenderer: CSS points down in Y, while the scene points up.
function cssMatrix(matrix: Matrix4, object: boolean): string {
  const elements = matrix.elements.map((value, index) => {
    const flip = object ? index >= 4 && index < 8 : index % 4 === 1;
    return Math.abs(value) < 1e-10 ? 0 : flip ? -value : value;
  });
  return `matrix3d(${elements.join(",")})`;
}

const PANEL_TRANSFORM = `translate(-50%,-50%) ${cssMatrix(PANEL_MATRIX, true)}`;

export function computeTypingPanelTransforms(camera: Camera, width: number, height: number) {
  const perspective = camera.projectionMatrix.elements[5] * height / 2;
  const view = camera.matrixWorldInverse.elements;
  const position = camera.matrixWorld.elements;
  const cameraZ = view[2] * PANEL_POSITION.x + view[6] * PANEL_POSITION.y
    + view[10] * PANEL_POSITION.z + view[14];
  const facing = -Math.sin(PANEL_ROTATION_X) * (position[13] - PANEL_POSITION.y)
    + Math.cos(PANEL_ROTATION_X) * (position[14] - PANEL_POSITION.z);

  return {
    perspective: `${perspective}px`,
    cameraTransform: `translateZ(${perspective}px) ${cssMatrix(camera.matrixWorldInverse, false)} translate(${width / 2}px,${height / 2}px)`,
    panelTransform: PANEL_TRANSFORM,
    visible: camera instanceof PerspectiveCamera && width > 0 && height > 0
      && cameraZ < -camera.near && facing > 0,
  };
}

export type TypingPanelProjectionProps = Readonly<{
  viewport: RefObject<HTMLDivElement | null>;
  cameraLayer: RefObject<HTMLDivElement | null>;
  panel: RefObject<HTMLDivElement | null>;
  visible: boolean;
}>;

export function TypingPanelProjection({ viewport, cameraLayer, panel, visible }: TypingPanelProjectionProps) {
  useFrame(({ camera, size }) => {
    if (!viewport.current || !cameraLayer.current || !panel.current) return;
    camera.updateMatrixWorld();
    const transforms = computeTypingPanelTransforms(camera, size.width, size.height);
    const viewportStyle = viewport.current.style;
    const cameraStyle = cameraLayer.current.style;
    const panelStyle = panel.current.style;
    const visibility = visible && transforms.visible ? "visible" : "hidden";

    if (viewportStyle.visibility !== visibility) viewportStyle.visibility = visibility;
    if (viewportStyle.perspective !== transforms.perspective) viewportStyle.perspective = transforms.perspective;
    if (cameraStyle.transform !== transforms.cameraTransform) cameraStyle.transform = transforms.cameraTransform;
    if (panelStyle.transform !== transforms.panelTransform) panelStyle.transform = transforms.panelTransform;
    panelStyle.backfaceVisibility = "hidden";
  }, -0.1);

  return null;
}
