import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve("public/models/keychron-k2-he");
const required = [
  "models/keyboards/K_2_HE/Keyboard.glb",
  "models/keyboards/K_2_HE/keyboardData.json",
  "models/keyboards/K_2_HE/textures/keycap_font_mac.jpg",
  "models/keycaps/KSA/keycaps.glb",
  "models/keycaps/KSA/keycap-bump-n.jpg",
  "models/switches/Gateron Double-Rail Magnetic Nebula Switch/switch.glb",
  "models/common/common.glb",
  "models/common/draco/draco_wasm_wrapper.js",
  "models/common/draco/draco_decoder.wasm",
  "textures/hdr/potsdamer_platz_1k_compressed.jpg",
  "README.md"
];

describe("Keychron K2 HE assets", () => {
  it("contains every runtime asset", () => {
    expect(required.filter((file) => !existsSync(resolve(root, file)))).toEqual([]);
  });

  it("contains valid glTF 2 binary headers", () => {
    for (const file of required.filter((name) => name.endsWith(".glb"))) {
      const bytes = readFileSync(resolve(root, file));
      expect(bytes.subarray(0, 4).toString("ascii")).toBe("glTF");
      expect(bytes.readUInt32LE(4)).toBe(2);
      expect(bytes.readUInt32LE(8)).toBe(bytes.byteLength);
    }
  });
});
