import * as THREE from "three";

const DISSOLVE_FRAGMENT = `
uniform float dissolveProgress;
varying vec3 vDissolvePosition;

float dissolveMask(vec3 point) {
  // Long vertical strokes with short crossbars, fixed to the model in both directions.
  vec2 grid = vec2(point.x * 19.0, (point.z + point.y) * 11.0);
  float vertical = 1.0 - abs(fract(grid.x) - 0.5) * 2.0;
  float crossbar = step(0.91, fract(grid.y));
  vec2 cell = floor(grid);
  float grain = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
  return clamp(vertical * 0.76 + crossbar * 0.12 + grain * 0.12, 0.001, 0.999);
}
`;

/** A cutout keeps each surviving stroke solid, avoiding transparent cap-shell sorting. */
export function createDissolveEffect(material: THREE.Material, whiteStrokes = false) {
  const progress = { value: 0 };
  const depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: material.side });

  const patch = (target: THREE.Material, colorPass: boolean) => {
    const originalCompile = target.onBeforeCompile;
    const originalKey = target.customProgramCacheKey();
    target.onBeforeCompile = (shader, renderer) => {
      originalCompile.call(target, shader, renderer);
      shader.uniforms.dissolveProgress = progress;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vDissolvePosition;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvDissolvePosition = position;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>\n${DISSOLVE_FRAGMENT}`)
        .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
if (dissolveProgress > 0.0 && dissolveMask(vDissolvePosition) < dissolveProgress) discard;`);
      if (colorPass && whiteStrokes) shader.fragmentShader = shader.fragmentShader.replace(
        "#include <opaque_fragment>",
        `outgoingLight = mix(outgoingLight, vec3(1.6), smoothstep(0.04, 0.4, dissolveProgress));
#include <opaque_fragment>`,
      );
    };
    target.customProgramCacheKey = () => `${originalKey}|keyboard-dissolve-v1:${colorPass && whiteStrokes}`;
  };
  patch(material, true);
  patch(depthMaterial, false);
  return { progress, depthMaterial };
}
