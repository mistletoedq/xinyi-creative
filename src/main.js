// 入口:Lenis + ScrollTrigger;hero 段驱动缩放与点阵消散,about 段驱动苹果滑走,works 为自然文档流
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { PARAMS, REDUCED, IS_TOUCH, isPortrait, portraitHeroTransform, computeAppleMobile, remap, heroFit } from './params.js';
import { scene3d } from './scene3d.js';
import { dapplegl } from './dapplegl.js';
import { works } from './works.js';
import { detail } from './detail.js';
import { createGridlines } from './gridlines.js';
import { intro } from './intro.js';
import { preloader } from './preloader.js';
import { initCatSticker, initOutroStickers } from './sticker.js';
import { initSettings } from './settings.js';
import { ABOUT } from './content.js';

gsap.registerPlugin(ScrollTrigger);

let lenis, st, currentT = 0, currentU = 0;

// about 浮动文案:hero 段随放大同步升起(t),about 段随滑走退场(u)
// about 白卡的变换统一出口:滚动升降(updateAbout)与悬停倾斜共写一条 transform
const aboutTilt = { rx: 0, ry: 0 };
let aboutY = 105;
function applyAboutTransform() {
  const el = document.getElementById('about-float');
  if (el) el.style.transform = `perspective(800px) translateY(${aboutY}vh) rotateX(${aboutTilt.rx}deg) rotateY(${aboutTilt.ry}deg)`;
}

function updateAbout() {
  const el = document.getElementById('about-float');
  if (!el) return;
  const ein = smooth01(remap(currentT, PARAMS.about.inStart, 1));
  const eout = remap(currentU, PARAMS.about.outStart, 1);
  el.style.opacity = String(ein * (1 - eout));
  aboutY = (1 - ein) * 105 - eout * 40;
  applyAboutTransform();
}
const smooth01 = (x) => x * x * (3 - 2 * x);

function dispatch(t) {
  currentT = t;
  scene3d.update(t);
  updateHeroExit(t);
  updateAbout();
  document.getElementById('scroll-hint').style.opacity = t > 0.012 ? '0' : '';
}

// hero 文字退场:整组同速上行(无组内时差),并用与苹果相同的 smoothstep 曲线,与苹果严格同步
const HERO_EXIT_IDS = ['hi-its', 'hi-hexinyi', 'hi-portfolio', 'hi-s', 'hi-cat'];
let heroExitEls = null;
function updateHeroExit(t) {
  if (!heroExitEls) heroExitEls = HERO_EXIT_IDS.map((id) => document.getElementById(id)).filter(Boolean);
  const e = t * t * (3 - 2 * t);             // = scene3d 的 smooth(),文字与苹果同一节奏
  const y = (-e * 130).toFixed(2);
  for (const el of heroExitEls) el.style.transform = `translateY(${y}vh)`;
}

// Hero 元素布局:params → 内联样式(面板滑杆实时生效)
// 竖屏:不另设构图,把 1440×900 桌面构图按宽度适配整体缩小(portraitHeroTransform)
// 各 hero 元素墨迹在其画布上的左右边界占比(离线测量);ar 为个别元素的画布纵横比(默认 1557/1080)
const HERO_INK = {
  its: { l: 0.0873, r: 0.2415 },
  hexinyi: { l: 0.4046, r: 0.9017 },
  portfolio: { l: 0.0925, r: 0.5832 },
  s: { l: 0.8812, r: 0.9017 },
  cat: { l: 0.037, r: 0.963, ar: 1198 / 698 },   // 紧裁画布(贴纸换图后)
};
const HERO_CANVAS_AR = 1557 / 1080;

