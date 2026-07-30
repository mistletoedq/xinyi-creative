// 首页右下角小猫贴纸(StickerPeel 移植):
// 悬停/按压折角露灰背(CSS 驱动),可拖拽——惯性、甩动微旋转、松手回正;点光源跟随指针
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';

// 手套光标(Draggable 在 pointerdown 时 preventDefault,:active 被抑制,拳头只能由 JS 切换)
const CURSOR_FIST = 'url("assets/img/cursor-hand-fist.png") 16 13, grabbing';

export function initCatSticker() {
  const el = document.getElementById('cat-sticker');
  if (!el) return;
  gsap.registerPlugin(Draggable);

  Draggable.create(el, {
    type: 'x,y',
    bounds: document.body,
    inertia: true,
    onPress() { el.style.cursor = CURSOR_FIST; },
    onRelease() { el.style.cursor = ''; },
    onDrag() {
      const rot = gsap.utils.clamp(-24, 24, this.deltaX * 0.4);
      gsap.to(el, { rotation: rot, duration: 0.15, ease: 'power1.out' });
    },
    onDragEnd() {
      gsap.to(el, { rotation: 0, duration: 0.8, ease: 'power2.out' });
    },
  });
  // 兜底:全局 pointerup/pointercancel 也恢复张手(窗口外松手、指针捕获丢失时 onRelease 可能不到)
  const relax = () => { el.style.cursor = ''; };
  addEventListener('pointerup', relax);
  addEventListener('pointercancel', relax);

  // 点光源跟随
  const l1 = document.getElementById('catLight');
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    l1?.setAttribute('x', e.clientX - r.left);
    l1?.setAttribute('y', e.clientY - r.top);
  }, { passive: true });
}

// ---- 结束页贴纸(StickerPeel 全效移植:折角剥开露灰背 + 点光源 + 拖拽惯性) ----
// 不成环:左右边列中点各两张,顶中两张、底中一张;第 5 张起小屏隐藏
// [gif 序号, 偏移%, top%, 初始旋转°, 靠左 l / 靠右 r]
const OUTRO_STICKERS = [
  [5, 2, 14, -7, 'l'],
  [3, 5, 70, 5, 'l'],
  [8, 4, 16, 6, 'r'],
  [10, 2, 72, 8, 'r'],
  [12, 44, 7, 4, 'l'],
  [6, 46, 76, -4, 'l'],
];

export function initOutroStickers() {
  const host = document.getElementById('outro-sticks');
  if (!host) return;
  gsap.registerPlugin(Draggable);
  const light = document.getElementById('stkLightPt');
  const lightF = document.getElementById('stkLightPtF');

  for (const [i, [n, x, y, r, side]] of OUTRO_STICKERS.entries()) {
    const el = document.createElement('div');
    el.className = i >= 4 ? 'stk stk-extra' : 'stk';   // extra:小屏隐藏
    el.style[side === 'r' ? 'right' : 'left'] = x + '%';
    el.style.top = y + '%';
    el.innerHTML = `<div class="stk-inner">
      <div class="stk-main"><div class="stk-light"><img src="assets/img/stickers/${n}.gif" alt="焦糖贴纸 ${n}" draggable="false"></div></div>
      <div class="stk-flap"><div class="stk-flap-light"><img src="assets/img/stickers/${n}.gif" alt="" draggable="false"></div></div>
    </div>`;
    host.appendChild(el);
    gsap.set(el, { rotation: r });

    Draggable.create(el, {
      type: 'x,y',
      inertia: true,
      onPress() { el.style.cursor = CURSOR_FIST; el.style.zIndex = 30; },
      onRelease() { el.style.cursor = ''; el.style.zIndex = ''; },
      onDrag() {
        const rot = gsap.utils.clamp(-24, 24, this.deltaX * 0.4);
        gsap.to(el, { rotation: r + rot, duration: 0.15, ease: 'power1.out' });
      },
      onDragEnd() {
        gsap.to(el, { rotation: r, duration: 0.8, ease: 'power2.out' });
      },
    });
    // 兜底:全局 pointerup/pointercancel 也恢复张手
    const relax = () => { el.style.cursor = ''; el.style.zIndex = ''; };
    addEventListener('pointerup', relax);
    addEventListener('pointercancel', relax);

    // 点光源跟随(共享滤镜——指针同一时刻只在一张贴上;灰背光源按镜像坐标)
    el.addEventListener('pointermove', (e) => {
      const rect = el.getBoundingClientRect();
      const lx = e.clientX - rect.left, ly = e.clientY - rect.top;
      light?.setAttribute('x', lx); light?.setAttribute('y', ly);
      lightF?.setAttribute('x', lx); lightF?.setAttribute('y', rect.height - ly);
    }, { passive: true });

    // 触屏折角(hover 不可用,改用 touch-active 类驱动)
    const inner = el.firstElementChild;
    el.addEventListener('touchstart', () => inner.classList.add('touch-active'), { passive: true });
    el.addEventListener('touchend', () => inner.classList.remove('touch-active'));
    el.addEventListener('touchcancel', () => inner.classList.remove('touch-active'));
  }
}
