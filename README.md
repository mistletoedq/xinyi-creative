# XINYI.CREATIVE

何欣颐的个人作品集网站 —— 一颗 3D 苹果作为叙事主角的滚动叙事单页站。

线上地址:**https://mistletoedq.github.io/xinyi-creative/**

## 这是什么

一个纯静态的个人作品集。整站围绕一颗 3D 苹果展开:随着滚动,苹果放大、转动、改变视角,最终像立体饼图一样裂成六个楔形切片,每一片通向一个作品案例。

- **首页(Hero)**:手绘标题 + 3D 苹果 + 可拖拽的小猫贴纸
- **About**:浮动自我介绍卡
- **Works**:六片苹果切片画廊,悬停出便签和大相框,点击打开 mac 式液态玻璃小窗(可多开、拖动、缩放)
- **结束页**:Inter 大写标题 + 七张焦糖贴纸环绕(StickerPeel 式剥角、拖拽、惯性)
- **细节**:定制卡通手套光标(手指/手掌/拳头)、加载页描边猫与文字圈、haoqi 式排版网格线、移动端汉堡菜单与全屏抽屉小窗

## 技术栈

无构建、无框架,原生 HTML/CSS/JS(ES Modules):

- [Three.js](https://threejs.org) — 3D 苹果渲染(Draco 压缩 GLB,移动端降级模型)
- [GSAP](https://gsap.com) + ScrollTrigger + Draggable + InertiaPlugin — 滚动编排与拖拽
- [Lenis](https://lenis.darkroom.engineering) — 平滑滚动
- 字体:TikTok Sans(可变)、Inter(可变,结束页)
- 第三方库全部走 CDN(unpkg),无需安装

## 目录结构

```
├── index.html          # 页面结构 + 加载动画内联样式
├── style.css           # 全站样式
├── server.mjs          # 本地开发服务器(支持 Range,Safari 播视频需要)
├── src/
│   ├── main.js         # 入口:Lenis + ScrollTrigger + 各模块接线
│   ├── scene3d.js      # Three.js 场景:苹果加载/滚动姿态/拖拽旋转
│   ├── preloader.js    # 加载页动画编排
│   ├── intro.js        # 入场动画
│   ├── works.js        # 切片画廊:便签布局/大相框/触屏点按
│   ├── detail.js       # 液态玻璃小窗管理(多开/拖拽/缩放/限位)
│   ├── sticker.js      # 猫贴纸与结束页贴纸(StickerPeel 移植)
│   ├── content.js      # 文案:ABOUT 与六个案例(配图/视频/链接都在这改)
│   ├── params.js       # 参数与设备判断
│   └── gridlines.js    # haoqi 式排版网格
└── assets/             # 字体、图片、视频、GLB 模型、贴纸
```

## 本地开发

```bash
node server.mjs 8130
# 打开 http://localhost:8130/
```

任何静态服务器都可以,但 `server.mjs` 支持 HTTP Range 请求(Safari 播放 mp4 需要 206 分段响应)。

## 部署

推送到 `main` 分支即可,GitHub Pages(根目录)约一分钟自动更新。

## 内容维护

- 改自我介绍 / 案例文案:`src/content.js`
- 案例配图、视频、报道链接:`src/content.js` 里 sections 支持 `img` / `imgs` / `video` / `links` 四种类型,资源放 `assets/case-media/`
- 结束页贴纸位置:`src/sticker.js` 里的 `OUTRO_STICKERS` 数组
- 光标图重新生成:`make_cursors.py`(在仓库外,需手动跑)

---

Made with Vibe Coding — 概念、文案、交互判断来自人,结构与实现来自人机结对。