// 文字不越两边灰线:量出墨迹并集,超出时绕视口中心整体缩小(苹果在 scene3d 里同步 heroFit.s)
function computeHeroFit() {
  const layers = [document.getElementById('hero-layer'), document.getElementById('hero-under')].filter(Boolean);
  const W = innerWidth, c = W / 2, M = (W < 1024 ? 16 : 56) + 16;   // 余量含鼠标视差的最大幅度
  for (const l of layers) l.style.transform = '';  // 先摘掉旧缩放,量原始布局
  let minX = Infinity, maxX = -Infinity;
  for (const key of Object.keys(HERO_INK)) {
    const el = document.getElementById('hi-' + key);
    if (!el) continue;
    const b = el.getBoundingClientRect();
    if (!b.width || !b.height) continue;
    // img 是 object-fit: contain → 按其画布纵横比算实绘宽度与落点
    const ink = HERO_INK[key];
    const ar = ink.ar || HERO_CANVAS_AR;
    const dw = b.width / b.height > ar ? b.height * ar : b.width;
    const dx = b.left + (b.width - dw) / 2;
    minX = Math.min(minX, dx + ink.l * dw);
    maxX = Math.max(maxX, dx + ink.r * dw);
  }
  let s = 1;
  if (isFinite(minX)) {
    if (minX < c) s = Math.min(s, (c - M) / (c - minX));
    if (maxX > c) s = Math.min(s, (c - M) / (maxX - c));
  }
  heroFit.s = Math.min(1, s);
  if (heroFit.s < 1) {
    for (const l of layers) {
      l.style.transform = `scale(${heroFit.s})`;
      l.style.transformOrigin = '50% 50%';
    }
  }
}

function applyHeroLayout() {
  const H = PARAMS.hero;
  const { r, topPad } = isPortrait() ? portraitHeroTransform() : { r: 1, topPad: 0 };
  for (const key of Object.keys(H)) {
    const v = H[key];
    const el = document.getElementById('hi-' + key);
    if (!el) continue;
    el.style.left = v.left + '%';
    el.style.top = (topPad + v.top * r) + '%';
    el.style.width = v.width * v.scale + '%';
    el.style.height = v.height * v.scale * r + '%';
  }
  computeHeroFit();
}

function fillAbout() {
  document.getElementById('about-body').innerHTML =
    `<p class="hello">${ABOUT.greeting}</p>`
    + ABOUT.paragraphs.map((p) => `<p>${p}</p>`).join('')
    + `<div id="avatar-pop" aria-hidden="true"></div>`;
  applyAvatarParams();
  // 头像线稿 SVG:hover 时逐路径描绘出来
  fetch('assets/img/avatar.svg').then((r) => r.text()).then((svg) => {
    const pop = document.getElementById('avatar-pop');
    if (!pop) return;
    pop.innerHTML = svg;
    const svgEl = pop.querySelector('svg');
    svgEl.classList.add('avatar-svg');
    // 大形状先画;pathLength=1 归一化,配合 dasharray 做描绘
    const paths = [...pop.querySelectorAll('path')];
    paths.sort((a, b) => b.getTotalLength() - a.getTotalLength());
    paths.forEach((p, i) => {
      p.setAttribute('pathLength', '1');
      p.style.setProperty('--i', i);
    });
  }).catch(() => {});
}

// 头像个签位置参数 → 内联样式(竖屏改放通栏卡右上角)
function applyAvatarParams() {
  const el = document.getElementById('avatar-pop');
  if (!el) return;
  if (isPortrait()) {
    el.style.left = 'auto';
    el.style.right = '14px';
    el.style.top = '14px';
    el.style.width = '96px';
    return;
  }
  const A = PARAMS.avatar;
  el.style.left = 'auto';
  el.style.right = A.right + 'px';
  el.style.top = A.top + 'px';
  el.style.width = A.width + 'px';
  el.style.setProperty('--av-rot', A.rot + 'deg');
}

