// haoqi 式排版网格(几何照搬 haoqi.design 的 SVG 实现):
// 竖线两边留白(桌面 56px / 移动 16px),横线通栏,交点处断 24px 缺口并画 12px 十字
// 1px 线,坐标取整 +0.5 保证 crisp
const STROKE = 'rgba(26, 23, 20, 0.12)';   // 沿用本站墨色(haoqi 原站是白线 + difference 混合)

export function createGridlines() {
  const host = document.getElementById('gridlines');
  if (!host) return;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  const vPath = document.createElementNS(NS, 'path');
  const hPath = document.createElementNS(NS, 'path');
  const cPath = document.createElementNS(NS, 'path');
  for (const p of [vPath, hPath, cPath]) {
    p.setAttribute('stroke', STROKE);
    p.setAttribute('stroke-width', '1');
    p.setAttribute('fill', 'none');
    svg.appendChild(p);
  }
  host.appendChild(svg);

  const draw = () => {
    const w = innerWidth, h = innerHeight;
    const n = w < 1024 ? 16 : 56;                 // 两侧留白
    const e = Math.max(0, w - 2 * n);             // 留白间可用宽
    const i = Math.max(0, h / 3 - 12);            // 第一条横线 y = h/3(缺口 12px 起)
    const s = i + 24;                             // 缺口 24px
    const a = s + i;                              // 第二条横线 y = 2h/3
    const o = 3;                                  // 竖线分隔数:中间等分为两条竖线(三列)
    const xs = Array.from({ length: o + 1 }, (_, k) => Math.round(n + (k / o) * e) + 0.5);
    const ys = [i + 12, a + 12].map((y) => Math.round(y) + 0.5);

    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    // 竖线:三条分段,横线处断 24px
    vPath.setAttribute('d', xs.map((x) =>
      `M${x} 0V${i}M${x} ${s}V${a}M${x} ${a + 24}V${h}`).join(''));
    // 横线:通栏,竖线处断 24px
    hPath.setAttribute('d', ys.map((y) => {
      const segs = [`M0 ${y}H${xs[0] - 12}`];
      for (let k = 0; k < xs.length - 1; k++) segs.push(`M${xs[k] + 12} ${y}H${xs[k + 1] - 12}`);
      segs.push(`M${xs[xs.length - 1] + 12} ${y}H${w}`);
      return segs.join('');
    }).join(''));
    // 十字:每个交点 12px
    cPath.setAttribute('d', xs.flatMap((x) => ys.flatMap((y) =>
      [`M${x} ${y - 6}V${y + 6}`, `M${x - 6} ${y}H${x + 6}`])).join(''));
  };

  draw();
  addEventListener('resize', draw);
}
