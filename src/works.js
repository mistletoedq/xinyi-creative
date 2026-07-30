// 作品切片画廊(自然文档流):贴彩色标签的苹果片;hover 提起+小便签全部交给 CSS
// hover/锁定某片时,对应手绘插画作为大相框浮现(每片独立参数,面板可锁定预览)
import { PARAMS, IS_TOUCH, isPortrait } from './params.js';
import { CASES } from './content.js';

const ART = ['kimi', 'caramel', 'vibe', 'site', 'news', 'media'];
let art = null, artImgs = [], shownIdx = -1;
let tappedIdx = -1;   // 触屏:首次点按只出便签/相框,二次点按才开窗

function applyArtProps(i) {
  const A = PARAMS.caseArt[i];
  // 相框四边不越页面边框(网格边距):可用宽 = 视口 − 左右边距 − 横向偏移量,可用高同理;
  // 渲染宽 = CSS 宽 × --art-scale,按图片纵横比与旋转余量(4%)一并收敛
  const margin = innerWidth < 1024 ? 16 : 56;
  const xPx = Math.abs(A.xOff / 100 * innerWidth);
  const yPx = Math.abs(A.yOff / 100 * innerHeight);
  const im = artImgs[i];
  const ar = im && im.naturalWidth && im.naturalHeight ? im.naturalWidth / im.naturalHeight : 2;
  const limit = Math.min(innerWidth - margin * 2 - xPx * 2, (innerHeight - margin * 2 - yPx * 2) * ar * 0.96) / A.scale;
  const w = Math.max(200, Math.min(1250 * A.scale, innerWidth * 0.96, limit));
  art.style.setProperty('--art-w', `${Math.round(w)}px`);
  art.style.setProperty('--art-x', `${A.xOff}vw`);
  art.style.setProperty('--art-y', `${A.yOff}vh`);
  art.style.setProperty('--art-rot', `${A.rot}deg`);
  art.style.setProperty('--art-scale', A.scale);
}

