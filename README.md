# Prince Blog

Prince Blog 的首页是一块单一暗色调的 Keychron K2 HE 交互式键盘舞台：真实的本地模型在可用 WebGL 环境中渲染，实体键盘输入会驱动对应键帽；无法创建 WebGL 上下文或资源加载失败时会显示可读的静态降级状态。

## 运行环境

- Node.js：`>=22.12.0`
- React：固定为 `19.2.8`
- 包管理：npm

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

运行自动测试：

```bash
npm test
```

构建生产包：

```bash
npm run build
```

本地检查构建结果：

```bash
npm run preview
```

## 首页交互

首页监听实体键盘的 `code` 值；常见键包括 `KeyA`、`Space`、`Enter`、`ShiftLeft`、方向键，以及组合键中的每一个实际按键。窗口失焦或页面隐藏时会释放所有按下状态。可在画布内拖动改变观察角度、滚轮缩放、双击复位。

## 模型来源与使用边界

键盘模型、键帽、轴体、纹理和 Draco 解码器存放在 `public/models/keychron-k2-he/`，以浏览器路径 `/models/keychron-k2-he/` 提供。资源的来源页、下载日期、文件角色与再发布边界记录在 [public/models/keychron-k2-he/README.md](public/models/keychron-k2-he/README.md)。

这些资源仅用于本地个人原型；其公开再发布许可证未知。在取得原作者授权前，请勿将资源作为公开发布、再分发或商业素材使用。

## 当前范围

本轮首页定位为 PC-only 单一暗色舞台，不提供移动端适配或键盘配置器。生产构建会给出场景包超过 500 kB 的 Vite 分包建议；这是当前已知的构建警告，不会阻止构建。