async function boot() {
  // 禁止浏览器恢复滚动位置(否则刷新/重开标签会停在中途:苹果巨大、文字已消散)
  history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  createGridlines();                            // haoqi 式排版网格
  if (PARAMS.dapple.enabled) dapplegl.init();
  fillAbout();
  // 触屏:点按 about 卡的 hello 行触发头像描绘(桌面是 hover)
  if (IS_TOUCH) {
    document.querySelector('#about-body .hello')?.addEventListener('click', () => {
      document.getElementById('about-body').classList.toggle('av-show');
    });
  }
  works.init((i) => detail.open(i));
  detail.init({
    get lenis() { return lenis; },
    onOpenChange() {},
  });

  document.getElementById('scrollzone').style.height = PARAMS.scroll.totalVh + 'vh';
  Object.assign(PARAMS.appleMobile, computeAppleMobile());
  applyHeroLayout();
  // 旋转/resize:重排 hero + 重算竖屏苹果参数(scene3d/gridlines 各自有 resize 监听)
  addEventListener('resize', () => {
    Object.assign(PARAMS.appleMobile, computeAppleMobile());
    applyHeroLayout();
    dispatch(currentT);
  });

  await scene3d.init(document.getElementById('gl'));

  lenis = new Lenis({
    smoothWheel: !REDUCED,
    lerp: REDUCED ? 1 : 0.11,
  });
  lenis.on('scroll', ScrollTrigger.update);
  // 兜底:浏览器若在 Lenis 初始化前恢复了滚动位置,强制回顶(直达 case 链接除外)
  if (!location.hash.startsWith('#/case/')) lenis.scrollTo(0, { immediate: true });
  // 左上角标:点击回 hero
  document.getElementById('brand').addEventListener('click', (e) => {
    e.preventDefault();
    if (detail.isOpen) { detail.close(); return; }
    lenis.scrollTo(0);
  });
  // 左下角装饰坐标:复刻 haoqi 格式(四位补零,定长)
  const coordsEl = document.getElementById('coords');
  const drawCoords = (x, y) => {
    coordsEl.textContent = `${String(Math.round(x)).padStart(4, '0')} X ${String(Math.round(y)).padStart(4, '0')} Y`;
  };
  drawCoords(0, 0);
  addEventListener('pointermove', (e) => drawCoords(e.clientX, e.clientY), { passive: true });

  // 鼠标视差:文字与背景作为刚性整体轻微漂移(单一驱动源、同帧写入,和滚动一样无时间差;
  // 用独立的 translate 属性,不与 heroFit 缩放 / 上行退场 / about 升起的 transform 冲突;
  // 入场动画期间不启用,播完才开始响应)
  let introDone = false;
  if (!REDUCED && !IS_TOUCH) {
    const PARA_T = ['hero-layer', 'hero-under', 'about-float', 'works']
      .map((id) => document.getElementById(id)).filter(Boolean);
    const proxy = { x: 0, y: 0 };
    const applyP = () => {
      const v = `${proxy.x.toFixed(2)}px ${proxy.y.toFixed(2)}px`;
      for (const el of PARA_T) el.style.translate = v;
    };
    const qx = gsap.quickTo(proxy, 'x', { duration: 1.1, ease: 'power2.out', onUpdate: applyP });
    const qy = gsap.quickTo(proxy, 'y', { duration: 1.1, ease: 'power2.out', onUpdate: applyP });
    addEventListener('pointermove', (e) => {
      if (!introDone) return;
      qx((e.clientX / innerWidth - 0.5) * 24);   // ±12px
      qy((e.clientY / innerHeight - 0.5) * 16);  // ±8px
    }, { passive: true });
  }

  // 鼠标跟随红点(internalities.eu 式:滞后跟随的小圆点,悬停可点元素轻轻放大)
  if (!IS_TOUCH) {
    const dot = document.createElement('div');
    dot.id = 'cursor-dot';
    document.body.appendChild(dot);
    gsap.set(dot, { xPercent: -50, yPercent: -50 });
    const ddx = gsap.quickTo(dot, 'x', { duration: 0.38, ease: 'power3.out' });
    const ddy = gsap.quickTo(dot, 'y', { duration: 0.38, ease: 'power3.out' });
    let dotShown = false;
    let dotOn = false;   // 红点默认关,齿轮设置里打开
    addEventListener('pointermove', (e) => {
      if (!dotOn) return;
      if (!dotShown) {
        dotShown = true;
        gsap.set(dot, { x: e.clientX, y: e.clientY });
        gsap.to(dot, { opacity: 1, duration: 0.25 });
      }
      ddx(e.clientX); ddy(e.clientY);
    }, { passive: true });
    const dotHover = (on) => gsap.to(dot, { scale: on ? 1.7 : 1, duration: 0.25, ease: 'power2.out' });
    addEventListener('pointerover', (e) => {
      if (e.target.closest('a, button, .card, .wm-bar')) dotHover(true);
    });
    addEventListener('pointerout', (e) => {
      if (e.target.closest('a, button, .card, .wm-bar')) dotHover(false);
    });
    document.addEventListener('pointerleave', () => gsap.to(dot, { opacity: 0, duration: 0.2 }));
    document.addEventListener('pointerenter', () => { if (dotOn && dotShown) gsap.to(dot, { opacity: 1, duration: 0.2 }); });
    // 设置齿轮:红点开关;BGM 开关在 settings.js 内自闭环
    initSettings({
      onRedDot: (on) => {
        dotOn = on;
        if (!on) { dotShown = false; gsap.to(dot, { opacity: 0, duration: 0.2 }); }
      },
    });
  }
  // 触屏没有小红点,但齿轮(BGM 开关)照常可用
  if (IS_TOUCH) initSettings();

  // about 白卡:悬停 3D 倾斜(TiltedCard 式:卡体随指针偏转,标题/正文分层浮起)
  // 卡未完全到位(淡入未完成)时旋转钉 0,到位后才平滑接入——消除半路"切换"的卡顿
  if (!REDUCED && !IS_TOUCH) {
    const card = document.getElementById('about-float');
    const qrx = gsap.quickTo(aboutTilt, 'rx', { duration: 0.6, ease: 'power2.out', onUpdate: applyAboutTransform });
    const qry = gsap.quickTo(aboutTilt, 'ry', { duration: 0.6, ease: 'power2.out', onUpdate: applyAboutTransform });
    addEventListener('pointermove', (e) => {
      const op = parseFloat(card.style.opacity || '0');
      if (op < 0.99) {
        if (aboutTilt.rx || aboutTilt.ry) { qrx(0); qry(0); }
        return;
      }
      const r = card.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const ox = Math.max(0, Math.abs(dx) - r.width / 2);
      const oy = Math.max(0, Math.abs(dy) - r.height / 2);
      const k = smooth01(1 - Math.min(1, Math.hypot(ox, oy) / 120));
      qrx(-(dy / (r.height / 2)) * 7 * k);
      qry((dx / (r.width / 2)) * 9 * k);
    }, { passive: true });
  }

  // 右上角 CONTACT:全屏联系名片(podium.global 式:遮罩淡入 + 名片 translateZ 纵深飞入),
  // 点遮罩/CLOSE/Esc 收起;打开期间锁滚动
  const contactBtn = document.getElementById('contact');
  const contactModal = document.getElementById('contact-modal');
  const contactClose = document.getElementById('contact-close');
  const cmCard = contactModal.querySelector('.cm-card');
  const cmItems = contactModal.querySelectorAll('.cm-title, .cm-item, .cm-cat, #contact-close');
  let contactOpen = false, contactAnim = null;

  const setContact = (open) => {
    if (open === contactOpen) return;
    contactOpen = open;
    contactBtn.setAttribute('aria-expanded', String(open));
    contactAnim?.kill();
    if (open) {
      contactModal.hidden = false;
      lenis?.stop();
      if (REDUCED) return;
      contactAnim = gsap.timeline()
        .fromTo(contactModal, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power1.out' }, 0)
        .fromTo(cmCard, { opacity: 0, z: -560, y: 24 },
                        { opacity: 1, z: 0, y: 0, duration: 0.62, ease: 'expo.out' }, 0.05)
        .fromTo(cmItems, { opacity: 0, y: 14 },
                         { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.05 }, 0.22);
    } else {
      const done = () => { contactModal.hidden = true; lenis?.start(); };
      if (REDUCED) { done(); return; }
      contactAnim = gsap.timeline({ onComplete: done })
        .to(cmCard, { opacity: 0, z: -320, y: 12, duration: 0.28, ease: 'power2.in' }, 0)
        .to(contactModal, { opacity: 0, duration: 0.22, ease: 'power1.in' }, 0.08);
    }
  };
  contactBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setContact(!contactOpen);
  });
  contactClose.addEventListener('click', () => setContact(false));
  contactModal.addEventListener('pointerdown', (e) => {
    if (e.target === contactModal || e.target === contactModal.querySelector('.cm-stage')) setContact(false);
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setContact(false); });

  // 顶部导航:WORK → 作品切片区;ABOUT → about 浮动文案完全展开处(hero 放大落点,currentT=1/currentU=0)
  const navScroll = (target) => {
    if (lenis) lenis.scrollTo(target);
    else if (typeof target === 'string') document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
    else scrollTo({ top: target, behavior: 'smooth' });
  };
  document.getElementById('nav-work').addEventListener('click', (e) => {
    e.preventDefault();
    navScroll('#works');
  });
  document.getElementById('nav-about').addEventListener('click', (e) => {
    e.preventDefault();
    navScroll(document.getElementById('scrollzone').offsetHeight - innerHeight);
  });
  // 竖屏/窄屏:右上导航收成汉堡菜单;点菜单项/点外部/Esc 收起
  const topnav = document.getElementById('topnav');
  const navToggle = document.getElementById('nav-toggle');
  navToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    navToggle.setAttribute('aria-expanded', String(topnav.classList.toggle('open')));
  });
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('#topnav')) topnav.classList.remove('open');
  });
  topnav.querySelectorAll('#nav-links a, #nav-links button').forEach((el) => {
    el.addEventListener('click', () => topnav.classList.remove('open'));
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') topnav.classList.remove('open'); });
  gsap.ticker.add((time, deltaMS) => {
    lenis.raf(time * 1000);
    scene3d.tick(deltaMS / 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // hero 段:漂浮 + 放大转视角 + 点阵消散(无吸附,自由顺滑滚动)
  st = ScrollTrigger.create({
    id: 'hero',
    trigger: '#scrollzone',
    start: 'top top',
    end: 'bottom bottom',
    scrub: PARAMS.scroll.scrub,
    onUpdate: (self) => dispatch(self.progress),
  });

  // about 段:随自然上滑,苹果向左下角滑走
  ScrollTrigger.create({
    id: 'away',
    trigger: '#about',
    start: 'top bottom',
    end: 'top top',
    scrub: PARAMS.scroll.scrub,
    onUpdate: (self) => {
      currentU = self.progress;
      scene3d.setAway(currentU);
      updateAbout();
    },
  });

  // 模型等动态内容就绪后必须 refresh(官方坑清单 #5)
  ScrollTrigger.refresh();
  dispatch(st.progress);

  // 测试钩子:__seek(0..1) 跳到 hero 叙事进度
  window.__seek = (t) => {
    const max = document.getElementById('scrollzone').offsetHeight - innerHeight;
    lenis.scrollTo(t * max, { immediate: true });
    ScrollTrigger.update();
  };
  window.__seekAbout = (u) => {
    const zoneH = document.getElementById('scrollzone').offsetHeight;
    lenis.scrollTo(zoneH - innerHeight + u * innerHeight, { immediate: true });
    ScrollTrigger.update();
  };
  window.__dbg = () => scene3d.debug();
  window.__px = () => scene3d.probePixels();
  window.__shot = (w = 640) => {
    scene3d.probePixels();
    const gl = document.getElementById('gl');
    const c = document.createElement('canvas');
    c.width = w; c.height = Math.round(gl.height * w / gl.width);
    const g = c.getContext('2d');
    g.fillStyle = '#FFFFFF';
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(gl, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.55).split(',')[1];
  };
  // 入场:先播加载动画(加载条 → 文字圈 → 模糊消散),再 hero 入场;播完/跳过才开放鼠标视差
  initCatSticker();   // 右下角小猫贴纸:折角 + 拖拽
  initOutroStickers();   // 结束页焦糖贴纸环
  preloader.play(lenis).then(() => { introDone = true; });

  // 直达 hash(刷新在详情页时)
  const m = location.hash.match(/#\/case\/(.+)/);
  if (m) {
    const { CASES } = await import('./content.js');
    const idx = CASES.findIndex((c) => c.slug === m[1]);
    if (idx >= 0) detail.open(idx);
  }
}

boot().catch((err) => {
  console.error('[boot]', err);
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:auto 12px 12px 12px;background:#FFE98A;padding:10px 14px;font:13px ui-monospace,monospace;z-index:9999';
  el.textContent = '加载失败:' + err.message;
  document.body.appendChild(el);
});
