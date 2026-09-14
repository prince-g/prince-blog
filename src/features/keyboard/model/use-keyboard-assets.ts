import { useLoader } from "@react-three/fiber";
import { use } from "react";
import { SRGBColorSpace, TextureLoader } from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KEYCHRON_ASSET_ROOT } from "./asset-paths";
import { parseKeyboardData } from "./parse-keyboard-data";
import type { KeyboardDefinition } from "./keyboard-types";

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

type DefinitionFetcher = (url: string) => Promise<Response>;

const definitionRequests = new Map<string, Promise<KeyboardDefinition>>();

export async function loadKeyboardDefinition(
  relativeName: string,
  fetcher: DefinitionFetcher = fetch,
): Promise<KeyboardDefinition> {
  try {
    const response = await fetcher(`${KEYCHRON_ASSET_ROOT}/${relativeName}`);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return parseKeyboardData(await response.json());
  } catch (cause) {
    throw new Error(`Failed to load ${relativeName}`, { cause });
  }
}

function getKeyboardDefinition(relativeName: string): Promise<KeyboardDefinition> {
  const pending = definitionRequests.get(relativeName);
  if (pending) return pending;

  const request = loadKeyboardDefinition(relativeName);
  definitionRequests.set(relativeName, request);
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
  const definition = use(getKeyboardDefinition(KEYBOARD_DEFINITION));

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
