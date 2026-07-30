// 设置:右下角齿轮弹层(白卡纸 + 括号开关)
// 鼠标小红点(默认关)/ BGM(默认关);选择持久化到 localStorage
import gsap from 'gsap';

const store = {
  get() { try { return JSON.parse(localStorage.getItem('xy-settings')) || {}; } catch { return {}; } },
  set(s) { try { localStorage.setItem('xy-settings', JSON.stringify(s)); } catch { /* 隐私模式忽略 */ } },
};

export const settings = { redDot: true, bgm: true };

// BGM 单例:加载页预载同一个文件;苹果出现时 startBgm(被自动播放策略挡则顺延首次手势)
let bgm = null;
function getBgm() {
  if (!bgm) {
    bgm = new Audio('assets/bgm.mp3');
    bgm.loop = true;
    bgm.volume = 0;
    bgm.style.display = 'none';
    document.body.appendChild(bgm);
  }
  return bgm;
}
let bgmStarted = false;
let disarmGesture = null;
function fadeInBgm() {
  bgmStarted = true;
  disarmGesture?.();
  const a = getBgm();
  gsap.to(a, { volume: 0.35, duration: 1.2, ease: 'power1.out' });
}
function attemptBgm() {
  if (bgmStarted) return;
  const a = getBgm();
  const p = a.play();
  if (p) p.then(() => fadeInBgm()).catch(() => {});
}
// 挂一次性手势兜底:boot 时就挂(Safari 里 play() 的 promise 可能永远挂起,
// 不能等 catch 再挂);每次手势都重试,真正开播后自动卸下
function armGestureFallback() {
  if (disarmGesture) return;
  const kick = () => { if (settings.bgm && !bgmStarted) attemptBgm(); };
  document.addEventListener('pointerdown', kick);
  document.addEventListener('keydown', kick);
  disarmGesture = () => {
    document.removeEventListener('pointerdown', kick);
    document.removeEventListener('keydown', kick);
  };
}
// 苹果出现(main.js 在加载卡上拉时调用):开关为开 → 直接尝试起播;
// 同时确保手势兜底已挂上(被自动播放策略挡时,下一次手势即开播)
export function tryStartBgm() {
  if (!settings.bgm || bgmStarted) return;
  attemptBgm();
  armGestureFallback();
}

export function initSettings({ onRedDot } = {}) {
  const gear = document.getElementById('settings-gear');
  const pop = document.getElementById('settings-pop');
  if (!gear || !pop) return;
  Object.assign(settings, store.get());

  const rows = {};
  pop.querySelectorAll('.sp-row').forEach((r) => { rows[r.dataset.key] = r; });

  const paint = (key) => {
    const on = settings[key];
    const st = rows[key].querySelector('.sp-state');
    st.children[0].textContent = on ? '[' : '(';
    st.children[1].textContent = on ? 'ON' : 'OFF';
    st.children[2].textContent = on ? ']' : ')';
    rows[key].classList.toggle('on', on);
    rows[key].setAttribute('aria-pressed', String(on));
  };

  // BGM:加载页已预载;苹果出现时由 main.js 调 tryStartBgm 起播(被浏览器挡则下一次手势开播)
  const bgm = getBgm();
  const bgmCtl = (on) => {
    if (on) { armGestureFallback(); attemptBgm(); }
    else { bgmStarted = false; gsap.to(bgm, { volume: 0, duration: 0.5, onComplete: () => bgm.pause() }); }
  };
  const hooks = { redDot: onRedDot, bgm: bgmCtl };

  pop.addEventListener('click', (e) => {
    const row = e.target.closest('.sp-row');
    if (!row) return;
    const key = row.dataset.key;
    settings[key] = !settings[key];
    paint(key);
    store.set(settings);
    hooks[key]?.(settings[key]);
  });

  // 弹层开合:齿轮转 135° + 卡片从右下角弹开;点外部/Esc 收起
  const setOpen = (open) => {
    gear.setAttribute('aria-expanded', String(open));
    pop.setAttribute('aria-hidden', String(!open));
    gear.classList.toggle('open', open);
    pop.classList.toggle('open', open);
  };
  gear.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(gear.getAttribute('aria-expanded') !== 'true');
  });
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('#settings')) setOpen(false);
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });

  // 初始应用:红点按存储恢复(默认开);BGM 为开则在 boot 就挂好手势兜底——
  // 加载页期间的点击也算数,首次手势即开播,不用等苹果出现后再交互好几次
  paint('redDot');
  paint('bgm');
  onRedDot?.(settings.redDot);
  if (settings.bgm) armGestureFallback();
}
