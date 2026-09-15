# 2026-09-13 键盘首页 QA 记录

## 范围与环境

- 工作树：`feature/keyboard-home`
- 目标：PC-only、单一暗色首页，桌面基准视口 `1440 × 900`
- Node 要求：`>=22.12.0`
- 浏览器：Codex 内置浏览器；开发服务器 `http://127.0.0.1:5175/`，production preview `http://127.0.0.1:4176/`

## 自动验证

2026-09-15 执行：

```text
npm test && npm run build && git diff --check
```

- `npm test`：12 个测试文件、52 项断言通过。
- `npm run build`：通过；产物主 JS 为 1,327.71 kB（gzip 385.29 kB）。Vite 仅提示该场景包超过 500 kB，建议后续按产品需求评估分包。
- `git diff --check`：无空白错误。
- 已额外运行 `npm test -- tests/switch-instances.test.ts`；3 项形变/Strict Mode 回归通过。

## 资源烟雾检查

production preview 对下列真实浏览器资源路径返回 HTTP 200：

| 资源 | 状态 |
| --- | --- |
| `keyboardData.json` | 200 |
| `Keyboard.glb` | 200 |
| `keycap_font_windows.jpg` | 200 |
| `draco_decoder.wasm` | 200 |

## 已完成的浏览器证据

- 开发页曾在 `1440 × 900` 加载并显示暗色画布；DOM 尺寸记录为画布 `1440 × 900`、文档滚动尺寸 `1440 × 900`，背景为 `rgb(8, 9, 8)`。
- 真实三维渲染最初持续报 `Cannot read properties of undefined (reading 'length')`。诊断显示 `springInstances` 的 `morphTexture` 会在 React 19 的开发期 effect replay 后变为 `null`。移除手工 `dispose()` 清理并补全每实例 morph 数据后，开发页和 production preview 对该错误的控制台查询均为空。
- production preview 已用内置浏览器打开；其控制台 error 查询为空。资源 200 见上表。

## 自动交互与降级覆盖

- `tests/physical-keyboard.test.ts` 覆盖按下/松开、多键、编辑目标忽略、blur 与 visibility reset。
- `tests/keyboard-hero-state.test.tsx` 覆盖 ready 门控、retry、资源错误状态、WebGL capability probe、相机拖拽/滚轮 clamp、双击复位、lost pointer capture 与 blur。
- `tests/switch-instances.test.ts` 覆盖每个 spring 实例复制 morph 权重、缺失源权重时初始化 0 值，以及 React 开发期 effect replay 不清空 morph texture。

## 未能由浏览器自动化闭环的项目

内置浏览器在 production 截图、DOM 评估和 8 秒稳定等待时多次出现 CDP 调度超时并重置会话；没有替换为外部 Playwright。因而以下项目仅有上述单测/源码覆盖，**未作为真实浏览器验收通过**：可见键帽位移与发光、快速/组合键的画面表现、拖动/滚轮后的画面 clamp、双击画面复位、三次路由往返的监听计数、`renderer.info` 的 draw calls/triangles/textures、请求拦截下的 GLB 失败后点击重试、以及禁用 WebGL 的静态降级截图。

后续应在可稳定调度的桌面浏览器会话中按上述清单补跑，尤其记录 `renderer.info`（draw calls 必须小于 180，DPR 上限 1.75）与三次离开/返回的单次按键触发证据。

## Morph 回归证明

接管时生产修复和未跟踪测试已存在，原始 RED 日志不可恢复，不能声称由本任务首次看到它。仍进行了 mutation/HEAD 对比：临时删除 `setMorphAt` 与 `morphTexture.needsUpdate` 后，`tests/switch-instances.test.ts` 稳定失败为 `expected null not to be null`；立即还原后通过。随后为真实浏览器发现的 Strict Mode dispose 问题先添加失败测试（effect replay 后 morph texture 为 `null`），删除手工 cleanup 后转绿。所有 mutation 与 DEV-only 诊断均已还原，未提交。
