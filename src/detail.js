// 液态玻璃窗口管理:切片点击开一扇 mac 式小窗,可多开/拖动/缩放/叉掉
import { PARAMS, REDUCED } from './params.js';
import { CASES } from './content.js';

let hooks = null;
let zTop = 100, spawnCount = 0;
const openWins = new Map();   // caseIdx -> element

const $ = (s) => document.querySelector(s);

function populateHTML(i) {
  const c = CASES[i];
  let html = `
    <div class="kicker">${[c.category, c.year, c.date].filter(Boolean).join(' · ')}</div>
    <h1>${c.title}</h1>
    <div class="sub">${c.en}</div>`;
  const fig = (inner, cap) =>
    `<figure class="wm-media">${inner}${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
  for (const s of c.sections) {
    if (s.h) html += `<h2>${s.h}</h2>`;
    if (s.p) html += `<p>${s.p}</p>`;
    if (s.img) html += fig(`<img src="${s.img}" alt="${s.cap || ''}" loading="lazy">`, s.cap);
    if (s.imgs) html += fig(
      `<div class="wm-grid">${s.imgs.map((u) => `<img src="${u}" alt="${s.cap || ''}" loading="lazy">`).join('')}</div>`, s.cap);
    if (s.video) html += fig(
      `<video src="${s.video}" muted autoplay loop playsinline preload="metadata"></video>`, s.cap);
    if (s.links) {
      html += `<div class="wm-links">`
        + s.links.map((l) => `<a href="${l.url}" target="_blank" rel="noopener"><span class="wl-label">${l.label}</span><span class="wl-arrow">↗</span></a>`).join('')
        + (s.cap ? `<div class="wl-src">${s.cap}</div>` : '') + `</div>`;
    }
  }
  if (c.wip) html += `<div class="wip">Work in progress — this page is not finished yet.</div>`;
  return html;
}

function bringFront(el) {
  el.style.zIndex = ++zTop;
}

// 窗口顶边永远压在 brand 栏之下:实时量取 #brand 底边(桌面 28px/窄屏 16px 两档自适应),留 8px 间隙
function minTop() {
  const brand = document.getElementById('brand');
  return (brand ? brand.getBoundingClientRect().bottom : 0) + 8;
}

function clampTop(top) {
  return Math.min(innerHeight - 60, Math.max(minTop(), top));
}

function topWindow() {
  let top = null, z = -1;
  for (const el of openWins.values()) {
    const zz = +el.style.zIndex;
    if (zz > z) { z = zz; top = el; }
  }
  return top;
}

function closeWin(i) {
  const el = openWins.get(i);
  if (!el) return;
  openWins.delete(i);
  if (REDUCED) { el.remove(); afterChange(); return; }
  el.animate(
    [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(16px) scale(.97)' }],
    { duration: Math.round(PARAMS.detail.ms * 0.65), easing: 'ease-in' },
  ).onfinish = () => { el.remove(); afterChange(); };
}

function afterChange() {
  if (openWins.size === 0) {
    history.replaceState(null, '', location.pathname + location.search);
    hooks.onOpenChange?.(false);
  }
}

function makeWindow(i) {
  const c = CASES[i];
  const D = PARAMS.detail;
  const el = document.createElement('div');
  el.className = 'wm-window';
  el.style.setProperty('--case-color', c.color);
  el.style.setProperty('--wm-blur', D.blur + 'px');
  el.style.setProperty('--wm-radius', D.radius + 'px');
  const n = spawnCount++;
  // 手机(<700px):全宽抽屉——左右 8px、顶边压 brand 栏、高撑到屏底;
  // 桌面:保持原来的 calc 定位,顶边统一过 clampTop,不压 brand 栏
  if (innerWidth < 700) {
    const top = minTop();
    el.dataset.sheet = '1';
    el.style.left = '8px';
    el.style.right = '8px';
    el.style.width = 'auto';
    el.style.top = `${top}px`;
    el.style.height = `${innerHeight - top - 8}px`;
  } else {
    el.style.left = `calc(50% - ${Math.round(D.winW / 2)}px + ${((n % 5) - 2) * 48}px)`;
    el.style.top = `${clampTop(innerHeight * (10 + (n % 5) * 4) / 100)}px`;
    el.style.width = `min(${D.winW}px, 86vw)`;
    el.style.height = `min(${D.winH}px, 74vh)`;
  }
  el.style.zIndex = ++zTop;
  el.innerHTML = `
    <div class="wm-bar">
      <button class="wm-close" aria-label="关闭">✕</button>
      <span class="wm-title">${c.title}</span>
      <span class="wm-dot" style="background:${c.color}"></span>
    </div>
    <div class="wm-body" data-lenis-prevent>${populateHTML(i)}</div>
    <div class="wm-grip" aria-hidden="true"></div>`;

  // 标题栏拖动(抽屉模式下禁用,按事件时状态判断,旋屏无缝切换)
  el.querySelector('.wm-bar').addEventListener('pointerdown', (e) => {
    if (e.target.closest('.wm-close') || el.dataset.sheet) return;
    bringFront(el);
    el.setPointerCapture(e.pointerId);
    const ox = el.offsetLeft - e.clientX, oy = el.offsetTop - e.clientY;
    const move = (ev) => {
      el.style.left = Math.min(innerWidth - 80, Math.max(-el.offsetWidth + 120, ox + ev.clientX)) + 'px';
      el.style.top = clampTop(oy + ev.clientY) + 'px';
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  });
  // 右下角缩放(抽屉模式下禁用)
  el.querySelector('.wm-grip').addEventListener('pointerdown', (e) => {
    if (el.dataset.sheet) return;
    e.stopPropagation();
    bringFront(el);
    el.querySelector('.wm-grip').setPointerCapture(e.pointerId);
    const ow = el.offsetWidth - e.clientX, oh = el.offsetHeight - e.clientY;
    const grip = el.querySelector('.wm-grip');
    const move = (ev) => {
      el.style.width = Math.max(320, Math.min(innerWidth * 0.94, ow + ev.clientX)) + 'px';
      el.style.height = Math.max(220, Math.min(innerHeight * 0.9, oh + ev.clientY)) + 'px';
    };
    const up = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
  });
  el.querySelector('.wm-close').addEventListener('click', () => closeWin(i));
  el.addEventListener('pointerdown', () => bringFront(el));

  if (!REDUCED) {
    el.animate(
      [{ opacity: 0, transform: 'translateY(26px) scale(.95)' },
       { opacity: 1, transform: 'none' }],
      { duration: PARAMS.detail.ms, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
  }
  return el;
}

export const detail = {
  init(h) {
    hooks = h;
    // 视口变化(改高度/旋转)时,已打开的窗口实时收回到限位内;手机端套用/还原抽屉几何
    addEventListener('resize', () => {
      for (const el of openWins.values()) {
        if (innerWidth < 700) {
          const top = minTop();
          el.dataset.sheet = '1';
          Object.assign(el.style, {
            left: '8px', right: '8px', width: 'auto',
            top: `${top}px`, height: `${innerHeight - top - 8}px`,
          });
        } else if (el.dataset.sheet) {
          const D = PARAMS.detail;
          delete el.dataset.sheet;
          Object.assign(el.style, {
            right: 'auto', width: `min(${D.winW}px, 86vw)`, height: `min(${D.winH}px, 74vh)`,
            top: `${clampTop(el.offsetTop)}px`,
          });
        } else {
          el.style.top = clampTop(el.offsetTop) + 'px';
        }
      }
    });
    addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const top = topWindow();
      if (top) {
        const i = [...openWins.entries()].find(([, el]) => el === top)?.[0];
        if (i !== undefined) closeWin(i);
      }
    });
  },

  get isOpen() { return openWins.size > 0; },
  get count() { return openWins.size; },

  async open(i) {
    if (openWins.has(i)) { bringFront(openWins.get(i)); return; }
    hooks.onOpenChange?.(true);
    const el = makeWindow(i);
    $('#windows').appendChild(el);
    openWins.set(i, el);
    location.hash = `/case/${CASES[i].slug}`;
  },

  // 关闭指定窗/全部窗(brand 用)
  async close(i) {
    if (i !== undefined) { closeWin(i); return; }
    for (const k of [...openWins.keys()]) closeWin(k);
  },

  closeAll() { this.close(); },
};