export const works = {
  pinned: -1,

  init(enterDetail) {
    const root = document.getElementById('cards');
    art = document.getElementById('case-art');
    // 六张背景插画全部预载为叠层 img:切换只动透明度,不再换 src(避免拉取/光栅化卡顿)
    artImgs = ART.map((name, i) => {
      const im = new Image();
      im.src = `assets/img/case-art/${name}.svg`;
      im.alt = '';
      im.draggable = false;
      im.addEventListener('load', () => { if (shownIdx === i) applyArtProps(i); });
      im.decode?.().catch(() => {});
      art.appendChild(im);
      return im;
    });
    const g = PARAMS.gallery;
    root.style.setProperty('--overlap', g.overlapVw + 'vw');
    const doc = document.documentElement.style;
    doc.setProperty('--lift-y', g.liftY + 'px');
    doc.setProperty('--lift-rot', g.liftRot + 'deg');
    doc.setProperty('--lift-scale', g.liftScale);
    doc.setProperty('--lift-ms', g.liftMs + 'ms');
    doc.setProperty('--note-delay', g.noteDelay + 'ms');

    for (let i = 0; i < CASES.length; i++) {
      const c = CASES[i];
      const tone = ['red', 'yellow', 'blue'][i % 3];
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-inner">
          <img src="assets/img/slice_card_${i}.png" alt="${c.title}" draggable="false">
          <img class="tab" src="assets/img/tab-${tone}.png" alt="" draggable="false"
               style="--tab-tilt:${(i % 2 ? -1 : 1) * (3 + i)}deg">
        </div>
        <div class="case-tag${i % 2 ? ' ct-below' : ''}${i < CASES.length / 2 ? ' ct-dir-l' : ' ct-dir-r'}" aria-hidden="true">
          <div class="ct-head"><b>${c.title}</b><span>/${String(i + 1).padStart(2, '0')}</span></div>
          <div class="ct-kicker">${[c.category, c.year].filter(Boolean).join(' · ')}</div>
          <div class="ct-blurb">${c.blurb}</div>
          <svg class="ct-lines" viewBox="0 0 264 62" fill="none" aria-hidden="true">
            <path class="ct-cord" d="M0 0 H204 L250 46" pathLength="1"/>
            <rect class="ct-cap" x="242" y="46" width="16" height="16"/>
            <text class="ct-plus" x="250" y="58" text-anchor="middle">+</text>
          </svg>
        </div>`;
      card.addEventListener('click', () => {
        if (IS_TOUCH && tappedIdx !== i) {   // 触屏首按:出便签/相框,不开窗
          root.querySelector('.tag-show')?.classList.remove('tag-show');
          tappedIdx = i;
          card.classList.add('tag-show');
          this.layoutTag(card, card.querySelector('.case-tag'));
          this.showFrame(i);
          return;
        }
        card.classList.remove('tag-show');
        tappedIdx = -1;
        this.hideFrame();
        enterDetail?.(i);
      });
      if (!IS_TOUCH) {
        card.addEventListener('mouseenter', () => {
          if (this.pinned >= 0) return;
          this.layoutTag(card, card.querySelector('.case-tag'));
          this.showFrame(i);
        });
        card.addEventListener('mouseleave', () => {
          if (this.pinned >= 0) return;
          this.hideFrame();
        });
      }
      root.appendChild(card);
    }
  },

  // hover 时按真实几何布点(sutera 原站语法):
  // 标签外缘钉到灰线(左半排钉左线,右半排钉右线);
  // 上方标签:框角水平伸出 → 45° 斜落到切片顶缘;
  // 下方标签(FOUNDATION 式):切片底缘标记 → 水平 → 45° 斜下 → 折进标签底边;
  // 标记落在标签正下方时简化为一条垂直线
  layoutTag(card, tag) {
    if (!tag) return;
    const r = card.getBoundingClientRect();
    if (isPortrait()) {           // 竖屏:卡片居中(配合 CSS 的 translate(-50%))
      tag.style.left = (innerWidth / 2 - r.left) + 'px';
      // 位置限制:上方不压顶栏(76px);3×2 网格中下排片的标签上挂会盖住上排片,与任一切片相交就改挂下方
      const tagH = tag.offsetHeight;
      let above = r.top - 18 - tagH >= 76;
      if (above) {
        const tagTop = r.top - 18 - tagH;
        for (const other of document.querySelectorAll('.card')) {
          if (other === card) continue;
          const o = other.getBoundingClientRect();
          if (tagTop < o.bottom && r.top - 18 > o.top) { above = false; break; }
        }
      }
      if (above) {
        tag.style.top = 'auto';
        tag.style.bottom = 'calc(100% + 18px)';
      } else {
        tag.style.top = 'calc(100% + 18px)';
        tag.style.bottom = 'auto';
      }
      return;
    }
    const margin = innerWidth < 1024 ? 16 : 56;
    const labelW = Math.min(300, innerWidth * 0.8);
    const dirL = tag.classList.contains('ct-dir-l');
    const labelL = dirL ? margin : innerWidth - margin - labelW;
    tag.style.left = (labelL - r.left) + 'px';
    const labelR = labelL + labelW;
    // 位置限制:下方标签底缘向下不超过左下坐标行,放不下就翻回上方
    const below = tag.classList.contains('ct-below')
      && r.bottom + 46 + tag.offsetHeight <= innerHeight - 76;
    const markerX = r.left + r.width * 0.5;
    const svg = tag.querySelector('.ct-lines');
    const path = svg.querySelector('.ct-cord');
    const cap = svg.querySelector('.ct-cap');
    const plus = svg.querySelector('.ct-plus');

    // 标记在标签水平跨度内:一条垂直线直落/直上,无需折角
    if (markerX > labelL + 8 && markerX < labelR - 8) {
      tag.classList.remove('ct-exit-l', 'ct-exit-r');
      svg.style.left = Math.round(markerX - labelL) - 9 + 'px';
      svg.style.transform = 'none';
      svg.style.width = '18px';
      if (!below) {
        tag.style.top = 'auto';
        tag.style.bottom = 'calc(100% + 46px)';
        svg.style.top = 'calc(100% - 1px)';
        svg.setAttribute('viewBox', '0 0 18 62');
        svg.style.height = '62px';
        path.setAttribute('d', 'M9 0 V46');
        cap.setAttribute('x', 1); cap.setAttribute('y', 46);
        plus.setAttribute('x', 9); plus.setAttribute('y', 58);
      } else {
        tag.style.top = 'calc(100% + 46px)';   // 覆盖此前上翻写入的内联 bottom,否则线朝上而标签仍挂上方
        tag.style.bottom = 'auto';
        svg.style.top = '-46px';
        svg.setAttribute('viewBox', '0 0 18 46');
        svg.style.height = '46px';
        path.setAttribute('d', 'M9 46 V0');
        cap.setAttribute('x', 1); cap.setAttribute('y', -8);
        plus.setAttribute('x', 9); plus.setAttribute('y', 4);
      }
      return;
    }

    let exitLeft;                 // true=从左框角出,false=从右框角出(切角在另一侧)
    if (markerX >= labelR) exitLeft = false;
    else if (markerX <= labelL) exitLeft = true;
    else exitLeft = !dirL;
    tag.classList.toggle('ct-exit-l', exitLeft);
    tag.classList.toggle('ct-exit-r', !exitLeft);
    svg.style.left = ''; svg.style.transform = '';   // 锚定/镜像交回 exit 类
    const exitX = exitLeft ? labelL : labelR;

    if (!below) {
      // 上方:出口框角 → 水平 → 45° 斜落到切片顶缘的 + 盒
      tag.style.top = 'auto';
      tag.style.bottom = 'calc(100% + 46px)';   // 被位置限制翻回上方时覆盖 ct-below 的 top
      const d = Math.max(48, Math.round(Math.abs(markerX - exitX)));
      svg.style.top = 'calc(100% - 1px)';
      svg.setAttribute('viewBox', `0 0 ${d} 62`);
      svg.style.width = d + 'px';
      svg.style.height = '62px';
      path.setAttribute('d', `M0 0 H${d - 46} L${d} 46`);
      cap.setAttribute('x', d - 8); cap.setAttribute('y', 46);
      plus.setAttribute('x', d); plus.setAttribute('y', 58);
    } else {
      // 下方(FOUNDATION 式):标签底角 → 短水平(下划线) → 45° 斜上 → 水平到切片底缘的 + 盒
      tag.style.top = 'calc(100% + 46px)';   // 覆盖此前上翻写入的内联 bottom,否则线朝上而标签仍挂上方
      tag.style.bottom = 'auto';
      const H = 46 + Math.round(tag.offsetHeight);
      const d = Math.max(24, Math.round(Math.abs(markerX - exitX)));
      svg.style.top = '-46px';
      svg.setAttribute('viewBox', `0 0 ${d} ${H}`);
      svg.style.width = d + 'px';
      svg.style.height = H + 'px';
      if (d >= H + 24) {
        const u = Math.min(46, d - H - 12);          // 底边下划线段
        path.setAttribute('d', `M0 ${H} H${u} L${u + H} 0 H${d}`);
      } else {
        path.setAttribute('d', `M0 ${H} L${d} 0`);   // 距离太近,单斜线
      }
      cap.setAttribute('x', d - 8); cap.setAttribute('y', -8);
      plus.setAttribute('x', d); plus.setAttribute('y', 4);
    }
  },

  showFrame(i) {
    shownIdx = i;
    artImgs.forEach((im, j) => im.classList.toggle('cur', j === i));
    applyArtProps(i);
    art.classList.add('show');
  },

  hideFrame() {
    shownIdx = -1;
    art.classList.remove('show');
  },

  // 面板锁定/切换预览
  pin(i) {
    this.pinned = i;
    if (i >= 0) this.showFrame(i);
    else this.hideFrame();
  },
};
