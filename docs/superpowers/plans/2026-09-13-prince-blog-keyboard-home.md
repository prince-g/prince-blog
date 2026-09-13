# Prince Blog 键盘首页实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建 `prince-blog` PC 首页，将 Keychron K2 HE 分体模型装配成可观察的三维键盘，并让实体键盘输入驱动对应网页键帽下压、发光和回弹。

**Architecture:** React 负责路由、首页内容和加载状态；React Three Fiber 负责三维场景。`features/keyboard` 内部把原始 JSON 转为装配计划，用独立键帽对象和轴体实例生成场景，并通过 `KeyboardEvent.code → KeyRegistry → KeyActuator` 驱动逐帧动画。

**Tech Stack:** React 19、TypeScript、Vite 6、React Router 7、Tailwind CSS 4、GSAP、Three.js 0.184、React Three Fiber 9、Vitest 3。

**Spec:** `docs/superpowers/specs/2026-09-13-prince-blog-keyboard-home-design.md`

## Global Constraints

- Node.js 最低版本为 `22.12.0`；本项目不得切换到 KeySim 使用的 Node 14 工具链。
- 仅实现 PC 首页和 `assembled` 场景；不实现移动端、拆解模式或配置器。
- 不实现按键声音。
- `keyboardData.json` 的 84 个键位必须全部装配，只有 `Fn` 与 `LightMode` 标记为浏览器不可可靠检测。
- 模型加载期间必须显示暗色加载状态，不允许出现空白 Canvas。
- 不引入 Drei、Redux、Motion、Lucide 或其他未使用依赖。
- 每个键帽共享不可变几何体和纹理，但必须拥有独立材质与动画状态。
- 轴体在首页使用 `THREE.InstancedMesh`；轴体详情不在本计划范围。
- 使用 `KeyboardEvent.code`，忽略 `event.repeat` 和编辑区域输入。
- 所有 Git 提交信息使用中文。
- 保留第三方模型来源说明；不公开部署。

## File Map

```text
package.json                         依赖、Node 版本约束与脚本
.nvmrc                              推荐的稳定 Node 版本
vite.config.ts                       React、Tailwind 与 Vitest 配置
src/app/router.tsx                   首页和占位路由
src/pages/home/HomePage.tsx          首页组合
src/pages/home/HomePage.css          暗色产品舞台布局
src/components/layout/SiteHeader.tsx 页面顶部个人标识和导航
src/features/keyboard/
  data/keyboard-key-map.ts           显式浏览器键码映射
  model/keyboard-types.ts            原始配置与装配类型
  model/parse-keyboard-data.ts       运行时配置校验
  model/build-assembly-plan.ts       纯数据装配计划
  model/use-keyboard-assets.ts       GLB、贴图和 Draco 加载
  scene/KeyboardHero.tsx             加载、错误和降级边界
  scene/KeyboardCanvas.tsx           R3F Canvas
  scene/KeyboardScene.tsx            灯光、镜头和模型组合
  scene/KeyboardModel.tsx            机身、键帽和轴体装配
  scene/KeycapMesh.tsx               单键帽材质与逐帧动画
  scene/SwitchInstances.tsx          轴体实例化
  scene/CameraRig.tsx                视差、拖动、缩放和复位
  interaction/key-registry.ts        键码到执行器映射
  interaction/physical-keyboard.ts   浏览器事件处理
  interaction/use-physical-keyboard.ts React 生命周期绑定
  animation/key-animation.ts         可测试的单键动画推进函数
src/styles/globals.css               设计变量、重置和降级样式
public/models/keychron-k2-he/         原始模型资源与来源说明
tests/                               纯逻辑、资源和渲染状态测试
```

---

### Task 1: 初始化应用并导入模型资源

