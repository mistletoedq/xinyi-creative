// 设置:右下角齿轮弹层(白卡纸 + 括号开关)
// 鼠标小红点(默认关)/ BGM(默认关);选择持久化到 localStorage
import gsap from 'gsap';

const store = {
  get() { try { return JSON.parse(localStorage.getItem('xy-settings')) || {}; } catch { return {}; } },
  set(s) { try { localStorage.setItem('xy-settings', JSON.stringify(s)); } catch { /* 隐私模式忽略 */ } },
};

export const settings = { redDot: false, bgm: false };

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

  // BGM:淡入淡出(开=用户手势,满足自动播放策略)
  const bgm = new Audio('assets/bgm.mp3');
  bgm.loop = true;
  bgm.volume = 0;
  bgm.style.display = 'none';
  document.body.appendChild(bgm);
  const bgmCtl = (on) => {
    if (on) {
      bgm.play().then(() => gsap.to(bgm, { volume: 0.35, duration: 1.2, ease: 'power1.out' })).catch(() => {});
    } else {
      gsap.to(bgm, { volume: 0, duration: 0.5, onComplete: () => bgm.pause() });
    }
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

  // 初始应用:红点按存储恢复(默认关);BGM 若存的是开,等首次手势再播(自动播放限制)
  paint('redDot');
  paint('bgm');
  onRedDot?.(settings.redDot);
  if (settings.bgm) {
    const kick = () => { bgmCtl(true); document.removeEventListener('pointerdown', kick); };
    document.addEventListener('pointerdown', kick);
  }
}
