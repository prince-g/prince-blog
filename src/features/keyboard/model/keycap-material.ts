import * as THREE from "three";
import { computeLegendTransform } from "./legend-transform";
import type { AssemblyKey, KeycapPalette, KeyboardDefinition } from "./keyboard-types";

export function createKeycapMaterial(key: AssemblyKey, palette: KeycapPalette, atlas: THREE.Texture, normal: THREE.Texture, atlasTransform: KeyboardDefinition["keycapUVOffsetScale"]): THREE.MeshStandardMaterial {
  const projection = computeLegendTransform(key.position, atlasTransform);
  const material = new THREE.MeshStandardMaterial({
    color: palette.keycapColor, roughness: 0.5, metalness: 0, map: atlas,
    normalMap: key.isBump ? normal : null, normalScale: new THREE.Vector2(1.5, 1.5),
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.legendProjection = { value: new THREE.Matrix3().set(
      projection.scaleX, 0, projection.offsetX,
      0, projection.scaleY, projection.offsetY,
      0, 0, 1,
    ) };
    shader.uniforms.legendColor = { value: new THREE.Color(palette.fontColor) };
    // Project physical x/z coordinates, including wide keys, into the full board atlas.
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>
uniform mat3 legendProjection;
varying vec2 vLegendUv;
varying float vCapShade;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
vLegendUv = (legendProjection * vec3(position.x, position.z, 1.0)).xy;
vCapShade = 1.0 - clamp((1.0 - position.y) * 0.4, 0.0, 0.4);`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
uniform vec3 legendColor;
varying vec2 vLegendUv;
varying float vCapShade;`)
      .replace("#include <map_fragment>", `#ifdef USE_MAP
float ink = texture2D(map, vLegendUv).r;
diffuseColor.rgb = mix(diffuseColor.rgb, legendColor, ink) * vCapShade;
#endif`);
  };
  material.customProgramCacheKey = () => "keychron-board-legends-v2";
  return material;
}
