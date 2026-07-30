// 全站可调参数(单一数据源;调试面板直接绑定本对象)
export const PARAMS = {
  scroll: {
    totalVh: 220,        // hero 滚动容器高度(t=1 即放大终点,之后 about 自然滑入)
    scrub: 1.0,          // scrub 惯性(秒)
  },
  seg: {
    floatFadeEnd: 0.08,  // 漂浮权重在 t∈[0,此值] 淡出
  },
  float: {
    ampY: 0.06,          // 世界单位(苹果直径 2)
    period: 4.4,         // 秒
    swayZ: 1.5,          // 度
    swayX: 1.0,          // 度
  },
  // Hero 元素布局(百分比定位,调试面板滑杆实时调;图片完整画布,contain 装入)
  hero: {
    its:       { left: -10.5, top: 4, width: 100, height: 101, scale: 1.13 },
    hexinyi:   { left: -0.5, top: 0, width: 100, height: 100, scale: 1.1 },
    portfolio: { left: -9, top: 2.5, width: 100, height: 100, scale: 1.1 },
    s:         { left: 0, top: 0, width: 100, height: 100, scale: 1.1 },
    cat:       { left: 64.9, top: 56.5, width: 25.4, height: 40, scale: 0.95 },
  },
  cam: {
    fov: 35,
    // CatmullRom 轨迹点(三点):正面静观 -> 中途 -> 四分之三俯视特写
    p0: { x: 0.15, y: 0.32, z: 8.4 },
    p1: { x: 0.85, y: 1.05, z: 4.6 },
    p2: { x: 1.32, y: 2.05, z: 2.02 },
    look0: { x: 0.85, y: -0.12, z: 0 },   // 起点视线偏移(把苹果放在画面左中)
    look2: { x: 0.35,  y: 0.98,  z: 0 },  // 终点视线偏移(蒂在左上三分点 0.33,0.25)
  },
  // 打光(亮一点、清透一点)
  light: {
    hemi: 2.3,           // 环境半球光
    key: 2.8,            // 左上主光
    fill: 0,             // 右后补光
  },
  apple: {
    rotYEnd: 0.1365,     // 段 B 苹果自转终点(弧度)
    startRotY: -2.184,   // 精选"正面"朝向
    tiltZ: -16,          // hero 常驻倾斜(度,蒂朝左上)
    tiltX: 5,            // hero 常驻前倾(度)
    xPct: -3.5,          // hero 苹果水平位置(视口宽 %,+右)
    yPct: 3.5,           // hero 苹果垂直位置(视口高 %,+上)
    scale: 0.9,          // hero 苹果大小倍率
  },
  // 竖屏苹果位置/大小(旋转参数共用;值由 computeAppleMobile() 按视口算出)
  appleMobile: {
    xPct: 21,
    yPct: 6,
    scale: 0.26,
  },
  // about 段:苹果向左下角滑走(u∈[0,1])
  away: {
    x: -2.4,             // 世界单位,-左
    y: -1.7,             // 世界单位,-下
    rot: 0.5,            // 附加倾倒(弧度)
    scale: 0.9,          // 滑走时缩小
    fadeStart: 0.75,     // 画布淡出起点(u)
  },
  // hover「你好」画出的头像个签(相对 #about-float 定位)
  avatar: {
    right: -22,          // px(贴卡片右缘探出,任何卡宽都贴合)
    top: 40,             // px
    width: 172,          // px
    rot: 0,              // 常驻倾斜(度)
  },
  // about 浮动文案:hero 段随放大同步升起,about 段随滑走退场
  about: {
    inStart: 0.32,       // t 达到此值后 about 开始上升
    outStart: 0.55,      // u 达到此值后 about 开始退场
  },
  // 苹果悬停:停止浮动 + 轻微放大
  appleHover: {
    ms: 500,             // 缓动时长
  },
  // haoqi 背景管线(默认关闭 = 素色纸底;面板可开启测试)
  dapple: {
    enabled: false,
    resScale: 0.3,       // 背景管线渲染分辨率(haoqi 原值)
    bokeh: 0.754,        // bokeh 柔焦强度(haoqi 原值;uAmount=3.125×此值)
    chroma: 1.0,         // 光谱彩虹边强度(0=关闭)
  },
  // 苹果复古磨砂滤镜(后处理,只作用于画布)——默认关闭
  filter: {
    enabled: false,
    grain: 0.09,         // 胶片颗粒强度
    desat: 0.22,         // 去饱和
    lift: 0.05,          // 抬黑(磨砂柔化对比)
  },
  gallery: {
    liftY: -24, liftRot: -2.5, liftScale: 1.06, liftMs: 350,
    overlapVw: 3.2,      // 卡片负 margin 重叠量
    noteDelay: 120,      // 小便签落下延迟 ms
  },
  // 相框插画(hover 切片时浮现的大相框)——每片独立一套参数
  caseArt: [
    { scale: 0.92, xOff: -1.96, yOff: 1.3, rot: 0.65 },   // 0 Kimi 联名卡
    { scale: 0.92, xOff: -3.26, yOff: -1.3, rot: -0.5 },  // 1 焦糖 IP
    { scale: 0.9, xOff: -1.3, yOff: 2.61, rot: -0.5 },    // 2 Vibe Coding
    { scale: 0.92, xOff: 0, yOff: 0, rot: 0.98 },         // 3 本站
    { scale: 0.9, xOff: -0.65, yOff: 0, rot: -0.5 },      // 4 广州日报
    { scale: 0.9, xOff: 0, yOff: 0, rot: -0.5 },          // 5 科荔软件
  ],
  // 详情窗口(液态玻璃,可多开/拖动/缩放)
  detail: {
    ms: 340,             // 开窗/关窗动画时长
    winW: 540,           // 默认宽(px)
    winH: 620,           // 默认高(px)
    blur: 28,            // 玻璃 backdrop 模糊(px)
    radius: 14,          // 圆角(px)
  },
  // 入场动画(学 yokanka:模糊苹果 → 手绘元素节奏弹出 → 苹果对焦 → UI 淡入)
  intro: {
    enabled: true,
    appleBlur: 14,       // 苹果初始模糊(px)
    appleFade: 0.6,      // 苹果淡入时长(s)
    riseDelay: 0.55,     // 卡片上拉多久后苹果开始从底端被拉上来(s)
    riseDur: 1.05,       // 苹果上升时长(s,停稳后文字才开始播)
    itemBlur: 8,         // 手绘元素初始模糊(px)
    itemDur: 0.7,        // 每个元素显现时长(s,大于间隔 → 互相重叠成流动)
    itemGap: 0.5,        // 元素间隔(s)
    startDelay: 0.4,     // 首个元素延迟(s)
    unblurAtItem: 1,     // 第几个元素出现时苹果开始对焦(0=its 1=hexinyi 2=ś 3=portfolio 4=猫);猫出现时刚好清晰
    uiDelay: 0.3,        // 猫落位后到 UI 淡入的停顿(s)
    uiFade: 0.5,         // UI 淡入时长(s)
    scrambleDur: 0.9,    // 四角文字 TextScramble 解码总时长(s)
    scrambleSpeed: 0.045,// 解码每步间隔(s,越小乱序滚动越密)
    scrambleGap: 0.12,   // 各文字元素解码的错落间隔(s)
    skipFade: 0.7,       // 点击跳过时,剩余内容一起缓入的时长(s)
  },
  colors: ['#D2263C', '#E8C93F', '#3B6FD4', '#F0716A', '#FFE98A', '#2E5AAC'],
};

