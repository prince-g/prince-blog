import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type GlbJson = { nodes?: Array<{ name?: string }> };

function nodeNames(path: string): string[] {
  const bytes = readFileSync(path);
  let offset = 12;

  while (offset < bytes.byteLength) {
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    if (type === 0x4e4f534a) {
      const json = JSON.parse(bytes.subarray(offset + 8, offset + 8 + length).toString("utf8").trim()) as GlbJson;
      return json.nodes?.flatMap((node) => node.name ?? []) ?? [];
    }
    offset += 8 + length;
  }

  throw new Error(`${path} has no JSON chunk`);
}

const root = resolve("public/models/keychron-k2-he");
const glbs = {
  keyboard: resolve(root, "models/keyboards/K_2_HE/Keyboard.glb"),
  keycaps: resolve(root, "models/keycaps/KSA/keycaps.glb"),
  switches: resolve(root, "models/switches/Gateron Double-Rail Magnetic Nebula Switch/switch.glb"),
  common: resolve(root, "models/common/common.glb"),
  comparison: resolve(root, "models/common/comparisonSet.glb"),
};

describe("Keychron GLB node contract", () => {
  it("keeps the keyboard body nodes used by assembly", () => {
    expect(nodeNames(glbs.keyboard)).toEqual(expect.arrayContaining(["bottomCase", "pcb", "plate"]));
  });

  it("keeps all 14 fixed keycap model nodes", () => {
    expect(nodeNames(glbs.keycaps)).toEqual([
      "r6_space",
      "r2_backspace",
      "r2",
      "r1",
      "r3_tab",
      "r3",
      "r4_enter",
      "r4_capslock",
      "r4",
      "r5_lshift",
      "r5_rshift",
      "r6_meta",
      "r6",
      "r5",
    ]);
  });

  it("keeps the six switch component nodes used for instancing", () => {
    expect(nodeNames(glbs.switches)).toEqual(expect.arrayContaining([
      "upperhousing",
      "stem",
      "housingbase",
      "spring",
      "stem_magnet",
      "lightRefractor",
    ]));
  });

  it("keeps the retained common model contracts readable", () => {
    expect(nodeNames(glbs.common)).toEqual(expect.arrayContaining(["screwExternal", "screwInternal", "knobCap"]));
    expect(nodeNames(glbs.comparison)).toEqual(expect.arrayContaining(["bluetoothKeyboard", "laptop14", "phone"]));
  });
});
