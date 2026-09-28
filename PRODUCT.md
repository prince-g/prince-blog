# Prince Blog

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

Prince 的个人博客，以个人简介为首页，连接作品、记录和关于页面。

## Capabilities and Constraints

- React 19 / TypeScript / Vite；保留现有 npm 锁文件。
- 保留键盘开场、个人肖像首屏和既有 Header。
- 本次参考 HTML 的作品滚动展示接在个人简介下方、栏目入口之前。
- 移除参考中的 Noa Vale 人物简介、肖像和签名；参考作品仅为展示素材，不声称是 Prince 的作品。
- 卡片采用用户提供的 Flip Card React 源码；动画适配已有内部滚动容器。
- 桌面与触屏均可使用，尊重减少动态效果设置。

## Evidence on Hand

- `E:/download/noa-vale.html`：已提供的视觉、交互及媒体参考。
- `C:/Users/28645/Desktop/Flip Card.ts` 和 `Flip Card.css`：指定卡片组件。
- 既有 `src/features/portrait` 与 `public/media/portrait`：个人简介和人物素材。
