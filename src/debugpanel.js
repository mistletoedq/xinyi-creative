// 调试面板:按页面分组,右下角齿轮(或 D)打开时只显示当前页面的参数
import { PARAMS, writeParamsHash } from './params.js';
import { CASES } from './content.js';
import { works } from './works.js';

let pane = null, visible = false, curPage = 1;
const folders = [];   // { api, pages: [1|2|3], global }

function addFolder(p, title, pages, opts = {}) {
  const api = p.addFolder({ title, ...opts });
  folders.push({ api, pages });
  return api;
}

function applyPage(page) {
  curPage = page;
  for (const f of folders) {
    f.api.hidden = !(f.pages.length === 0 || f.pages.includes(page));
  }
}

export async function togglePanel(onChange, page = 1) {
  if (pane) {
    visible = !visible;
    const el = pane.element.parentElement;
    if (visible) el.style.removeProperty('display');
    else el.style.setProperty('display', 'none', 'important');
    if (visible) applyPage(page);
    return;
  }
  const { Pane } = await import('tweakpane');
  pane = new Pane({ title: 'XINYI · 调参', expanded: true });
  // 面板内的滚轮事件不要冒泡到 Lenis(否则调参时页面会触发吸附)
  pane.element.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
  visible = true;
  const fire = () => onChange?.();

  // —— 第 1 页:Hero ——
  const fHero = addFolder(pane, 'Hero 元素布局', [1]);
  for (const [key, label] of [
    ['its', "It's"], ['hexinyi', 'HFXINYI!'], ['portfolio', 'Portfolio'],
    ['s', 'ś'], ['cat', '猫'],
  ]) {
    const f = fHero.addFolder({ title: label, expanded: false });
    folders.push({ api: f, pages: [1] });   // tweakpane 子文件夹与父级平级渲染,需单独登记
    const o = PARAMS.hero[key];
    f.addBinding(o, 'left', { min: -30, max: 120, step: 0.5 }).on('change', fire);
    f.addBinding(o, 'top', { min: -30, max: 120, step: 0.5 }).on('change', fire);
    f.addBinding(o, 'width', { min: 5, max: 150, step: 0.5 }).on('change', fire);
    f.addBinding(o, 'height', { min: 5, max: 150, step: 0.5 }).on('change', fire);
    f.addBinding(o, 'scale', { min: 0.2, max: 2.5, step: 0.01 }).on('change', fire);
  }

  const fApple = addFolder(pane, '苹果位置大小', [1]);
  fApple.addBinding(PARAMS.apple, 'xPct', { min: -40, max: 40, step: 0.5 }).on('change', fire);
  fApple.addBinding(PARAMS.apple, 'yPct', { min: -40, max: 40, step: 0.5 }).on('change', fire);
  fApple.addBinding(PARAMS.apple, 'scale', { min: 0.4, max: 2, step: 0.01 }).on('change', fire);
  fApple.addBinding(PARAMS.apple, 'startRotY', { min: -6.28, max: 6.28, step: 0.01, label: '旋转角度' }).on('change', fire);

  const fCam = addFolder(pane, '相机轨迹', [1], { expanded: false });
  fCam.addBinding(PARAMS.cam, 'fov', { min: 20, max: 60 }).on('change', fire);
  for (const key of ['p0', 'p1', 'p2', 'look0', 'look2']) {
    fCam.addBinding(PARAMS.cam, key, {
      x: { min: -4, max: 4 }, y: { min: -2, max: 4 }, z: { min: -1, max: 12 },
    }).on('change', fire);
  }
  fCam.addBinding(PARAMS.apple, 'rotYEnd', { min: -6.28, max: 6.28 }).on('change', fire);
  fCam.addBinding(PARAMS.apple, 'startRotY', { min: -3.14, max: 3.14 }).on('change', fire);
  fCam.addBinding(PARAMS.apple, 'tiltZ', { min: -45, max: 45 }).on('change', fire);
  fCam.addBinding(PARAMS.apple, 'tiltX', { min: -45, max: 45 }).on('change', fire);

  const fSeg = addFolder(pane, '段边界', [1], { expanded: false });
  fSeg.addBinding(PARAMS.seg, 'floatFadeEnd', { min: 0.02, max: 0.3 }).on('change', fire);
  fSeg.addBinding(PARAMS.scroll, 'scrub', { min: 0.1, max: 3 }).on('change', fire);
  fSeg.addBinding(PARAMS.scroll, 'totalVh', { min: 150, max: 800, step: 10 }).on('change', fire);

  const fFloat = addFolder(pane, '漂浮', [1], { expanded: false });
  fFloat.addBinding(PARAMS.float, 'ampY', { min: 0, max: 0.15 });
  fFloat.addBinding(PARAMS.float, 'period', { min: 1, max: 8 });
  fFloat.addBinding(PARAMS.float, 'swayZ', { min: 0, max: 5 });
  fFloat.addBinding(PARAMS.float, 'swayX', { min: 0, max: 5 });

  const fL = addFolder(pane, '打光', [1, 2], { expanded: false });
  fL.addBinding(PARAMS.light, 'hemi', { min: 0, max: 3 }).on('change', fire);
  fL.addBinding(PARAMS.light, 'key', { min: 0, max: 5 }).on('change', fire);
  fL.addBinding(PARAMS.light, 'fill', { min: 0, max: 2 }).on('change', fire);

  const fHv = addFolder(pane, '苹果悬停', [1], { expanded: false });
  fHv.addBinding(PARAMS.appleHover, 'ms', { min: 100, max: 1200 });

  const fIntro = addFolder(pane, '入场动画', [1], { expanded: false });
  fIntro.addBinding(PARAMS.intro, 'enabled').on('change', fire);
  fIntro.addBinding(PARAMS.intro, 'appleBlur', { min: 0, max: 30, label: '苹果模糊' });
  fIntro.addBinding(PARAMS.intro, 'itemBlur', { min: 0, max: 20, label: '元素模糊' });
  fIntro.addBinding(PARAMS.intro, 'itemDur', { min: 0.1, max: 1.5, label: '显现时长' });
  fIntro.addBinding(PARAMS.intro, 'itemGap', { min: 0.1, max: 1.5, label: '显现间隔' });
  fIntro.addBinding(PARAMS.intro, 'startDelay', { min: 0, max: 2, label: '首延迟' });
  fIntro.addBinding(PARAMS.intro, 'unblurAtItem', {
    label: '对焦起点',
    options: { 'its': 0, 'hexinyi': 1, 'ś': 2, 'portfolio': 3, '猫': 4 },
  });
  fIntro.addBinding(PARAMS.intro, 'uiDelay', { min: 0, max: 2, label: 'UI 停顿' });
  fIntro.addBinding(PARAMS.intro, 'uiFade', { min: 0.1, max: 2, label: 'UI 淡入' });
  fIntro.addBinding(PARAMS.intro, 'skipFade', { min: 0.2, max: 2, label: '跳过缓入' });
  fIntro.addButton({ title: '重播入场(刷新页面)' }).on('click', () => {
    location.reload();
  });

  // —— 第 2 页:About ——
  const fAw = addFolder(pane, '苹果滑走(about 段)', [2]);
  fAw.addBinding(PARAMS.away, 'x', { min: -5, max: 5 }).on('change', fire);
  fAw.addBinding(PARAMS.away, 'y', { min: -5, max: 5 }).on('change', fire);
  fAw.addBinding(PARAMS.away, 'rot', { min: -1.5, max: 1.5 }).on('change', fire);
  fAw.addBinding(PARAMS.away, 'scale', { min: 0.4, max: 1.5 }).on('change', fire);
  fAw.addBinding(PARAMS.away, 'fadeStart', { min: 0, max: 1 }).on('change', fire);

  const fAb = addFolder(pane, 'about 文案时序', [2], { expanded: false });
  fAb.addBinding(PARAMS.about, 'inStart', { min: 0, max: 1 }).on('change', fire);
  fAb.addBinding(PARAMS.about, 'outStart', { min: 0, max: 1 }).on('change', fire);

  const fAv = addFolder(pane, '头像个签', [2]);
  fAv.addBinding(PARAMS.avatar, 'right', { min: -300, max: 300, step: 2 }).on('change', fire);
  fAv.addBinding(PARAMS.avatar, 'top', { min: -100, max: 400, step: 2 }).on('change', fire);
  fAv.addBinding(PARAMS.avatar, 'width', { min: 60, max: 400, step: 2 }).on('change', fire);
  fAv.addBinding(PARAMS.avatar, 'rot', { min: -20, max: 20, step: 0.5 }).on('change', fire);

  // —— 第 3 页:画廊 ——
  const fG = addFolder(pane, '画廊交互', [3], { expanded: false });
  fG.addBinding(PARAMS.gallery, 'liftY', { min: -60, max: 0 }).on('change', fire);
  fG.addBinding(PARAMS.gallery, 'liftRot', { min: -10, max: 10 }).on('change', fire);
  fG.addBinding(PARAMS.gallery, 'liftScale', { min: 1, max: 1.3 }).on('change', fire);
  fG.addBinding(PARAMS.gallery, 'liftMs', { min: 100, max: 900 }).on('change', fire);
  fG.addBinding(PARAMS.gallery, 'overlapVw', { min: 0, max: 8 }).on('change', fire);
  fG.addBinding(PARAMS.gallery, 'noteDelay', { min: 0, max: 600 }).on('change', fire);

  const caState = { caseIdx: 0, pin: false };
  const caTitles = CASES.map((c) => c.title);
  const fCa = addFolder(pane, '相框(第3页)', [3]);
  let caSliders = [];
  const rebuildCaSliders = () => {
    for (const b of caSliders) b.dispose();
    caSliders = [];
    const A = PARAMS.caseArt[caState.caseIdx];
    caSliders.push(fCa.addBinding(A, 'scale', { min: 0.3, max: 2.5, label: 'scale' }).on('change', fire));
    caSliders.push(fCa.addBinding(A, 'xOff', { min: -30, max: 30, label: 'xOff' }).on('change', fire));
    caSliders.push(fCa.addBinding(A, 'yOff', { min: -30, max: 30, label: 'yOff' }).on('change', fire));
    caSliders.push(fCa.addBinding(A, 'rot', { min: -15, max: 15, label: 'rot' }).on('change', fire));
  };
  fCa.addBinding(caState, 'caseIdx', {
    label: '选择切片',
    options: Object.fromEntries(caTitles.map((t, i) => [`${i + 1}·${t}`, i])),
  }).on('change', () => {
    rebuildCaSliders();
    if (caState.pin) works.pin(caState.caseIdx);
  });
  rebuildCaSliders();
  fCa.addBinding(caState, 'pin', { label: '锁定预览' }).on('change', () => {
    works.pin(caState.pin ? caState.caseIdx : -1);
  });

  const fD = addFolder(pane, '详情窗口', [3], { expanded: false });
  fD.addBinding(PARAMS.detail, 'ms', { min: 150, max: 1200, label: '动画时长' });
  fD.addBinding(PARAMS.detail, 'winW', { min: 320, max: 900, label: '默认宽' });
  fD.addBinding(PARAMS.detail, 'winH', { min: 240, max: 900, label: '默认高' });
  fD.addBinding(PARAMS.detail, 'blur', { min: 0, max: 60, label: '玻璃模糊' });
  fD.addBinding(PARAMS.detail, 'radius', { min: 0, max: 32, label: '圆角' });

  // —— 全局(每页都显示) ——
  const fDa = addFolder(pane, 'haoqi 背景', [], { expanded: false });
  fDa.addBinding(PARAMS.dapple, 'enabled').on('change', () => {
    import('./dapplegl.js').then((m) => m.dapplegl.setEnabled(PARAMS.dapple.enabled));
  });
  fDa.addBinding(PARAMS.dapple, 'bokeh', { min: 0, max: 1.5 });
  fDa.addBinding(PARAMS.dapple, 'chroma', { min: 0, max: 3 });

  const fF2 = addFolder(pane, '苹果滤镜(shader,默认关)', [], { expanded: false });
  fF2.addBinding(PARAMS.filter, 'enabled');
  fF2.addBinding(PARAMS.filter, 'grain', { min: 0, max: 0.3 }).on('change', fire);
  fF2.addBinding(PARAMS.filter, 'desat', { min: 0, max: 1 }).on('change', fire);
  fF2.addBinding(PARAMS.filter, 'lift', { min: 0, max: 0.3 }).on('change', fire);

  pane.addButton({ title: '复制参数链接(发给我即可)' }).on('click', () => {
    writeParamsHash();
    navigator.clipboard?.writeText(location.href);
  });
  pane.addButton({ title: '导出 JSON' }).on('click', () => {
    const json = JSON.stringify(PARAMS, null, 2);
    console.log('[params]', json);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = 'xinyi-apple-params.json';
    a.click();
  });

  applyPage(page);
}

// 面板打开时,滚动换页自动切换分组
export function syncPanelPage(page) {
  if (pane && visible && page !== curPage) applyPage(page);
}

export function panelState() { return { hasPane: !!pane, visible }; }
