# 键盘首页镜头 360° 旋转 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 放开键盘首页镜头水平旋转限制（可 360° 甚至多圈），并把俯仰范围放宽到约 3°~83°。

**Architecture:** 改动集中在 `CameraRig.tsx` 的镜头输入与逐帧应用两处：水平 yaw 不再 `clamp`（无限累加），俯仰 pitch 用更宽的 `PITCH_RANGE = [0.05, 1.45]` 继续夹紧。滚轮缩放、双击复位、悬停视差与阻尼保持不变。

**Tech Stack:** React 19 + TypeScript（严格模式）+ Vite 6 + React Three Fiber + Vitest。

## Global Constraints

- Node.js `>= 22.12.0`（`.nvmrc` 指定 `22.20.0`）。
- React 固定 `19.2.8`。
- 不引入 Drei 或任何新依赖。
- TypeScript 严格模式；改动必须通过 `npm run build`（`tsc -b`）。
- 测试命令为 `npm test`（`vitest run`）。
- 提交信息使用中文 conventional commit（`feat:` / `fix:` / `test:` / `docs:`）。

---

### Task 1: 放开 yaw 并放宽 pitch 范围

**Files:**
- Modify: `src/features/keyboard/scene/CameraRig.tsx`
- Test: `tests/keyboard-hero-state.test.tsx`

**Interfaces:**
- Consumes: `createCameraInputState`、`bindCameraInput`、`applyCameraFrame`（均为 `CameraRig.tsx` 既有导出，签名不变）。
- Produces: 无新增导出。行为变化：`bindCameraInput` 拖动时 `input.target.yaw` 不再被夹紧；`applyCameraFrame` 对 `controls.target.yaw + parallax.yaw` 不再夹紧。`input.target.pitch` 夹紧范围由 `[0.34, 0.92]` 变为 `[0.05, 1.45]`。

- [ ] **Step 1: 写失败测试**

在 `tests/keyboard-hero-state.test.tsx` 中做三处改动：

**(a) 更新现有断言**（`describe("keyboard scene capability and camera input")` 内、测试标题为 `"constrains camera input, restores defaults and removes every listener"` 的用例）。把标题改为：

```ts
  it("frees yaw and clamps pitch and distance, restores defaults and removes every listener", () => {
```

把该用例末尾这段：

```ts
    element.dispatch("pointermove", { clientX: 10000, clientY: 10000, pointerId: 1 });
    element.dispatch("wheel", { deltaY: 10000, preventDefault() {} });
    expect(input.target).toEqual({ yaw: -0.38, pitch: 0.92, distance: 62 });
```

改为：

```ts
    element.dispatch("pointermove", { clientX: 10000, clientY: 10000, pointerId: 1 });
    element.dispatch("wheel", { deltaY: 10000, preventDefault() {} });
    expect(input.target.yaw).toBeLessThan(-0.38);
    expect(input.target.pitch).toBe(1.45);
    expect(input.target.distance).toBe(62);
```

**(b) 新增「转满一整圈」用例**（紧接上面那个用例的结束 `});` 之后插入）：

```ts
  it("accumulates yaw past a full revolution when dragged horizontally", () => {
    const element = new CameraEventTarget();
    const input = createCameraInputState();
    const cleanup = bindCameraInput(element as unknown as HTMLCanvasElement, input);

    element.dispatch("pointerdown", { clientX: 0, clientY: 50, pointerId: 1 });
    element.dispatch("pointermove", { clientX: 2000, clientY: 50, pointerId: 1 });

    expect(input.target.yaw).toBeCloseTo(0.08 - 2000 * 0.004, 10);
    expect(Math.abs(input.target.yaw - 0.08)).toBeGreaterThan(2 * Math.PI);

    cleanup();
  });
```

**(c) 新增「俯仰下界夹紧」用例**（紧随其后插入）：

```ts
  it("clamps pitch at the widened lower bound", () => {
    const element = new CameraEventTarget();
    const input = createCameraInputState();
    const cleanup = bindCameraInput(element as unknown as HTMLCanvasElement, input);

    element.dispatch("pointerdown", { clientX: 100, clientY: 50, pointerId: 1 });
    element.dispatch("pointermove", { clientX: 100, clientY: -10000, pointerId: 1 });

    expect(input.target.pitch).toBe(0.05);

    cleanup();
  });
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test -- tests/keyboard-hero-state.test.tsx`

Expected: 三个断言失败（源码仍把 yaw 夹到 `-0.38`、pitch 夹到 `0.92`），其余用例通过。失败点应是：
- `expect(input.target.yaw).toBeLessThan(-0.38)` 失败（实际 `-0.38`）。
- `expect(input.target.pitch).toBe(1.45)` 失败（实际 `0.92`）。
- 新用例 `expect(Math.abs(...)).toBeGreaterThan(2 * Math.PI)` 失败。
- 新用例 `expect(input.target.pitch).toBe(0.05)` 失败（实际 `0.34`）。

- [ ] **Step 3: 实现最小改动**

修改 `src/features/keyboard/scene/CameraRig.tsx` 三处：

**(a) 删除 `YAW_RANGE`，放宽 `PITCH_RANGE`**（原第 17–19 行附近）：

```ts
const DEFAULT_TARGET: Readonly<CameraTarget> = { yaw: 0.08, pitch: 0.62, distance: 49 };
const PITCH_RANGE = [0.05, 1.45] as const;
const DISTANCE_RANGE = [38, 62] as const;
```

（即：删掉 `const YAW_RANGE = [-0.38, 0.38] as const;`，并把 `PITCH_RANGE` 从 `[0.34, 0.92]` 改为 `[0.05, 1.45]`。）

**(b) `pointermove` 中 yaw 不再夹紧**（原第 76–84 行）：

```ts
    if (!activePointer || activePointer.id !== event.pointerId) return;
    input.target.yaw = input.target.yaw - (event.clientX - activePointer.x) * DRAG_RADIANS_PER_PIXEL;
    input.target.pitch = clamp(
      input.target.pitch + (event.clientY - activePointer.y) * DRAG_RADIANS_PER_PIXEL,
      PITCH_RANGE,
    );
```

（即：把原来包在 `clamp(..., YAW_RANGE)` 里的 yaw 赋值改成直接累加。）

**(c) `applyCameraFrame` 中 yaw 不再夹紧**（原第 156–157 行）：

```ts
    const yaw = controls.target.yaw + controls.parallax.yaw;
    const pitch = clamp(controls.target.pitch + controls.parallax.pitch, PITCH_RANGE);
```

（即：`yaw` 去掉 `clamp(..., YAW_RANGE)`，`pitch` 保留 `clamp`。）

`clamp` 函数仍被 pitch 与 distance 使用，不要删除；确认文件中不再有 `YAW_RANGE` 引用。

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test`

Expected: 13 个测试文件全部通过（含更新后的相机用例与两个新用例）。

- [ ] **Step 5: 类型检查与构建**

Run: `npm run build`

Expected: `tsc -b` 通过（无 `YAW_RANGE` 未定义等类型错误）；`vite build` 完成（可能出现场景包超过 500 kB 的分包提示，属已知警告，不阻断）。

- [ ] **Step 6: 提交**

```bash
git add src/features/keyboard/scene/CameraRig.tsx tests/keyboard-hero-state.test.tsx
git commit -m "feat: 放开镜头水平 360° 旋转并放宽俯仰范围"
```