export const remap = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
export const lerp = (a, b, f) => a + (b - a) * f;
// hero 手绘层整体缩放系数(main.js computeHeroFit 写入,scene3d 苹果同步)
export const heroFit = { s: 1 };

export const IS_MOBILE = matchMedia('(max-width: 760px)').matches
  || (navigator.hardwareConcurrency || 8) <= 4;
export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const IS_TOUCH = matchMedia('(hover: none)').matches;
// 竖屏判定(布局切换用,运行时每次读取,支持旋转/resize)
export const isPortrait = () => innerWidth < innerHeight;

// 竖屏 hero 变换:把 1440×900 的桌面构图按宽度适配整体缩小,垂直居中偏上
// s = 水平缩放;r = 缩放后构图带占视口高的比例;topPad = 带上边距(视口高 %)
export const portraitHeroTransform = () => {
  const s = innerWidth / 1440;
  const r = (900 * s) / innerHeight;
  return { s, r, topPad: (1 - r) * 42 };
};

// 竖屏苹果参数:桌面苹果屏幕位置(36.5%, 44.2%)映射进缩放带(每次 resize 重算)
export function computeAppleMobile() {
  const { s, r, topPad } = portraitHeroTransform();
  const wH = 2 * 8.45 * Math.tan((PARAMS.cam.fov / 2) * Math.PI / 180);
  const aspect = innerWidth / innerHeight;
  const xFrac = 0.365, yFrac = topPad / 100 + 0.442 * r;
  return {
    xPct: ((xFrac - 0.5) + PARAMS.cam.look0.x / (wH * aspect)) * 100,
    yPct: ((0.5 - yFrac) + PARAMS.cam.look0.y / wH) * 100,
    scale: PARAMS.apple.scale * r,
  };
}

