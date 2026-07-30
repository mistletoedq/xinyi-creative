// 入场动画(学 yokanka.com):模糊的苹果先立中央,手绘元素有节奏地弹出,
// 最后苹果对焦(移走模糊)、UI 淡入。每次刷新都播放;
// REDUCED 不播(index.html 内联脚本已判断);点击/按键加速跳过
import gsap from 'gsap';
import { PARAMS } from './params.js';
import { scrambleText } from './scramble.js';

const ITEMS = ['hi-its', 'hi-hexinyi', 'hi-s', 'hi-portfolio', 'hi-cat'];   // 读出 "It's HFXINYI's Portfolio" + 猫
// UI 元素及其 CSS 自然透明度(cleanup 后 clearProps 回落到 CSS,值一致无跳变)
// scramble:true 的四角/文字元素用 TextScramble 解码式导入,其余维持淡入
const UI = [
  { sel: '#brand', o: 1, scramble: true },
  { sel: '#nav-work', o: 1, scramble: true },
  { sel: '#nav-about', o: 1, scramble: true },
  { sel: '#contact', o: 1, scramble: true },
  { sel: '#coords', o: 0.55, scramble: true },
  { sel: '#scroll-hint', o: 0.45, scramble: true },
  { sel: '#gridlines', o: 1 },
];

const blockOpts = { passive: false };
const blockScroll = (e) => e.preventDefault();
const scrollKeys = new Set([' ', 'PageDown', 'PageUp', 'Home', 'End', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight']);
const blockKeys = (e) => { if (scrollKeys.has(e.key)) e.preventDefault(); };

export const intro = {
  get pending() {
    return document.documentElement.classList.contains('intro-pending');
  },

  // 播放(或立即结束);返回 Promise:播完/跳过/无需播放都会 resolve
  play(lenis) {
    if (!this.pending) return Promise.resolve();
    const html = document.documentElement;
    if (!PARAMS.intro.enabled) {
      html.classList.remove('intro-pending');
      return Promise.resolve();
    }
    const P = PARAMS.intro;
    const items = ITEMS.map((id) => document.getElementById(id)).filter(Boolean);
    const gl = document.getElementById('gl');

    // 锁滚动(Lenis + 原生 wheel/触摸/方向键)
    lenis?.stop();
    addEventListener('wheel', blockScroll, blockOpts);
    addEventListener('touchmove', blockScroll, blockOpts);
    addEventListener('keydown', blockKeys, true);

    // 初始态:苹果在页面底端之下待命(模糊),随卡片上拉被拉上来;手绘元素模糊待命
    const glFrom = `blur(${P.appleBlur}px)`;
    const glTo = 'blur(0px)';
    gsap.set(gl, { opacity: 1, y: '105vh', filter: glFrom, willChange: 'transform, filter' });
    gsap.set(items, { opacity: 0, filter: `blur(${P.itemBlur}px)`, willChange: 'filter, opacity' });

    let done;
    const finished = new Promise((r) => (done = r));
    const cleanup = () => {
      removeEventListener('wheel', blockScroll, blockOpts);
      removeEventListener('touchmove', blockScroll, blockOpts);
      removeEventListener('keydown', blockKeys, true);
      removeEventListener('pointerdown', skip);
      removeEventListener('keydown', skip);
      html.classList.remove('intro-pending');
      // 只清动画相关属性,保留 applyHeroLayout 写的 left/top/width/height
      gsap.set(items, { clearProps: 'opacity,filter,transform,willChange' });
      gsap.set(gl, { clearProps: 'opacity,filter,transform,willChange' });
      for (const { sel } of UI) {
        const el = document.querySelector(sel);
        if (el) gsap.set(el, { clearProps: 'opacity' });
      }
      lenis?.start();
      done();
    };

    const tl = gsap.timeline({ defaults: { ease: 'power2.out' }, onComplete: cleanup });

    // 卡片上拉后,苹果从页面底端被拉上来;停稳之前什么都不播
    tl.to(gl, { y: 0, duration: P.riseDur, ease: 'power3.out' }, P.riseDelay);
    // 停稳后:yokanka 式弹出:模糊+淡入,间隔小于时长,元素互相重叠成连续流动
    const itemsAt = P.riseDelay + P.riseDur + 0.15;
    items.forEach((el, i) => {
      tl.to(el, {
        opacity: 1, filter: 'blur(0px)',
        duration: P.itemDur,
        ease: 'power2.out',
      }, itemsAt + i * P.itemGap);
    });
    // 苹果对焦:hexinyi(默认)出现时开始,一条平滑曲线,猫出现的一刻刚好归 0
    // (power1.in 先慢后快,模糊撑到后段才化开)
    const unblurAt = itemsAt + Math.min(P.unblurAtItem, items.length - 1) * P.itemGap;
    const catAt = itemsAt + (items.length - 1) * P.itemGap;
    tl.to(gl, { filter: glTo, duration: Math.max(0.2, catAt - unblurAt), ease: 'power1.in' }, unblurAt);
    // UI 淡入:猫落位后;文字类元素淡入的同时跑 TextScramble 解码,逐个轻微错落
    const uiAt = catAt + P.itemDur + P.uiDelay;
    let scrambleIdx = 0;
    for (const { sel, o, scramble } of UI) {
      const el = document.querySelector(sel);
      if (!el) continue;
      tl.fromTo(el, { opacity: 0 }, { opacity: o, duration: P.uiFade }, uiAt);
      if (scramble) {
        const at = uiAt + scrambleIdx++ * P.scrambleGap;
        tl.call(() => scrambleText(el, { duration: P.scrambleDur, speed: P.scrambleSpeed }), null, at);
      }
    }

    // 点击/按键跳过:掐掉逐个弹出的编排,剩下的内容一起缓进显现
    let skipped = false;
    const skip = () => {
      if (skipped) return;
      skipped = true;
      tl.kill();
      const tlSkip = gsap.timeline({ defaults: { ease: 'power2.out' }, onComplete: cleanup });
      tlSkip.to(items, { opacity: 1, filter: 'blur(0px)', duration: P.skipFade }, 0);
      tlSkip.to(gl, { y: 0, opacity: 1, filter: glTo, duration: P.skipFade }, 0);
      for (const { sel, o } of UI) {
        const el = document.querySelector(sel);
        if (el) tlSkip.to(el, { opacity: o, duration: P.skipFade }, 0);
      }
    };
    addEventListener('pointerdown', skip);
    addEventListener('keydown', skip);

    return finished;
  },
};
