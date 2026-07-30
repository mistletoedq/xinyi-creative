// 加载动画编排:加载条收尾到 100 → 文字圈弹出并弹性转满一圈 → 模糊蒙版消散,
// 同时 hero 以同样的模糊→清晰入场(intro.play);完成后 resolve(开放视差等)
import gsap from 'gsap';
import { intro } from './intro.js';

const RING_TEXT = 'XINYI.CREATIVE · LOADING · ';

// CircularText 的 vanilla 移植:字母沿圆周排布,容器旋转即文字圈
function buildRing(host) {
  const chars = [...RING_TEXT];
  const step = 360 / chars.length;
  chars.forEach((ch, i) => {
    const s = document.createElement('span');
    s.textContent = ch === ' ' ? ' ' : ch;
    s.style.transform = `rotate(${i * step}deg) translateY(calc(min(210px, 34vw) * -1))`;
    host.appendChild(s);
  });
}

export const preloader = {
  play(lenis) {
    const el = document.getElementById('preloader');
    if (!el) return intro.play(lenis);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.remove();
      return intro.play(lenis);
    }
    buildRing(document.getElementById('pl-ring'));
    const barI = document.getElementById('pl-bar-i');
    const pct = document.getElementById('pl-pct');
    const creep = (window.__pl = window.__pl || { v: 0 });
    const paint = () => {
      barI.style.transform = `scaleX(${creep.v / 100})`;
      pct.textContent = Math.round(creep.v);
    };
    return new Promise((resolve) => {
      const tl = gsap.timeline();
      // 1. 加载条收尾到 100(停掉内联缓爬)
      tl.call(() => { window.__plStop = true; });
      tl.to(creep, { v: 100, duration: 0.4, ease: 'power1.in', onUpdate: paint });
      // 2. 文字圈弹出:弹性放大 + 有弹性地转满一圈
      tl.fromTo('#pl-ring',
        { scale: 0.55, opacity: 0, rotation: 0 },
        { scale: 1, opacity: 1, rotation: 360, duration: 1.5, ease: 'elastic.out(1, 0.62)' }, '-=0.05');
      tl.to({}, { duration: 0.25 });
      // 3. 卡纸上拉揭示:加载层整体被拉上去,露出盖着白蒙版的首页;同时 hero 开始蒙版对焦
      tl.call(() => { intro.play(lenis).then(resolve); });
      tl.to(el, { yPercent: -100, duration: 0.85, ease: 'power3.inOut' }, '<');
      tl.call(() => el.remove(), null, '+=0.9');
    });
  },
};
