import { useLoader } from "@react-three/fiber";
import { use } from "react";
import { SRGBColorSpace, TextureLoader } from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KEYCHRON_ASSET_ROOT } from "./asset-paths";
import { parseKeyboardData } from "./parse-keyboard-data";

const KEYBOARD_DEFINITION = "models/keyboards/K_2_HE/keyboardData.json";
const GLB_URLS = [
  `${KEYCHRON_ASSET_ROOT}/models/keyboards/K_2_HE/Keyboard.glb`,
  `${KEYCHRON_ASSET_ROOT}/models/keycaps/KSA/keycaps.glb`,
  `${KEYCHRON_ASSET_ROOT}/models/switches/Gateron Double-Rail Magnetic Nebula Switch/switch.glb`,
  `${KEYCHRON_ASSET_ROOT}/models/common/common.glb`,
];
const TEXTURE_URLS = [
  `${KEYCHRON_ASSET_ROOT}/models/keyboards/K_2_HE/textures/keycap_font_windows.jpg`,
  `${KEYCHRON_ASSET_ROOT}/models/keycaps/KSA/keycap-bump-n.jpg`,
];

const jsonRequests = new Map<string, Promise<unknown>>();

function fetchJson(relativeName: string): Promise<unknown> {
  const pending = jsonRequests.get(relativeName);
  if (pending) return pending;

  const request = fetch(`${KEYCHRON_ASSET_ROOT}/${relativeName}`).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to load ${relativeName}: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<unknown>;
  });
  jsonRequests.set(relativeName, request);
  return request;
}

function configureLoader(loader: GLTFLoader): void {
  const draco = new DRACOLoader();
  draco.setDecoderPath(`${KEYCHRON_ASSET_ROOT}/models/common/draco/`);
  draco.setDecoderConfig({ type: "wasm" });
  loader.setDRACOLoader(draco);
}

export function useKeyboardAssets() {
  const [keyboard, keycaps, switches, common] = useLoader(GLTFLoader, GLB_URLS, configureLoader);
  const [legendAtlas, bumpMap] = useLoader(TextureLoader, TEXTURE_URLS);
  const definition = parseKeyboardData(use(fetchJson(KEYBOARD_DEFINITION)));

  legendAtlas.colorSpace = SRGBColorSpace;
  legendAtlas.flipY = false;
  bumpMap.flipY = false;

  return {
    keyboardScene: keyboard.scene,
    keycapScene: keycaps.scene,
    switchScene: switches.scene,
    commonScene: common.scene,
    definition,
    legendAtlas,
    bumpMap,
  };
}