**Files:**
- Create: `package.json`
- Create: `.nvmrc`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/vite-env.d.ts`
- Create: `tests/asset-integrity.test.ts`
- Create: `public/models/keychron-k2-he/README.md`
- Create: `public/models/keychron-k2-he/**`

**Interfaces:**
- Consumes: 已下载资源目录 `C:\Users\28645\Documents\Codex\2026-09-13\ni-hu\outputs\Keychron-K2-HE-assets`。
- Produces: 可运行的 React/Vite 测试外壳；浏览器资源根路径常量 `/models/keychron-k2-he`。

- [ ] **Step 1: 创建最小项目配置**

`package.json` 使用以下脚本与版本范围：

```json
{
  "name": "prince-blog",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=22.12.0" },
  "scripts": {
    "dev": "vite",
    "test": "vitest run",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@gsap/react": "^2.1.2",
    "@react-three/fiber": "^9.7.0",
    "gsap": "^3.15.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "three": "^0.184.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/three": "^0.184.0",
    "@vitejs/plugin-react": "^5.0.0",
    "tailwindcss": "^4.1.0",
    "typescript": "~5.8.3",
    "vite": "^6.0.0",
    "vitest": "^3.2.4"
  }
}
```

`.nvmrc` 写入 `22.20.0`。`vite.config.ts` 使用以下内容：

```ts
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: { environment: "node" }
});
```

TypeScript 配置沿用参考项目的 `ES2022`、`moduleResolution: "bundler"`、`strict: true`、`noEmit: true`，额外启用 `resolveJsonModule: true`，并让 `src` 与 `tests` 都参与类型检查。

初始入口保持可构建，Task 7 再替换为正式路由：

```tsx
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);

// src/app/App.tsx
export default function App() {
  return <main>Prince Blog</main>;
}
```

- [ ] **Step 2: 安装依赖并记录实际版本**

Run: `node -v && npm -v && npm install`

Expected: Node 输出不低于 `v22.12.0`，安装生成 `package-lock.json`，无 peer dependency error。

- [ ] **Step 3: 写资源完整性失败测试**

```ts
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
```

- [ ] **Step 4: 运行测试并确认资源缺失**

Run: `npm test -- tests/asset-integrity.test.ts`

Expected: FAIL，错误数组列出尚未复制的模型文件。

- [ ] **Step 5: 复制资源并写来源说明**

Run:

```powershell
New-Item -ItemType Directory -Path 'E:\project\front\prince-blog\public\models\keychron-k2-he' -Force | Out-Null
Copy-Item -Path 'C:\Users\28645\Documents\Codex\2026-09-13\ni-hu\outputs\Keychron-K2-HE-assets\*' -Destination 'E:\project\front\prince-blog\public\models\keychron-k2-he' -Recurse -Force
```

将来源说明重写为项目路径版本，明确记录来源页、2026-09-13 下载日期、文件角色、未知再发布许可证和“仅本地个人原型”。从 `https://jingfu.space/keyboard/models/keyboards/K_2_HE/thumbnail.jpg` 下载 `thumbnail.jpg` 作为 WebGL 降级图，并把 URL 加入来源说明。

- [ ] **Step 6: 运行资源测试和构建**

Run: `npm test -- tests/asset-integrity.test.ts && npm run build`

Expected: 资源测试 PASS，TypeScript 与 Vite build exit 0。

- [ ] **Step 7: 中文提交**

```bash
git add package.json package-lock.json .nvmrc index.html vite.config.ts tsconfig*.json src public tests
git commit -m "chore: 初始化项目并导入键盘资源"
```

---

### Task 2: 解析键盘配置并生成装配计划

**Files:**
- Create: `src/features/keyboard/model/keyboard-types.ts`
- Create: `src/features/keyboard/model/parse-keyboard-data.ts`
- Create: `src/features/keyboard/model/build-assembly-plan.ts`
- Create: `src/features/keyboard/data/keyboard-key-map.ts`
- Create: `tests/keyboard-assembly.test.ts`

**Interfaces:**
- Consumes: `keyboardData.json`，其 `keyPosition` 含 84 个条目，条目字段为 `key`、`position`、`capModel`、`row`、`isBump`、`random`。
- Produces: `parseKeyboardData(input: unknown): KeyboardDefinition`；`buildAssemblyPlan(definition: KeyboardDefinition): AssemblyPlan`；`MODEL_KEY_BY_CODE`。

- [ ] **Step 1: 写装配计划失败测试**

```ts
import data from "../public/models/keychron-k2-he/models/keyboards/K_2_HE/keyboardData.json";
import { describe, expect, it } from "vitest";
import { parseKeyboardData } from "../src/features/keyboard/model/parse-keyboard-data";
import { buildAssemblyPlan } from "../src/features/keyboard/model/build-assembly-plan";
import { MODEL_KEY_BY_CODE, NON_DETECTABLE_MODEL_KEYS } from "../src/features/keyboard/data/keyboard-key-map";

describe("keyboard assembly plan", () => {
  it("creates 84 unique keys using existing keycap node names", () => {
    const plan = buildAssemblyPlan(parseKeyboardData(data));
    expect(plan.keys).toHaveLength(84);
    expect(new Set(plan.keys.map((key) => key.modelKey)).size).toBe(84);
    expect(plan.keys.every((key) => plan.keycapModels.has(key.capModel))).toBe(true);
  });

  it("maps every browser-detectable key and documents two exceptions", () => {
    const keys = Object.keys(data.keyPosition);
    const mapped = new Set(Object.values(MODEL_KEY_BY_CODE));
    expect(keys.filter((key) => !mapped.has(key))).toEqual([...NON_DETECTABLE_MODEL_KEYS]);
    expect([...NON_DETECTABLE_MODEL_KEYS]).toEqual(["Fn", "LightMode"]);
  });
});
```

- [ ] **Step 2: 运行测试确认接口不存在**

Run: `npm test -- tests/keyboard-assembly.test.ts`

Expected: FAIL，模块无法解析。

- [ ] **Step 3: 定义严格类型与校验器**

```ts
export type Vector3Data = Readonly<{ x: number; y: number; z: number }>;
export type KeyboardKeyDefinition = Readonly<{
  key: string;
  position: Vector3Data;
  capModel: string;
  row: number;
  isBump: boolean;
  random: number;
}>;
export type KeyboardDefinition = Readonly<{
  keyboardOffset: readonly [number, number, number];
  keycapUVOffsetScale: readonly [number, number, number, number];
  switchOrientation: "north" | "south";
  keyPosition: Readonly<Record<string, KeyboardKeyDefinition>>;
}>;
export type AssemblyKey = KeyboardKeyDefinition & Readonly<{ modelKey: string }>;
export type AssemblyPlan = Readonly<{
  keys: readonly AssemblyKey[];
  keycapModels: ReadonlySet<string>;
}>;
```

`parseKeyboardData` 对上述字段逐项检查；任何缺失、非有限坐标、未知 `switchOrientation` 或键名与 `entry.key` 不一致都抛出 `KeyboardDataError`。`buildAssemblyPlan` 使用 `Object.entries` 生成冻结数组，并使用固定节点集合：`r6_space`、`r2_backspace`、`r2`、`r1`、`r3_tab`、`r3`、`r4_enter`、`r4_capslock`、`r4`、`r5_lshift`、`r5_rshift`、`r6_meta`、`r6`、`r5`。

- [ ] **Step 4: 建立显式浏览器键码表**

`keyboard-key-map.ts` 导出 `NON_DETECTABLE_MODEL_KEYS = new Set(["Fn", "LightMode"])`，并显式列出配置中除这两项外的所有 `KeyboardEvent.code`。使用下列分组拼接并冻结映射：

```ts
const codes = [
  "Escape", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13",
  "Backquote", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal", "Backspace", "Delete", "Home", "End", "PageUp", "PageDown",
  "Tab", "KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight", "Backslash",
  "CapsLock", "KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote", "Enter",
  "ShiftLeft", "KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash", "ShiftRight", "ArrowUp",
  "ControlLeft", "MetaLeft", "AltLeft", "Space", "AltRight", "ControlRight", "ArrowLeft", "ArrowDown", "ArrowRight"
] as const;

export const MODEL_KEY_BY_CODE = Object.freeze(
  Object.fromEntries(codes.map((code) => [code, code])) as Record<(typeof codes)[number], string>
);
```

- [ ] **Step 5: 运行测试与类型检查**

Run: `npm test -- tests/keyboard-assembly.test.ts && npm run build`

Expected: 两个测试 PASS，构建 exit 0。

- [ ] **Step 6: 中文提交**

```bash
git add src/features/keyboard/model src/features/keyboard/data tests/keyboard-assembly.test.ts
git commit -m "feat: 建立键盘配置解析与装配计划"
```

---

### Task 3: 实现独立按键注册表与浏览器事件控制器

**Files:**
- Create: `src/features/keyboard/interaction/key-registry.ts`
- Create: `src/features/keyboard/interaction/physical-keyboard.ts`
- Create: `src/features/keyboard/interaction/use-physical-keyboard.ts`
- Create: `tests/physical-keyboard.test.ts`

**Interfaces:**
- Consumes: `MODEL_KEY_BY_CODE`。
- Produces: `KeyActuator`、`KeyRegistry`、`createPhysicalKeyboardHandlers`、`usePhysicalKeyboard`。

- [ ] **Step 1: 写按键隔离与边界条件失败测试**

```ts
import { describe, expect, it, vi } from "vitest";
import { KeyRegistry } from "../src/features/keyboard/interaction/key-registry";
import { createPhysicalKeyboardHandlers } from "../src/features/keyboard/interaction/physical-keyboard";

const actuator = () => ({ press: vi.fn(), release: vi.fn(), reset: vi.fn() });

describe("physical keyboard", () => {
  it("presses and releases only the matching key", () => {
    const registry = new KeyRegistry();
    const a = actuator(); const b = actuator();
    registry.register("KeyA", a); registry.register("KeyB", b);
    const handlers = createPhysicalKeyboardHandlers(registry);
    handlers.keydown({ code: "KeyA", repeat: false, target: null });
    handlers.keyup({ code: "KeyA", repeat: false, target: null });
    expect(a.press).toHaveBeenCalledOnce();
    expect(a.release).toHaveBeenCalledOnce();
    expect(b.press).not.toHaveBeenCalled();
  });

  it("ignores repeats and editable targets", () => {
    const registry = new KeyRegistry(); const a = actuator(); registry.register("KeyA", a);
    const handlers = createPhysicalKeyboardHandlers(registry);
    handlers.keydown({ code: "KeyA", repeat: true, target: null });
    handlers.keydown({ code: "KeyA", repeat: false, target: { tagName: "INPUT" } as EventTarget });
    expect(a.press).not.toHaveBeenCalled();
  });

  it("releases every pressed key on blur", () => {
    const registry = new KeyRegistry(); const a = actuator(); const b = actuator();
    registry.register("KeyA", a); registry.register("KeyB", b);
    registry.press("KeyA"); registry.press("KeyB");
    createPhysicalKeyboardHandlers(registry).blur();
    expect(a.reset).toHaveBeenCalledOnce(); expect(b.reset).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/physical-keyboard.test.ts`

Expected: FAIL，交互模块不存在。

- [ ] **Step 3: 实现注册表与纯事件处理器**

```ts
export type KeyActuator = Readonly<{
  press(): void;
  release(): void;
  reset(): void;
}>;

export class KeyRegistry {
  private readonly actuators = new Map<string, KeyActuator>();
  private readonly pressed = new Set<string>();
  register(modelKey: string, actuator: KeyActuator) {
    this.actuators.set(modelKey, actuator);
    return () => this.actuators.delete(modelKey);
  }
  press(modelKey: string) {
    if (this.pressed.has(modelKey)) return;
    this.pressed.add(modelKey); this.actuators.get(modelKey)?.press();
  }
  release(modelKey: string) {
    this.pressed.delete(modelKey); this.actuators.get(modelKey)?.release();
  }
  releaseAll() {
    for (const code of this.pressed) this.actuators.get(code)?.reset();
    this.pressed.clear();
  }
}
```

`createPhysicalKeyboardHandlers` 将 `event.code` 经 `MODEL_KEY_BY_CODE` 转换；`keydown` 在 `repeat` 或编辑区域时返回；`keyup` 始终尝试释放映射键；`blur` 和 `visibilitychange` 在页面隐藏时调用 `releaseAll()`。

- [ ] **Step 4: 实现 React 绑定并保证清理**

`usePhysicalKeyboard(registry)` 在 `useEffect` 中给 `window` 绑定 `keydown`、`keyup`、`blur`，给 `document` 绑定 `visibilitychange`；清理函数移除四个监听器并调用 `registry.releaseAll()`。不调用 `preventDefault()`，不改变浏览器快捷键行为。

- [ ] **Step 5: 运行交互测试和完整测试**

Run: `npm test -- tests/physical-keyboard.test.ts && npm test`

Expected: 全部 PASS。

- [ ] **Step 6: 中文提交**

```bash
git add src/features/keyboard/interaction tests/physical-keyboard.test.ts
git commit -m "feat: 实现实体键盘事件与单键隔离"
```

---

### Task 4: 实现可测试的键帽动画和材质参数

**Files:**
- Create: `src/features/keyboard/animation/key-animation.ts`
- Create: `src/features/keyboard/model/legend-transform.ts`
- Create: `tests/key-animation.test.ts`
- Create: `tests/legend-transform.test.ts`

**Interfaces:**
- Consumes: `KeyboardKeyDefinition.position` 与 `keycapUVOffsetScale = [0.5, 0.49, 32.04, 12.79]`。
- Produces: `createKeyAnimationState`、`stepKeyAnimation`、`computeLegendTransform`。

- [ ] **Step 1: 写动画隔离与纹理坐标失败测试**

```ts
import { describe, expect, it } from "vitest";
import { createKeyAnimationState, stepKeyAnimation } from "../src/features/keyboard/animation/key-animation";
import { computeLegendTransform } from "../src/features/keyboard/model/legend-transform";

describe("key animation", () => {
  it("moves only the pressed state toward -0.16 and glow 1", () => {
    const pressed = createKeyAnimationState(); const neighbor = createKeyAnimationState();
    pressed.pressed = true;
    stepKeyAnimation(pressed, 1 / 60); stepKeyAnimation(neighbor, 1 / 60);
    expect(pressed.offsetY).toBeLessThan(0); expect(pressed.glow).toBeGreaterThan(0);
    expect(neighbor.offsetY).toBe(0); expect(neighbor.glow).toBe(0);
  });
});

describe("legend transform", () => {
  it("maps KeyA board coordinates into normalized atlas coordinates", () => {
    const value = computeLegendTransform({ x: -10.928000450134277, z: 0.9500422477722168 }, [0.5, 0.49, 32.04, 12.79]);
    expect(value.offsetX).toBeCloseTo(0.1589, 3);
    expect(value.offsetY).toBeCloseTo(0.4157, 3);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/key-animation.test.ts tests/legend-transform.test.ts`

Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现与帧率无关的动画推进函数**

```ts
export type KeyAnimationState = { pressed: boolean; offsetY: number; glow: number };
export const createKeyAnimationState = (): KeyAnimationState => ({ pressed: false, offsetY: 0, glow: 0 });

export function stepKeyAnimation(state: KeyAnimationState, delta: number) {
  const positionTarget = state.pressed ? -0.16 : 0;
  const glowTarget = state.pressed ? 1 : 0;
  const positionAlpha = 1 - Math.exp(-24 * delta);
  const glowAlpha = 1 - Math.exp(-(state.pressed ? 30 : 14) * delta);
  state.offsetY += (positionTarget - state.offsetY) * positionAlpha;
  state.glow += (glowTarget - state.glow) * glowAlpha;
  if (!state.pressed && Math.abs(state.offsetY) < 0.0001) state.offsetY = 0;
  if (!state.pressed && state.glow < 0.0001) state.glow = 0;
}
```

`computeLegendTransform` 使用 `offsetX = atlasOffsetX + x / atlasScaleX` 与 `offsetY = atlasOffsetY - z / atlasScaleY`。实现必须返回有限值，并在 scale 为 0 时抛出错误。纹理最终对齐以 Escape、KeyA、Space、ArrowRight 四个位置做浏览器视觉校准；若 GLB 的 UV 原点相反，只在该函数中翻转 Y，不在组件内散布修正。

- [ ] **Step 4: 运行测试并确认通过**

Run: `npm test -- tests/key-animation.test.ts tests/legend-transform.test.ts && npm run build`

Expected: 两个测试文件 PASS，构建 exit 0。

- [ ] **Step 5: 中文提交**

```bash
git add src/features/keyboard/animation src/features/keyboard/model/legend-transform.ts tests/key-animation.test.ts tests/legend-transform.test.ts
git commit -m "feat: 添加独立键帽动画与图集坐标计算"
```

---

### Task 5: 加载并装配 Keychron 三维模型

**Files:**
- Create: `src/features/keyboard/model/use-keyboard-assets.ts`
- Create: `src/features/keyboard/scene/KeyboardModel.tsx`
- Create: `src/features/keyboard/scene/KeycapMesh.tsx`
- Create: `src/features/keyboard/scene/SwitchInstances.tsx`
- Create: `tests/model-node-contract.test.ts`

**Interfaces:**
- Consumes: `AssemblyPlan`、`KeyRegistry`、动画函数、模型根路径。
- Produces: `<KeyboardModel plan={plan} registry={registry} />`。

- [ ] **Step 1: 写模型节点契约失败测试**

测试读取五个 GLB 的 JSON chunk，并断言：`Keyboard.glb` 包含 `bottomCase`、`pcb`、`plate`；`keycaps.glb` 包含 14 个固定键帽节点；`switch.glb` 包含 `upperhousing`、`stem`、`housingbase`、`spring`、`stem_magnet`、`lightRefractor`。

```ts
expect(nodeNames("Keyboard.glb")).toEqual(expect.arrayContaining(["bottomCase", "pcb", "plate"]));
expect(nodeNames("keycaps.glb")).toEqual(expect.arrayContaining(["r6_space", "r2_backspace", "r4_enter", "r5_lshift", "r6"]));
expect(nodeNames("switch.glb")).toEqual(expect.arrayContaining(["upperhousing", "stem", "housingbase", "spring", "stem_magnet", "lightRefractor"]));
```

- [ ] **Step 2: 运行契约测试并确认辅助函数缺失**

Run: `npm test -- tests/model-node-contract.test.ts`

Expected: FAIL，`nodeNames` 尚未实现或导入模块不存在。

- [ ] **Step 3: 实现资源加载 Hook**

使用 R3F `useLoader(GLTFLoader, urls, configureLoader)` 一次加载 `Keyboard.glb`、`keycaps.glb`、`switch.glb` 和 `common.glb`。`configureLoader` 设置：

```ts
const draco = new DRACOLoader();
draco.setDecoderPath(`${MODEL_ROOT}/models/common/draco/`);
draco.setDecoderConfig({ type: "wasm" });
loader.setDRACOLoader(draco);
```

JSON 与贴图使用 `fetch`/`TextureLoader` 加载；非 2xx 响应抛出包含相对资源名的错误。Hook 返回 `{ keyboardScene, keycapScene, switchScene, commonScene, definition, legendAtlas, bumpMap }`。

- [ ] **Step 4: 实现键帽与机身装配**

`KeyboardModel` 克隆固定机身场景；按 `AssemblyPlan.keys` 找到 `capModel` 节点并创建 `KeycapMesh`。每个键帽：

- 共享源 `BufferGeometry`。
- 克隆源 `MeshStandardMaterial` 或 `MeshPhysicalMaterial`。
- 保存 `baseY` 与 `KeyAnimationState`。
- 注册 `press/release/reset` 执行器；卸载时注销。
- `useFrame` 调用 `stepKeyAnimation`，只写该键帽的位置和材质发光参数。
- 使用 `computeLegendTransform` 设置独立图集变换；材质把 JPEG 亮度作为字体遮罩，在 Keychron White 配色的 `#F2F2F0` 键帽色与黑色字体之间混合。
- 按下时将 emissive 颜色插值到 `#caff6a`，强度使用 `animation.glow * 0.85`。

- [ ] **Step 5: 实现轴体实例化**

`SwitchInstances` 对轴体的 6 个源 Mesh 各创建一个 `THREE.InstancedMesh`，每个实例数为 84。最终矩阵为 `keyboardOffset × key.position × switchOrientation × sourceNode.matrixWorld`；全部矩阵写入后设置 `instanceMatrix.needsUpdate = true`。实例不参与按键下压，避免键帽联动时更新 504 个部件矩阵。

- [ ] **Step 6: 运行模型契约、装配与完整测试**

Run: `npm test -- tests/model-node-contract.test.ts tests/keyboard-assembly.test.ts && npm test && npm run build`

Expected: 全部 PASS，构建 exit 0，无未处理的 TypeScript 类型错误。

- [ ] **Step 7: 中文提交**

```bash
git add src/features/keyboard/model src/features/keyboard/scene tests/model-node-contract.test.ts
git commit -m "feat: 加载并装配Keychron键盘模型"
```

---

### Task 6: 构建三维舞台、镜头控制和错误边界

**Files:**
- Create: `src/features/keyboard/scene/KeyboardCanvas.tsx`
- Create: `src/features/keyboard/scene/KeyboardScene.tsx`
- Create: `src/features/keyboard/scene/CameraRig.tsx`
- Create: `src/features/keyboard/scene/KeyboardHero.tsx`
- Create: `src/features/keyboard/scene/KeyboardErrorBoundary.tsx`
- Create: `tests/keyboard-hero-state.test.tsx`

**Interfaces:**
- Consumes: `KeyboardModel`、`KeyRegistry`、`usePhysicalKeyboard`。
- Produces: `<KeyboardHero />`，包含加载、WebGL、错误与重试状态。

- [ ] **Step 1: 写首页三维状态失败测试**

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KeyboardHeroState } from "../src/features/keyboard/scene/KeyboardHero";

describe("KeyboardHeroState", () => {
  it("renders loading, error and WebGL fallback copy", () => {
    expect(renderToStaticMarkup(<KeyboardHeroState state="loading" />)).toContain("正在装配键盘");
    expect(renderToStaticMarkup(<KeyboardHeroState state="error" onRetry={() => {}} />)).toContain("重新加载");
    expect(renderToStaticMarkup(<KeyboardHeroState state="no-webgl" />)).toContain("当前浏览器无法启动 3D 场景");
  });
});
```

- [ ] **Step 2: 运行测试确认组件不存在**

Run: `npm test -- tests/keyboard-hero-state.test.tsx`

Expected: FAIL，组件模块不存在。

- [ ] **Step 3: 实现状态组件和错误边界**

`KeyboardHeroState` 为纯组件，三种状态都保留 `thumbnail.jpg`、品牌文字和明确说明；错误状态按钮调用 `onRetry`。`KeyboardErrorBoundary` 捕获 Canvas 子树错误，展示错误状态；重试通过递增 Canvas `key` 创建全新资源生命周期。

- [ ] **Step 4: 实现场景与产品灯光**

`KeyboardCanvas` 使用：

```tsx
<Canvas
  dpr={[1, 1.75]}
  camera={{ fov: 32, near: 0.1, far: 120, position: [0, 10.5, 18] }}
  gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
  shadows
>
```

`KeyboardScene` 设置 `ACESFilmicToneMapping`、SRGB 输出、环境贴图、一个暖白主光 `#fff4e8`、一个绿色边缘光 `#caff6a` 和柔和接触阴影平面。加载成功后调用外层 `onReady`，只更新一次 React 状态。

- [ ] **Step 5: 实现受限镜头控制**

`CameraRig` 保存目标偏航 `[-0.38, 0.38]`、俯仰 `[0.34, 0.92]` 和距离 `[14, 23]`。鼠标移动只添加最大 `0.025` 弧度视差；拖动每像素改变 `0.004` 弧度；滚轮每次改变 `deltaY * 0.008`；双击恢复 `[yaw=0.08, pitch=0.62, distance=18]`。所有相机写入发生在 `useFrame`，事件卸载时完整清理。

- [ ] **Step 6: 连接实体键盘 Hook**

`KeyboardHero` 创建一次 `KeyRegistry`，`usePhysicalKeyboard` 只在模型 ready 后启用。加载期间和错误状态不绑定实体按键事件。

- [ ] **Step 7: 运行状态测试、完整测试和构建**

Run: `npm test -- tests/keyboard-hero-state.test.tsx && npm test && npm run build`

Expected: 全部 PASS，构建 exit 0。

- [ ] **Step 8: 中文提交**

```bash
git add src/features/keyboard/scene tests/keyboard-hero-state.test.tsx
git commit -m "feat: 构建键盘三维舞台与镜头交互"
```

---

### Task 7: 完成暗色产品舞台首页与路由

**Files:**
- Create: `src/app/router.tsx`
- Modify: `src/app/App.tsx`
- Create: `src/pages/home/HomePage.tsx`
- Create: `src/pages/home/HomePage.css`
- Create: `src/components/layout/SiteHeader.tsx`
- Create: `src/styles/globals.css`
- Create: `src/styles/tailwind.css`
- Create: `tests/app-shell.test.tsx`

**Interfaces:**
- Consumes: `<KeyboardHero />`。
- Produces: `/` 首页，以及 `/notes`、`/work`、`/about` 的明确占位页。

- [ ] **Step 1: 写路由与首页文案失败测试**

使用 `createMemoryRouter` 和 `renderToStaticMarkup` 检查首页包含 `PRINCE / DIGITAL GARDEN`、`Ideas become interfaces.`、`PRESS ANY KEY`；占位路由包含“内容正在整理”。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/app-shell.test.tsx`

Expected: FAIL，路由和页面文件不存在。

- [ ] **Step 3: 实现首页结构**

`HomePage` 的 DOM 顺序固定为：跳转链接、`SiteHeader`、主标题、`KeyboardHero`、按键提示。`SiteHeader` 左侧显示 `PRINCE / DIGITAL GARDEN`，右侧显示 `WORK`、`NOTES`、`ABOUT`。占位页使用同一 Header，并提供返回首页链接。

- [ ] **Step 4: 实现 A 方案视觉样式**

CSS 变量：`--ink:#080908`、`--surface:#111512`、`--text:#f2f2ed`、`--muted:#90978e`、`--accent:#caff6a`。首页固定 `min-height:100svh`、`overflow:hidden`；Canvas 占视口主体，文字层使用 `pointer-events:none`，导航恢复 `pointer-events:auto`。背景使用中心偏右绿色灰径向渐变和极淡噪点，不使用大面积纯绿。

GSAP 仅负责 Header、标题和提示文字入场；模型镜头动画保留在 R3F。`prefers-reduced-motion: reduce` 时跳过文字位移动画并缩短淡入。

- [ ] **Step 5: 运行页面测试、完整测试和构建**

Run: `npm test -- tests/app-shell.test.tsx && npm test && npm run build`

Expected: 全部 PASS，构建 exit 0。

- [ ] **Step 6: 中文提交**

```bash
git add src/app src/pages src/components src/styles tests/app-shell.test.tsx
git commit -m "feat: 完成暗色键盘首页与基础路由"
```

---

### Task 8: 浏览器集成验证与交付文档

**Files:**
- Create: `README.md`
- Create: `docs/qa/2026-09-13-keyboard-home.md`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: 完整首页与测试套件。
- Produces: 可复现的启动说明、验证记录和干净 Git 工作区。

- [ ] **Step 1: 运行完整自动验证**

Run: `npm test && npm run build && git diff --check`

Expected: 全部测试 PASS，构建 exit 0，`git diff --check` 无输出。

- [ ] **Step 2: 启动生产预览并验证 1440×900**

Run: `npm run dev -- --host 127.0.0.1`

在浏览器明确设置 1440×900，验证：首页无横纵溢出；模型与文字不互相遮挡；Network 中模型、JSON、贴图和 Draco 均为 200；控制台无 error。

- [ ] **Step 3: 验证按键与相机交互**

依次检查 `KeyA`、`Space`、`Enter`、`ShiftLeft`、方向键和 `ControlLeft + KeyA`。记录：只有目标键帽移动和发光；松开后归位；快速连按不中断；多键同时按下互不影响；窗口失焦全部复位；输入占位页的可编辑测试元素时不响应。检查拖动角度限制、滚轮缩放限制、双击复位。

- [ ] **Step 4: 验证错误与 WebGL 降级**

临时在浏览器请求拦截中阻断 `Keyboard.glb`，确认显示失败与重试界面；取消阻断并点击重试，确认场景恢复。使用浏览器禁用 WebGL 的测试上下文确认静态预览和说明可见。测试结束后恢复正常浏览器设置。

- [ ] **Step 5: 检查性能与资源释放**

记录首次稳定帧的 draw calls、triangles 和纹理数量；验收上限为稳定场景 draw calls 小于 180、设备像素比上限 1.75。导航离开首页再返回三次，确认监听器没有重复触发，同一次按键只执行一次动画。

- [ ] **Step 6: 写启动说明和 QA 证据**

`README.md` 写明 Node 要求、`npm install`、`npm run dev`、`npm test`、`npm run build`、模型来源边界和当前 PC-only 范围。QA 文档记录自动命令输出摘要、浏览器尺寸、测试键位、资源状态、控制台结果和性能计数。

- [ ] **Step 7: 再运行最终验证**

Run: `npm test && npm run build && git diff --check && git status --short`

Expected: 测试与构建通过，diff check 无输出；status 只包含 README、QA 文档和 `.gitignore` 的预期改动。

- [ ] **Step 8: 中文提交**

```bash
git add README.md docs/qa .gitignore
git commit -m "docs: 记录键盘首页使用说明与验证结果"
```

- [ ] **Step 9: 确认最终仓库状态**

Run: `git status --short --branch && git log --oneline --decorate -8`

Expected: `## main` 且工作区无未提交文件；最近提交均为中文描述。
