# 键盘首页镜头 360° 旋转设计

日期：2026-09-16

## 1. 目标

放开键盘首页镜头的水平旋转限制：用户按住鼠标左键拖动时，可绕键盘水平旋转任意角度（含完整的 360°、可多圈），并放宽上下俯仰范围，以便更自由地观察键盘各面。

本设计修订 [2026-09-13-prince-blog-keyboard-home-design.md](./2026-09-13-prince-blog-keyboard-home-design.md) 第 9 节「镜头与鼠标交互」：原「不允许翻转到键盘背面」的限制被放宽为允许水平 360° 旋转。

## 2. 非目标

- 不引入第三方轨道控制库（如 Drei `OrbitControls`）。
- 不提供自由平移（pan）或键盘正下方视角。
- 不改变滚轮缩放、双击复位、悬停视差与逐帧阻尼等既有行为。
- 不改变默认视角、焦点高度与相机初始位置。

## 3. 现状

镜头交互集中在 `src/features/keyboard/scene/CameraRig.tsx`，交互模型已支持「按住左键拖动旋转」，但受两个夹紧常量限制：

- `YAW_RANGE = [-0.38, 0.38]`（约 ±22°）：水平旋转被夹死，无法转到键盘侧面或背面。
- `PITCH_RANGE = [0.34, 0.92]`（约 20°~53°）：俯仰范围较窄。

## 4. 改动方案

全部改动位于 `CameraRig.tsx`：

| 项 | 现状 | 改为 |
|----|------|------|
| 水平 yaw | 夹紧到 `[-0.38, 0.38]` | 不夹紧，无限累加（可 360°、可多圈） |
| 俯仰 pitch | `[0.34, 0.92]` | `[0.05, 1.45]`（约 3°~83°） |
| 滚轮距离 | `[38, 62]` | 不变 |

具体修改点：

1. 删除 `YAW_RANGE` 常量。
2. `PITCH_RANGE` 由 `[0.34, 0.92]` 改为 `[0.05, 1.45]`。
3. `bindCameraInput` 的 `pointermove` 中，`input.target.yaw` 去掉 `clamp`，直接累加；`input.target.pitch` 保留 `clamp`（用新范围）。
4. `applyCameraFrame` 中，`yaw` 去掉 `clamp`，改为 `controls.target.yaw + controls.parallax.yaw`；`pitch` 保留 `clamp`（用新范围）。

保持不变的默认值：`DEFAULT_TARGET = { yaw: 0.08, pitch: 0.62, distance: 49 }`、`CAMERA_FOCUS_Y = 5`、`INITIAL_CAMERA_POSITION`。

俯仰仍被限制在 `(0, π/2)` 区间内：最小 `0.05` 避免相机落到桌面以下（从下方仰视），最大 `1.45` 避免越过正上方导致翻转。yaw 无限累加不产生浮点或周期问题（`sin`/`cos` 周期函数 + `MathUtils.damp` 对任意大值安全）。

## 5. 交互行为（修订后）

- 鼠标移动：轻微视差（不变）。
- 按住左键水平拖动：水平 360° 旋转，无角度上限。
- 按住左键垂直拖动：俯仰在约 3°~83° 之间变化。
- 滚轮：缩放保持在 `[38, 62]`。
- 双击：恢复默认镜头。

## 6. 测试

更新 `tests/keyboard-hero-state.test.tsx`：

1. 更新「constrains camera input, restores defaults and removes every listener」：原断言 yaw 被夹到 `-0.38` 的行改为断言 yaw 按拖动距离无限累加；pitch 夹紧期望值改为新上限 `1.45`。
2. 新增用例：连续水平拖动使 yaw 累加超过 `2π`，验证能完成一整圈（甚至多圈）旋转。

## 7. 验收

- `npm test` 全部通过。
- `npm run build` 通过。
- 在 PC 浏览器按住左键水平拖动，可绕键盘旋转完整 360°；垂直拖动可在更宽的俯仰范围内调整；滚轮缩放、双击复位、悬停视差行为不变。
