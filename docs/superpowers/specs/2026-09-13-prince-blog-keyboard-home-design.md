# Prince Blog 键盘首页设计

日期：2026-09-13

## 1. 目标

在 `E:\project\front\prince-blog` 创建一个 PC 优先的个人网站首版。首页以 Keychron K2 HE 三维键盘为视觉主体：用户按下实体键盘按键时，网页中的对应键帽下压、发光并在松开后回弹。

首版只实现全屏首页、简洁个人标识与导航入口，以及键盘的基础观察和实体按键联动。文章、项目等页面仅保留路由入口，不制作内容。

## 2. 非目标

- 不实现移动端交互或专用移动场景。
- 不实现整机拆解、轴体拆解或部件说明；这些作为后续场景模式扩展。
- 不实现键盘配置器、换色、换轴、布局编辑、导出或分享。
- 不实现按键声音。
- 不公开部署，也不声称拥有第三方模型资源版权。

## 3. 技术栈

沿用参考项目的主技术栈：

- React 19
- TypeScript 严格模式
- Vite 6
- React Router 7
- Tailwind CSS 4
- GSAP 与 `@gsap/react`
- Three.js
- React Three Fiber

不引入 Drei、Redux 或额外全局状态库。React 管理页面与低频加载状态；React Three Fiber 管理三维场景；逐帧键帽动画保留在三维层内部。

## 4. 视觉方向

采用已批准的 A 方案“暗色产品舞台”：

- 全屏近黑背景，中心使用柔和的绿色灰光晕。
- 键盘占据首屏主要面积，使用克制的产品灯光突出材质。
- 个人名称、导航和提示信息悬浮在画面边缘，不遮挡模型。
- 首次加载完成后执行一次短促的镜头推近与键盘落位。
- 提示文案使用 `PRESS ANY KEY`。

## 5. 项目结构

```text
src/
├─ app/                 应用入口与路由
├─ pages/home/          首页组合
├─ components/layout/   Header 等通用页面组件
├─ features/keyboard/   三维场景、装配、交互、数据、类型与测试
├─ styles/              全局样式与设计变量
└─ assets/              页面级静态素材

public/models/keychron-k2-he/
└─ 原始 GLB、JSON、贴图、Draco 与来源说明
```

键盘功能域保持内聚，不让首页组件直接操作 Three.js 对象。未来场景模式可扩展为 `assembled`、`exploded` 和 `switch-detail`；首版只实现 `assembled`。

## 6. 模型装配

保留网页原始分体资源，不预先合并为单个 GLB：

- `Keyboard.glb`：机身、定位板、PCB 等固定结构。
- `keycaps.glb`：KSA 键帽源几何体。
- `switch.glb`：Gateron Double-Rail Magnetic Nebula Switch 源模型。
- `common.glb`：公共场景部件。
- `keyboardData.json`：84 个键位的位置、方向和选项数据。
- 外部贴图、环境图与 Draco 解码文件。

`KeyboardAssembler` 负责读取配置并生成首页场景。键帽共享不可变几何体和纹理，但每个键帽拥有独立材质实例、基础变换与动画状态，保证一个按键不会改变其他键帽。轴体在首页采用实例化渲染：源模型的各个组件按 84 个键位复用，以降低绘制任务。后续轴体详情场景可以单独加载一个非实例化轴体并拆分其零件。

## 7. 组件边界

- `HomePage`：组合页面内容和键盘舞台，不持有逐键状态。
- `KeyboardHero`：首页键盘区域的 React 边界，展示加载或错误状态。
- `KeyboardCanvas`：创建 R3F Canvas、相机和场景环境。
- `KeyboardScene`：加载资源，组合灯光、阴影、机身和键盘装配器。
- `KeyboardAssembler`：将原始配置转换成 84 个可交互键帽及轴体实例。
- `KeyRegistry`：维护 `KeyboardEvent.code` 到键帽对象的映射。
- `usePhysicalKeyboard`：绑定和清理 `keydown`、`keyup`、`blur` 与可见性事件。
- `keyboardKeyMap`：显式定义浏览器物理键码与模型键位的关系。

## 8. 按键数据流

```text
keydown / keyup
  → keyboardKeyMap
  → KeyRegistry
  → 对应键帽的目标按压状态
  → useFrame 插值更新位置和发光
```

行为规则：

- 使用 `KeyboardEvent.code`，避免受输入法、大小写和键盘字符布局影响。
- `keydown` 设置按下目标；`keyup` 设置释放目标。
- 忽略 `event.repeat`，避免长按不断重启动画。
- 快速按下并松开时保留释放意图，不让键帽停在中间状态。
- 窗口失焦、页面隐藏或组件卸载时释放全部按键。
- 焦点位于 `input`、`textarea` 或 `contenteditable` 时不触发三维按键。
- `Fn`、电源键及被操作系统截获的组合键不承诺网页联动。

按键动画不进入 React 状态。每个键帽保存当前位置、目标位置和发光强度，由 `useFrame` 平滑插值，支持快速连按和多键同时按下。

## 9. 镜头与鼠标交互

- 鼠标移动产生轻微视差。
- 按住拖动可在受限俯仰角与偏航角内观察键盘。
- 滚轮缩放保持在安全范围，防止模型裁切或离开画面。
- 双击恢复默认镜头。
- 不提供自由平移，不允许翻转到键盘背面。

## 10. 加载、错误与降级

- 模型加载期间展示与暗色舞台一致的加载状态，不显示空白 Canvas。
- GLB、JSON、贴图或 Draco 加载失败时保留首页文字，显示三维场景加载失败和重试入口。
- WebGL 不可用时显示静态键盘预览和明确说明。
- 组件卸载时清理事件监听器；共享资源随 Canvas 生命周期释放。
- 首版不实现自动画质分级，只有在 PC 实测数据表明需要时再增加。

## 11. 测试与验收

使用最小必要的测试工具验证纯逻辑和浏览器行为：

- 键位映射覆盖配置中的 84 个键位，不存在重复或遗漏。
- `keydown`、`keyup`、快速连按与多键同时按下正确改变单个键帽状态。
- 重复 `keydown` 被忽略。
- 窗口失焦和页面隐藏释放全部键帽。
- 编辑区域获得焦点时不触发三维键盘。
- 一个键帽响应时，其他键帽的变换和发光保持不变。
- 模型加载失败和 WebGL 不可用时显示可用的降级页面。
- `npm test` 与 `npm run build` 通过。
- 在 1440×900 的 PC 浏览器检查布局、加载、按键反馈、组合键、拖动、缩放、复位、资源 404、页面溢出和控制台错误。

## 12. 参考边界与资源来源

- `E:\project\front\keysim` 只参考 `KeyboardEvent.code` 到单键状态的概念。它使用 React 16、CRA、Three.js 0.119、`node-sass` 和 Node 14 兼容链，不继承其工具链。
- `E:\project\front\nur-modkeys` 只参考场景分组、镜头控制和数据分层。首版不复制其实现代码。
- Keychron 模型资源来自 `https://jingfu.space/keyboard/?&keyboardid=K_2_HE` 在浏览器中公开加载的文件。项目内保留来源、下载日期和文件清单。

当前未取得模型再发布许可证。首版按本地个人原型处理；公开部署或商业使用前必须确认模型、贴图、商标和相关素材的授权。
